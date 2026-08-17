import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { downloadDocument, getDocumentUrl } from '../utils/documentActions';

// Hosts that typically block embedding (X-Frame-Options / frame-ancestors)
// and must be opened on their own site instead of inlined.
const NON_EMBEDDABLE_HOSTS = [
  'mega.nz',
  'icedrive.net',
  'mediafire.com',
  'drive.google.com',
  'dropbox.com',
  'www.dropbox.com',
  '1drv.ms',
  'app.box.com'
];

const getHostName = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return '';
  }
};

const getFileTypeIcon = (fileName) => {
  if (!fileName) return '📄';
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return '🎬';
  return '📄';
};

const DocumentReader = ({ document, onClose }) => {
  const { theme } = useTheme();
  const [fontSize, setFontSize] = useState(16);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const containerRef = useRef(null);

  const filePath = getDocumentUrl(document) || '';
  const fileName = filePath.split('?')[0].split('#')[0].split('/').pop() || document?.title || 'document';
  const extension = (fileName.split('.').pop() || '').toLowerCase();

  const isPDF = extension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(extension);
  const isOffice = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension);
  const isDirectFile = isPDF || isImage || isVideo || isOffice;

  const hostName = getHostName(filePath);
  const isExternalHost = NON_EMBEDDABLE_HOSTS.some((h) => hostName.includes(h));

  const useFallback = !isDirectFile || isExternalHost || embedFailed;

  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(filePath)}&embedded=true`;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className={`relative w-full max-w-5xl h-[90vh] bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isFullscreen ? 'max-w-full h-full rounded-none' : ''}`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{getFileTypeIcon(fileName)}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate">{document.title}</h3>
              {hostName && (
                <p className="text-xs text-gray-500 dark:text-dark-muted truncate">Hosted on {hostName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => downloadDocument(document)}
              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
            >
              Close
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-dark-muted">Loading document...</p>
            </div>
          )}

          {!loading && !useFallback && isPDF && (
            <div className="w-full h-full">
              <iframe
                src={filePath}
                className="w-full h-full border-0"
                title={document.title}
                onLoad={() => setLoading(false)}
                onError={() => setEmbedFailed(true)}
              >
                <p className="p-8 text-center">
                  Your browser does not support PDFs.{' '}
                  <a href={filePath} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    Download the PDF
                  </a>
                </p>
              </iframe>
            </div>
          )}

          {!loading && !useFallback && isImage && (
            <div className="flex items-center justify-center p-4">
              <img
                src={filePath}
                alt={document.title}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setLoading(false)}
                onError={() => setEmbedFailed(true)}
              />
            </div>
          )}

          {!loading && !useFallback && isVideo && (
            <div className="flex items-center justify-center p-4 w-full h-full">
              <video
                controls
                className="max-w-full max-h-full"
                style={{ maxHeight: '80vh' }}
                onError={() => setEmbedFailed(true)}
              >
                <source src={filePath} type={`video/${extension}`} />
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {!loading && !useFallback && isOffice && (
            <div className="w-full h-full">
              <iframe
                src={googleViewerUrl}
                className="w-full h-full border-0"
                title={document.title}
                allow="autoplay"
                onError={() => setEmbedFailed(true)}
              >
                <p>Your browser does not support iframes. Please open the document directly.</p>
              </iframe>
            </div>
          )}

          {!loading && useFallback && (
            <div className="text-center p-8 max-w-lg">
              <div className="text-6xl mb-4">{getFileTypeIcon(fileName)}</div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-1 truncate">
                {document.title}
              </h4>
              <p className="text-sm text-gray-500 dark:text-dark-muted mb-6 break-all">
                {fileName}
              </p>
              <p className="text-gray-600 dark:text-dark-muted mb-6">
                {isExternalHost
                  ? `This file is hosted on ${hostName}, which doesn't allow inline preview. Open it on the host site to view or download.`
                  : 'This file type cannot be previewed inline.'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href={filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Open on {hostName || 'host'}
                </a>
                <button
                  onClick={() => downloadDocument(document)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                >
                  Download
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;
