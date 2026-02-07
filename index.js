const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// ⚠️ GANTI INI DENGAN API KEY MU!
const OPENAI_API_KEY = "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";

// Middleware
app.use(express.json());

// System prompt
const SYSTEM_PROMPT = `Anda ahli grammar Korea. HANYA jawab soal grammar Korea. Tolak pertanyaan lain dengan "Fokus grammar Bahasa Korea".`;

// Helper OpenAI
async function callOpenAI(prompt, userMessage) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `${prompt}\n\n${userMessage}` }
                ],
                temperature: 0.7,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        return `Error: ${error.response?.data?.error?.message || error.message}`;
    }
}

// 1. Tanya Jawab
app.post('/grammar/ask', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Butuh question' });
    
    const answer = await callOpenAI(
        `Jawab pertanyaan grammar Korea dengan singkat + 2 contoh kalimat.`,
        `Pertanyaan: ${question}`
    );
    
    res.json({ question, answer });
});

// 2. Generate Quiz
app.post('/grammar/quiz', async (req, res) => {
    const { level = 'basic' } = req.body;
    
    const response = await callOpenAI(
        `Buat 1 soal pilihan ganda grammar Korea level ${level}. 
        Format JSON: {"question": "...", "choices": ["A","B","C","D"], "answer": "A", "explanation": "..."}`,
        ''
    );
    
    try {
        const quiz = JSON.parse(response);
        res.json(quiz);
    } catch {
        res.json({
            question: `Pilih partikel yang tepat: 나는 학생___`,
            choices: ["은", "는", "이", "가"],
            answer: "는",
            explanation: "나 (saya) pakai 는"
        });
    }
});

// 3. Koreksi Jawaban
app.post('/grammar/check', async (req, res) => {
    const { question, userAnswer } = req.body;
    
    if (!question || !userAnswer) {
        return res.status(400).json({ error: 'Butuh question dan userAnswer' });
    }
    
    const response = await callOpenAI(
        `Periksa jawaban grammar Korea.
        Format JSON: {"correct": true/false, "feedback": "..."}`,
        `Pertanyaan: ${question}\nJawaban user: ${userAnswer}`
    );
    
    try {
        const result = JSON.parse(response);
        res.json(result);
    } catch {
        res.json({
            correct: false,
            feedback: "Gagal memproses koreksi"
        });
    }
});

// 4. Homepage
app.get('/', (req, res) => {
    res.send(`
        <h1>Korean Grammar API</h1>
        <p>Endpoints:</p>
        <ul>
            <li>POST /grammar/ask - Tanya jawab grammar</li>
            <li>POST /grammar/quiz - Generate soal</li>
            <li>POST /grammar/check - Koreksi jawaban</li>
        </ul>
        <p>API Key: ${OPENAI_API_KEY.substring(0, 10)}...</p>
    `);
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`🔥 Server running at http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${OPENAI_API_KEY.substring(0, 10)}...`);
});
