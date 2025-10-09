const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const dental = require('./dental-training');

const app = express();
const port = 3000;

const ai = new GoogleGenAI({ apiKey: 'AIzaSyA5QU_FRr3tliXfHV798PfI1NSi2tXMHAw' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Get dental enhancement (but don't use quickResponse anymore)
        const enhanced = dental.enhanceWithDentalTraining(message);
        
        // ALWAYS send to Gemini - no more quickResponse shortcuts
        // If it's dental-related, use enhanced prompt with context
        // If it's not dental, use original message
        const promptToSend = enhanced.isDental ? enhanced.enhancedPrompt : message;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptToSend
        });
        
        // Log appointment info if detected
        if (enhanced.appointmentInfo?.phone || enhanced.appointmentInfo?.email) {
            console.log('📅 Appointment Request Detected:', enhanced.appointmentInfo);
        }
        
        res.json({ response: response.text });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:3000`);
    console.log(`🦷 Dental training system activated (AI-powered mode)`);
});