const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const dental = require('./dental-training');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini AI with environment variable (secure for production)
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyA5QU_FRr3tliXfHV798PfI1NSi2tXMHAw';
const ai = new GoogleGenAI({ apiKey });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Vercel
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

// Use public folder (lowercase for consistency)
const publicFolder = 'public';

// Verify public folder exists
if (!fs.existsSync(path.join(__dirname, publicFolder))) {
    console.error('⚠️  CRITICAL: "public" folder not found!');
    console.error('   Current directory:', __dirname);
    console.error('   Files in directory:', fs.readdirSync(__dirname));
}

// Serve static files (HTML, CSS, JS) - look in public folder
app.use(express.static(path.join(__dirname, publicFolder)));

// Catch-all route for SPA (must be last)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, publicFolder, 'index.html');
    
    // Check if file exists before sending
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ 
            error: 'index.html not found',
            searchedPath: indexPath,
            publicFolder: publicFolder,
            filesInPublicFolder: fs.existsSync(path.join(__dirname, publicFolder)) 
                ? fs.readdirSync(path.join(__dirname, publicFolder))
                : []
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[UNHANDLED ERROR]', {
        timestamp: new Date().toISOString(),
        error: err.message,
        stack: err.stack
    });
    
    res.status(500).json({ 
        error: 'Internal server error' 
    });
});

// Start server
const server = app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🦷 Saia Dental Assistant Server     ║
╠═══════════════════════════════════════╣
║  Port: ${port.toString().padEnd(28)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}║
║  AI Model: gemini-2.5-flash          ║
║  Working Dir: ${__dirname.padEnd(20).substring(0,20)}║
║  Status: ✅ Running                   ║
╚═══════════════════════════════════════╝
    `);
    
    // Verify index.html exists on startup
    const indexPath = path.join(__dirname, publicFolder, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error('⚠️  WARNING: index.html not found at:', indexPath);
        if (fs.existsSync(path.join(__dirname, publicFolder))) {
            console.error('   Files in', publicFolder, 'folder:', fs.readdirSync(path.join(__dirname, publicFolder)));
        }
    } else {
        console.log('✅ index.html found at:', indexPath);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Received SIGTERM signal');
    server.close(() => {
        console.log('[SHUTDOWN] Server closed gracefully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[SHUTDOWN] Received SIGINT signal');
    server.close(() => {
        console.log('[SHUTDOWN] Server closed gracefully');
        process.exit(0);
    });
});

module.exports = app;