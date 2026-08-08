const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const GROQ_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_VERIFY_PATH = '/transaction/verify';

const aiMemoryCache = new Map();
const AI_CACHE_MAX_ENTRIES = 10000;

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

const paystackLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many payment verification requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many AI requests, please try again later.' }
});

app.use(generalLimiter);

const sanitizePaystackReference = (reference) => {
  if (typeof reference !== 'string') return null;
  const trimmed = reference.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_./]*$/.test(trimmed)) return null;
  if (trimmed.includes('..')) return null;
  return trimmed;
};

app.post('/api/paystack/verify', paystackLimiter, async (req, res) => {
  try {
    const { reference } = req.body;
    const safeReference = sanitizePaystackReference(reference);
    if (!safeReference) {
      return res.status(400).json({ success: false, error: 'Invalid reference format' });
    }

    const verifyUrl = `${PAYSTACK_BASE_URL}${PAYSTACK_VERIFY_PATH}/${encodeURIComponent(safeReference)}`;
    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    const data = await response.json();
    
    if (data.status && data.data && data.data.status === 'success') {
      res.json({ success: true, data: data.data });
    } else {
      res.json({ success: false, error: data.message || 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Paystack verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/paystack/webhook', paystackLimiter, (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const payload = req.body;
  console.log('Paystack webhook received:', payload);
  if (payload.event === 'charge.success') {
    console.log('Payment successful:', payload.data);
  }
  res.status(200).send('OK');
});

app.post('/api/ai/chat', aiLimiter, async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Messages array is required' });
    }

    const cacheKey = messages.map(m => `${m.role}:${m.content}`).join('|');
    if (aiMemoryCache.has(cacheKey)) {
      const cached = aiMemoryCache.get(cacheKey);
      return res.json({ success: true, response: cached, cached: true });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, error: 'AI service is not configured on the server.' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      const reply = data.choices[0].message.content;
      if (aiMemoryCache.size > AI_CACHE_MAX_ENTRIES) {
        const oldestKey = aiMemoryCache.keys().next().value;
        aiMemoryCache.delete(oldestKey);
      }
      aiMemoryCache.set(cacheKey, reply);
      res.json({ success: true, response: reply });
    } else {
      const errorMsg = data.error?.message || 'AI request failed';
      res.status(500).json({ success: false, error: errorMsg });
    }
  } catch (error) {
    console.error('AI proxy error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notify/email', generalLimiter, async (req, res) => {
  try {
    const { to, subject, message, eventType, userEmail, userName } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields: to, subject, message' });
    }

    if (!EMAIL_USER || !EMAIL_PASS) {
      return res.status(500).json({ success: false, error: 'Email service is not configured on the server.' });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #059669, #10b981); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MediDocs Notification</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <h2 style="color: #059669; margin-top: 0;">${subject}</h2>
          <p style="font-size: 16px; line-height: 1.6;">${message}</p>
          ${eventType ? `<div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 10px; margin: 15px 0; border-radius: 4px;"><strong>Event:</strong> ${eventType}</div>` : ''}
          ${userEmail ? `<p style="color: #6b7280; font-size: 14px;"><strong>User Email:</strong> ${userEmail}</p>` : ''}
          ${userName ? `<p style="color: #6b7280; font-size: 14px;"><strong>User Name:</strong> ${userName}</p>` : ''}
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Sent automatically by MediDocs System</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: EMAIL_USER,
      to: to,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('*', generalLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
