// Shared helpers for "Read Online" and "Download" actions on documents.

export const getDocumentUrl = (doc) => {
  if (!doc || typeof doc !== 'object') return null;
  const candidates = [doc.fileUrl, doc.filePath, doc.url];
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

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Input string to escape
 * @returns {string} - Escaped string
 */
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')
};

export const getDocumentFileName = (doc) => {
  const url = getDocumentUrl(doc);
  if (url) {
    try {
      const pathPart = url.split('?')[0].split('#')[0];
      const decoded = decodeURIComponent(pathPart.substring(pathPart.lastIndexOf('/') + 1));
      if (decoded) return decoded;
    } catch (e) {
      // fall through to default
    }
  }
  return doc?.title || 'document';
};

// Request that the running MediDocs app open the document in its own reader.
// Never navigate the browser to the source URL or create another window.
export const readOnline = (doc) => {
  const url = getDocumentUrl(doc);
  console.info('[DocumentActions] readOnline', {
    id: doc?.id || null,
    title: doc?.title || null,
    url,
    urlType: typeof url
  });
  if (!url || !isValidDocumentUrl(doc)) {
    alert('No read online link available for this document');
    return;
  }
  window.dispatchEvent(new CustomEvent('medidocs:read-document', { detail: doc }));
};

// Download the document without ever opening or navigating a new browser window.
// If cross-origin fetch is blocked, use a hidden iframe so the browser handles
// the download in the current MediDocs window.
export const downloadDocument = async (doc) => {
  const url = getDocumentUrl(doc);
  console.info('[DocumentActions] download', {
    id: doc?.id || null,
    title: doc?.title || null,
    url,
    urlType: typeof url
  });
  if (!url || !isValidDocumentUrl(doc)) {
    alert('No download link available for this document');
    return;
  }

  const fileName = getDocumentFileName(doc);

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
    console.error('[DocumentActions] download fetch failed; using same-window download fallback', {
      id: doc?.id || null,
      url,
      error: error?.message || String(error)
    });
    const downloadFrame = document.createElement('iframe');
    downloadFrame.setAttribute('aria-hidden', 'true');
    downloadFrame.tabIndex = -1;
    downloadFrame.style.position = 'fixed';
    downloadFrame.style.width = '1px';
    downloadFrame.style.height = '1px';
    downloadFrame.style.border = '0';
    downloadFrame.style.opacity = '0';
    downloadFrame.style.pointerEvents = 'none';
    downloadFrame.src = url;
    document.body.appendChild(downloadFrame);
    window.setTimeout(() => downloadFrame.remove(), 60000);
  }
};
