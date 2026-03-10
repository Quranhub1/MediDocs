import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Firebase Admin Initialization ───────────────────────────────────────────
let db;
try {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  };

  initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore();
  console.log('✅ Firebase Admin initialized');
} catch (err) {
  console.error('❌ Firebase Admin initialization failed:', err.message);
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman) or from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Studypedia Server is running!', status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── Groq AI Proxy ────────────────────────────────────────────────────────────
// POST /api/ai/chat
// Body: { messages: [...], model?: string, max_tokens?: number }
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, model = 'llama-3.1-8b-instant', max_tokens = 800 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens,
        top_p: 0.9,
        stream: false
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', errText);
      return res.status(groqRes.status).json({ error: 'AI service error', details: errText });
    }

    const data = await groqRes.json();
    res.json(data);
  } catch (error) {
    console.error('Error in /api/ai/chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Payment Routes ───────────────────────────────────────────────────────────

// GET /api/payments/status/:userId
app.get('/api/payments/status/:userId', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not available' });
    const { userId } = req.params;
    const paymentDoc = await db.collection('user_payments').doc(userId).get();

    if (!paymentDoc.exists) {
      return res.json({ hasPaid: false, status: 'none' });
    }

    const data = paymentDoc.data();
    res.json({
      hasPaid: data.status === 'approved',
      status: data.status,
      paymentDate: data.paymentDate?.toDate?.() || null,
      approvedDate: data.approvedAt?.toDate?.() || null,
      isNewUser: data.isNewUser || false
    });
  } catch (error) {
    console.error('Error in /api/payments/status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/submit
// Body: { userId, userEmail, paymentReference, paymentMethod }
app.post('/api/payments/submit', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not available' });
    const { userId, userEmail, paymentReference, paymentMethod } = req.body;

    if (!userId || !userEmail || !paymentReference || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const paymentData = {
      userId,
      userEmail,
      paymentReference,
      paymentMethod,
      amount: 5000,
      status: 'pending',
      paymentDate: new Date(),
      submittedAt: new Date(),
      isNewUser: true
    };

    await db.collection('user_payments').doc(userId).set(paymentData, { merge: true });

    await db.collection('payment_notifications').add({
      ...paymentData,
      type: 'new_payment',
      createdAt: new Date()
    });

    res.json({ success: true, message: 'Payment submitted successfully' });
  } catch (error) {
    console.error('Error in /api/payments/submit:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/approve
// Body: { userId, adminEmail }
app.post('/api/payments/approve', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not available' });
    const { userId, adminEmail } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId is required' });

    await db.collection('user_payments').doc(userId).set({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: adminEmail || 'admin'
    }, { merge: true });

    await db.collection('payment_notifications').add({
      userId,
      type: 'payment_approved',
      message: 'Your payment has been approved. You now have access to all courses.',
      createdAt: new Date()
    });

    res.json({ success: true, message: 'Payment approved' });
  } catch (error) {
    console.error('Error in /api/payments/approve:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/reject
// Body: { userId, adminEmail }
app.post('/api/payments/reject', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not available' });
    const { userId, adminEmail } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId is required' });

    await db.collection('user_payments').doc(userId).set({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: adminEmail || 'admin'
    }, { merge: true });

    await db.collection('payment_notifications').add({
      userId,
      type: 'payment_rejected',
      message: 'Your payment has been rejected. Please contact admin for assistance.',
      createdAt: new Date()
    });

    res.json({ success: true, message: 'Payment rejected' });
  } catch (error) {
    console.error('Error in /api/payments/reject:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payments/all  (admin only - protect with admin check in production)
app.get('/api/payments/all', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not available' });
    const snapshot = await db.collection('user_payments').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error in /api/payments/all:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Studypedia Server running on http://localhost:${PORT}`);
});
