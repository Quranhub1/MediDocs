// Shared helpers for "Read Online" and "Download" actions on documents.

export const getDocumentUrl = (doc) => {
  if (!doc) return null;
  return doc.filePath || doc.fileUrl || doc.url || null;
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Input string to escape
 * @returns {string} - Escaped string
 */
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  if (!url) {
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
  if (!url) {
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
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
