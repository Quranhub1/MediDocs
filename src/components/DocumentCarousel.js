import React, { useState, useEffect } from 'react';

const DocumentCarousel = ({ documents }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!documents || documents.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % documents.length);
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [documents]);

  if (!documents || documents.length === 0) return null;

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

  const currentDoc = documents[currentIndex];

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
          {documents.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
        
        {/* Left/Right Arrows */}
        <button
          onClick={() => setCurrentIndex((currentIndex - 1 + documents.length) % documents.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentIndex((currentIndex + 1) % documents.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Document Counter */}
      <div className="text-center mt-4 text-gray-600">
        {currentIndex + 1} / {documents.length}
      </div>
    </div>
  );
};

export default DocumentCarousel;
