const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false
}));

app.get('/', (req, res) => {
    if (req.session.userId) {
      res.sendFile(__dirname + '/public/index.html');
    } else {
      res.redirect('/login');
    }
});

app.use(express.static('public'));

//LOG for debug
app.use((req, res, next)=>{
    console.log(req.path, req.method);
    console.log(req.body)
    console.log(req.session.userId)
    next();
})

// Cấu hình multer để lưu trữ tệp tin
const upload = multer({ dest: 'uploads/' });

const speechClient = new SpeechClient();



// Endpoint cho trang đăng ký
// app.post('/register', (req, res) => {
//     const { username, password } = req.body;
//     db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function(err) {
//         if (err) {
//             return res.status(500).send("Error registering user");
//         }
//         res.redirect('/login.html');
//     });
// });

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
        if (err) throw err;
        req.session.userId = this.lastID;
        res.redirect('/');
    });
});

// Endpoint cho trang đăng nhập
// app.post('/login', (req, res) => {
//     const { username, password } = req.body;
//     db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
//         if (err) {
//             return res.status(500).send("Error logging in");
//         }
//         if (!row) {
//             return res.status(400).send("Invalid credentials");
//         }
//         res.redirect('/index.html');
//     });
// });


app.get('/login', (req, res) => {
    if (req.session.userId) {
      res.redirect('/');
    } else {
      res.sendFile(__dirname + '/public/login.html');
    }
  });

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) throw err;
        if (user && user.password === password) {
            req.session.userId = user.id;
            res.redirect('/');
        } else {
            res.send('Invalid username or password');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) throw err;
        res.redirect('/login');
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
            languageCode: 'vi-VN',
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

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
