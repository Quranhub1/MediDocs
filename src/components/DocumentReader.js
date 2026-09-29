import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { downloadDocument, getDocumentUrl, isValidDocumentUrl } from '../utils/documentActions';
import { getBlob, ref } from 'firebase/storage';
import { storage } from '../firebase';

const getHostName = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
};

const getFileTypeIcon = (fileName) => {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return '📘';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return '🎬';
  return '📄';
};

const DocumentReader = ({ document: doc, onClose, onProgress, onDownload }) => {
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(16);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [loadStarted, setLoadStarted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const sessionStartedRef = useRef(null);
  const lastProgressFlushRef = useRef(null);
  const flushProgress = () => {
    if (!sessionStartedRef.current || !onProgress) return;
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - sessionStartedRef.current) / 1000));
    const last = lastProgressFlushRef.current || 0;
    const delta = Math.max(0, seconds - last);
    if (delta < 5) return;
    lastProgressFlushRef.current = seconds;
    onProgress(delta, null);
  };

  useEffect(() => {
    sessionStartedRef.current = Date.now();
    lastProgressFlushRef.current = 0;
    const timer = window.setInterval(flushProgress, 10000);
    const handleVisibility = () => { if (document.visibilityState === 'visible') sessionStartedRef.current = Date.now() - ((lastProgressFlushRef.current || 0) * 1000); else flushProgress(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      flushProgress();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [doc, onProgress]);

  const filePath = getDocumentUrl(doc) || '';
  const validUrl = isValidDocumentUrl(doc);
  const fileName = typeof filePath === 'string'
    ? filePath.split('?')[0].split('#')[0].split('/').pop() || doc?.title || 'document'
    : doc?.title || 'document';

  useEffect(() => {
    console.info('[DocumentReader] open', {
      id: doc?.id || null,
      title: doc?.title || null,
      filePath,
      validUrl,
      filePathType: typeof filePath
    });
  }, [doc, filePath, validUrl]);

  const extension = (fileName.split('.').pop() || '').toLowerCase();
  const isPDF = extension === 'pdf' || doc?.fileType === 'application/pdf' || doc?.mimeType === 'application/pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(extension);
  const isOffice = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension);
  const isGenericDocument = validUrl && !isPDF && !isImage && !isVideo;
  const hostName = getHostName(filePath);

  // Icedrive public share pages are HTML application pages, not the image/file
  // itself. Google Viewer therefore receives an HTML page and can expose its own
  // navigation. Keep the share page inside the MediDocs reader instead.
  const isIcedriveShare = hostName === 'icedrive.net';
  const googleViewerUrl = filePath
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(filePath)}`
    : '';

  useEffect(() => {
    setEmbedFailed(false);
    setLoadStarted(false);
    setPreviewUrl(filePath);
    let objectUrl = null;
    let cancelled = false;
    const prepareInlinePreview = async () => {
      if (!filePath || !validUrl || !storage || (!isPDF && !isImage && !isVideo)) return;
      try {
        const storageReference = ref(storage, filePath);
        const blob = await getBlob(storageReference);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (error) {
        console.info('[DocumentReader] Direct inline blob preview unavailable; using source URL:', error?.message || error);
      }
    };
    void prepareInlinePreview();
    setFontSize(16);
    setIsFullscreen(Boolean(document.fullscreenElement));
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [doc, filePath, validUrl, isPDF, isImage, isVideo]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (error) {
      console.error('[DocumentReader] fullscreen error:', error);
    }
  };

  if (!doc) return null;

  const canPreview = validUrl && (isPDF || isImage || isVideo || isOffice || isGenericDocument);
  const showFallback = !filePath || !canPreview || embedFailed;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4" data-theme={theme}>
      <div ref={containerRef} className={`relative w-full max-w-6xl h-[95vh] bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isFullscreen ? 'max-w-full h-full rounded-none' : ''}`}>
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl">{getFileTypeIcon(fileName)}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate">{doc.title || fileName}</h3>
              {hostName && <p className="text-xs text-gray-500 dark:text-dark-muted truncate">Hosted on {hostName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={() => setFontSize((s) => Math.max(12, s - 1))} className="hidden sm:block px-2 py-1 text-gray-700 dark:text-dark-text" aria-label="Decrease text size">A−</button>
            <span className="hidden sm:block text-xs text-gray-500 min-w-6 text-center">{fontSize}</span>
            <button onClick={() => setFontSize((s) => Math.min(24, s + 1))} className="hidden sm:block px-2 py-1 text-gray-700 dark:text-dark-text" aria-label="Increase text size">A+</button>
            <button onClick={() => (onDownload ? onDownload(doc) : downloadDocument(doc))} className="px-2 sm:px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm hover:bg-emerald-700">Download</button>
            <button onClick={toggleFullscreen} className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs sm:text-sm">{isFullscreen ? 'Exit' : 'Fullscreen'}</button>
            <button onClick={onClose} className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm">Close</button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {!showFallback && isPDF && (
            <iframe
              src={previewUrl || filePath}
              className="w-full h-full border-0"
              title={doc.title || 'PDF document'}
              onLoad={() => { setLoadStarted(true); console.info('[DocumentReader] PDF loaded:', filePath); }}
              onError={() => { setEmbedFailed(true); console.error('[DocumentReader] PDF iframe failed:', filePath); }}
            />
          )}

          {!showFallback && isImage && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img src={previewUrl || filePath} alt={doc.title || 'Document'} className="max-w-full max-h-full object-contain" onLoad={() => setLoadStarted(true)} onError={() => setEmbedFailed(true)} />
            </div>
          )}

          {!showFallback && isVideo && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <video controls className="max-w-full max-h-full" onLoadedData={() => setLoadStarted(true)} onError={() => setEmbedFailed(true)}><source src={previewUrl || filePath} type={`video/${extension}`} />Your browser does not support this video.</video>
            </div>
          )}

          {!showFallback && isIcedriveShare && (
            <iframe
              src={filePath}
              className="w-full h-full border-0"
              title={doc.title || 'Icedrive document'}
              referrerPolicy="no-referrer"
              allow="fullscreen"
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
              onLoad={() => { setLoadStarted(true); console.info('[DocumentReader] Icedrive share loaded inside MediDocs:', filePath); }}
              onError={() => { setEmbedFailed(true); console.error('[DocumentReader] Icedrive share iframe failed:', filePath); }}
            />
          )}

          {!showFallback && !isIcedriveShare && (isOffice || isGenericDocument) && (
            <iframe
              src={googleViewerUrl}
              className="w-full h-full border-0"
              title={doc.title || 'Document'}
              onLoad={() => setLoadStarted(true)}
              onError={() => setEmbedFailed(true)}
            />
          )}

          {!showFallback && !loadStarted && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/80">
              <div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" /><p className="text-gray-600 dark:text-dark-muted">Opening document...</p></div>
            </div>
          )}

          {showFallback && (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto" style={{ fontSize: `${fontSize}px` }}>
              <div className="text-center max-w-xl">
                <div className="text-6xl mb-4">{getFileTypeIcon(fileName)}</div>
                <h4 className="font-semibold text-gray-800 dark:text-dark-text mb-2">{doc.title || fileName}</h4>
                <p className="text-gray-500 dark:text-dark-muted mb-5 break-all">{fileName}</p>
                <p className="text-gray-600 dark:text-dark-muted mb-6">{!filePath ? 'This document has no file URL.' : 'This document cannot be rendered inline by this browser or its source. It will remain inside the app without opening another window.'}</p>
                {filePath && <div className="flex flex-wrap justify-center gap-3"><button onClick={() => downloadDocument(doc)} className="px-4 py-2 bg-gray-700 text-white rounded-lg">Download</button></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;
