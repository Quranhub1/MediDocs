import React, { useEffect, useRef, useState } from 'react';
import WebViewer from '@pdftron/webviewer';
import { useTheme } from '../context/ThemeContext';
import { downloadDocument, getDocumentContentUrl, getDocumentFileName, getDocumentHostName, getDocumentUrl, isCloudDocumentUrl, isValidDocumentUrl } from '../utils/documentActions';
import { getBlob, ref } from 'firebase/storage';
import { storage } from '../firebase';

const getFileTypeIcon = (fileName) => {
  const ext = String(fileName || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return '📘';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff'].includes(ext)) return '🖼️';
  if (['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mp3', 'wav', 'm4a'].includes(ext)) return '🎬';
  return '📄';
};

const DocumentReader = ({ document: doc, onClose, onProgress, onDownload }) => {
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const viewerElementRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const sessionStartedRef = useRef(null);
  const lastProgressFlushRef = useRef(0);

  const [fontSize, setFontSize] = useState(16);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [contentError, setContentError] = useState('');

  const filePath = getDocumentUrl(doc) || '';
  const validUrl = isValidDocumentUrl(doc);
  const provider = getDocumentHostName(filePath);
  const fileName = getDocumentFileName(doc);
  const cloudSource = validUrl && isCloudDocumentUrl(filePath);
  const contentUrl = cloudSource
    ? getDocumentContentUrl(doc)
    : (validUrl ? filePath : '');

  // Icedrive's public share page provides its own document viewer. Use the provider
  // viewer directly instead of proxying the file through Apryse; this also avoids
  // Icedrive signed-URL/streaming incompatibilities for public shares.
  const useIcedriveEmbed = provider === 'icedrive.net' || provider.endsWith('.icedrive.net') || provider === 'icedrive.io' || provider.endsWith('.icedrive.io');

  const flushProgress = () => {
    if (!sessionStartedRef.current || !onProgress) return;
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - sessionStartedRef.current) / 1000));
    const delta = Math.max(0, seconds - lastProgressFlushRef.current);
    if (delta < 5) return;
    lastProgressFlushRef.current = seconds;
    onProgress(delta, null);
  };

  useEffect(() => {
    sessionStartedRef.current = Date.now();
    lastProgressFlushRef.current = 0;

    const timer = window.setInterval(flushProgress, 10000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sessionStartedRef.current = Date.now() - (lastProgressFlushRef.current * 1000);
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
    setIsFullscreen(Boolean(document.fullscreenElement));

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let storageBlob = null;

    setViewerReady(false);
    setDocumentLoaded(false);
    setContentError('');

    if (!viewerElementRef.current || !doc) return undefined;

    const webViewerOptions = {
      path: '/lib/webviewer',
      enableFilePicker: false
    };

    const licenseKey = process.env.REACT_APP_APRYSE_LICENSE_KEY;
    if (licenseKey) webViewerOptions.licenseKey = licenseKey;

    const initialize = async () => {
      try {
        console.info('[DocumentReader] Initializing Apryse WebViewer', {
          id: doc?.id || null,
          title: doc?.title || null,
          fileName,
          provider: provider || 'direct',
          source: filePath,
          cloudSource,
          contentUrl
        });

        const instance = await WebViewer(webViewerOptions, viewerElementRef.current);
        if (cancelled) {
          instance.UI.dispose?.();
          return;
        }

        viewerInstanceRef.current = instance;
        setViewerReady(true);

        const documentViewer = instance.Core.documentViewer;
        const handleDocumentLoaded = () => {
          if (cancelled) return;
          setDocumentLoaded(true);
          console.info('[DocumentReader] Full document loaded in Apryse WebViewer:', {
            id: doc?.id || null,
            title: doc?.title || null,
            fileName
          });
        };

        const handleLoadError = (error) => {
          if (cancelled) return;
          const message =
            error?.message ||
            error?.detail?.message ||
            'The complete document could not be loaded.';
          console.error('[DocumentReader] Apryse document load error:', {
            id: doc?.id || null,
            title: doc?.title || null,
            provider: provider || 'direct',
            source: contentUrl || filePath,
            error: message
          });
          setContentError(String(message));
        };

        documentViewer.addEventListener('documentLoaded', handleDocumentLoaded);
        instance.UI.addEventListener(instance.UI.Events.LOAD_ERROR, handleLoadError);

        if (theme) {
          try {
            instance.UI.setTheme(theme === 'dark' ? 'dark' : 'light');
          } catch (error) {
            console.info('[DocumentReader] Apryse theme setup unavailable:', error?.message || error);
          }
        }

        let sourceToLoad = contentUrl;
        if (!sourceToLoad && !validUrl && storage && filePath) {
          try {
            storageBlob = await getBlob(ref(storage, filePath));
            if (!cancelled) {
              sourceToLoad = storageBlob;
            }
          } catch (error) {
            console.error('[DocumentReader] Firebase Storage file retrieval failed:', error);
            setContentError('The stored document could not be retrieved from Firebase Storage.');
          }
        }

        if (!cancelled && sourceToLoad) {
          await instance.UI.loadDocument(sourceToLoad, {
            filename: fileName || 'document'
          });
        } else if (!cancelled && !contentError) {
          setContentError(
            filePath
              ? 'This document does not have a usable file source.'
              : 'This document has no file URL.'
          );
        }
      } catch (error) {
        if (cancelled) return;
        console.error('[DocumentReader] Apryse WebViewer initialization failed:', error);
        setContentError(
          error?.message ||
          'The document viewer could not be initialized.'
        );
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      const instance = viewerInstanceRef.current;
      viewerInstanceRef.current = null;
      if (instance) {
        try {
          instance.UI.dispose?.();
        } catch (error) {
          console.info('[DocumentReader] Apryse cleanup warning:', error?.message || error);
        }
      }
      storageBlob = null;
    };
  }, [doc, filePath, fileName, provider, cloudSource, contentUrl, validUrl, theme]);

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

  const handleDownload = () => {
    void (onDownload ? onDownload(doc) : downloadDocument(doc));
  };

  if (!doc) return null;

  const showFallback = Boolean(contentError) || !filePath || (!viewerReady && !contentError);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4"
      data-theme={theme}
      aria-label="Document reader"
    >
      <div
        ref={containerRef}
        className={
          'relative w-full max-w-7xl h-[96vh] bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col ' +
          (isFullscreen ? 'max-w-full h-full rounded-none' : '')
        }
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl" aria-hidden="true">{getFileTypeIcon(fileName)}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate">
                {doc.title || fileName || 'Document'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-dark-muted truncate">
                {provider ? 'Hosted on ' + provider : 'MediDocs document viewer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setFontSize((size) => Math.max(12, size - 1))}
              className="hidden sm:block px-2 py-1 text-gray-700 dark:text-dark-text"
              aria-label="Decrease reader text size"
            >
              A−
            </button>
            <span className="hidden sm:block text-xs text-gray-500 min-w-6 text-center">
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize((size) => Math.min(24, size + 1))}
              className="hidden sm:block px-2 py-1 text-gray-700 dark:text-dark-text"
              aria-label="Increase reader text size"
            >
              A+
            </button>
            <button
              onClick={handleDownload}
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

        <div className="relative flex-1 min-h-0 bg-gray-100 dark:bg-gray-900">

          {useIcedriveEmbed && validUrl ? (
            <iframe
              src={filePath}
              title={doc.title || fileName || 'Icedrive Document Viewer'}
              className="w-full h-full border-0"
              allowFullScreen
              allow="fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <>
              <div ref={viewerElementRef} className="w-full h-full" />

              {!viewerReady && !contentError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 dark:bg-gray-900/90">
                  <div className="text-center px-6">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
                    <p className="text-gray-700 dark:text-dark-text font-medium">Loading MediDocs document viewer...</p>
                    <p className="text-gray-500 dark:text-dark-muted text-sm mt-1">
                      Preparing the complete file, not a thumbnail or provider preview.
                    </p>
                  </div>
                </div>
              )}

              {viewerReady && !documentLoaded && !contentError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/50">
                  <div className="text-center px-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3" />
                    <p className="text-gray-700 dark:text-dark-text font-medium">Opening the complete document...</p>
                  </div>
                </div>
              )}
            </>
          )}

          {showFallback && contentError && (
            <div className="absolute inset-0 flex items-center justify-center p-6 overflow-auto bg-white dark:bg-dark-card">
              <div className="text-center max-w-2xl">
                <div className="text-6xl mb-4" aria-hidden="true">{getFileTypeIcon(fileName)}</div>
                <h4 className="font-semibold text-gray-900 dark:text-dark-text text-xl mb-2">
                  Unable to open the complete document
                </h4>
                <p className="text-gray-500 dark:text-dark-muted mb-3 break-all">
                  {fileName || doc.title || 'Document'}
                </p>
                <p className="text-gray-600 dark:text-dark-muted mb-6 break-words">
                  {contentError}
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
                >
                  Download full document
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
