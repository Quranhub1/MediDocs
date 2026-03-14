require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// For React Router - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        paymentMethod: 'Manual deposit via Airtel Money (0749846848)'
    });
});

// --- HANDLE CALLBACK ---
app.get('/callback', (req, res) => {
    res.send("<h1>Processing...</h1><script>setTimeout(() => { window.location.href='/#/dashboard'; }, 3000)</script>");
});

// --- WEBHOOK FOR PAYMENT NOTIFICATIONS ---
app.post('/api/webhook', async (req, res) => {
    console.log('Webhook received:', req.body);
    res.json({ received: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Zenith Assets running on port ${PORT}`));
