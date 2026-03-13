require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

// Validate required environment variables
const requiredEnvVars = ['PESAPAL_CONSUMER_KEY', 'PESAPAL_CONSUMER_SECRET', 'PESAPAL_NOTIFICATION_ID', 'PESAPAL_BASE_URL', 'CALLBACK_URL'];
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    // Don't crash - just warn and use defaults where possible
}

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
        console.error("Auth Error:", error.response?.data || error.message);
        throw new Error('PesaPal authentication failed');
    }
}

// --- API: INITIATE PAYMENT ---
app.post('/api/pay', async (req, res) => {
    const { amount, phone, email } = req.body;
    
    // Get token first
    let token;
    try {
        token = await getPesaPalToken();
    } catch (authError) {
        console.error("Failed to get PesaPal token:", authError.message);
        return res.status(500).json({ error: { error_type: "auth_error", message: "Payment service unavailable" } });
    }

    // Build order data - only add notification_id if it's set
    const orderData = {
        id: "ZENITH-" + Math.floor(Math.random() * 100000),
        currency: "UGX",
        amount: amount,
        description: "Investment Top-up",
        callback_url: process.env.CALLBACK_URL,
        redirect_mode: "SUCCESS",
        billing_address: {
            email_address: email || "user@zenith.com",
            phone_number: phone
        }
    };
    
    // Add notification_id only if provided
    if (process.env.PESAPAL_NOTIFICATION_ID) {
        orderData.notification_id = process.env.PESAPAL_NOTIFICATION_ID;
    }

    try {
        const response = await axios.post(
            `${process.env.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
            orderData,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        res.json(response.data); // Sends the redirect URL to the frontend
    } catch (error) {
        console.error("Payment Error:", error.response?.data || error.message);
        res.status(500).json({ 
            error: { 
                error_type: "payment_error", 
                message: error.response?.data?.error || error.message 
            } 
        });
    }
});

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        envVars: {
            pesapalBaseUrl: process.env.PESAPAL_BASE_URL ? 'set' : 'missing',
            pesapalConsumerKey: process.env.PESAPAL_CONSUMER_KEY ? 'set' : 'missing',
            pesapalNotificationId: process.env.PESAPAL_NOTIFICATION_ID ? 'set' : 'missing',
            callbackUrl: process.env.CALLBACK_URL ? 'set' : 'missing'
        }
    });
});

// --- HANDLE CALLBACK ---
app.get('/callback', (req, res) => {
    // This is where users land after payment
    res.send("<h1>Payment Processing...</h1><script>setTimeout(() => { window.location.href='/#profile'; }, 3000)</script>");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Zenith Assets running on port ${PORT}`));
