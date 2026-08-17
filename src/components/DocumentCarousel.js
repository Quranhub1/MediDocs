import React, { useState, useEffect, useMemo } from 'react';
import { readOnline, downloadDocument, getDocumentUrl } from '../utils/documentActions';

const DocumentCarousel = ({ documents, user, userProfile }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const convertToDate = (timestamp) => {
    if (!timestamp) return new Date(0);
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date(0) : date;
  };

  const displayDocs = useMemo(() => {
    if (!documents || !Array.isArray(documents)) return [];
    const latestDocs = documents.filter(doc => doc && doc.time && doc.time.toLowerCase() === 'latest');
    if (latestDocs.length > 0) {
      return latestDocs.slice(0, 10);
    }
    const sortedDocs = [...documents].sort((a, b) => {
      const dateA = a.createdAtDate ? a.createdAtDate : convertToDate(a.createdAt);
      const dateB = b.createdAtDate ? b.createdAtDate : convertToDate(b.createdAt);
      return dateB - dateA;
    });
    return sortedDocs.slice(0, 5);
  }, [documents]);

  const getFileTypeIcon = (filePath) => {
    if (!filePath) return '📄';
    const extension = filePath.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf': return '📕';
      case 'doc': case 'docx': return '📘';
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg': return '🖼️';
      default: return '📄';
    }
  };

  const getThumbnailUrl = (doc) => {
    return doc.thumbnailUrl || doc.thumbnail || null;
  };

  const isShowingLatest = displayDocs.length > 0 && 
    documents?.some(doc => doc.time && doc.time.toLowerCase() === 'latest');

  useEffect(() => {
    setCurrentIndex(0);
  }, [documents]);

  useEffect(() => {
    if (!displayDocs || displayDocs.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % displayDocs.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [displayDocs]);

  if (!displayDocs || displayDocs.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + displayDocs.length) % displayDocs.length);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % displayDocs.length);
  };

  const renderSlide = (doc, index) => (
    <div key={doc.id || index} className="w-full shrink-0 p-8 text-center">
      <div className="relative w-full h-48 mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        {getThumbnailUrl(doc) ? (
          <img
            src={getThumbnailUrl(doc)}
            alt={`${doc.title} thumbnail`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
            <span className="text-6xl">{getFileTypeIcon(doc.filePath)}</span>
          </div>
        )}
      </div>

      <h3 className="text-2xl font-bold text-white mb-2">
        {doc.title || doc.id}
      </h3>
      <p className="text-emerald-100 mb-4">
        {doc.description || 'No description available'}
      </p>

      <div className="flex justify-center gap-2 mb-6">
        <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
          {doc.courseId?.toUpperCase()}
        </span>
        <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
          {doc.semesterId?.toUpperCase()}
        </span>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => readOnline(doc)}
          disabled={!getDocumentUrl(doc)}
          className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Read Online
        </button>
        <button
          onClick={() => downloadDocument(doc)}
          disabled={!getDocumentUrl(doc)}
          className="px-6 py-3 bg-emerald-800 text-white rounded-xl font-medium hover:bg-emerald-900 transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Download
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-center text-white mb-8 drop-shadow-lg">
        Featured Documents
      </h2>
      
      <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {displayDocs.map(renderSlide)}
          </div>
        </div>
        
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {displayDocs.map((_, index) => (
            <button key={index} onClick={() => setCurrentIndex(index)} aria-label={`Go to slide ${index + 1}`} className={`w-3 h-3 rounded-full transition-all ${index === currentIndex ? 'bg-white w-6' : 'bg-white/50'}`} />
          ))}
        </div>
        
        {displayDocs.length > 1 && (
          <button onClick={goToPrevious} aria-label="Previous document" className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors z-10">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {displayDocs.length > 1 && (
          <button onClick={goToNext} aria-label="Next document" className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors z-10">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="text-center mt-4 text-white">
        {currentIndex + 1} / {displayDocs.length} {isShowingLatest ? '(Latest)' : ''}
      </div>
    </div>
  );
};

export default DocumentCarousel;
