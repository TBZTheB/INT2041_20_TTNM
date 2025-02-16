const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Cấu hình multer để lưu trữ tệp tin
const upload = multer({ dest: 'uploads/' });

const speechClient = new SpeechClient();

// Endpoint cho trang đăng ký
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function(err) {
        if (err) {
            return res.status(500).send("Error registering user");
        }
        res.redirect('/login.html');
    });
});

// Endpoint cho trang đăng nhập
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) {
            return res.status(500).send("Error logging in");
        }
        if (!row) {
            return res.status(400).send("Invalid credentials");
        }
        res.redirect('/index.html');
    });
});

// Endpoint để xử lý upload file audio
app.post('/upload-audio', upload.single('audio'), async (req, res) => {
    const filePath = req.file.path;
    const fileName = path.basename(filePath);

    const audio = {
        content: fs.readFileSync(filePath).toString('base64'),
    };

    const request = {
        audio: audio,
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
        },
    };

    try {
        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        res.json({ transcript: transcription });
    } catch (error) {
        res.status(500).send("Error transcribing audio");
    } finally {
        fs.unlinkSync(filePath); // Xóa tệp sau khi xử lý
    }
});

app.post('/summarize', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'No text provided' });
    }

    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/google/flan-t5-xxl',
            { inputs: text },
            {
                headers: {
                    'Authorization': `Bearer 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`,
                    'Content-Type': 'application/json'
                },
                params: {
                    max_length: 500, // Adjust max length of summary
                }
            }
        );
        const summary = response.data[0]?.generated_text || response.data?.generated_text || "Summary not found in response";
        
        res.json({ summary });
    } catch (error) {
        console.error('Error during summarization:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to summarize text' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
