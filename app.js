const express = require('express');
const cors = require('cors');

const http = require('http');
require('dotenv').config();

const port = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DID_KEY = process.env.DID_KEY;

const app = express();
app.use('/', express.static(__dirname));
app.use(cors());
app.use(express.json());

// Authentication middleware
function authenticate(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey === process.env.SECURE_API_KEY) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden' });
    }
}

// Apply authentication middleware to specific routes
app.get('/api/openai-key', authenticate, (req, res) => {
    res.json({ apiKey: OPENAI_API_KEY });
});

app.get('/api/did-key', authenticate, (req, res) => {
    res.json({ apiKey: DID_KEY });
});

const server = http.createServer(app);

server.listen(port, () => console.log(`Server started on port localhost:${port}`));
