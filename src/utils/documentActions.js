// Shared helpers for "Read Online" and "Download" actions on documents.

export const getDocumentUrl = (doc) => {
  if (!doc || typeof doc !== 'object') return null;

  // Documents created at different points in MediDocs may use different
  // casing for the stored file URL field. Prefer the current field names,
  // but keep compatibility with existing records instead of requiring a
  // database migration.
  const candidates = [
    doc.fileUrl,
    doc.filePath,
    doc.filepath,
    doc.url
  ];

  const url = candidates.find((value) => typeof value === 'string' && value.trim());
  return url ? url.trim() : null;
};

export const isValidDocumentUrl = (doc) => {
  const url = getDocumentUrl(doc);
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Escape HTML special characters for existing document rendering helpers.
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
};

export const getDocumentHostName = (value) => {
  const url = typeof value === 'string' ? value : getDocumentUrl(value);
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

export const isCloudDocumentUrl = (value) => {
  const host = getDocumentHostName(value);
  return Boolean(
    host === 'icedrive.net' ||
    host === 'icedrive.io' ||
    host === 'mega.nz' ||
    host === 'mega.io' ||
    host === 'mega.co.nz' ||
    host === 'drive.google.com' ||
    host === 'docs.google.com' ||
    host === 'drive.usercontent.google.com' ||
    host === 'docs.googleusercontent.com' ||
    host === '1drv.ms' ||
    host === 'onedrive.live.com' ||
    host.endsWith('.sharepoint.com') ||
    host === 'dropbox.com' ||
    host === 'dl.dropboxusercontent.com' ||
    host === 'app.box.com' ||
    host === 'pcloud.com'
  );
};

export const getDocumentFileName = (doc) => {
  const preferred = [doc?.fileName, doc?.name, doc?.title]
    .find((value) => typeof value === 'string' && value.trim());

  const url = getDocumentUrl(doc);
  if (url) {
    try {
      const parsed = new URL(url);
      const pathPart = parsed.pathname || '';
      const decoded = decodeURIComponent(pathPart.substring(pathPart.lastIndexOf('/') + 1));
      const looksLikeRealFileName = decoded && /\.[A-Za-z0-9]{1,10}$/.test(decoded);
      if (looksLikeRealFileName) return decoded;
    } catch (error) {
      // Fall through to the document metadata.
    }
  }

  return preferred || 'document';
};

export const getDocumentContentUrl = (doc, options = {}) => {
  const url = getDocumentUrl(doc);
  if (!url || !isCloudDocumentUrl(url)) return null;

  const params = new URLSearchParams();
  params.set('url', url);

  const fileName = getDocumentFileName(doc);
  if (fileName && fileName !== 'document') params.set('filename', fileName);
  if (options.download) params.set('download', '1');

  return '/api/document/content?' + params.toString();
};

// Request that the running MediDocs app open the document in its own reader.
// Never navigate the browser to the source URL or create another window.
export const readOnline = (doc) => {
  const url = getDocumentUrl(doc);
  console.info('[DocumentActions] readOnline', {
    id: doc?.id || null,
    title: doc?.title || null,
    url,
    urlType: typeof url,
    provider: isCloudDocumentUrl(url) ? getDocumentHostName(url) : 'direct'
  });
  if (!url || !isValidDocumentUrl(doc)) {
    alert('No read online link available for this document');
    return;
  }
  window.dispatchEvent(new CustomEvent('medidocs:read-document', { detail: doc }));
};

// Download through the MediDocs server for public cloud-drive shares.
// This avoids browser CORS restrictions and, importantly, streams the actual
// source file instead of downloading a preview/thumbnail page.
export const downloadDocument = async (doc) => {
  const url = getDocumentUrl(doc);
  console.info('[DocumentActions] download', {
    id: doc?.id || null,
    title: doc?.title || null,
    url,
    urlType: typeof url,
    provider: isCloudDocumentUrl(url) ? getDocumentHostName(url) : 'direct'
  });

  if (!url || !isValidDocumentUrl(doc)) {
    alert('No download link available for this document');
    return;
  }

  const fileName = getDocumentFileName(doc);
  const cloudDownloadUrl = getDocumentContentUrl(doc, { download: true });

  if (cloudDownloadUrl) {
    const link = document.createElement('a');
    link.href = cloudDownloadUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  // Firebase Storage and other direct file URLs keep the existing browser
  // download behavior.
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('[DocumentActions] direct download fetch failed; using same-window fallback', {
      id: doc?.id || null,
      url,
      error: error?.message || String(error)
    });

    const downloadFrame = document.createElement('iframe');
    downloadFrame.setAttribute('aria-hidden', 'true');
    downloadFrame.tabIndex = -1;
    Object.assign(downloadFrame.style, {
      position: 'fixed',
      width: '1px',
      height: '1px',
      border: '0',
      opacity: '0',
      pointerEvents: 'none'
    });
    downloadFrame.src = url;
    document.body.appendChild(downloadFrame);
    window.setTimeout(() => downloadFrame.remove(), 60000);
  }
};
