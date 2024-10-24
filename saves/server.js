// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware with updated Content Security Policy
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: [
                    "'self'",
                    'data:',
                    'https://pub-3626123a908346a7a8be8d9295f44e26.r2.dev',
                    'https://cdn2.stablediffusionapi.com',
                ],
                // Add other directives if necessary
            },
        },
    })
);

// Logging Middleware
app.use(morgan('combined'));

// Rate Limiting Middleware
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 Minute
    max: 60, // Limit each IP to 60 requests per windowMs
    message: 'Too many requests from this IP, please try again after a minute.',
});
app.use(limiter);

// CORS Configuration
app.use(cors());

// Body Parsing Middleware
app.use(express.json());

// Serve Static Files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Google Generative AI
const googleApiKey = process.env.GOOGLE_API_KEY;
if (!googleApiKey) {
    console.error('Error: GOOGLE_API_KEY is not defined in environment variables.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(googleApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// POST /api/chat Endpoint
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid message provided' });
    }

    try {
        // Generate AI Response
        const prompt = userMessage.trim();
        const result = await model.generateContent([prompt]);
        const aiReply = result.response.text();

        res.json({ reply: aiReply });
    } catch (error) {
        console.error('Error generating AI response:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/generate-image Endpoint
app.post('/api/generate-image', async (req, res) => {
    const userPrompt = req.body.prompt || 'the quick brown fox jumps over the lazy dog';
    const width = parseInt(req.body.width) || 512;
    const height = parseInt(req.body.height) || 512;
    const negativePrompt = req.body.negativePrompt || 'bad quality';

    // Validate width and height
    if (width < 64 || width > 2048 || height < 64 || height > 2048) {
        return res.status(400).json({ error: 'Width and Height must be between 64 and 2048.' });
    }

    try {
        const modelslabApiKey = process.env.MODELSLAB_API_KEY;
        if (!modelslabApiKey) {
            return res.status(500).json({ error: 'Modelslab API key not configured' });
        }

        const response = await axios.post(
            'https://stablediffusionapi.com/api/v3/text2img',
            {
                key: modelslabApiKey,
                prompt: userPrompt,
                negative_prompt: negativePrompt,
                width: width,
                height: height,
                samples: 1,
                num_inference_steps: 30,
                guidance_scale: 7.5,
                safety_checker: 'no',
                seed: null,
                webhook: null,
                track_id: null,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data && response.data.output && response.data.output.length > 0) {
            const imageUrl = response.data.output[0];
            res.json({ image: imageUrl });
        } else {
            throw new Error('No image returned from API');
        }
    } catch (error) {
        console.error('Error generating image:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error generating image' });
    }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Serve Frontend for All Other Routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
