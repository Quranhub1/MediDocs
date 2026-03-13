require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'public')));

// For React Router - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate signature for Airtel API
function generateSignature(secretKey, data) {
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(data);
    return hmac.digest('hex');
}

// --- API: INITIATE PAYMENT (Cash In) ---
app.post('/api/pay', async (req, res) => {
    const { amount, phone, email } = req.body;

    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '256' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('256')) {
        formattedPhone = '256' + formattedPhone;
    }

    const msisdn = formattedPhone.substring(3);
    
    const transactionId = Math.floor(Math.random() * 900000000) + 100000000;
    const reference = "ZENITH-" + Math.floor(Math.random() * 100000);

    const requestData = {
        subscriber: {
            msisdn: msisdn
        },
        transaction: {
            amount: amount.toString(),
            id: transactionId.toString()
        },
        reference: reference
    };

    try {
        const signature = generateSignature(process.env.YO_PUBLIC_KEY, JSON.stringify(requestData));

        const response = await axios.post(
            `${process.env.YO_BASE_URL}/standard/v2/cashin/`,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.YO_CONSUMER_KEY}`,
                    'x-key': process.env.YO_PUBLIC_KEY,
                    'x-signature': signature,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Country': 'UG',
                    'X-Currency': 'UGX'
                }
            }
        );

        if (response.data && response.data.status && response.data.status.code === '200') {
            res.json({
                status: 'success',
                message: 'Payment request sent to your phone. Please approve.',
                transaction_id: response.data.transaction?.id,
                airtel_money_id: response.data.transaction?.airtel_money_id
            });
        } else {
            res.json(response.data);
        }
    } catch (error) {
        console.error("Yo! Payment Error:", error.response?.data || error.message);
        res.status(500).json({
            error: {
                error_type: "payment_error",
                message: error.response?.data?.message || error.response?.data?.status?.message || error.message
            }
        });
    }
});

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        paymentProvider: 'Yo! Payments (Airtel Uganda - Cash In API)',
        apiUrl: process.env.YO_BASE_URL
    });
});

// --- HANDLE CALLBACK ---
app.get('/callback', (req, res) => {
    const transactionStatus = req.query.status || req.query.transaction_status;
    
    if (transactionStatus === 'SUCCESS' || transactionStatus === 'success') {
        res.send("<h1>Payment Successful!</h1><p>Redirecting...</p><script>setTimeout(() => { window.location.href='/#/dashboard'; }, 3000)</script>");
    } else {
        res.send("<h1>Payment Processing...</h1><script>setTimeout(() => { window.location.href='/#/dashboard'; }, 3000)</script>");
    }
});

// --- WEBHOOK FOR PAYMENT NOTIFICATIONS ---
app.post('/api/webhook', async (req, res) => {
    const { status, reference, amount } = req.body;
    console.log('Yo! Payment Webhook:', { status, reference, amount });
    res.json({ received: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Zenith Assets running on port ${PORT}`));
