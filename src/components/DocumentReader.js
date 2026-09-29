import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  downloadDocument,
  getDocumentContentUrl,
  getDocumentFileName,
  getDocumentHostName,
  getDocumentUrl,
  isCloudDocumentUrl,
  isValidDocumentUrl
} from '../utils/documentActions';
import { getBlob, ref } from 'firebase/storage';
import { storage } from '../firebase';

const getFileTypeIcon = (fileName) => {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return '📘';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return '🎬';
  return '📄';
};

const getExtensionFromMime = (mimeType) => {
  const map = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'video/quicktime': 'mov'
  };
  return map[String(mimeType || '').toLowerCase()] || '';
};

const DocumentReader = ({ document: doc, onClose, onProgress, onDownload }) => {
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(16);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadStarted, setLoadStarted] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [contentUrl, setContentUrl] = useState('');
  const [contentError, setContentError] = useState('');

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

  const filePath = getDocumentUrl(doc) || '';
  const validUrl = isValidDocumentUrl(doc);
  const provider = getDocumentHostName(filePath);
  const fileName = getDocumentFileName(doc);
  const extension = (fileName.split('.').pop() || '').toLowerCase();

  const mimeType = String(doc?.mimeType || doc?.fileType || '').toLowerCase();
  const mimeExtension = getExtensionFromMime(mimeType);
  const effectiveExtension = extension && extension.length <= 10 ? extension : mimeExtension;

  const isPDF = effectiveExtension === 'pdf' || mimeType === 'application/pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(effectiveExtension);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(effectiveExtension);
  const isOffice = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(effectiveExtension);

  const cloudSource = validUrl && isCloudDocumentUrl(filePath);
  const inlineSourceUrl = cloudSource
    ? getDocumentContentUrl(doc)
    : filePath;

  const googleViewerUrl = inlineSourceUrl
    ? 'https://docs.google.com/gview?embedded=true&url=' + encodeURIComponent(
      cloudSource ? window.location.origin + inlineSourceUrl : inlineSourceUrl
    )
    : '';

  useEffect(() => {
    sessionStartedRef.current = Date.now();
    lastProgressFlushRef.current = 0;

    const timer = window.setInterval(flushProgress, 10000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sessionStartedRef.current = Date.now() - ((lastProgressFlushRef.current || 0) * 1000);
      } else {
        flushProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(timer);
      flushProgress();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [doc, onProgress]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    setLoadStarted(false);
    setEmbedFailed(false);
    setContentError('');
    setContentUrl(inlineSourceUrl || '');
    setFontSize(16);
    setIsFullscreen(Boolean(document.fullscreenElement));

    const prepareFirebaseInlinePreview = async () => {
      if (
        cloudSource ||
        !filePath ||
        !validUrl ||
        !storage ||
        (!isPDF && !isImage && !isVideo)
      ) {
        return;
      }

      try {
        const storageReference = ref(storage, filePath);
        const blob = await getBlob(storageReference);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setContentUrl(objectUrl);
      } catch (error) {
        console.info('[DocumentReader] Direct Firebase blob preview unavailable; using source URL:', error?.message || error);
      }
    };

    void prepareFirebaseInlinePreview();

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [
    doc,
    inlineSourceUrl,
    cloudSource,
    filePath,
    validUrl,
    isPDF,
    isImage,
    isVideo
  ]);

  useEffect(() => {
    console.info('[DocumentReader] open', {
      id: doc?.id || null,
      title: doc?.title || null,
      provider: provider || 'direct',
      source: filePath,
      cloudSource,
      contentUrl: inlineSourceUrl
    });
  }, [doc, provider, filePath, cloudSource, inlineSourceUrl]);

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

  const handleContentError = (message) => {
    setEmbedFailed(true);
    setContentError(message);
  };

  if (!doc) return null;

  const canPreview = validUrl && Boolean(contentUrl) && (
    isPDF ||
    isImage ||
    isVideo ||
    isOffice ||
    cloudSource ||
    Boolean(googleViewerUrl)
  );

  const showFallback = !filePath || !validUrl || !canPreview || embedFailed;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4" data-theme={theme}>
      <div
        ref={containerRef}
        className={
          'relative w-full max-w-6xl h-[95vh] bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col ' +
          (isFullscreen ? 'max-w-full h-full rounded-none' : '')
        }
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl">{getFileTypeIcon(fileName)}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate">
                {doc.title || fileName}
              </h3>
              {provider && (
                <p className="text-xs text-gray-500 dark:text-dark-muted truncate">
                  Hosted on {provider}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              className="hidden sm:block px-2 py-1 text-gray-700 dark:text-dark-text"
              aria-label="Decrease text size"
            >
              A−
            </button>

            <span className="hidden sm:block text-xs text-gray-500 min-w-6 text-center">
              {fontSize}
            </span>

            <button
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="hidden sm:block px-2 py-1 text-gray-700 dark:text-dark-text"
              aria-label="Increase text size"
            >
              A+
            </button>

            <button
              onClick={() => (onDownload ? onDownload(doc) : downloadDocument(doc))}
              className="px-2 sm:px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm hover:bg-emerald-700"
            >
              Download
            </button>

            <button
              onClick={toggleFullscreen}
              className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs sm:text-sm"
            >
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>

            <button
              onClick={onClose}
              className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {!showFallback && isPDF && (
            <iframe
              src={contentUrl}
              className="w-full h-full border-0"
              title={doc.title || fileName || 'PDF document'}
              onLoad={() => {
                setLoadStarted(true);
                console.info('[DocumentReader] PDF/content loaded:', contentUrl);
              }}
              onError={() => handleContentError('The full document could not be opened.')}
            />
          )}

          {!showFallback && isImage && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={contentUrl}
                alt={doc.title || fileName || 'Document'}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setLoadStarted(true)}
                onError={() => handleContentError('The full image could not be opened.')}
              />
            </div>
          )}

          {!showFallback && isVideo && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <video
                controls
                preload="metadata"
                className="max-w-full max-h-full"
                onLoadedData={() => setLoadStarted(true)}
                onError={() => handleContentError('The full video could not be opened.')}
              >
                <source src={contentUrl} type={mimeType || ('video/' + effectiveExtension)} />
                Your browser does not support this video.
              </video>
            </div>
          )}

          {!showFallback && isOffice && googleViewerUrl && (
            <iframe
              src={googleViewerUrl}
              className="w-full h-full border-0"
              title={doc.title || fileName || 'Document'}
              onLoad={() => setLoadStarted(true)}
              onError={() => handleContentError('The complete document viewer could not be opened.')}
            />
          )}

          {!showFallback && !isPDF && !isImage && !isVideo && !isOffice && contentUrl && (
            <iframe
              src={contentUrl}
              className="w-full h-full border-0 bg-white"
              title={doc.title || fileName || 'Document'}
              onLoad={() => setLoadStarted(true)}
              onError={() => handleContentError('The document source could not be opened.')}
            />
          )}

          {!showFallback && !loadStarted && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/80">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-dark-muted">
                  Opening full document...
                </p>
              </div>
            </div>
          )}

          {showFallback && (
            <div
              className="w-full h-full flex items-center justify-center p-6 overflow-auto"
              style={{ fontSize: fontSize + 'px' }}
            >
              <div className="text-center max-w-xl">
                <div className="text-6xl mb-4">{getFileTypeIcon(fileName)}</div>

                <h4 className="font-semibold text-gray-800 dark:text-dark-text mb-2">
                  {doc.title || fileName}
                </h4>

                <p className="text-gray-500 dark:text-dark-muted mb-3 break-all">
                  {fileName}
                </p>

                <p className="text-gray-600 dark:text-dark-muted mb-6">
                  {contentError ||
                    (!filePath
                      ? 'This document has no file URL.'
                      : 'The full document could not be rendered from this cloud source. A thumbnail is not used as a substitute.')}
                </p>

                {filePath && (
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => (onDownload ? onDownload(doc) : downloadDocument(doc))}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      Download full document
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;
