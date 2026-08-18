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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
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

    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const isAdmin = decodedToken.phone_number === '256749846848' ||
      (decodedToken.email && decodedToken.email.toLowerCase() === (ADMIN_EMAIL || '').toLowerCase());
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

// Proration calculation endpoint
app.post('/api/subscription/prorate', generalLimiter, async (req, res) => {
  try {
    const { userId, currentPlan, newPlan, currentExpiryDate } = req.body;
    
    if (!userId || !currentPlan || !newPlan) {
      return res.status(400).json({ success: false, error: 'User ID, current plan, and new plan are required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    // Import the proration function (we'd need to modify this to work with admin SDK)
    // For now, we'll implement a simplified version directly here
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const currentExpiry = currentExpiryDate || (userData.subscriptionExpiry ? 
      (userData.subscriptionExpiry.toDate ? userData.subscriptionExpiry.toDate() : new Date(userData.subscriptionExpiry)) : 
      new Date());
    
    const now = new Date();
    
    // If not subscribed or expired, no proration needed
    if (!userData.subscriptionApproved || 
        userData.subscriptionStatus !== 'active' || 
        currentExpiry <= now) {
      return res.json({ success: true, prorationAmount: 0, message: 'No active subscription to prorate' });
    }
    
    // Get plan details
    const planDurations = {
      weekly: 7,
      monthly: 30,
      yearly: 365
    };
    
    const planAmounts = {
      weekly: 5000,
      monthly: 15000,
      yearly: 60000
    };
    
    if (!planDurations[currentPlan] || !planDurations[newPlan] || 
        !planAmounts[currentPlan] || !planAmounts[newPlan]) {
      return res.status(400).json({ success: false, error: 'Invalid plan specified' });
    }
    
    // Calculate time remaining in current subscription
    const timeRemainingMs = currentExpiry.getTime() - now.getTime();
    const timeRemainingDays = Math.max(0, timeRemainingMs / (1000 * 60 * 60 * 24));
    
    // Calculate daily rate for current plan
    const currentDailyRate = planAmounts[currentPlan] / planDurations[currentPlan];
    
    // Calculate value of remaining time
    const remainingValue = timeRemainingDays * currentDailyRate;
    
    // Calculate what the remaining time would be worth in new plan
    const newDailyRate = planAmounts[newPlan] / planDurations[newPlan];
    const equivalentNewPlanDays = remainingValue / newDailyRate;
    
    // Calculate new expiry date based on equivalent time in new plan
    const newExpiryDate = new Date(now.getTime() + (equivalentNewPlanDays * 1000 * 60 * 60 * 24));
    
    // Calculate any additional amount owed or refund due
    const dailyRateDifference = newDailyRate - currentDailyRate;
    const prorationAmount = dailyRateDifference * timeRemainingDays;
    
    res.json({
      success: true,
      prorationAmount: Math.round(prorationAmount * 100) / 100, // Round to 2 decimal places
      newExpiryDate: newExpiryDate.toISOString(),
      timeRemainingDays: Math.round(timeRemainingDays * 100) / 100,
      currentDailyRate: Math.round(currentDailyRate * 100) / 100,
      newDailyRate: Math.round(newDailyRate * 100) / 100,
      message: prorationAmount > 0 
        ? `You owe UGX ${Math.round(prorationAmount)} for upgrading to a more expensive plan`
        : prorationAmount < 0
        ? `You'll receive a credit of UGX ${Math.round(Math.abs(prorationAmount))} for downgrading to a less expensive plan`
        : 'No proration amount - plans have equivalent daily rates'
    });
  } catch (error) {
    console.error('Error calculating proration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record document view for usage analytics
app.post('/api/analytics/document-view', generalLimiter, async (req, res) => {
  try {
    const { userId, documentId, courseId, semesterId, unitId } = req.body;
    
    if (!userId || !documentId) {
      return res.status(400).json({ success: false, error: 'User ID and document ID are required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    const viewsRef = adminDb.collection('document_views');
    await viewsRef.add({
      userId,
      documentId,
      courseId: courseId || null,
      semesterId: semesterId || null,
      unitId: unitId || null,
      viewedAt: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording document view:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's subscription usage analytics
app.get('/api/analytics/usage/:userId', generalLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const viewsRef = adminDb.collection('document_views');
    const q = viewsRef
      .where('userId', '==', userId)
      .where('viewedAt', '>=', startDate.toISOString());
    
    const snapshot = await viewsRef.get();
    const views = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      viewedAt: doc.data().viewedAt
    }));
    
    // Group by course/semester/unit
    const usageByCourse = {};
    views.forEach(view => {
      const key = `${view.courseId || 'unknown'}-${view.semesterId || 'unknown'}-${view.unitId || 'unknown'}`;
      if (!usageByCourse[key]) {
        usageByCourse[key] = {
          courseId: view.courseId,
          semesterId: view.semesterId,
          unitId: view.unitId,
          count: 0,
          lastViewed: view.viewedAt
        };
      }
      usageByCourse[key].count++;
      if (view.viewedAt > usageByCourse[key].lastViewed) {
        usageByCourse[key].lastViewed = view.viewedAt;
      }
    });
    
    res.json({
      success: true,
      totalViews: views.length,
      viewsPerDay: Math.round((views.length / parseInt(days)) * 100) / 100,
      usageByCourse: Object.values(usageByCourse),
      periodDays: parseInt(days)
    });
  } catch (error) {
    console.error('Error getting user subscription analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record referral
app.post('/api/referrals', generalLimiter, async (req, res) => {
  try {
    const { referrerId, refereeId, referralType = 'signup' } = req.body;
    
    if (!referrerId || !refereeId) {
      return res.status(400).json({ success: false, error: 'Referrer ID and referee ID are required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    const referralsRef = adminDb.collection('referrals');
    await referralsRef.add({
      referrerId,
      refereeId,
      referralType,
      timestamp: new Date().toISOString(),
      completed: false
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording referral:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete referral (when referee subscribes)
app.post('/api/referrals/complete', generalLimiter, async (req, res) => {
  try {
    const { referralId, rewardAmount = 5000 } = req.body;
    
    if (!referralId) {
      return res.status(400).json({ success: false, error: 'Referral ID is required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    const referralRef = adminDb.collection('referrals').doc(referralId);
    const referralDoc = await referralRef.get();
    
    if (!referralDoc.exists()) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }
    
    const referralData = referralDoc.data();
    
    // Update referral as completed
    await referralRef.update({
      completed: true,
      completedAt: new Date().toISOString(),
      rewardAmount: rewardAmount
    });
    
    // Award credit to referrer (record the event)
    await adminDb.collection('subscription_events').add({
      userId: referralData.referrerId,
      eventType: 'referral_reward',
      timestamp: new Date().toISOString(),
      referralId: referralId,
      refereeId: referralData.refereeId,
      rewardAmount: rewardAmount,
      rewardType: 'credit'
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error completing referral:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create gift subscription
app.post('/api/gift-subscriptions', generalLimiter, async (req, res) => {
  try {
    const { senderId, recipientEmail, plan, message } = req.body;
    
    if (!senderId || !recipientEmail || !plan) {
      return res.status(400).json({ success: false, error: 'Sender ID, recipient email, and plan are required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    // Find recipient by email
    const usersRef = adminDb.collection('users');
    const q = usersRef.where('email', '==', recipientEmail);
    const snapshot = await q.get();
    
    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'No user found with that email' });
    }
    
    const recipientDoc = snapshot.docs[0];
    const recipientId = recipientDoc.id;
    const recipientData = recipientDoc.data();
    
    // Create gift record
    const giftsRef = adminDb.collection('gift_subscriptions');
    const giftDocRef = await giftsRef.add({
      senderId,
      recipientId: recipientId,
      plan: plan,
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    // Notify recipient
    try {
      const planLabel = {
        weekly: 'Weekly',
        monthly: 'Monthly',
        yearly: 'Yearly'
      }[plan] || plan;
      
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [recipientEmail],
          subject: `You've received a MediDocs gift subscription!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You've received a MediDocs gift subscription!</h2>
              <p>Hi ${recipientData.name || 'there'},</p>
              <p>You have been gifted a ${planLabel} subscription to MediDocs!</p>
              ${message ? `<p><strong>Message from sender:</strong> ${message}</p>` : ''}
              <p>To accept this gift, please log into your account and visit the subscription page.</p>
              <a href="https://yourdomain.com/subscription" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Accept Gift Subscription
              </a>
            </div>
          `
        })
      });
    } catch (emailError) {
      console.error('Failed to send gift subscription notification email:', emailError);
      // Don't fail the whole request if email fails
    }
    
    res.json({ success: true, giftId: giftDocRef.id });
  } catch (error) {
    console.error('Error creating gift subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Accept gift subscription
app.post('/api/gift-subscriptions/accept', generalLimiter, async (req, res) => {
  try {
    const { giftId, userId } = req.body;
    
    if (!giftId || !userId) {
      return res.status(400).json({ success: false, error: 'Gift ID and user ID are required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    const giftRef = adminDb.collection('gift_subscriptions').doc(giftId);
    const giftDoc = await giftRef.get();
    
    if (!giftDoc.exists()) {
      return res.status(404).json({ success: false, error: 'Gift not found' });
    }
    
    const giftData = giftDoc.data();
    
    if (giftData.recipientId !== userId) {
      return res.status(403).json({ success: false, error: 'This gift is not for you' });
    }
    
    if (giftData.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'This gift has already been processed' });
    }
    
    // Calculate expiry date based on plan
    const planDurations = {
      weekly: 7,
      monthly: 30,
      yearly: 365
    };
    
    if (!planDurations[giftData.plan]) {
      return res.status(400).json({ success: false, error: 'Invalid plan in gift' });
    }
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + planDurations[giftData.plan]);
    
    // Update user's subscription
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      subscriptionApproved: true,
      subscriptionStatus: 'active',
      subscriptionPlan: giftData.plan,
      subscriptionExpiry: expiryDate.toISOString(),
      giftSubscriptionId: giftId
    });
    
    // Update gift status
    await giftRef.update({
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
    
    // Record event
    await adminDb.collection('subscription_events').add({
      userId: userId,
      eventType: 'gift_subscription_accepted',
      timestamp: new Date().toISOString(),
      giftId: giftId,
      senderId: giftData.senderId,
      plan: giftData.plan
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting gift subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record payment failure
app.post('/api/payments/failure', generalLimiter, async (req, res) => {
  try {
    const { userId, paymentData, failureReason } = req.body;
    
    if (!userId || !paymentData || !failureReason) {
      return res.status(400).json({ success: false, error: 'User ID, payment data, and failure reason are required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    const failuresRef = adminDb.collection('payment_failures');
    await failuresRef.add({
      userId,
      paymentData: {
        amount: paymentData.amount,
        plan: paymentData.plan,
        reference: paymentData.reference
        // Don't store sensitive payment info
      },
      failureReason: failureReason,
      attemptedAt: new Date().toISOString()
    });
    
    // Update failure count
    const failureCountRef = adminDb.collection('payment_failure_counts').doc(userId);
    const failureCountDoc = await failureCountRef.get();
    let failureCount = 1;
    
    if (failureCountDoc.exists()) {
      failureCount = failureCountDoc.data().count + 1;
    }
    
    await failureCountRef.set({
      count: failureCount,
      lastFailure: new Date().toISOString()
    }, { merge: true });
    
    // If 3 consecutive failures, suspend subscription
    if (failureCount >= 3) {
      const userRef = adminDb.collection('users').doc(userId);
      await userRef.update({
        subscriptionStatus: 'past_due',
        subscriptionApproved: false
      });
      
      // Notify user
      try {
        const userDoc = await userRef.get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [userData.email],
              subject: 'Important: Your MediDocs subscription payment is past due',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Subscription Payment Past Due</h2>
                  <p>Hi ${userData.name || 'user'},</p>
                  <p>We've noticed that your recent payment attempts have failed. To avoid interruption of service, please update your payment method.</p>
                  <p>Your subscription will be suspended if payment is not received within 7 days.</p>
                  <a href="https://yourdomain.com/subscription" 
                     style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Update Payment Method
                  </a>
                </div>
              `
            })
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment failure notification email:', emailError);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording payment failure:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check grace period status
app.get('/api/subscriptions/grace-period/:userId', generalLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Check if subscription is expired but within grace period (e.g., 3 days)
    if (userData.subscriptionExpiry) {
      const expiryDate = userData.subscriptionExpiry.toDate ? 
        userData.subscriptionExpiry.toDate() : 
        new Date(userData.subscriptionExpiry);
      
      const now = new Date();
      const gracePeriodDays = 3; // 3 day grace period
      const gracePeriodEnd = new Date(expiryDate.getTime() + (gracePeriodDays * 1000 * 60 * 60 * 24));
      
      const isExpired = expiryDate <= now;
      const isInGracePeriod = !isExpired && now <= gracePeriodEnd;
      
      res.json({
        success: true,
        isExpired: isExpired,
        isInGracePeriod: isInGracePeriod,
        gracePeriodEnds: gracePeriodEnd.toISOString(),
        daysUntilGracePeriodEnds: Math.max(0, Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        canAccess: isInGracePeriod || !isExpired // Can access if not expired or in grace period
      });
    } else {
      res.json({
        success: true,
        isExpired: true,
        isInGracePeriod: false,
        canAccess: false
      });
    }
  } catch (error) {
    console.error('Error checking grace period:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Extend subscription due to grace period or payment delay
app.post('/api/subscriptions/extend-grace-period', generalLimiter, async (req, res) => {
  try {
    const { userId, extensionDays = 3 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    if (!adminDb) {
      return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    }
    
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    let newExpiryDate;
    if (userData.subscriptionExpiry) {
      const currentExpiry = userData.subscriptionExpiry.toDate ? 
        userData.subscriptionExpiry.toDate() : 
        new Date(userData.subscriptionExpiry);
      
      newExpiryDate = new Date(currentExpiry.getTime() + (extensionDays * 1000 * 60 * 60 * 24));
    } else {
      // If no expiry date, set from now
      newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + extensionDays);
    }
    
    // Update subscription
    await userRef.update({
      subscriptionExpiry: newExpiryDate.toISOString(),
      subscriptionStatus: 'active', // Keep active during grace period
      gracePeriodExtended: true,
      gracePeriodExtendedAt: new Date().toISOString(),
      gracePeriodExtensionDays: extensionDays
    });
    
    res.json({ 
      success: true, 
      newExpiryDate: newExpiryDate.toISOString(),
      message: `Subscription extended by ${extensionDays} days due to grace period`
    });
  } catch (error) {
    console.error('Error extending subscription grace period:', error);
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
