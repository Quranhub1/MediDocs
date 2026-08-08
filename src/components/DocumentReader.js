import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';

const DocumentReader = ({ document, onClose }) => {
  const { theme } = useTheme();
  const [fontSize, setFontSize] = useState(16);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const filePath = document?.filePath || '';
  const fileName = filePath.split('/').pop() || document?.title || 'document';
  const extension = fileName.split('.').pop().toLowerCase();

  const isPDF = extension === 'pdf';
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(fileName);
  const isOffice = /\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(fileName);

  useEffect(() => {
    if (isPDF && filePath) {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setTotalPages(1);
      setPdfDoc(null);

      getDocument({ url: filePath }).promise
        .then((pdf) => {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          return pdf.getPage(1);
        })
        .then((page) => {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = canvasRef.current;
          if (canvas) {
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            return page.render({ canvasContext: context, viewport }).promise;
          }
        })
        .catch((err) => {
          console.error('Error loading PDF:', err);
          setError('Failed to load PDF. The file may be blocked by CORS or unavailable.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isPDF, filePath]);

  useEffect(() => {
    if (isPDF && pdfDoc && canvasRef.current) {
      pdfDoc.getPage(currentPage).then((page) => {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          return page.render({ canvasContext: context, viewport }).promise;
        }
      }).catch((err) => {
        console.error('Error rendering PDF page:', err);
      });
    }
  }, [isPDF, pdfDoc, currentPage]);

  const goToPage = (page) => {
    if (pdfDoc && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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

  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(filePath)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className={`relative w-full max-w-5xl h-[90vh] bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isFullscreen ? 'max-w-full h-full rounded-none' : ''}`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-900 dark:text-dark-text">{document.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {isPDF && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-dark-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
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

          {error && (
            <div className="text-center p-8 max-w-lg">
              <p className="text-red-600 mb-4">{error}</p>
              <a
                href={filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline"
              >
                Open in new tab
              </a>
            </div>
          )}

          {!loading && !error && isPDF && (
            <div className="flex flex-col items-center justify-center p-4">
              <canvas ref={canvasRef} className="max-w-full h-auto shadow-lg" />
            </div>
          )}

          {!loading && !error && isImage && (
            <div className="flex items-center justify-center p-4">
              <img
                src={filePath}
                alt={document.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          {!loading && !error && isVideo && (
            <div className="flex items-center justify-center p-4 w-full h-full">
              <video
                controls
                className="max-w-full max-h-full"
                style={{ maxHeight: '80vh' }}
              >
                <source src={filePath} type={`video/${extension}`} />
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {!loading && !error && isOffice && (
            <div className="w-full h-full">
              <iframe
                src={googleViewerUrl}
                className="w-full h-full border-0"
                title={document.title}
                allow="autoplay"
              >
                <p>Your browser does not support iframes. Please open the document directly.</p>
              </iframe>
            </div>
          )}

          {!loading && !error && !isPDF && !isImage && !isVideo && !isOffice && (
            <div className="text-center p-8">
              <p className="text-gray-600 dark:text-dark-muted mb-4">
                This file type cannot be previewed inline.
              </p>
              <a
                href={filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Open Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;
