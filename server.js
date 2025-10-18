// Load environment variables
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { v4: uuidv4 } = require('uuid');
const dental = require('./dental-training');
const db = require('./database');

const app = express();

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables!');
}
const ai = new GoogleGenAI({ apiKey });

// Connect to MongoDB
db.connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware to generate/retrieve session ID
app.use((req, res, next) => {
    if (!req.headers['x-session-id']) {
        req.sessionId = uuidv4();
        res.setHeader('x-session-id', req.sessionId);
    } else {
        req.sessionId = req.headers['x-session-id'];
    }
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Saia Dental Assistant',
        database: db.Conversation ? 'connected' : 'disconnected'
    });
});

// Main chat endpoint with database integration
app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { message } = req.body;
        const sessionId = req.sessionId;
        
        // Validate input
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Invalid message format. Message must be a non-empty string.' 
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({ 
                error: 'Message too long. Maximum 2000 characters allowed.' 
            });
        }

        // Get conversation history for context
        const history = await db.getConversationHistory(sessionId, 5);

        // Enhance with dental training
        const enhanced = dental.enhanceWithDentalTraining(message);
        
        // Use quick response if available
        if (enhanced.quickResponse) {
            // Save to database
            await db.saveConversation(
                sessionId,
                message,
                enhanced.quickResponse,
                {
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                enhanced.isDental
            );

            return res.json({ 
                response: enhanced.quickResponse,
                sessionId 
            });
        }

        // Build context-aware prompt with conversation history
        let contextPrompt = enhanced.isDental ? enhanced.enhancedPrompt : message;
        
        if (history.length > 0) {
            const historyContext = history.map(msg => 
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n');
            
            contextPrompt = `Previous conversation:\n${historyContext}\n\nCurrent message: ${contextPrompt}`;
        }

        // Call Gemini API
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: contextPrompt
            });

            clearTimeout(timeout);
            
            const responseText = response.text;
            const responseTime = Date.now() - startTime;

            // Save conversation to database
            await db.saveConversation(
                sessionId,
                message,
                responseText,
                {
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                enhanced.isDental
            );

            // Check for appointment request and save
            if (enhanced.appointmentInfo?.phone || enhanced.appointmentInfo?.email) {
                await db.saveAppointment({
                    sessionId,
                    patientInfo: {
                        phone: enhanced.appointmentInfo.phone,
                        email: enhanced.appointmentInfo.email
                    },
                    appointmentDetails: {
                        reason: message,
                        urgency: enhanced.appointmentInfo.isUrgent ? 'urgent' : 'routine'
                    },
                    notes: `Auto-detected from conversation`
                });

                console.log('[APPOINTMENT] Saved to database:', {
                    sessionId,
                    phone: enhanced.appointmentInfo.phone,
                    email: enhanced.appointmentInfo.email
                });
            }

            // Update analytics asynchronously
            db.updateAnalytics().catch(err => 
                console.error('Analytics update failed:', err)
            );

            res.json({ 
                response: responseText,
                isDental: enhanced.isDental,
                sessionId,
                responseTime
            });

        } catch (apiError) {
            clearTimeout(timeout);
            throw apiError;
        }

    } catch (error) {
        console.error('[ERROR]', {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack
        });

        if (error.name === 'AbortError') {
            return res.status(504).json({ 
                error: 'Request timeout. Please try again.' 
            });
        }

        if (error.message?.includes('API key')) {
            return res.status(500).json({ 
                error: 'Service configuration error. Please contact support.' 
            });
        }

        res.status(500).json({ 
            error: 'An error occurred while processing your request. Please try again.' 
        });
    }
});

// Get conversation history endpoint
app.get('/api/conversation/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const history = await db.getConversationHistory(sessionId, 50);
        res.json({ history });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation history' });
    }
});

// Submit feedback endpoint
app.post('/api/feedback', async (req, res) => {
    try {
        const { sessionId, rating, feedback, category } = req.body;
        
        const savedFeedback = await db.saveFeedback({
            sessionId: sessionId || req.sessionId,
            rating,
            feedback,
            category
        });

        res.json({ 
            success: true, 
            feedbackId: savedFeedback._id 
        });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

// Get analytics endpoint (admin only - add authentication in production)
app.get('/api/analytics', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const analytics = await db.Analytics.find({
            date: { $gte: startDate }
        }).sort({ date: -1 });

        const totalAppointments = await db.Appointment.countDocuments({
            createdAt: { $gte: startDate }
        });

        const appointmentsByStatus = await db.Appointment.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            analytics,
            totalAppointments,
            appointmentsByStatus
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Import and register appointments routes
const appointmentsRouter = require('./routes/appointments');app.use('/api/appointments', appointmentsRouter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🦷 Saia Dental Assistant Server     ║
╠═══════════════════════════════════════╣
║  Port: ${port.toString().padEnd(28)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}║
║  AI Model: gemini-2.5-flash          ║
║  Database: MongoDB                   ║
║  Status: ✅ Running                   ║
╚═══════════════════════════════════════╝

🌐 Server running on port ${port}
    `);
});

module.exports = app;