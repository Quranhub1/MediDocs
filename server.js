const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

app.set('trust proxy', 1);

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const GROQ_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

let paystackConfig = {
  publicKey: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || '',
  secretKey: PAYSTACK_SECRET_KEY || ''
};

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_VERIFY_PATH = '/transaction/verify';

const aiMemoryCache = new Map();
const AI_CACHE_MAX_ENTRIES = 10000;

let adminDb = null;
let adminAuth = null;

try {
  const admin = require('firebase-admin');
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    adminDb = admin.firestore();
    adminAuth = admin.auth();
  } else {
    console.warn('Firebase Admin not initialized: FIREBASE_SERVICE_ACCOUNT missing');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

const isConfiguredAdmin = (email) => Boolean(ADMIN_EMAIL && email && email.trim().toLowerCase() === ADMIN_EMAIL);

const getAdminProfile = (uid, email, existing = {}) => ({
  uid,
  email: email || existing.email || ADMIN_EMAIL,
  name: existing.name || 'MediDocs Administrator',
  phone: existing.phone || '',
  createdAt: existing.createdAt || null,
  role: 'admin',
  subscription: 'lifetime',
  subscriptionPlan: 'lifetime',
  subscriptionApproved: true,
  subscriptionStatus: 'active',
  subscriptionExpiry: null,
  banned: false,
  accountType: 'administrator',
  accessLevel: 'permanent',
  updatedAt: new Date().toISOString()
});

// Server-authoritative admin bootstrap. The client never receives ADMIN_EMAIL itself.
// Every authenticated request from the configured admin re-applies lifetime access in Firestore,
// so a hard refresh or an accidentally edited profile cannot downgrade the administrator.
app.get('/api/admin/status', async (req, res) => {
  try {
    if (!adminAuth || !adminDb) {
      return res.status(503).json({ success: false, isAdmin: false, error: 'Admin authentication is not configured' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ success: false, isAdmin: false, error: 'Missing authorization token' });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ success: false, isAdmin: false, error: 'Invalid authentication token' });
    }

    const email = (decodedToken.email || '').trim().toLowerCase();
    if (!isConfiguredAdmin(email)) {
      return res.json({ success: true, isAdmin: false });
    }

    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userRef.get();
    const existing = userSnap.exists ? userSnap.data() : {};
    const profile = getAdminProfile(decodedToken.uid, email, existing);

    await userRef.set({
      ...profile,
      createdAt: existing.createdAt || new Date().toISOString()
    }, { merge: true });

    res.json({
      success: true,
      isAdmin: true,
      profile: {
        ...profile,
        createdAt: existing.createdAt || profile.createdAt || null
      }
    });
  } catch (error) {
    console.error('Admin status error:', error);
    res.status(500).json({ success: false, isAdmin: false, error: 'Unable to restore administrator access' });
  }
});

async function loadPaystackConfig() {
  try {
    if (!adminDb) return;
    const docRef = adminDb.collection('config').doc('paystack');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data.publicKey) paystackConfig.publicKey = data.publicKey;
      if (data.secretKey) paystackConfig.secretKey = data.secretKey;
      console.log('Paystack config loaded from Firestore');
    }
  } catch (error) {
    console.error('Error loading Paystack config from Firestore:', error);
  }
}

loadPaystackConfig();

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

const escapeHtml = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Aggregated, non-sensitive statistics used by the existing Google Apps Script.
// No names, email addresses, passwords, or authentication data are returned.
app.get('/api/daily-report-data', async (req, res) => {
  try {
    if (!adminDb) {
      return res.status(503).json({ success: false, error: 'Reporting database is not available' });
    }

    const now = new Date();
    const previous24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const date = new Intl.DateTimeFormat('en-UG', {
      timeZone: 'Africa/Kampala',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(now);

    const [usersSnapshot, paymentsSnapshot] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('payments').get()
    ]);

    const users = usersSnapshot.docs.map(doc => doc.data());
    const payments = paymentsSnapshot.docs.map(doc => doc.data());

    const newUsers = users.filter(user => {
      const createdAt = toDate(user.createdAt);
      return createdAt && createdAt >= previous24Hours && createdAt <= now;
    }).length;

    const activeSubscriptions = users.filter(user =>
      (user.role === 'admin' && user.accessLevel === 'permanent') ||
      (user.subscriptionStatus === 'active' && user.subscriptionApproved === true)
    ).length;

    const expiredSubscriptions = users.filter(user => {
      if (user.role === 'admin' && user.accessLevel === 'permanent') return false;
      const expiry = toDate(user.subscriptionExpiry);
      return Boolean(expiry && expiry <= now && user.subscriptionApproved === true);
    }).length;

    const bannedAccounts = users.filter(user => user.banned === true).length;

    const recentPayments = payments.filter(payment => {
      const createdAt = toDate(payment.createdAt);
      return createdAt && createdAt >= previous24Hours && createdAt <= now;
    });

    const approvedPayments = recentPayments.filter(payment =>
      payment.status === 'approved' || payment.status === 'success'
    ).length;

    const declinedPayments = recentPayments.filter(payment =>
      payment.status === 'declined'
    ).length;

    const memory = process.memoryUsage();

    res.json({
      success: true,
      date,
      period: 'Last 24 hours',
      newUsers,
      totalUsers: users.length,
      activeSubscriptions,
      expiredSubscriptions,
      bannedAccounts,
      paymentsReceived: recentPayments.length,
      approvedPayments,
      declinedPayments,
      application: {
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        memoryRssMb: Number((memory.rss / 1024 / 1024).toFixed(1)),
        heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(1))
      },
      httpRequests: 'Not tracked',
      p95Latency: 'Not tracked',
      cpuUsage: 'Not tracked',
      memoryUsage: `${(memory.rss / 1024 / 1024).toFixed(1)} MB RSS`
    });
  } catch (error) {
    console.error('Daily report data error:', error);
    res.status(500).json({ success: false, error: 'Unable to generate daily report data' });
  }
});

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
        'Authorization': `Bearer ${paystackConfig.secretKey}`
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

app.get('/api/config/paystack', (req, res) => {
  res.json({
    publicKey: paystackConfig.publicKey || process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || ''
  });
});

app.post('/api/config/paystack', generalLimiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing authorization token' });
    }

    if (!adminDb || !adminAuth) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const isAdmin = isConfiguredAdmin(decodedToken.email);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { publicKey, secretKey } = req.body;
    if (!publicKey && !secretKey) {
      return res.status(400).json({ success: false, error: 'At least one key is required' });
    }

    const updateData = { updatedAt: new Date().toISOString() };
    if (publicKey) updateData.publicKey = publicKey;
    if (secretKey) updateData.secretKey = secretKey;

    await adminDb.collection('config').doc('paystack').set(updateData, { merge: true });

    if (publicKey) paystackConfig.publicKey = publicKey;
    if (secretKey) paystackConfig.secretKey = secretKey;

    res.json({ success: true, message: 'Paystack config updated' });
  } catch (error) {
    console.error('Error updating Paystack config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
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

    const allowedRecipients = ['kaigwaakram123@gmail.com', ADMIN_EMAIL].filter(Boolean);
    if (!allowedRecipients.includes(to)) {
      return res.status(400).json({ success: false, error: 'Recipient not allowed' });
    }

    if (!RESEND_API_KEY) {
      console.warn('Email skipped: RESEND_API_KEY is not configured.');
      return res.status(500).json({ success: false, error: 'Email service is not configured on the server.' });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(to right, #059669, #10b981); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MediDocs Notification</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <h2 style="color: #059669; margin-top: 0;">${escapeHtml(subject)}</h2>
          <p style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</p>
          ${eventType ? `<div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 10px; margin: 15px 0; border-radius: 4px;"><strong>Event:</strong> ${escapeHtml(eventType)}</div>` : ''}
          ${userEmail ? `<p style="color: #6b7280; font-size: 14px;"><strong>User Email:</strong> ${escapeHtml(userEmail)}</p>` : ''}
          ${userName ? `<p style="color: #6b7280; font-size: 14px;"><strong>User Name:</strong> ${escapeHtml(userName)}</p>` : ''}
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Sent automatically by MediDocs System</p>
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        html: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Resend API error:', response.status, errorData);
      return res.status(500).json({ success: false, error: errorData.message || 'Failed to send email via Resend' });
    }

    const data = await response.json();
    res.json({ success: true, message: 'Email sent successfully', data });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions/expiring', generalLimiter, async (req, res) => {
  try {
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }

    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.get();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const expiringUsers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => {
        if (user.role === 'admin' && user.accessLevel === 'permanent') return false;
        if (!user.subscriptionExpiry || !user.subscriptionApproved) return false;
        const expiry = user.subscriptionExpiry.toDate ? user.subscriptionExpiry.toDate() : new Date(user.subscriptionExpiry);
        return expiry <= fiveDaysFromNow && expiry > new Date();
      });

    res.json({ success: true, data: expiringUsers });
  } catch (error) {
    console.error('Error fetching expiring subscriptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.sendFile(path.join(__dirname, 'build', 'sitemap.xml'));
});

app.get('*', generalLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
