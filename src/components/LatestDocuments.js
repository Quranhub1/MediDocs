import React from 'react';

const LatestDocuments = ({ documents, user }) => {
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
    // Check for thumbnail fields - prioritize in order
    if (doc.thumbnailUrl) return doc.thumbnailUrl;
    if (doc.thumbnail) return doc.thumbnail;
    if (doc.imageUrl) return doc.imageUrl;
    if (doc.image) return doc.image;
    if (doc.coverImage) return doc.coverImage;
    if (doc.previewImage) return doc.previewImage;
    if (doc.url) return doc.url;
    if (doc.fileUrl) return doc.fileUrl;

    // If there's a filePath that's an image, use it
    if (doc.filePath) {
      const extension = doc.filePath.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        return doc.filePath;
      }
    }

    return null;
  };

  const handleReadOnline = (doc) => {
    // Check various possible field names for view/read URL
    const url = doc.viewUrl || doc.readUrl || doc.previewUrl || doc.filepath || doc.fileUrl || doc.url || doc.link;
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('No read online link available for this document');
    }
  };

  const handleDownload = (doc) => {
    // Check various possible field names for file URL
    const url = doc.filepath || doc.fileUrl || doc.url || doc.downloadUrl || doc.file || doc.link;
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('No download link available for this document');
    }
  };

// Filter documents to show only latest documents (status: 'latest') and premium documents for subscribed users
  const filteredDocuments = documents.filter(doc => {
    if (doc.status === 'latest') return true; // Always show latest documents
    if (user && doc.status === 'premium' && user.subscriptionApproved) return true; // Show premium documents only to subscribed users with approved subscription
    return false;
  });

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
          {filteredDocuments.map((doc) => (
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
                      doc.status === 'latest'
                        ? 'bg-emerald-500 text-white'
                        : doc.status === 'premium'
                          ? user
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-500 text-white'
                          : 'bg-gray-500 text-white'
                    }`}
                  >
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
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
                  {doc.status === 'premium' && !user ? (
                    // Premium document - show upgrade button for non-authenticated users
                    <button
                      onClick={() => alert('Please login and subscribe to access premium documents')}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-medium rounded-xl transition-all duration-200 cursor-not-allowed opacity-50"
                    >
                      Read Online
                    </button>
                  ) : (
                    // Free or authenticated user - show normal buttons
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

        {/* View All Button */}
        <div className="text-center mt-10">
          <button className="px-8 py-3 bg-white border-2 border-emerald-500 text-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition-all duration-200">
            View All Documents
          </button>
        </div>
      </div>
    </section>
  );
};

export default LatestDocuments;
