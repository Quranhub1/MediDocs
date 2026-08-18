import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { readOnline, downloadDocument, getDocumentUrl } from '../utils/documentActions';
import { useViewLimit } from '../hooks/useViewLimit';
import LimitReachedModal from './LimitReachedModal';
import PaymentModal from './PaymentModal';

const LatestDocuments = ({ documents, user, userProfile, onViewChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { viewedCount, limitReached, recordView, isSubscriber } = useViewLimit(userProfile);

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

  const convertToDate = (timestamp) => {
    if (!timestamp) return new Date(0);
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date(0) : date;
  };

  const displayDocuments = useMemo(() => {
    if (!documents || documents.length === 0) return [];
    const latestDocs = documents.filter(doc => doc.time === 'latest');
    if (latestDocs.length > 0) {
      return latestDocs.slice(0, 10);
    }
    const sortedDocs = [...documents].sort((a, b) => {
      const dateA = a.createdAtDate ? a.createdAtDate : convertToDate(a.createdAt);
      const dateB = b.createdAtDate ? b.createdAtDate : convertToDate(b.createdAt);
      return dateB - dateA;
    });
    return sortedDocs.slice(0, 10);
  }, [documents]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + displayDocuments.length) % displayDocuments.length);
  }, [displayDocuments.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % displayDocuments.length);
  }, [displayDocuments.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [documents]);

  useEffect(() => {
    if (isPaused || displayDocuments.length <= 1) return;
    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [displayDocuments.length, isPaused, goToNext]);

  const handleReadOnline = (doc) => {
    // Check if user is subscribed
    if (!isSubscriber) {
      // Check if document is premium
      const isPremium = doc.status === 'premium';
      
      if (isPremium) {
        // Premium document - show payment prompt
        setShowPaymentModal(true);
        return;
      }
      
      // Free document - check view limit
      if (limitReached) {
        setShowLimitModal(true);
        return;
      }
      
      // Record the view
      recordView(doc.id);
    }
    
    readOnline(doc);
  };

  const handleDownload = (doc) => {
      // Check if user is subscribed
      if (!isSubscriber) {
        // Check if document is premium
        const isPremium = doc.status === 'premium';
        
        if (isPremium) {
          // Premium document - show payment prompt
          setShowPaymentModal(true);
          return;
        }
        
        // Free document - check view limit
        if (limitReached) {
          // After free limit is reached, show payment prompt for any document
          setShowPaymentModal(true);
          return;
        }
        
        // Record the view
        recordView(doc.id);
      }
      
      downloadDocument(doc);
    };

  const handleChoosePlan = (planKey) => {
    setSelectedPlan(planKey);
    setShowLimitModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    // Refresh user profile to update subscription status
    if (onViewChange) {
      // Trigger a refresh of the user profile
      window.location.reload();
    }
  };

  if (displayDocuments.length === 0) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Latest Documents</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Stay updated with the newest study materials added to our platform</p>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-500">No latest documents available at the moment.</p>
            <p className="text-gray-400 text-sm mt-2">Check back soon for new study materials!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Latest Documents</h2>
          <p className="text-gray-600 max-w-xl mx-auto">Stay updated with the newest study materials added to our platform</p>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {displayDocuments.map((doc, index) => (
                <div key={doc.id || index} className="w-full shrink-0">
                  <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden mx-auto max-w-3xl">
                    <div className="relative h-48 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
                      {getThumbnailUrl(doc) ? (
                        <img
                          src={getThumbnailUrl(doc)}
                          alt={doc.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                          <span className="text-6xl">{getFileTypeIcon(doc.filePath)}</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          doc.time === 'latest' ? 'bg-emerald-500 text-white' : doc.status === 'premium' ? 'bg-amber-500 text-white' : 'bg-gray-500 text-white'
                        }`}>
                          {doc.time === 'latest' ? 'Latest' : doc.status === 'premium' ? 'Premium' : 'Free'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-bold text-gray-800 mb-2 line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {doc.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg">
                          {doc.courseId?.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg">
                          {doc.semesterId?.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleReadOnline(doc)}
                          disabled={!getDocumentUrl(doc)}
                          className="w-full px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-base font-semibold rounded-xl transition-all duration-200 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Read Online
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={!getDocumentUrl(doc)}
                          className="w-full px-4 py-3.5 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-base font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {displayDocuments.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
                aria-label="Previous document"
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
                aria-label="Next document"
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="flex justify-center gap-2 mt-6">
            {displayDocuments.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-6 bg-emerald-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to document ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Limit Reached Modal - shown after 3 free document views */}
      <LimitReachedModal
        show={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onChoosePlan={handleChoosePlan}
        viewedCount={viewedCount}
      />

      {/* Payment Modal - shown when premium document is clicked or user chooses a plan */}
      <PaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        selectedPlan={selectedPlan}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </section>
  );
};

export default LatestDocuments;
