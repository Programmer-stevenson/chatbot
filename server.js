// Load environment variables (only for local development, not production)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const dental = require('./dental-training');

const app = express();

// Initialize Gemini AI with environment variable
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables!');
    console.error('   Make sure .env file exists with: GEMINI_API_KEY=your_key');
}
const ai = new GoogleGenAI({ apiKey });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Saia Dental Assistant'
    });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
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

        // Enhance with dental training
        const enhanced = dental.enhanceWithDentalTraining(message);
        
        // Use quick response if available (for exact matches)
        if (enhanced.quickResponse) {
            return res.json({ response: enhanced.quickResponse });
        }

        // Determine prompt based on dental relevance
        const promptToSend = enhanced.isDental ? enhanced.enhancedPrompt : message;
        
        // Call Gemini API with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: promptToSend
            });

            clearTimeout(timeout);

            // Log appointment detection for admin tracking
            if (enhanced.appointmentInfo?.phone || enhanced.appointmentInfo?.email) {
                console.log('[APPOINTMENT] Detected:', {
                    timestamp: new Date().toISOString(),
                    phone: enhanced.appointmentInfo.phone,
                    email: enhanced.appointmentInfo.email
                });
            }

            // Return successful response
            res.json({ 
                response: response.text,
                isDental: enhanced.isDental
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

        // Handle specific error types
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

        // Generic error response
        res.status(500).json({ 
            error: 'An error occurred while processing your request. Please try again.' 
        });
    }
});

// Serve static files from public folder (ALWAYS, not just locally)
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route for SPA - must be AFTER API routes (ALWAYS)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server (works for both local and Render)
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🦷 Saia Dental Assistant Server     ║
╠═══════════════════════════════════════╣
║  Port: ${port.toString().padEnd(28)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}║
║  AI Model: gemini-2.5-flash          ║
║  Status: ✅ Running                   ║
╚═══════════════════════════════════════╝

🌐 Server running on port ${port}
    `);
});

// Export for serverless platforms (Vercel)
module.exports = app;