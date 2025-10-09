const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyA5QU_FRr3tliXfHV798PfI1NSi2tXMHAw');

async function listModels() {
    try {
        const models = await genAI.listModels();
        console.log('Available models:');
        for await (const model of models) {
            console.log('- ' + model.name);
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();