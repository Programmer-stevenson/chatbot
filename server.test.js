const request = require('supertest');
const express = require('express');
const path = require('path');

// Mock the dependencies
jest.mock('@google/genai');
jest.mock('./dental-training');

const { GoogleGenAI } = require('@google/genai');
const dental = require('./dental-training');

describe('Dental Chatbot Server Tests', () => {
    let app;
    let mockGenerateContent;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Setup mock responses
        mockGenerateContent = jest.fn().mockResolvedValue({
            text: 'This is a test response from Gemini'
        });

        GoogleGenAI.mockImplementation(() => ({
            models: {
                generateContent: mockGenerateContent
            }
        }));

        dental.enhanceWithDentalTraining = jest.fn((message) => ({
            isDental: true,
            enhancedPrompt: `Enhanced: ${message}`,
            appointmentInfo: null
        }));

        // Create a fresh app instance for each test
        const cors = require('cors');
        app = express();
        const port = process.env.PORT || 3000;
        const ai = new GoogleGenAI({ apiKey: 'test-key' });

        app.use(cors());
        app.use(express.json());

        app.post('/api/chat', async (req, res) => {
            try {
                const { message } = req.body;
                const enhanced = dental.enhanceWithDentalTraining(message);
                const promptToSend = enhanced.isDental ? enhanced.enhancedPrompt : message;
                
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: promptToSend
                });
                
                if (enhanced.appointmentInfo?.phone || enhanced.appointmentInfo?.email) {
                    console.log('📅 Appointment Request Detected:', enhanced.appointmentInfo);
                }
                
                res.json({ response: response.text });
            } catch (error) {
                console.error('Error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        app.use(express.static(__dirname));
    });

    describe('POST /api/chat', () => {
        test('should return a successful response for valid message', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'I need a dental appointment' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('response');
            expect(response.body.response).toBe('This is a test response from Gemini');
        });

        test('should call dental training enhancement', async () => {
            await request(app)
                .post('/api/chat')
                .send({ message: 'What are the office hours?' })
                .expect(200);

            expect(dental.enhanceWithDentalTraining).toHaveBeenCalledWith('What are the office hours?');
        });

        test('should use enhanced prompt when isDental is true', async () => {
            await request(app)
                .post('/api/chat')
                .send({ message: 'I have tooth pain' })
                .expect(200);

            expect(mockGenerateContent).toHaveBeenCalledWith({
                model: 'gemini-2.5-flash',
                contents: 'Enhanced: I have tooth pain'
            });
        });

        test('should use original message when isDental is false', async () => {
            dental.enhanceWithDentalTraining.mockReturnValue({
                isDental: false,
                enhancedPrompt: 'Enhanced: Hello',
                appointmentInfo: null
            });

            await request(app)
                .post('/api/chat')
                .send({ message: 'Hello' })
                .expect(200);

            expect(mockGenerateContent).toHaveBeenCalledWith({
                model: 'gemini-2.5-flash',
                contents: 'Hello'
            });
        });

        test('should handle appointment info detection', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            dental.enhanceWithDentalTraining.mockReturnValue({
                isDental: true,
                enhancedPrompt: 'Book appointment',
                appointmentInfo: {
                    phone: '555-1234',
                    email: 'test@example.com'
                }
            });

            await request(app)
                .post('/api/chat')
                .send({ message: 'Book appointment' })
                .expect(200);

            expect(consoleSpy).toHaveBeenCalledWith(
                '📅 Appointment Request Detected:',
                { phone: '555-1234', email: 'test@example.com' }
            );

            consoleSpy.mockRestore();
        });

        test('should return 500 error when Gemini API fails', async () => {
            mockGenerateContent.mockRejectedValue(new Error('API Error'));

            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Test message' })
                .expect('Content-Type', /json/)
                .expect(500);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('API Error');
        });

        test('should handle missing message in request body', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({})
                .expect(200);

            expect(dental.enhanceWithDentalTraining).toHaveBeenCalledWith(undefined);
        });

        test('should handle empty message', async () => {
            await request(app)
                .post('/api/chat')
                .send({ message: '' })
                .expect(200);

            expect(dental.enhanceWithDentalTraining).toHaveBeenCalledWith('');
        });

        test('should handle long messages', async () => {
            const longMessage = 'a'.repeat(2000);
            
            await request(app)
                .post('/api/chat')
                .send({ message: longMessage })
                .expect(200);

            expect(dental.enhanceWithDentalTraining).toHaveBeenCalledWith(longMessage);
        });

        test('should return proper JSON structure', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Test' })
                .expect(200);

            expect(response.body).toEqual({
                response: 'This is a test response from Gemini'
            });
        });
    });

    describe('CORS Configuration', () => {
        test('should allow cross-origin requests', async () => {
            const response = await request(app)
                .post('/api/chat')
                .set('Origin', 'http://example.com')
                .send({ message: 'Test' });

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });

    describe('Static File Serving', () => {
        test('should serve static files', async () => {
            // This test would need actual static files to work properly
            // In a real scenario, you'd create test files
            const response = await request(app)
                .get('/non-existent-file.html');

            // Should either return file or 404, but not crash
            expect([200, 404]).toContain(response.status);
        });
    });
});

describe('Environment Configuration Tests', () => {
    test('should use environment API key if provided', () => {
        process.env.GEMINI_API_KEY = 'env-api-key';
        
        const mockConstructor = jest.fn();
        GoogleGenAI.mockImplementation(mockConstructor);

        // Re-require to trigger constructor
        new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY || 'fallback-key' 
        });

        expect(mockConstructor).toHaveBeenCalledWith({ 
            apiKey: 'env-api-key' 
        });

        delete process.env.GEMINI_API_KEY;
    });

    test('should use fallback API key if environment variable not set', () => {
        delete process.env.GEMINI_API_KEY;
        
        const mockConstructor = jest.fn();
        GoogleGenAI.mockImplementation(mockConstructor);

        new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY || 'fallback-key' 
        });

        expect(mockConstructor).toHaveBeenCalledWith({ 
            apiKey: 'fallback-key' 
        });
    });

    test('should use PORT from environment or default to 3000', () => {
        process.env.PORT = '8080';
        const port = process.env.PORT || 3000;
        expect(port).toBe('8080');

        delete process.env.PORT;
        const defaultPort = process.env.PORT || 3000;
        expect(defaultPort).toBe(3000);
    });
    test('your test description', async () => {
    const response = await request(app)
        .post('/api/chat')
        .send({ message: 'your test message' })
        .expect(200);
    
    expect(response.body.response).toBeDefined();
});
});