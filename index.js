const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validasi API Key
if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY environment variable is required!');
    process.exit(1);
}

// OpenAI configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_HEADERS = {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
};

// System prompt untuk membatasi hanya grammar Bahasa Korea
const SYSTEM_PROMPT = `Anda adalah ahli grammar Bahasa Korea. 
HANYA jawab pertanyaan tentang grammar Bahasa Korea (tata bahasa Korea).
Jika pertanyaan di luar topik grammar Bahasa Korea, tolak dengan tegas dan katakan: "Fokus grammar Bahasa Korea".
Gunakan Bahasa Indonesia dalam penjelasan.
Contoh grammar: 은/는, 이/가, 을/를, 고, 지만, (으)니까, 아서/어서, (으)면, 게, 기, 등.`;

// Helper function untuk call OpenAI
async function callOpenAI(prompt, userMessage) {
    try {
        const response = await axios.post(OPENAI_API_URL, {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `${prompt}\n\n${userMessage}` }
            ],
            temperature: 0.7,
            max_tokens: 500
        }, { headers: OPENAI_HEADERS });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API Error:', error.response?.data || error.message);
        throw new Error('Failed to get response from AI');
    }
}

// 1. Endpoint Tanya Jawab Grammar
app.post('/grammar/ask', async (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        const prompt = `Jawab pertanyaan tentang grammar Bahasa Korea berikut dengan jelas dan singkat. Berikan penjelasan dan 2 contoh kalimat.`;
        const answer = await callOpenAI(prompt, `Pertanyaan: ${question}`);
        
        res.json({ question, answer });
    } catch (error) {
        console.error('Error in /grammar/ask:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Endpoint Generate Soal Quiz
app.post('/grammar/quiz', async (req, res) => {
    try {
        const { level = 'basic' } = req.body;
        const validLevels = ['basic', 'intermediate'];
        
        if (!validLevels.includes(level)) {
            return res.status(400).json({ error: 'Level must be "basic" or "intermediate"' });
        }

        const prompt = `Buat 1 soal pilihan ganda tentang grammar Bahasa Korea level ${level} dengan format:
1. Pertanyaan
2. 4 pilihan jawaban (A, B, C, D)
3. Jawaban yang benar (huruf saja)
4. Penjelasan singkat

Format output JSON:
{
    "question": "isi pertanyaan",
    "choices": ["pilihan A", "pilihan B", "pilihan C", "pilihan D"],
    "answer": "A",
    "explanation": "penjelasan"
}`;

        const response = await callOpenAI(prompt, 'Buat soal grammar Korea:');
        
        // Parse JSON dari response AI
        try {
            const quizData = JSON.parse(response);
            res.json(quizData);
        } catch (parseError) {
            // Fallback jika AI tidak return JSON sempurna
            res.json({
                question: `Grammar Korea level ${level}: Pilih penggunaan partikel yang tepat`,
                choices: ["은", "는", "이", "가"],
                answer: "A",
                explanation: "Response dari AI tidak dalam format yang diharapkan. Silakan coba lagi."
            });
        }
    } catch (error) {
        console.error('Error in /grammar/quiz:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Endpoint Koreksi Jawaban
app.post('/grammar/check', async (req, res) => {
    try {
        const { question, userAnswer } = req.body;
        
        if (!question || !userAnswer) {
            return res.status(400).json({ 
                error: 'Both question and userAnswer are required' 
            });
        }

        const prompt = `Periksa dan koreksi jawaban grammar Bahasa Korea berikut.
Pertanyaan: ${question}
Jawaban user: ${userAnswer}

Berikan analisis:
1. Apakah jawaban benar? (true/false)
2. Feedback dan koreksi jika salah
3. Penjelasan grammar yang relevan

Format output JSON:
{
    "correct": true/false,
    "feedback": "feedback detail"
}`;

        const response = await callOpenAI(prompt, '');
        
        try {
            const checkData = JSON.parse(response);
            res.json(checkData);
        } catch (parseError) {
            // Fallback response
            res.json({
                correct: false,
                feedback: "Terjadi kesalahan dalam memproses koreksi. Silakan coba lagi."
            });
        }
    } catch (error) {
        console.error('Error in /grammar/check:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Korean Grammar API',
        timestamp: new Date().toISOString()
    });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Korean Grammar API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`OpenAI Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not Set!'}`);
});

module.exports = app;
