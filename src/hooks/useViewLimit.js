import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'medidocs_viewed_docs';
const FREE_VIEW_LIMIT = 3;

const readViewed = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeViewed = (ids) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-50)));
  } catch {}
};

// Tracks how many distinct free documents a user has opened.
// Subscribers (active, non-expired) bypass the limit.
export const useViewLimit = (userProfile) => {
  const [viewedIds, setViewedIds] = useState([]);

  const isSubscriber = !!(
    userProfile &&
    !userProfile.banned &&
    userProfile.subscriptionApproved &&
    userProfile.subscriptionStatus === 'active' &&
    (!userProfile.subscriptionExpiry || new Date(userProfile.subscriptionExpiry) > new Date())
  );

  useEffect(() => {
    if (isSubscriber) {
      setViewedIds([]);
    } else {
      setViewedIds(readViewed());
    }
  }, [isSubscriber]);

  const viewedCount = viewedIds.length;
  const limitReached = !isSubscriber && viewedCount >= FREE_VIEW_LIMIT;

  const hasViewed = useCallback((docId) => viewedIds.includes(docId), [viewedIds]);

  const recordView = useCallback((docId) => {
    if (!docId || isSubscriber) return false;
    let added = false;
    setViewedIds((prev) => {
      if (prev.includes(docId)) return prev;
      added = true;
      const next = [...prev, docId];
      writeViewed(next);
      return next;
    });
    return added;
  }, [isSubscriber]);

  return { viewedCount, limitReached, hasViewed, recordView, isSubscriber, FREE_VIEW_LIMIT };
};

export { FREE_VIEW_LIMIT };
