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

// Open the document in a new browser tab so it can be read online
// without navigating away from the application.
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
  window.open(url, '_blank', 'noopener,noreferrer');
};

// Download the document. Tries a binary fetch first (forces a real
// download); falls back to opening the file in a new tab if the
// origin blocks the cross-origin fetch.
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
    console.error('[DocumentActions] download fetch failed, opening source URL', {
      id: doc?.id || null,
      url,
      error: error?.message || String(error)
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
