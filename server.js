const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const GROQ_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || process.env.GROQ_API_KEY;

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_VERIFY_PATH = '/transaction/verify';

const aiMemoryCache = new Map();
const AI_CACHE_MAX_ENTRIES = 10000;

const sanitizePaystackReference = (reference) => {
  if (typeof reference !== 'string') return null;
  const trimmed = reference.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_./]*$/.test(trimmed)) return null;
  if (trimmed.includes('..')) return null;
  return trimmed;
};

app.post('/api/paystack/verify', async (req, res) => {
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

app.post('/api/paystack/webhook', (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const payload = req.body;
  console.log('Paystack webhook received:', payload);
  if (payload.event === 'charge.success') {
    console.log('Payment successful:', payload.data);
  }
  res.status(200).send('OK');
});

app.post('/api/ai/chat', async (req, res) => {
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
        model: 'llama-3.1-70b-versatile',
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
