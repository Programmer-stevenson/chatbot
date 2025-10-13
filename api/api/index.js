const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

// Import dental training from parent directory
const dental = require('../dental-training');

const app = express();

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

        const enhanced = dental.enhanceWithDentalTraining(message);
        
        if (enhanced.quickResponse) {
            return res.json({ response: enhanced.quickResponse });
        }

        const promptToSend = enhanced.isDental ? enhanced.enhancedPrompt : message;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptToSend
        });

        if (enhanced.appointmentInfo?.phone || enhanced.appointmentInfo?.email) {
            console.log('[APPOINTMENT] Detected:', {
                timestamp: new Date().toISOString(),
                phone: enhanced.appointmentInfo.phone,
                email: enhanced.appointmentInfo.email
            });
        }

        res.json({ 
            response: response.text,
            isDental: enhanced.isDental
        });

    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({ 
            error: 'An error occurred while processing your request. Please try again.' 
        });
    }
});

// Export for Vercel serverless
module.exports = app;