import React, { useState, useEffect } from 'react';

const DocumentCarousel = ({ documents }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Debug: log documents received
  console.log('Carousel received documents:', documents?.length || 0);
  if (documents && documents.length > 0) {
    console.log('Sample doc:', JSON.stringify(documents[0]));
    console.log('Checking time field:', documents.map(d => ({ id: d.id, time: d.time })));
  }

  // Helper to convert any timestamp format to Date
  const convertToDate = (timestamp) => {
    if (!timestamp) return new Date(0);
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) return timestamp;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date(0) : date;
  };

  // Show documents with time='latest', or fallback to recent documents
  const getDisplayDocs = () => {
    // If documents is undefined or not an array, return empty array
    if (!documents || !Array.isArray(documents)) {
      console.log('Documents is not an array or is empty');
      return [];
    }
    
    // First try to get documents with time='latest' (case-insensitive)
    const latestDocs = documents.filter(doc => doc && doc.time && doc.time.toLowerCase() === 'latest');
    console.log('Latest docs filtered:', latestDocs.length);
    
    if (latestDocs.length > 0) {
      console.log('Showing latest flagged documents');
      return latestDocs;
    }
    
    // Fallback: sort by createdAt/createdAtDate and get most recent
    console.log('No latest flagged docs, showing most recent');
    const sortedDocs = [...documents].sort((a, b) => {
      const dateA = a.createdAtDate ? a.createdAtDate : convertToDate(a.createdAt);
      const dateB = b.createdAtDate ? b.createdAtDate : convertToDate(b.createdAt);
      return dateB - dateA;
    });
    
    return sortedDocs.slice(0, 5); // Show up to 5 recent docs
  };
  
  const displayDocs = getDisplayDocs();
  
  // Check if we're showing actual latest flagged docs (not fallback)
  const isShowingLatest = displayDocs.length > 0 && 
    documents?.some(doc => doc.time && doc.time.toLowerCase() === 'latest');
  
  // Reset currentIndex when documents change
  useEffect(() => {
    setCurrentIndex(0);
  }, [documents]);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (!displayDocs || displayDocs.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        return (prevIndex + 1) % displayDocs.length;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [displayDocs]);
  
  // If no documents at all, return null
  console.log('displayDocs before check:', displayDocs?.length);
  if (!displayDocs || displayDocs.length === 0) {
    console.log('Returning null - no displayDocs');
    return null;
  }

  const currentDoc = displayDocs[currentIndex];
  console.log('Display docs:', displayDocs.length, 'currentIndex:', currentIndex, 'currentDoc:', currentDoc);

  const handleReadOnline = (doc) => {
    const url = doc.filePath;
    if (url) {
      window.location.href = url;
    }
  };

  const handleDownload = (doc) => {
    const url = doc.filePath;
    if (url) {
      window.location.href = url;
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      (prevIndex - 1 + displayDocs.length) % displayDocs.length
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      (prevIndex + 1) % displayDocs.length
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-center text-white mb-8 drop-shadow-lg">
        Featured Documents
      </h2>
      
      {/* Carousel Container */}
      <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-2xl overflow-hidden">
        {/* Content */}
        <div className="p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">
            {currentDoc.title || currentDoc.id}
          </h3>
          <p className="text-emerald-100 mb-4">
            {currentDoc.description || 'No description available'}
          </p>
          
          {/* Course Info */}
          <div className="flex justify-center gap-2 mb-6">
            <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
              {currentDoc.courseId?.toUpperCase()}
            </span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
              {currentDoc.semesterId?.toUpperCase()}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => handleReadOnline(currentDoc)}
              className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors shadow-lg"
            >
              Read Online
            </button>
            <button
              onClick={() => handleDownload(currentDoc)}
              className="px-6 py-3 bg-emerald-800 text-white rounded-xl font-medium hover:bg-emerald-900 transition-colors shadow-lg"
            >
              Download
            </button>
          </div>
        </div>
        
        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {displayDocs.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
        
        {/* Left Arrow */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Right Arrow */}
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Document Counter */}
      <div className="text-center mt-4 text-white">
        {currentIndex + 1} / {displayDocs.length} {isShowingLatest ? '(Latest)' : ''}
      </div>
    </div>
  );
};

export default DocumentCarousel;
