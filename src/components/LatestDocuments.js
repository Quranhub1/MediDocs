import React from 'react';

const LatestDocuments = ({ documents, user, onViewChange }) => {
  const getFileTypeIcon = (filePath) => {
    if (!filePath) return '📄';

    const extension = filePath.split('.').pop().toLowerCase();

    switch (extension) {
      case 'pdf':
        return '📕';
      case 'doc':
      case 'docx':
        return '📘';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const getThumbnailUrl = (doc) => {
    // Use thumbnail field directly
    return doc.thumbnail || null;
  };

  const handleReadOnline = (doc) => {
    // Use filePath for read online URL - open in same tab
    const url = doc.filePath;
    if (url) {
      window.location.href = url;
    } else {
      alert('No read online link available for this document');
    }
  };

  const handleDownload = (doc) => {
    // Use filePath - open in same tab
    const url = doc.filePath;
    if (url) {
      window.location.href = url;
    } else {
      alert('No link available for this document');
    }
  };

// Show all documents in the Latest Documents section
  const displayDocuments = documents.slice(0, 6);

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            Latest Documents
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Stay updated with the newest study materials added to our platform
          </p>
        </div>

        {/* Documents Grid - Responsive: 1 col mobile, 2 cols tablet, 3 cols desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group"
            >
              {/* Thumbnail/Preview */}
              <div className="relative h-40 bg-gradient-to-br from-emerald-50 to-teal-50">
                {getThumbnailUrl(doc) ? (
                  <img
                    src={getThumbnailUrl(doc)}
                    alt={`${doc.title} thumbnail`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-5xl">{getFileTypeIcon(doc.filePath)}</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      doc.time === 'latest'
                        ? 'bg-emerald-500 text-white'
                        : doc.status === 'premium'
                          ? user
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-500 text-white'
                          : 'bg-gray-500 text-white'
                    }`}
                  >
                    {doc.time === 'latest' ? 'Latest' : doc.status === 'premium' ? 'Premium' : 'Free'}
                  </span>
                </div>
              </div>

              {/* Document Info */}
              <div className="p-5">
                <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                  {doc.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {doc.description}
                </p>

                {/* Course Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg">
                    {doc.courseId?.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg">
                    {doc.semesterId?.toUpperCase()}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
{doc.status === 'premium' && (!user || !user.subscriptionApproved) ? (
                    // Premium document - show upgrade button for non-authenticated or non-approved users
                    <button
                      onClick={() => alert('Please login and subscribe to access premium documents')}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-medium rounded-xl transition-all duration-200 cursor-not-allowed opacity-50"
                    >
                      Read Online
                    </button>
                  ) : (
                    // Free or authenticated user with approved subscription - show normal buttons
                    <>
                      <button
                        onClick={() => handleReadOnline(doc)}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium rounded-xl transition-all duration-200"
                      >
                        Read Online
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex-1 px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm font-medium rounded-xl transition-all duration-200"
                      >
                        Download
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestDocuments;
