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
const GOOGLE_APPS_SCRIPT_URL = (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
const GOOGLE_APPS_SCRIPT_SECRET = process.env.GOOGLE_APPS_SCRIPT_SECRET || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

let paystackConfig = {
  publicKey: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || '',
  secretKey: PAYSTACK_SECRET_KEY || ''
};

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_VERIFY_PATH = '/transaction/verify';

const aiMemoryCache = new Map();
const AI_CACHE_MAX_ENTRIES = 10000;

// Short-lived admin profile cache prevents repeated Firestore reads/writes
// when the frontend checks administrator access during startup/navigation.
const adminProfileCache = new Map();
const ADMIN_PROFILE_CACHE_MS = 5 * 60 * 1000;

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
    console.log('Firebase Admin initialized successfully');
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

app.get('/api/admin/status', async (req, res) => {
  try {
    if (!adminAuth || !adminDb) {
      return res.status(503).json({ success: false, isAdmin: false, error: 'Admin authentication is not configured' });
    }
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return res.status(401).json({ success: false, isAdmin: false, error: 'Missing authorization token' });
    let decodedToken;
    try { decodedToken = await adminAuth.verifyIdToken(token); }
    catch (error) { return res.status(401).json({ success: false, isAdmin: false, error: 'Invalid authentication token' }); }
    const email = (decodedToken.email || '').trim().toLowerCase();
    if (!isConfiguredAdmin(email)) return res.json({ success: true, isAdmin: false });
    const cached = adminProfileCache.get(decodedToken.uid);
    if (cached && Date.now() - cached.cachedAt < ADMIN_PROFILE_CACHE_MS) {
      return res.json({ success: true, isAdmin: true, profile: cached.profile });
    }

    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    let existing = {};
    try {
      const userSnap = await userRef.get();
      existing = userSnap.exists ? userSnap.data() : {};
    } catch (error) {
      console.error('[AdminStatus] Firestore profile read failed:', {
        code: error?.code,
        message: error?.message
      });
      // The configured admin email has already been verified by Firebase Auth.
      // Do not turn a temporary Firestore quota failure into an admin lockout.
      const profile = getAdminProfile(decodedToken.uid, email, {});
      adminProfileCache.set(decodedToken.uid, { profile, cachedAt: Date.now() });
      return res.json({ success: true, isAdmin: true, profile });
    }

    const profile = getAdminProfile(decodedToken.uid, email, existing);
    const responseProfile = {
      ...profile,
      createdAt: existing.createdAt || profile.createdAt || null
    };

    // Cache the result. Do not write the profile on every status check.
    adminProfileCache.set(decodedToken.uid, {
      profile: responseProfile,
      cachedAt: Date.now()
    });

    res.json({ success: true, isAdmin: true, profile: responseProfile });
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

const icedrivePreviewCache = new Map();
const ICEDRIVE_PREVIEW_CACHE_MS = 5 * 60 * 1000;

const isAllowedIcedriveShareUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    return parsed.protocol === 'https:' &&
      hostname === 'icedrive.net' &&
      /^\/s\/[A-Za-z0-9_-]+$/.test(parsed.pathname);
  } catch {
    return false;
  }
};

const normalizeRemoteUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return '';
  return value.trim().replace(/\\\//g, '/').replace(/&amp;/g, '&');
};

const findPreviewResource = (node, found = { direct: '', thumbnail: '' }) => {
  if (!node || (found.direct && found.thumbnail)) return found;

  if (Array.isArray(node)) {
    for (const item of node) findPreviewResource(item, found);
    return found;
  }

  if (typeof node !== 'object') return found;

  const downloadUrl = normalizeRemoteUrl(node.download_url || node.downloadUrl);
  const thumbnail = normalizeRemoteUrl(node.thumbnail || node.thumbnail_url || node.thumbnailUrl);
  const url = normalizeRemoteUrl(node.url);

  if (!found.direct && downloadUrl) found.direct = downloadUrl;
  if (!found.thumbnail && thumbnail) found.thumbnail = thumbnail;
  if (!found.direct && url && /^https:\/\//i.test(url)) found.direct = url;

  for (const value of Object.values(node)) {
    if (typeof value === 'object' && value !== null) findPreviewResource(value, found);
    if (found.direct && found.thumbnail) break;
  }
  return found;
};

const extractIcedriveShareMetadata = (html) => {
  let shareData = null;

  // Current public-share pages initialise the page with encoded JSON.
  const initMatch = html.match(/initPublicSharePage\(\s*['"]([^'"]+)['"]/);
  if (initMatch?.[1]) {
    try {
      const decoded = Buffer.from(initMatch[1], 'base64').toString('utf8');
      shareData = JSON.parse(decoded);
    } catch (error) {
      console.warn('[ICEDRIVE] Unable to decode share metadata:', error?.message || error);
    }
  }

  const fileIdMatch = html.match(/previewItem\(\s*['"]([^'"]+)['"]/i);
  const fileId = String(
    shareData?.id ||
    shareData?.share_record?.item_id ||
    fileIdMatch?.[1] ||
    ''
  ).trim();

  // The public-share page passes its metadata as base64-encoded JSON.
  // The actual thumbnail therefore lives in shareData.thumbnail, not in the
  // raw HTML source.
  const thumbnailMatch = html.match(/["']thumbnail["']\s*:\s*["']([^"']+)["']/i);
  const thumbnail = normalizeRemoteUrl(
    shareData?.thumbnail ||
    shareData?.thumbnail_url ||
    thumbnailMatch?.[1] ||
    ''
  );

  return {
    shareData,
    fileId,
    thumbnail
  };
};

const makeLargeThumbnailUrl = (thumbnailUrl) => {
  if (!thumbnailUrl) return '';
  return thumbnailUrl.replace(/&w=[^&]+&h=[^&]+&m=[^&]+.*$/i, '&w=1024&h=1024');
};

const fetchIcedrivePreview = async (shareUrl) => {
  const cached = icedrivePreviewCache.get(shareUrl);
  if (cached && Date.now() - cached.cachedAt < ICEDRIVE_PREVIEW_CACHE_MS) return cached.value;

  const shareResponse = await fetch(shareUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MediDocs/1.0; document-preview)',
      'Accept': 'text/html,application/xhtml+xml'
    },
    redirect: 'follow'
  });

  if (!shareResponse.ok) {
    throw new Error(`Icedrive share page returned HTTP ${shareResponse.status}`);
  }

  const canonicalShareUrl = isAllowedIcedriveShareUrl(shareResponse.url)
    ? shareResponse.url
    : shareUrl;

  // Icedrive's public-share API is session-aware. The public share page can
  // establish an anonymous Icedrive session/cookie even though no login is
  // required. Preserve that cookie for the follow-up API request; otherwise
  // Icedrive responds with HTTP 403.
  const shareCookie = getSetCookieHeader(shareResponse);
  const html = await shareResponse.text();
  const metadata = extractIcedriveShareMetadata(html);

  if (!metadata.fileId || !/^\d+$/.test(metadata.fileId)) {
    throw new Error(`Icedrive share did not expose a file ID (HTTP ${shareResponse.status}, final URL: ${canonicalShareUrl})`);
  }

  let directUrl = '';
  let thumbnailUrl = metadata.thumbnail;

  // For public image shares, the signed thumbnail embedded in the share
  // metadata is already a usable preview resource. Use it first so a change
  // to Icedrive's internal API cannot break image previews.
  const isImageExtension = /^(?:jpe?g|png|gif|webp|svg)$/i.test(
    String(metadata.shareData?.extension || '')
  );

  // Icedrive's preview endpoint may return a direct URL or a thumbnail.
  // Keep it as a secondary source for PDFs, Office files, and other types.
  const apiUrl = `https://icedrive.net/API/Internal/V1/?request=file-preview&id=${encodeURIComponent(metadata.fileId)}&sess=1`;
  try {
    const previewHeaders = {
      'User-Agent': 'Mozilla/5.0 (compatible; MediDocs/1.0; document-preview)',
      'Accept': 'application/json,text/plain,*/*',
      'Referer': canonicalShareUrl,
      'Origin': 'https://icedrive.net'
    };
    if (shareCookie) previewHeaders.Cookie = shareCookie;

    const previewResponse = await fetch(apiUrl, {
      headers: previewHeaders,
      redirect: 'follow'
    });

    const responseText = await previewResponse.text();
    if (previewResponse.ok && responseText) {
      try {
        const previewData = JSON.parse(responseText);
        const found = findPreviewResource(previewData);
        directUrl = found.direct;
        thumbnailUrl = found.thumbnail || thumbnailUrl;
      } catch {
        const directMatch = responseText.match(/["']download_url["']\s*:\s*["']([^"']+)["']/i);
        const thumbnailResponseMatch = responseText.match(/["']thumbnail["']\s*:\s*["']([^"']+)["']/i);
        directUrl = normalizeRemoteUrl(directMatch?.[1] || '');
        thumbnailUrl = normalizeRemoteUrl(thumbnailResponseMatch?.[1] || thumbnailUrl);
      }
    } else {
      console.warn('[ICEDRIVE] Preview API returned no usable response:', previewResponse.status);
    }
  } catch (error) {
    console.warn('[ICEDRIVE] Preview API request failed; using share thumbnail fallback:', error?.message || error);
  }

  // A thumbnail is never a valid substitute for the original document.
  // Read Online and Download must use the full file URL returned by Icedrive.
  const previewUrl = directUrl;
  if (!previewUrl) {
    throw new Error('Icedrive did not expose a full-file download URL for this share');
  }

  const result = {
    success: true,
    fileId: metadata.fileId,
    fileName: metadata.shareData?.filename || metadata.shareData?.title || '',
    extension: metadata.shareData?.extension || '',
    canonicalShareUrl,
    previewUrl,
    direct: true,
    source: 'icedrive-full-file'
  };

  icedrivePreviewCache.set(shareUrl, { value: result, cachedAt: Date.now() });
  return result;
};

app.get('/api/icedrive/preview', async (req, res) => {
  const shareUrl = String(req.query.url || '').trim();

  if (!isAllowedIcedriveShareUrl(shareUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Only valid Icedrive public file-share URLs are supported.'
    });
  }

  try {
    const result = await fetchIcedrivePreview(shareUrl);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.json(result);
  } catch (error) {
    console.error('[ICEDRIVE] Preview resolution failed:', {
      url: shareUrl,
      message: error?.message || String(error)
    });
    return res.status(502).json({
      success: false,
      error: error?.message || 'Unable to resolve the Icedrive preview resource.'
    });
  }
});

// Receives sanitized browser-side Cloudinary failures so they are visible in Render logs.
// Never send secrets, tokens, the upload preset, or full Cloudinary URLs here.
// ============================================================
// FULL DOCUMENT CLOUD PROXY
// ============================================================

let MegaFile = null;
try {
  ({ File: MegaFile } = require('megajs'));
  console.info('[CLOUD] MEGAJS loaded');
} catch (error) {
  console.warn('[CLOUD] MEGAJS is unavailable. MEGA links will return a clear error:', error?.message || error);
}

const getCloudProvider = (value) => {
  try {
    const host = new URL(String(value || '').trim()).hostname
      .replace(/^www\./, '')
      .toLowerCase();

    if (host === 'icedrive.net' || host === 'icedrive.io') return 'icedrive';
    if (host === 'mega.nz' || host === 'mega.io' || host === 'mega.co.nz') return 'mega';
    if (
      host === 'drive.google.com' ||
      host === 'docs.google.com' ||
      host === 'drive.usercontent.google.com' ||
      host === 'docs.googleusercontent.com'
    ) return 'google-drive';
    if (host === 'dropbox.com' || host === 'dl.dropboxusercontent.com') return 'dropbox';
    if (host === '1drv.ms' || host === 'onedrive.live.com' || host.endsWith('.sharepoint.com')) return 'onedrive';
    if (host === 'app.box.com' || host === 'pcloud.com') return 'direct-cloud';
    return '';
  } catch {
    return '';
  }
};

const getSafeFilename = (value, fallback = 'document') => {
  const filename = String(value || '').trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 180);

  return filename || fallback;
};

const mimeTypeFromFilename = (filename) => {
  const ext = String(filename || '').toLowerCase().split('.').pop();
  const types = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    html: 'text/html',
    htm: 'text/html',
    json: 'application/json',
    xml: 'application/xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    zip: 'application/zip'
  };

  return types[ext] || 'application/octet-stream';
};

const getSetCookieHeader = (response) => {
  try {
    if (typeof response.headers.getSetCookie === 'function') {
      return response.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ');
    }
  } catch {
    // Fall through to the single-header implementation below.
  }

  const value = response.headers.get('set-cookie');
  if (!value) return '';

  return value
    .split(/,(?=[^;,]+=)/)
    .map((item) => item.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
};

const getFilenameFromDisposition = (value) => {
  if (!value) return '';

  const utf8 = String(value).match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }

  const quoted = String(value).match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];

  const plain = String(value).match(/filename=([^;]+)/i);
  return plain?.[1]?.trim() || '';
};

const parseGoogleDriveSource = (sourceUrl) => {
  const parsed = new URL(sourceUrl);
  const pathname = parsed.pathname;
  let fileId = '';
  let workspaceType = '';

  const patterns = [
    [/\/file\/d\/([^/]+)/, 'blob'],
    [/\/document\/d\/([^/]+)/, 'document'],
    [/\/spreadsheets\/d\/([^/]+)/, 'spreadsheet'],
    [/\/presentation\/d\/([^/]+)/, 'presentation']
  ];

  for (const [pattern, type] of patterns) {
    const match = pathname.match(pattern);
    if (match?.[1]) {
      fileId = decodeURIComponent(match[1]);
      workspaceType = type;
      break;
    }
  }

  if (!fileId && parsed.searchParams.get('id')) {
    fileId = parsed.searchParams.get('id');
    workspaceType = 'blob';
  }

  if (!fileId) {
    throw new Error('Google Drive link does not contain a supported file ID');
  }

  const resourceKey =
    parsed.searchParams.get('resourcekey') ||
    parsed.searchParams.get('resourceKey') ||
    '';

  return { fileId, workspaceType, resourceKey };
};

const buildGoogleDriveDownloadUrl = (sourceUrl) => {
  const parsed = parseGoogleDriveSource(sourceUrl);
  const key = parsed.resourceKey
    ? '&resourcekey=' + encodeURIComponent(parsed.resourceKey)
    : '';

  if (parsed.workspaceType === 'document') {
    return 'https://docs.google.com/document/d/' + encodeURIComponent(parsed.fileId) + '/export?format=pdf';
  }

  if (parsed.workspaceType === 'spreadsheet') {
    return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(parsed.fileId) + '/export?format=xlsx';
  }

  if (parsed.workspaceType === 'presentation') {
    return 'https://docs.google.com/presentation/d/' + encodeURIComponent(parsed.fileId) + '/export/pptx';
  }

  return 'https://drive.usercontent.google.com/download?id=' +
    encodeURIComponent(parsed.fileId) +
    '&export=download&confirm=t' +
    key;
};

const extractGoogleDriveConfirmation = (html) => {
  const patterns = [
    /[?&]confirm=([0-9A-Za-z_-]+)/i,
    /name=["']confirm["'][^>]*value=["']([^"']+)["']/i,
    /confirm=([0-9A-Za-z_-]+)[^"'\s<]*/i
  ];

  for (const pattern of patterns) {
    const match = String(html || '').match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
};

const appendGoogleConfirmation = (url, token) => {
  const parsed = new URL(url);
  parsed.searchParams.set('confirm', token);
  return parsed.toString();
};

const fetchGoogleDriveDocument = async (sourceUrl, rangeHeader = '') => {
  const parsed = parseGoogleDriveSource(sourceUrl);
  const targetUrl = buildGoogleDriveDownloadUrl(sourceUrl);

  const requestHeaders = {
    'User-Agent': 'MediDocs/1.0 full-document-proxy',
    'Accept': '*/*'
  };

  if (rangeHeader) requestHeaders.Range = rangeHeader;

  let response = await fetch(targetUrl, {
    headers: requestHeaders,
    redirect: 'follow'
  });

  const responseContentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (responseContentType.includes('text/html')) {
    const html = await response.text();
    const confirmToken = extractGoogleDriveConfirmation(html);

    if (confirmToken) {
      const cookie = getSetCookieHeader(response);
      const confirmedUrl = appendGoogleConfirmation(targetUrl, confirmToken);
      const confirmedHeaders = { ...requestHeaders };
      if (cookie) confirmedHeaders.Cookie = cookie;

      response = await fetch(confirmedUrl, {
        headers: confirmedHeaders,
        redirect: 'follow'
      });
    } else if (parsed.workspaceType === 'document' || parsed.workspaceType === 'spreadsheet' || parsed.workspaceType === 'presentation') {
      throw new Error('Google Workspace export was returned as HTML instead of document bytes');
    } else {
      throw new Error('Google Drive returned an access page instead of the file. Check that the file is shared publicly and downloadable.');
    }
  }

  if (!response.ok) {
    throw new Error('Google Drive returned HTTP ' + response.status);
  }

  return response;
};

const buildDropboxSourceUrl = (sourceUrl) => {
  const parsed = new URL(sourceUrl);
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'dropbox.com') {
    parsed.searchParams.set('dl', '1');
  }

  return parsed.toString();
};

const buildOneDriveSourceUrl = (sourceUrl) => {
  const parsed = new URL(sourceUrl);
  parsed.searchParams.set('download', '1');
  return parsed.toString();
};

const streamWebResponseToExpress = async (response, res, options = {}) => {
  const { filename, download = false, fallbackMime = '' } = options;
  const { Readable } = require('stream');

  res.status(response.status === 206 ? 206 : 200);

  const contentType = response.headers.get('content-type') || fallbackMime || 'application/octet-stream';
  const contentLength = response.headers.get('content-length');
  const contentRange = response.headers.get('content-range');
  const acceptRanges = response.headers.get('accept-ranges');

  res.setHeader('Content-Type', contentType);
  if (contentLength) res.setHeader('Content-Length', contentLength);
  if (contentRange) res.setHeader('Content-Range', contentRange);
  res.setHeader('Accept-Ranges', acceptRanges || 'bytes');

  const upstreamDisposition = response.headers.get('content-disposition');
  const upstreamFilename = getFilenameFromDisposition(upstreamDisposition);
  const finalFilename = getSafeFilename(filename || upstreamFilename || 'document', 'document');

  res.setHeader(
    'Content-Disposition',
    (download ? 'attachment' : 'inline') +
      '; filename="' + finalFilename.replace(/"/g, '\\"') + '"'
  );
  res.setHeader('Cache-Control', 'private, max-age=300');

  if (!response.body) return res.end();
  Readable.fromWeb(response.body).pipe(res);
};

const streamMegaDocument = async (sourceUrl, res, options = {}) => {
  if (!MegaFile) {
    throw new Error('MEGA support is not available on the server yet. The MEGAJS dependency is missing.');
  }

  const { filename: filenameHint, download = false, rangeHeader = '' } = options;
  const mainFile = MegaFile.fromURL(sourceUrl);
  mainFile.api.userAgent = 'MediDocs/1.0 full-document-proxy';

  let selectedFile = await mainFile.loadAttributes();
  if (!selectedFile) selectedFile = mainFile;

  if (selectedFile.children) {
    throw new Error('The supplied MEGA link points to a folder. Use a shared link to the individual file.');
  }

  const finalFilename = getSafeFilename(selectedFile.name || filenameHint || 'document', getSafeFilename(filenameHint || 'document'));
  const totalSize = Number(selectedFile.size) || 0;
  const fallbackMime = mimeTypeFromFilename(finalFilename);

  let downloadOptions = { maxConnections: 4 };
  let status = 200;
  let contentLength = totalSize;
  let contentRange = '';

  const rangeMatch = String(rangeHeader || '').match(/^bytes=(\d*)-(\d*)$/i);
  if (rangeMatch && totalSize > 0) {
    const requestedStart = rangeMatch[1]
      ? Number(rangeMatch[1])
      : Math.max(0, totalSize - Number(rangeMatch[2] || 0));
    const requestedEnd = rangeMatch[2]
      ? Number(rangeMatch[2])
      : totalSize - 1;

    const start = Math.max(0, Math.min(requestedStart, totalSize - 1));
    const end = Math.max(start, Math.min(requestedEnd, totalSize - 1));

    downloadOptions = { ...downloadOptions, start, end };
    status = 206;
    contentLength = end - start + 1;
    contentRange = 'bytes ' + start + '-' + end + '/' + totalSize;
  }

  const stream = selectedFile.download(downloadOptions);
  stream.on('error', (error) => {
    console.error('[MEGA] Full-file stream failed:', error?.message || error);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: 'MEGA could not provide the full document.'
      });
    } else {
      res.destroy(error);
    }
  });

  res.status(status);
  res.setHeader('Content-Type', fallbackMime);
  res.setHeader('Accept-Ranges', 'bytes');
  if (contentLength) res.setHeader('Content-Length', String(contentLength));
  if (contentRange) res.setHeader('Content-Range', contentRange);
  res.setHeader(
    'Content-Disposition',
    (download ? 'attachment' : 'inline') +
      '; filename="' + finalFilename.replace(/"/g, '\\"') + '"'
  );
  res.setHeader('Cache-Control', 'private, max-age=300');

  stream.pipe(res);
};

app.get('/api/document/content', async (req, res) => {
  const sourceUrl = String(req.query.url || '').trim();
  const filenameHint = getSafeFilename(req.query.filename || '', 'document');
  const download = String(req.query.download || '') === '1';
  const provider = getCloudProvider(sourceUrl);

  if (!sourceUrl || !provider) {
    return res.status(400).json({
      success: false,
      error: 'Only supported public cloud-drive document links can be opened here.'
    });
  }

  try {
    const rangeHeader = String(req.headers.range || '');

    if (provider === 'icedrive') {
      const resolved = await fetchIcedrivePreview(sourceUrl);
      if (!resolved?.direct || !resolved?.previewUrl) {
        throw new Error('Icedrive did not provide the full document file.');
      }

      const response = await fetch(resolved.previewUrl, {
        headers: {
          'User-Agent': 'MediDocs/1.0 full-document-proxy',
          'Accept': '*/*',
          ...(rangeHeader ? { Range: rangeHeader } : {})
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error('Icedrive file returned HTTP ' + response.status);
      }

      return await streamWebResponseToExpress(response, res, {
        filename: filenameHint !== 'document' ? filenameHint : resolved.fileName,
        download,
        fallbackMime: mimeTypeFromFilename(resolved.fileName || filenameHint)
      });
    }

    if (provider === 'mega') {
      return await streamMegaDocument(sourceUrl, res, {
        filename: filenameHint,
        download,
        rangeHeader
      });
    }

    if (provider === 'google-drive') {
      const response = await fetchGoogleDriveDocument(sourceUrl, rangeHeader);
      const upstreamFilename = getFilenameFromDisposition(response.headers.get('content-disposition'));

      return await streamWebResponseToExpress(response, res, {
        filename: filenameHint !== 'document' ? filenameHint : upstreamFilename,
        download,
        fallbackMime: mimeTypeFromFilename(filenameHint)
      });
    }

    if (provider === 'dropbox') {
      const targetUrl = buildDropboxSourceUrl(sourceUrl);
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'MediDocs/1.0 full-document-proxy',
          'Accept': '*/*',
          ...(rangeHeader ? { Range: rangeHeader } : {})
        },
        redirect: 'follow'
      });

      if (!response.ok) throw new Error('Dropbox returned HTTP ' + response.status);

      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        throw new Error('Dropbox returned its share page instead of the file. Use a public share that permits downloading.');
      }

      return await streamWebResponseToExpress(response, res, {
        filename: filenameHint,
        download,
        fallbackMime: mimeTypeFromFilename(filenameHint)
      });
    }

    if (provider === 'onedrive') {
      const targetUrl = buildOneDriveSourceUrl(sourceUrl);
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'MediDocs/1.0 full-document-proxy',
          'Accept': '*/*',
          ...(rangeHeader ? { Range: rangeHeader } : {})
        },
        redirect: 'follow'
      });

      if (!response.ok) throw new Error('OneDrive returned HTTP ' + response.status);

      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        throw new Error('OneDrive returned its share page instead of the file. Use a public share that permits downloading.');
      }

      return await streamWebResponseToExpress(response, res, {
        filename: filenameHint,
        download,
        fallbackMime: mimeTypeFromFilename(filenameHint)
      });
    }

    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'MediDocs/1.0 full-document-proxy',
        'Accept': '*/*',
        ...(rangeHeader ? { Range: rangeHeader } : {})
      },
      redirect: 'follow'
    });

    if (!response.ok) throw new Error('Cloud file returned HTTP ' + response.status);

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      throw new Error('This cloud URL returned a web page instead of the document file. Store the provider download/share URL for a public file.');
    }

    return await streamWebResponseToExpress(response, res, {
      filename: filenameHint,
      download,
      fallbackMime: mimeTypeFromFilename(filenameHint)
    });
  } catch (error) {
    console.error('[DOCUMENT] Full cloud document request failed:', {
      provider,
      url: sourceUrl,
      error: error?.message || String(error)
    });

    return res.status(502).json({
      success: false,
      provider,
      error: error?.message || 'Unable to retrieve the full document from the cloud provider.'
    });
  }
});

app.post('/api/debug/cloudinary', (req, res) => {
  const {
    stage,
    cloudNameConfigured,
    uploadPresetConfigured,
    fileType,
    fileSize,
    httpStatus,
    errorCode,
    errorMessage,
    browser
  } = req.body || {};

  console.error('[CLOUDINARY DEBUG] Profile photo upload event');
  console.error('[CLOUDINARY DEBUG] Stage:', String(stage || 'unknown').slice(0, 80));
  console.error('[CLOUDINARY DEBUG] Cloud name configured:', Boolean(cloudNameConfigured));
  console.error('[CLOUDINARY DEBUG] Upload preset configured:', Boolean(uploadPresetConfigured));
  console.error('[CLOUDINARY DEBUG] File type:', String(fileType || 'unknown').slice(0, 80));
  console.error('[CLOUDINARY DEBUG] File size:', Number(fileSize) || 0, 'bytes');
  console.error('[CLOUDINARY DEBUG] Cloudinary HTTP status:', Number(httpStatus) || 0);
  console.error('[CLOUDINARY DEBUG] Error code:', String(errorCode || 'none').slice(0, 120));
  console.error('[CLOUDINARY DEBUG] Error message:', String(errorMessage || 'none').slice(0, 500));
  console.error('[CLOUDINARY DEBUG] Browser:', String(browser || 'unknown').slice(0, 200));
  console.error('[CLOUDINARY DEBUG] Timestamp:', new Date().toISOString());

  res.status(204).end();
});

const escapeHtml = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
};

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resourceIndexCache = { data: null, cachedAt: 0 };
const RESOURCE_INDEX_CACHE_MS = 10 * 60 * 1000;
const RESOURCE_INDEX_FAILURE_BACKOFF_MS = 5 * 60 * 1000;
let resourceIndexFailureAt = 0;
let resourceIndexFailureError = null;
// Prevent several users hitting the first-load cache miss from launching
// identical Firestore hierarchy scans at the same time.
let resourceIndexRefreshPromise = null;

async function buildResourceIndex() {
  if (!adminDb) throw new Error('Firebase Admin SDK is not initialized');

  // Build the index with collection-group reads instead of walking every
  // course -> semester -> unit -> documents branch. Firebase Admin bypasses
  // client security rules, while these queries drastically reduce read count.
  const [coursesSnapshot, semestersSnapshot, unitsSnapshot, documentsSnapshot] = await Promise.all([
    adminDb.collection('RESOURCES_STUDYPEDIA').get(),
    adminDb.collectionGroup('semesters').get(),
    adminDb.collectionGroup('courseunits').get(),
    adminDb.collectionGroup('documents').get()
  ]);

  const courseNames = new Map(
    coursesSnapshot.docs.map((item) => [
      item.id,
      item.data()?.name || item.id
    ])
  );

  const semesterNames = new Map();
  for (const item of semestersSnapshot.docs) {
    const parts = item.ref.path.split('/');
    const courseId = parts[1] || item.data()?.courseId || '';
    const semesterId = parts[3] || item.id;
    semesterNames.set(
      `${courseId}/${semesterId}`,
      item.data()?.name || item.id
    );
  }

  const unitNames = new Map();
  for (const item of unitsSnapshot.docs) {
    const parts = item.ref.path.split('/');
    const courseId = parts[1] || item.data()?.courseId || '';
    const semesterId = parts[3] || item.data()?.semesterId || '';
    const unitId = parts[5] || item.id;
    unitNames.set(
      `${courseId}/${semesterId}/${unitId}`,
      item.data()?.name || item.id
    );
  }

  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const allDocuments = documentsSnapshot.docs.map((document) => {
    const data = document.data() || {};
    const parts = document.ref.path.split('/');

    const courseId = parts[1] || data.courseId || '';
    const semesterId = parts[3] || data.semesterId || '';
    const unitId = parts[5] === 'courseunits' ? parts[6] : (data.unitId || null);

    const courseName =
      data.courseName ||
      data.course ||
      courseNames.get(courseId) ||
      courseId;

    const semesterName =
      data.semesterName ||
      semesterNames.get(`${courseId}/${semesterId}`) ||
      semesterId;

    const unitName = unitId
      ? (
          data.unitName ||
          unitNames.get(`${courseId}/${semesterId}/${unitId}`) ||
          unitId
        )
      : null;

    return {
      id: document.id,
      ...data,
      courseId,
      courseName,
      semesterId,
      semesterName,
      unitId,
      unitName,
      fullPath: document.ref.path
    };
  });

  allDocuments.sort((a, b) => {
    if (a.time === 'latest' && b.time !== 'latest') return -1;
    if (a.time !== 'latest' && b.time === 'latest') return 1;
    return toMillis(b.createdAt) - toMillis(a.createdAt);
  });

  const courseCounts = Object.values(allDocuments.reduce((counts, item) => {
    const key = item.courseId || item.courseName || 'Other';
    if (!counts[key]) {
      counts[key] = {
        courseId: key,
        courseName: item.courseName || key,
        count: 0
      };
    }
    counts[key].count += 1;
    return counts;
  }, {})).sort((a, b) => b.count - a.count);

  const data = allDocuments.map((item) => {
    const createdAtMillis = toMillis(item.createdAt);
    return {
      ...item,
      createdAtDate: createdAtMillis
        ? new Date(createdAtMillis).toISOString()
        : null
    };
  });

  return {
    success: true,
    data,
    courseCounts,
    totalDocuments: data.length,
    generatedAt: new Date().toISOString()
  };
}
app.get('/api/resources/count', async (req, res) => {
  try {
    if (!adminDb) return res.status(503).json({ success: false, error: 'Reporting database is not available', totalDocuments: 0 });
    const snapshot = await adminDb.collectionGroup('documents').count().get();
    const totalDocuments = Number(snapshot.data().count) || 0;
    console.info('[RESOURCES] Aggregate resource count:', totalDocuments);
    return res.json({ success: true, totalDocuments });
  } catch (error) {
    const quotaExceeded = error?.code === 8 || String(error?.message || '').includes('RESOURCE_EXHAUSTED') || String(error?.message || '').includes('Quota exceeded');
    console.error('[RESOURCES] Aggregate resource count failed:', { code: error?.code, message: error?.message });
    return res.status(quotaExceeded ? 503 : 500).json({ success: false, quotaExceeded, totalDocuments: 0, error: quotaExceeded ? 'Firestore quota temporarily exceeded' : 'Resource count unavailable' });
  }
});

app.get('/api/resources/index', async (req, res) => {
  const limit = Math.max(1, Math.min(10000, Number(req.query.limit) || 50));
  try {
    if (resourceIndexCache.data && Date.now() - resourceIndexCache.cachedAt < RESOURCE_INDEX_CACHE_MS) {
      return res.json({ ...resourceIndexCache.data, data: resourceIndexCache.data.data.slice(0, limit) });
    }

    if (resourceIndexFailureAt && Date.now() - resourceIndexFailureAt < RESOURCE_INDEX_FAILURE_BACKOFF_MS) {
      if (resourceIndexCache.data) {
        return res.json({ ...resourceIndexCache.data, stale: true, data: resourceIndexCache.data.data.slice(0, limit) });
      }
      return res.status(503).json({ success: false, quotaExceeded: true, error: resourceIndexFailureError || 'Resource index temporarily unavailable', data: [], courseCounts: [], totalDocuments: 0 });
    }

    if (!resourceIndexRefreshPromise) {
      resourceIndexRefreshPromise = buildResourceIndex()
        .then((result) => {
          resourceIndexCache.data = result;
          resourceIndexCache.cachedAt = Date.now();
          console.info('[RESOURCES] Resource index refreshed:', {
            totalDocuments: result.totalDocuments,
            courses: result.courseCounts.length
          });
          return result;
        })
        .finally(() => {
          resourceIndexRefreshPromise = null;
        });
    }

    const result = await resourceIndexRefreshPromise;
    return res.json({ ...result, data: result.data.slice(0, limit) });
  } catch (error) {
    console.error('[RESOURCES] Resource index failed:', {
      code: error?.code,
      message: error?.message
    });
    if (error?.code === 8 || String(error?.message || '').includes('RESOURCE_EXHAUSTED') || String(error?.message || '').includes('Quota exceeded')) {
      resourceIndexFailureAt = Date.now();
      resourceIndexFailureError = 'Firestore quota temporarily exceeded';
    }

    // Keep serving the last known index during a temporary Firestore quota
    // incident instead of making every request fail.
    if (resourceIndexCache.data) {
      return res.json({
        ...resourceIndexCache.data,
        stale: true,
        data: resourceIndexCache.data.data.slice(0, limit)
      });
    }

    return res.status(503).json({
      success: false,
      error: 'Resource index temporarily unavailable',
      data: [],
      courseCounts: [],
      totalDocuments: 0
    });
  }
});

app.get('/api/daily-report-data', async (req, res) => {
  try {
    if (!adminDb) return res.status(503).json({ success: false, error: 'Reporting database is not available' });
    const now = new Date();
    const previous24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const date = new Intl.DateTimeFormat('en-UG', { timeZone: 'Africa/Kampala', year: 'numeric', month: 'long', day: 'numeric' }).format(now);
    const [usersSnapshot, paymentsSnapshot] = await Promise.all([adminDb.collection('users').get(), adminDb.collection('payments').get()]);
    const users = usersSnapshot.docs.map(doc => doc.data());
    const payments = paymentsSnapshot.docs.map(doc => doc.data());
    const newUsers = users.filter(user => { const createdAt = toDate(user.createdAt); return createdAt && createdAt >= previous24Hours && createdAt <= now; }).length;
    const activeSubscriptions = users.filter(user => (user.role === 'admin' && user.accessLevel === 'permanent') || (user.subscriptionStatus === 'active' && user.subscriptionApproved === true)).length;
    const expiredSubscriptions = users.filter(user => { if (user.role === 'admin' && user.accessLevel === 'permanent') return false; const expiry = toDate(user.subscriptionExpiry); return Boolean(expiry && expiry <= now && user.subscriptionApproved === true); }).length;
    const bannedAccounts = users.filter(user => user.banned === true).length;
    const recentPayments = payments.filter(payment => { const createdAt = toDate(payment.createdAt); return createdAt && createdAt >= previous24Hours && createdAt <= now; });
    const approvedPayments = recentPayments.filter(payment => payment.status === 'approved' || payment.status === 'success').length;
    const declinedPayments = recentPayments.filter(payment => payment.status === 'declined').length;
    const memory = process.memoryUsage();
    res.json({ success: true, date, period: 'Last 24 hours', newUsers, totalUsers: users.length, activeSubscriptions, expiredSubscriptions, bannedAccounts, paymentsReceived: recentPayments.length, approvedPayments, declinedPayments, application: { uptimeSeconds: Math.round(process.uptime()), nodeVersion: process.version, memoryRssMb: Number((memory.rss / 1024 / 1024).toFixed(1)), heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(1)) }, httpRequests: 'Not tracked', p95Latency: 'Not tracked', cpuUsage: 'Not tracked', memoryUsage: `${(memory.rss / 1024 / 1024).toFixed(1)} MB RSS` });
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
    if (!safeReference) return res.status(400).json({ success: false, error: 'Invalid reference format' });
    const verifyUrl = `${PAYSTACK_BASE_URL}${PAYSTACK_VERIFY_PATH}/${encodeURIComponent(safeReference)}`;
    const response = await fetch(verifyUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${paystackConfig.secretKey}` } });
    const data = await response.json();
    if (data.status && data.data && data.data.status === 'success') res.json({ success: true, data: data.data });
    else res.json({ success: false, error: data.message || 'Payment verification failed' });
  } catch (error) {
    console.error('Paystack verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/paystack/webhook', paystackLimiter, (req, res) => {
  const payload = req.body;
  console.log('Paystack webhook received:', payload);
  if (payload.event === 'charge.success') console.log('Payment successful:', payload.data);
  res.status(200).send('OK');
});

app.get('/api/config/paystack', (req, res) => {
  res.json({ publicKey: paystackConfig.publicKey || process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || '' });
});

app.post('/api/config/paystack', generalLimiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: 'Missing authorization token' });
    if (!adminDb || !adminAuth) return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    let decodedToken;
    try { decodedToken = await adminAuth.verifyIdToken(token); }
    catch (error) { return res.status(401).json({ success: false, error: 'Invalid token' }); }
    if (!isConfiguredAdmin(decodedToken.email)) return res.status(403).json({ success: false, error: 'Forbidden' });
    const { publicKey, secretKey } = req.body;
    if (!publicKey && !secretKey) return res.status(400).json({ success: false, error: 'At least one key is required' });
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
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ success: false, error: 'Messages array is required' });
    const cacheKey = messages.map(m => `${m.role}:${m.content}`).join('|');
    if (aiMemoryCache.has(cacheKey)) return res.json({ success: true, response: aiMemoryCache.get(cacheKey), cached: true });
    if (!GROQ_API_KEY) return res.status(500).json({ success: false, error: 'AI service is not configured on the server.' });
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` }, body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 1000, temperature: 0.7 }) });
    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      const reply = data.choices[0].message.content;
      if (aiMemoryCache.size > AI_CACHE_MAX_ENTRIES) aiMemoryCache.delete(aiMemoryCache.keys().next().value);
      aiMemoryCache.set(cacheKey, reply);
      res.json({ success: true, response: reply });
    } else res.status(500).json({ success: false, error: data.error?.message || 'AI request failed' });
  } catch (error) {
    console.error('AI proxy error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notify/email', generalLimiter, async (req, res) => {
  try {
    const { to, subject, message, eventType, userEmail, userName } = req.body;
    if (!to || !subject || !message) return res.status(400).json({ success: false, error: 'Missing required fields: to, subject, message' });
    const allowedRecipients = ['kaigwaakram123@gmail.com', ADMIN_EMAIL].filter(Boolean);
    if (!allowedRecipients.includes(to)) return res.status(400).json({ success: false, error: 'Recipient not allowed' });
    if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_SECRET) return res.status(503).json({ success: false, error: 'Google email service is not configured on the server.' });
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sendEmail', secret: GOOGLE_APPS_SCRIPT_SECRET, to, subject, message, eventType: eventType || '', userEmail: userEmail || '', userName: userName || '' }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success !== true) { console.error('Google Apps Script email error:', response.status, data); return res.status(502).json({ success: false, error: data.error || 'Failed to send email via Google Apps Script' }); }
    res.json({ success: true, message: 'Email sent successfully', data });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(502).json({ success: false, error: 'Unable to reach Google email service' });
  }
});

app.get('/api/subscriptions/expiring', generalLimiter, async (req, res) => {
  try {
    if (!adminDb) return res.status(500).json({ success: false, error: 'Admin SDK not initialized' });
    const snapshot = await adminDb.collection('users').get();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    const expiringUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(user => {
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
app.listen(port, () => console.log(`Server running on port ${port}`));
