import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const BookmarkContext = createContext();

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};

export const BookmarkProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [bookmarks, setBookmarks] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    if (user && db) {
      loadBookmarks();
    }
    if (db) {
      loadTrending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadBookmarks = async () => {
    if (!user || !db) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'bookmarks'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setBookmarks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const loadTrending = async () => {
    try {
      const q = query(collection(db, 'trending'), orderBy('viewCount', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      setTrending(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error loading trending:', error);
    }
  };

  const toggleBookmark = async (document) => {
    if (!user) {
      addToast('Please login to bookmark documents', 'warning');
      return;
    }
    try {
      const existing = bookmarks.find(b => b.documentId === document.id);
      if (existing) {
        await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', existing.id));
        setBookmarks(prev => prev.filter(b => b.id !== existing.id));
        addToast('Bookmark removed', 'info');
      } else {
        const bookmark = {
          documentId: document.id,
          title: document.title,
          courseId: document.courseId,
          semesterId: document.semesterId,
          unitId: document.unitId,
          filePath: document.filePath,
          thumbnailUrl: document.thumbnailUrl,
          description: document.description,
          createdAt: serverTimestamp()
        };
        const docRef = await setDoc(doc(collection(db, 'users', user.uid, 'bookmarks')), bookmark);
        setBookmarks(prev => [{ id: docRef.id, ...bookmark }, ...prev]);
        addToast('Bookmarked!', 'success');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      addToast('Failed to update bookmark', 'error');
    }
  };

  const addRecentSearch = async (searchTerm) => {
    if (!user || !searchTerm.trim()) return;
    try {
      const recent = {
        term: searchTerm.trim(),
        createdAt: serverTimestamp()
      };
      const docRef = await setDoc(doc(collection(db, 'users', user.uid, 'recentSearches')), recent);
      setRecentSearches(prev => [{ id: docRef.id, ...recent }, ...prev.filter(s => s.term !== searchTerm.trim())].slice(0, 10));
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const clearRecentSearches = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'recentSearches'));
      const snapshot = await getDocs(q);
      const batch = [];
      snapshot.docs.forEach(doc => batch.push(deleteDoc(doc.ref)));
      await Promise.all(batch);
      setRecentSearches([]);
      addToast('Search history cleared', 'success');
    } catch (error) {
      console.error('Error clearing searches:', error);
    }
  };

  const isBookmarked = (documentId) => {
    return bookmarks.some(b => b.documentId === documentId);
  };

  const value = {
    bookmarks,
    recentSearches,
    trending,
    toggleBookmark,
    addRecentSearch,
    clearRecentSearches,
    isBookmarked,
    loadBookmarks,
    loadTrending
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
};

export default BookmarkContext;
