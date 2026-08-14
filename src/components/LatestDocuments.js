import React, { useMemo } from 'react';

const ADMIN_EMAIL = 'kaigwaakram123@gmail.com';

const canAccessDocument = (doc, userProfile, userEmail) => {
  if (!doc) return true;
  if (doc.status === 'free') return true;
  if (userEmail === ADMIN_EMAIL) return true;
  if (!userProfile) return false;
  if (userProfile.banned) return false;
  if (userProfile.subscriptionApproved && userProfile.subscriptionStatus === 'active') {
    if (userProfile.subscriptionExpiry) {
      const expiry = new Date(userProfile.subscriptionExpiry);
      return expiry > new Date();
    }
    return true;
  }
  return false;
};

const LatestDocuments = ({ documents, user, userProfile, onViewChange, onPaymentClick, onLockedAccess }) => {
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

  const handleReadOnline = (doc) => {
    if (!canAccessDocument(doc, userProfile, user?.email)) {
      if (onPaymentClick) onPaymentClick();
      return;
    }
    if (onLockedAccess) {
      onLockedAccess(doc, () => {
        const url = doc.filePath;
        if (url) window.location.href = url;
        else alert('No read online link available for this document');
      });
      return;
    }
    const url = doc.filePath;
    if (url) {
      window.location.href = url;
    } else {
      alert('No read online link available for this document');
    }
  };

  const handleDownload = (doc) => {
    if (!canAccessDocument(doc, userProfile, user?.email)) {
      if (onPaymentClick) onPaymentClick();
      return;
    }
    if (onLockedAccess) {
      onLockedAccess(doc, () => {
        const url = doc.filePath;
        if (url) window.location.href = url;
        else alert('No link available for this document');
      });
      return;
    }
    const url = doc.filePath;
    if (url) {
      window.location.href = url;
    } else {
      alert('No link available for this document');
    }
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
      return latestDocs.slice(0, 6);
    }
    const sortedDocs = [...documents].sort((a, b) => {
      const dateA = a.createdAtDate ? a.createdAtDate : convertToDate(a.createdAt);
      const dateB = b.createdAtDate ? b.createdAtDate : convertToDate(b.createdAt);
      return dateB - dateA;
    });
    return sortedDocs.slice(0, 6);
  }, [documents]);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayDocuments.map((doc, index) => {
            const hasAccess = canAccessDocument(doc, userProfile, user?.email);
            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden group card-hover"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative h-48 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
                  {getThumbnailUrl(doc) ? (
                    <>
                      <img
                        src={getThumbnailUrl(doc)}
                        alt={`${doc.title} thumbnail`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                      <span className="text-6xl transition-transform duration-300 group-hover:scale-125">{getFileTypeIcon(doc.filePath)}</span>
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
                  <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
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

                  <div className="flex space-x-2">
                    {hasAccess ? (
                      <>
                        <button onClick={() => handleReadOnline(doc)} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium rounded-xl transition-all duration-200">
                          Read Online
                        </button>
                        <button onClick={() => handleDownload(doc)} className="flex-1 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm font-medium rounded-xl transition-all duration-200">
                          Download
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={onPaymentClick} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-xl transition-all duration-200">
                          Read Online
                        </button>
                        <button onClick={onPaymentClick} className="flex-1 px-4 py-2.5 bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50 text-sm font-medium rounded-xl transition-all duration-200">
                          Download
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LatestDocuments;
