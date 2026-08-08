import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const DocumentReader = ({ document, onClose }) => {
  const { theme } = useTheme();
  const [fontSize, setFontSize] = useState(16);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (document?.filePath) {
      setTotalPages(Math.max(1, Math.floor(Math.random() * 20) + 5));
    }
  }, [document]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div 
        ref={containerRef}
        className={`relative w-full max-w-4xl h-[90vh] bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          isFullscreen ? 'max-w-full h-full rounded-none' : ''
        }`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-900 dark:text-dark-text">{document.title}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                A-
              </button>
              <span className="text-sm text-gray-600 dark:text-dark-muted">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                A+
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        <div 
          className="flex-1 overflow-y-auto p-8"
          style={{ fontSize: `${fontSize}px` }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="prose dark:prose-invert max-w-none">
              <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-dark-text">{document.title}</h1>
              <p className="text-gray-600 dark:text-dark-muted mb-6">{document.description}</p>
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  This is a preview of the document content. The full document would be loaded from:
                </p>
                <a 
                  href={document.filePath} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline break-all"
                >
                  {document.filePath}
                </a>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                  Document ID: {document.id}<br/>
                  Course: {document.courseId?.toUpperCase()}<br/>
                  Semester: {document.semesterId?.toUpperCase()}<br/>
                  Unit: {document.unitId?.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-emerald-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-dark-muted">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-emerald-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;
