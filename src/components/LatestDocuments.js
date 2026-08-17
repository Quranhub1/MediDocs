import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { readOnline, downloadDocument, getDocumentUrl } from '../utils/documentActions';

const LatestDocuments = ({ documents, user, userProfile, onViewChange }) => {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dragState = useRef({ startX: 0, scrollLeft: 0, isDown: false, moved: false });
  const suppressClick = useRef(false);
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
    readOnline(doc);
  };

  const handleDownload = (doc) => {
    downloadDocument(doc);
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

  const scrollToIndex = useCallback((index) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, displayDocuments.length - 1));
    setActiveIndex(clamped);
    const card = el.children[clamped];
    if (card) {
      el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: 'smooth' });
    }
  }, [displayDocuments.length]);

  const goToPrevious = () => scrollToIndex(activeIndex - 1);
  const goToNext = () => scrollToIndex(activeIndex + 1);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const children = el.children;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < children.length; i++) {
      const dist = Math.abs(children[i].offsetLeft - el.scrollLeft - (el.clientWidth - children[i].clientWidth) / 2);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    if (closest !== activeIndex) {
      setActiveIndex(closest);
    }
  };

  const onDragStart = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current.isDown = true;
    dragState.current.moved = false;
    dragState.current.startX = (e.touches ? e.touches[0].pageX : e.pageX) - el.offsetLeft;
    dragState.current.scrollLeft = el.scrollLeft;
  };

  const onDragMove = (e) => {
    if (!dragState.current.isDown) return;
    const el = scrollRef.current;
    if (!el) return;
    const x = (e.touches ? e.touches[0].pageX : e.pageX) - el.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 5) dragState.current.moved = true;
    el.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const onDragEnd = () => {
    if (!dragState.current.isDown) return;
    dragState.current.isDown = false;
    if (!dragState.current.moved) return;
    const el = scrollRef.current;
    if (!el) return;
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const dist = Math.abs(el.children[i].offsetLeft - el.scrollLeft - (el.clientWidth - el.children[i].clientWidth) / 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }
    scrollToIndex(nearest);
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);
  };

  const onClickCapture = (e) => {
    if (dragState.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      dragState.current.moved = false;
    }
  };

  useEffect(() => {
    setActiveIndex(0);
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
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

        <div className="relative">
          <button
            onClick={goToPrevious}
            disabled={activeIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Previous document"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={goToNext}
            disabled={activeIndex === displayDocuments.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Next document"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            onMouseDown={onDragStart}
            onMouseMove={onDragMove}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
            onClickCapture={onClickCapture}
            className="flex gap-8 overflow-x-auto snap-x snap-mandatory px-12 py-2 scrollbar-hide cursor-grab active:cursor-grabbing"
          >
            {displayDocuments.map((doc, index) => {
              return (
                <div
                  key={doc.id}
                  className="snap-center shrink-0 w-[300px] sm:w-[340px] bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden group card-hover"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative h-48 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
                    {getThumbnailUrl(doc) ? (
                      <>
                        <img
                          src={getThumbnailUrl(doc)}
                          alt={`${doc.title} thumbnail`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 pointer-events-none"
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

                    <div className="flex flex-col gap-3">
                      <button onClick={(e) => { if (suppressClick.current) return; handleReadOnline(doc); }} disabled={!getDocumentUrl(doc)} className="w-full px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-base font-semibold rounded-xl transition-all duration-200 shadow-md disabled:opacity-40 disabled:cursor-not-allowed">
                        Read Online
                      </button>
                      <button onClick={(e) => { if (suppressClick.current) return; handleDownload(doc); }} disabled={!getDocumentUrl(doc)} className="w-full px-4 py-3.5 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-base font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {displayDocuments.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex ? 'w-6 bg-emerald-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to document ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestDocuments;
