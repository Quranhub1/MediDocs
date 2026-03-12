require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serves your HTML

// --- PESAPAL AUTHENTICATION ---
async function getPesaPalToken() {
    try {
        const response = await axios.post(`${process.env.PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
            consumer_key: process.env.PESAPAL_CONSUMER_KEY,
            consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
        });
        return response.data.token;
    } catch (error) {
        console.error("Auth Error:", error.response.data);
    }
}

// --- API: INITIATE PAYMENT ---
app.post('/api/pay', async (req, res) => {
    const { amount, phone, email } = req.body;
    const token = await getPesaPalToken();

    const orderData = {
        id: "ZENITH-" + Math.floor(Math.random() * 100000),
        currency: "UGX",
        amount: amount,
        description: "Investment Top-up",
        callback_url: process.env.CALLBACK_URL,
        notification_id: "", // You get this from PesaPal IPN registration
        billing_address: {
            email_address: email || "user@zenith.com",
            phone_number: phone
        }
    };

    try {
        const response = await axios.post(
            `${process.env.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
            orderData,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        res.json(response.data); // Sends the redirect URL to the frontend
    } catch (error) {
        res.status(500).json({ error: "Payment initiation failed" });
    }
});

// --- HANDLE CALLBACK ---
app.get('/callback', (req, res) => {
    // This is where users land after payment
    res.send("<h1>Payment Processing...</h1><script>setTimeout(() => { window.location.href='/#profile'; }, 3000)</script>");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Zenith Assets running on port ${PORT}`));
