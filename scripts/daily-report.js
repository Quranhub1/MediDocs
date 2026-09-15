const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kaigwaakram123@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || 'srv-d6stefia214c73c8co3g';

if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is required');
if (!RENDER_API_KEY) throw new Error('RENDER_API_KEY is required');
if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is required');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = getFirestore();

const dateLabel = new Intl.DateTimeFormat('en-UG', {
  timeZone: 'Africa/Kampala', year: 'numeric', month: 'long', day: 'numeric'
}).format(new Date());

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

async function renderMetrics() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const url = new URL(`https://api.render.com/v1/services/${RENDER_SERVICE_ID}/metrics`);
  url.searchParams.set('metricTypes', 'http_request_count,http_latency,cpu_usage,memory_usage');
  url.searchParams.set('startTime', start.toISOString());
  url.searchParams.set('endTime', end.toISOString());
  url.searchParams.set('resolution', '3600');
  url.searchParams.set('httpLatencyQuantile', '0.95');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${RENDER_API_KEY}` } });
  if (!response.ok) throw new Error(`Render metrics request failed: ${response.status}`);
  return response.json();
}

function metricValues(metrics, type) {
  const metric = metrics?.metrics?.find(item => item.type === type);
  return (metric?.data || []).flatMap(series => series.values || []);
}

async function sendEmail(subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [ADMIN_EMAIL], subject, html })
  });
  if (!response.ok) throw new Error(`Resend request failed: ${response.status} ${await response.text()}`);
}

async function main() {
  const [usersSnapshot, paymentsSnapshot, metrics] = await Promise.all([
    db.collection('users').get(),
    db.collection('payments').get(),
    renderMetrics()
  ]);

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const newUsers = users.filter(user => {
    const created = toDate(user.createdAt);
    return created && created >= yesterday && created <= now;
  });
  const active = users.filter(user => user.subscriptionStatus === 'active' && user.subscriptionApproved).length;
  const banned = users.filter(user => user.banned).length;
  const expired = users.filter(user => {
    const expiry = toDate(user.subscriptionExpiry);
    return expiry && expiry <= now && user.subscriptionApproved;
  }).length;
  const recentPayments = payments.filter(payment => {
    const created = toDate(payment.createdAt);
    return created && created >= yesterday && created <= now;
  });
  const approvedPayments = recentPayments.filter(p => p.status === 'approved' || p.status === 'success').length;
  const declinedPayments = recentPayments.filter(p => p.status === 'declined').length;

  const requests = metricValues(metrics, 'http_request_count').reduce((sum, point) => sum + Number(point.value || 0), 0);
  const latencyValues = metricValues(metrics, 'http_latency').map(point => Number(point.value)).filter(Number.isFinite);
  const cpuValues = metricValues(metrics, 'cpu_usage').map(point => Number(point.value)).filter(Number.isFinite);
  const memoryValues = metricValues(metrics, 'memory_usage').map(point => Number(point.value)).filter(Number.isFinite);
  const p95 = latencyValues.length ? Math.max(...latencyValues) : null;
  const avgCpu = cpuValues.length ? cpuValues.reduce((a,b) => a+b, 0) / cpuValues.length : null;
  const maxMemory = memoryValues.length ? Math.max(...memoryValues) / 1024 / 1024 : null;

  const subject = `MediDocs Daily Performance Report - ${dateLabel}`;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937">
    <div style="background:linear-gradient(135deg,#059669,#0f766e);padding:28px;border-radius:14px 14px 0 0;color:white">
      <h1 style="margin:0">MediDocs Daily Report</h1><p style="margin:8px 0 0">${escapeHtml(dateLabel)} • Last 24 hours</p>
    </div>
    <div style="padding:24px;background:#f8fafc;border:1px solid #e5e7eb">
      <h2>Users</h2>
      <p>👤 New users: <strong>${newUsers.length}</strong></p>
      <p>👥 Total registered: <strong>${users.length}</strong></p>
      <p>💳 Active subscriptions: <strong>${active}</strong></p>
      <p>⏳ Expired subscriptions: <strong>${expired}</strong></p>
      <p>🚫 Banned accounts: <strong>${banned}</strong></p>
      <h2>Payments</h2>
      <p>💰 Payments received: <strong>${recentPayments.length}</strong></p>
      <p>✅ Approved: <strong>${approvedPayments}</strong></p>
      <p>❌ Declined: <strong>${declinedPayments}</strong></p>
      <h2>Application performance</h2>
      <p>🌐 HTTP requests: <strong>${Math.round(requests).toLocaleString()}</strong></p>
      <p>⚡ Peak recorded P95 latency: <strong>${p95 === null ? 'No data' : `${Math.round(p95)} ms`}</strong></p>
      <p>🖥️ Average CPU: <strong>${avgCpu === null ? 'No data' : `${(avgCpu * 100).toFixed(2)}%`}</strong></p>
      <p>💾 Peak memory: <strong>${maxMemory === null ? 'No data' : `${maxMemory.toFixed(1)} MB`}</strong></p>
      <div style="margin-top:22px;padding:14px;background:#ecfdf5;border-left:4px solid #10b981;border-radius:6px">
        <strong>System status:</strong> Daily report completed successfully.
      </div>
    </div>
    <div style="padding:16px;color:#6b7280;font-size:12px">Automated MediDocs operations report. No passwords or authentication secrets are included.</div>
  </div>`;

  await sendEmail(subject, html);
  console.log(`Daily report sent to ${ADMIN_EMAIL}: ${subject}`);
}

main().catch(error => { console.error(error); process.exit(1); });
