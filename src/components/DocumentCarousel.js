import React, { useState, useEffect, useMemo, useRef } from 'react';
import { readOnline, downloadDocument, getDocumentUrl } from '../utils/documentActions';
import './DocumentCarousel.css';

const AUTO_PLAY_MS = 7000;

const DocumentCarousel = ({ documents, user, userProfile, onReadDocument, onDownloadDocument }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(null);
  const pointerStartX = useRef(null);

  const convertToDate = (timestamp) => {
    if (!timestamp) return new Date(0);
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
  };

  const displayDocs = useMemo(() => {
    if (!Array.isArray(documents)) return [];

    const latestDocs = documents.filter(doc => doc?.time?.toLowerCase() === 'latest');
    if (latestDocs.length > 0) return latestDocs.slice(0, 10);

    return [...documents]
      .filter(Boolean)
      .sort((a, b) => convertToDate(b.createdAtDate || b.createdAt) - convertToDate(a.createdAtDate || a.createdAt))
      .slice(0, 5);
  }, [documents]);

  const getFileTypeIcon = (filePath) => {
    if (!filePath) return '📄';
    const extension = filePath.split('.').pop().toLowerCase();
    if (extension === 'pdf') return '📕';
    if (extension === 'doc' || extension === 'docx') return '📘';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return '🖼️';
    return '📄';
  };

  const getThumbnailUrl = (doc) => doc.thumbnailUrl || doc.thumbnail || null;

  const isShowingLatest = displayDocs.length > 0 && documents?.some(doc => doc?.time?.toLowerCase() === 'latest');

  useEffect(() => {
    setCurrentIndex(0);
  }, [documents]);

  useEffect(() => {
    if (displayDocs.length <= 1 || isPaused) return undefined;
    const interval = window.setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % displayDocs.length);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(interval);
  }, [displayDocs.length, isPaused]);

  if (displayDocs.length === 0) return null;

  const goTo = (index) => {
    const nextIndex = (index + displayDocs.length) % displayDocs.length;
    setCurrentIndex(nextIndex);
  };

  const goToPrevious = () => goTo(currentIndex - 1);
  const goToNext = () => goTo(currentIndex + 1);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = touchStartX.current - endX;
    touchStartX.current = null;
    if (Math.abs(delta) > 45) delta > 0 ? goToNext() : goToPrevious();
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse') return;
    pointerStartX.current = event.clientX;
    setIsDragging(true);
  };

  const handlePointerUp = (event) => {
    if (pointerStartX.current === null) return;
    const delta = pointerStartX.current - event.clientX;
    pointerStartX.current = null;
    setIsDragging(false);
    if (Math.abs(delta) > 45) delta > 0 ? goToNext() : goToPrevious();
  };

  const renderSlide = (doc, index) => (
    <article key={doc.id || index} className="w-full shrink-0 px-5 py-5 sm:px-8 sm:py-8 text-center" aria-hidden={index !== currentIndex}>
      <div className="relative w-full h-44 sm:h-56 mb-5 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 shadow-inner">
        {getThumbnailUrl(doc) ? (
          <img
            src={getThumbnailUrl(doc)}
            alt={`${doc.title || 'Document'} thumbnail`}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
            <span className="text-6xl" aria-hidden="true">{getFileTypeIcon(doc.filePath)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 line-clamp-2 min-h-[3.5rem]">
        {doc.title || doc.id}
      </h3>
      <p className="text-emerald-50/90 text-sm sm:text-base mb-4 line-clamp-2 min-h-[3rem]">
        {doc.description || 'No description available'}
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-5">
        {doc.courseId && <span className="px-3 py-1 bg-white/15 border border-white/20 rounded-full text-white text-xs sm:text-sm">{doc.courseId.toUpperCase()}</span>}
        {doc.semesterId && <span className="px-3 py-1 bg-white/15 border border-white/20 rounded-full text-white text-xs sm:text-sm">{doc.semesterId.toUpperCase()}</span>}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
        <button
          onClick={() => (onReadDocument ? onReadDocument(doc) : readOnline(doc))}
          disabled={!getDocumentUrl(doc)}
          className="px-5 py-3 bg-white text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Read Online
        </button>
        <button
          onClick={() => (onDownloadDocument ? onDownloadDocument(doc) : downloadDocument(doc))}
          disabled={!getDocumentUrl(doc)}
          className="px-5 py-3 bg-emerald-950/70 text-white border border-white/15 rounded-xl font-semibold hover:bg-emerald-950 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Download
        </button>
      </div>
    </article>
  );

  return (
    <section
      className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-7 sm:py-9"
      aria-label="Featured documents"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <div className="flex items-end justify-between gap-4 mb-5 px-1">
        <div>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100/90">MediDocs</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">Featured Documents</h2>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 border border-white/10">
          {currentIndex + 1} / {displayDocs.length}
        </span>
      </div>

      <div className="relative rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-2xl ring-1 ring-white/10 overflow-hidden">
        <div
          className={`overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { pointerStartX.current = null; setIsDragging(false); }}
          style={{ touchAction: 'pan-y' }}
        >
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform"
            style={{ transform: `translate3d(-${currentIndex * 100}%, 0, 0)` }}
          >
            {displayDocs.map(renderSlide)}
          </div>
        </div>

        {displayDocs.length > 1 && (
          <>
            <button onClick={goToPrevious} aria-label="Previous document" className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 bg-black/20 hover:bg-black/35 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105 text-white z-10 border border-white/10">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={goToNext} aria-label="Next document" className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 bg-black/20 hover:bg-black/35 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105 text-white z-10 border border-white/10">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}

        <div className="px-5 sm:px-8 pb-5 sm:pb-6 pt-1">
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-white/80 transition-all duration-500" style={{ width: `${((currentIndex + 1) / displayDocs.length) * 100}%` }} />
          </div>
          <div className="flex items-center justify-center gap-2 mt-4" role="tablist" aria-label="Featured document slides">
            {displayDocs.map((doc, index) => (
              <button
                key={doc.id || index}
                onClick={() => goTo(index)}
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Go to document ${index + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
          <div className="text-center mt-3 text-xs text-white/70 sm:hidden">
            {currentIndex + 1} / {displayDocs.length} {isShowingLatest ? '• Latest' : ''}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DocumentCarousel;
