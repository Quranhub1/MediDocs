import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const StudyContext = createContext();

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within a StudyProvider');
  return context;
};

const emptyStreak = {
  current: 0,
  longest: 0,
  lastStudyDate: null,
  totalStudyTime: 0,
  totalStudySeconds: 0
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const StudyProvider = ({ children }) => {
  // AuthContext exposes currentUser, not user. The previous mismatch silently
  // disabled every user-scoped study write and made buttons appear dead.
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [streak, setStreak] = useState(emptyStreak);
  const [badges, setBadges] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studyNotes, setStudyNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStreak = useCallback(async () => {
    if (!currentUser || !db) {
      setStreak(emptyStreak);
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'userStudyData', currentUser.uid));
      if (!snap.exists()) {
        setStreak(emptyStreak);
        return;
      }
      const data = snap.data();
      const totalStudySeconds =
        Number(data.totalStudySeconds) ||
        Math.round((Number(data.totalStudyTime) || 0) * 60);
      setStreak({
        current: Number(data.currentStreak) || 0,
        longest: Number(data.longestStreak) || 0,
        lastStudyDate: normalizeDate(data.lastStudyDate),
        totalStudyTime: Math.floor(totalStudySeconds / 60),
        totalStudySeconds
      });
    } catch (error) {
      console.error('[STUDY] Failed to load streak:', error);
    }
  }, [currentUser]);

  const loadBadges = useCallback(async () => {
    if (!currentUser || !db) {
      setBadges([]);
      return;
    }
    try {
      const q = query(
        collection(db, 'users', currentUser.uid, 'badges'),
        orderBy('earnedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setBadges(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error('[BADGES] Failed to load badges:', error);
    }
  }, [currentUser]);

  const loadStudyNotes = useCallback(async () => {
    if (!currentUser || !db) {
      setStudyNotes([]);
      return;
    }
    try {
      const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'studyNotes'));
      const notes = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          const aTime = normalizeDate(a.createdAt)?.getTime() || 0;
          const bTime = normalizeDate(b.createdAt)?.getTime() || 0;
          return bTime - aTime;
        });
      setStudyNotes(notes);
      console.info('[NOTES] Loaded saved notes:', notes.length);
    } catch (error) {
      console.error('[NOTES] Failed to load saved notes:', error);
      setStudyNotes([]);
      addToast('Could not load your saved notes', 'error');
    }
  }, [currentUser, addToast]);

  const loadFlashcards = useCallback(async () => {
    if (!currentUser || !db) {
      setFlashcards([]);
      return;
    }
    try {
      const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'flashcards'));
      const cards = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          const aTime = normalizeDate(a.createdAt)?.getTime() || 0;
          const bTime = normalizeDate(b.createdAt)?.getTime() || 0;
          return bTime - aTime;
        });
      setFlashcards(cards);
      console.info('[FLASHCARDS] Loaded saved flashcards:', cards.length);
    } catch (error) {
      console.error('[FLASHCARDS] Failed to load saved flashcards:', error);
      setFlashcards([]);
      addToast('Could not load your flashcards', 'error');
    }
  }, [currentUser, addToast]);

  const loadQuizzes = useCallback(async () => {
    if (!currentUser || !db) {
      setQuizzes([]);
      return;
    }
    try {
      const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'quizzes'));
      const items = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          const aTime = normalizeDate(a.createdAt)?.getTime() || 0;
          const bTime = normalizeDate(b.createdAt)?.getTime() || 0;
          return bTime - aTime;
        });
      setQuizzes(items);
      console.info('[QUIZ] Loaded saved quiz records:', items.length);
    } catch (error) {
      console.error('[QUIZ] Failed to load saved quiz records:', error);
      setQuizzes([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !db) {
      setStreak(emptyStreak);
      setBadges([]);
      setFlashcards([]);
      setQuizzes([]);
      setStudyNotes([]);
      return;
    }

    void Promise.all([
      loadStreak(),
      loadBadges(),
      loadFlashcards(),
      loadQuizzes(),
      loadStudyNotes()
    ]).catch((error) => {
      console.error('[STUDY] Failed to initialise study data:', error);
    });
  }, [
    currentUser,
    loadStreak,
    loadBadges,
    loadFlashcards,
    loadQuizzes,
    loadStudyNotes
  ]);

  useEffect(() => {
    const refresh = () => void loadStreak();
    window.addEventListener('medidocs:study-time-updated', refresh);
    return () => window.removeEventListener('medidocs:study-time-updated', refresh);
  }, [loadStreak]);

  const recordStudySession = async (durationMinutes = 0) => {
    if (!currentUser || !db) return false;
    if (durationMinutes === 5) {
      console.warn('[STUDY TIME] Ignoring deprecated synthetic 5-minute session.');
      return false;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'userStudyData', currentUser.uid);
      const snapshot = await getDoc(docRef);
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      const old = snapshot.exists() ? snapshot.data() : {};
      const lastDate = normalizeDate(old.lastStudyDate);
      const lastDateString = lastDate?.toDateString();
      const current = Number(old.currentStreak) || 0;
      const longest = Number(old.longestStreak) || 0;
      const total = Number(old.totalStudyTime) || 0;

      let newStreak = 1;
      if (lastDateString === today) newStreak = Math.max(current, 1);
      else if (lastDateString === yesterday) newStreak = current + 1;

      const newLongest = Math.max(longest, newStreak);
      const newTotal = total + Math.max(0, Number(durationMinutes) || 0);

      await setDoc(docRef, {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastStudyDate: serverTimestamp(),
        totalStudyTime: newTotal,
        totalStudySeconds: newTotal * 60,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setStreak({
        current: newStreak,
        longest: newLongest,
        lastStudyDate: new Date(),
        totalStudyTime: newTotal,
        totalStudySeconds: newTotal * 60
      });

      await checkAndAwardBadges(newStreak, durationMinutes);
      return true;
    } catch (error) {
      console.error('[STUDY] Failed to record study session:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const recordDocumentView = async (documentId) => {
    if (!currentUser || !db || !documentId) return false;

    try {
      const studyRef = doc(db, 'userStudyData', currentUser.uid);
      const snapshot = await getDoc(studyRef);
      const existing = snapshot.exists() ? snapshot.data() : {};
      const documentsViewed = Number(existing.documentsViewed) || 0;

      await setDoc(studyRef, {
        documentsViewed: documentsViewed + 1,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.info('[ANALYTICS] Document view recorded:', {
        uid: currentUser.uid,
        documentId,
        documentsViewed: documentsViewed + 1
      });
      return true;
    } catch (error) {
      console.error('[ANALYTICS] Failed to record document view:', error);
      return false;
    }
  };

  const checkAndAwardBadges = async (streakDays, studyMinutes) => {
    if (!currentUser || !db) return;
    const newBadges = [];

    if (streakDays >= 7 && !badges.some((b) => b.type === 'streak_7')) {
      newBadges.push({
        type: 'streak_7',
        name: 'Week Warrior',
        description: '7 day study streak',
        icon: '🔥'
      });
    }
    if (streakDays >= 30 && !badges.some((b) => b.type === 'streak_30')) {
      newBadges.push({
        type: 'streak_30',
        name: 'Monthly Master',
        description: '30 day study streak',
        icon: '🏆'
      });
    }
    if (studyMinutes >= 60 && !badges.some((b) => b.type === 'study_1h')) {
      newBadges.push({
        type: 'study_1h',
        name: 'Dedicated Learner',
        description: 'Studied for 1 hour',
        icon: '📚'
      });
    }

    for (const badge of newBadges) {
      try {
        const badgeRef = doc(collection(db, 'users', currentUser.uid, 'badges'));
        await setDoc(badgeRef, { ...badge, earnedAt: serverTimestamp() });
      } catch (error) {
        console.error('[BADGES] Failed to award badge:', error);
      }
    }

    if (newBadges.length) {
      setBadges((prev) => [
        ...newBadges.map((badge, index) => ({ ...badge, id: `local-${Date.now()}-${index}` })),
        ...prev
      ]);
      addToast(`🎉 New badge earned: ${newBadges[0].name}!`, 'success');
    }
  };

  const createFlashcard = async (front, back, courseId = null, unitId = null) => {
    if (!currentUser || !db) {
      addToast('Please sign in before creating flashcards', 'error');
      return null;
    }

    const cleanFront = String(front || '').trim();
    const cleanBack = String(back || '').trim();
    if (!cleanFront || !cleanBack) {
      addToast('Both the front and back of the flashcard are required', 'error');
      return null;
    }

    try {
      const cardRef = doc(collection(db, 'users', currentUser.uid, 'flashcards'));
      const card = {
        front: cleanFront,
        back: cleanBack,
        courseId: courseId || null,
        unitId: unitId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        nextReview: serverTimestamp(),
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5
      };

      // setDoc returns void. Always use the generated ref for the id.
      await setDoc(cardRef, card);
      const saved = {
        ...card,
        id: cardRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        nextReview: new Date()
      };
      setFlashcards((prev) => [saved, ...prev]);
      console.info('[FLASHCARDS] Saved card:', cardRef.id);
      addToast('Flashcard saved!', 'success');
      return saved;
    } catch (error) {
      console.error('[FLASHCARDS] Failed to save card:', error);
      addToast(`Failed to save flashcard: ${error.message || 'unknown error'}`, 'error');
      return null;
    }
  };

  const updateFlashcardReview = async (flashcardId, quality) => {
    if (!currentUser || !db || !flashcardId) return false;

    const numericQuality = Math.max(0, Math.min(5, Number(quality)));
    const flashcard = flashcards.find((item) => item.id === flashcardId);
    if (!flashcard) {
      console.error('[FLASHCARDS] Card not found in local state:', flashcardId);
      return false;
    }

    try {
      let interval = Number(flashcard.interval) || 1;
      let repetitions = Number(flashcard.repetitions) || 0;
      let easeFactor = Number(flashcard.easeFactor) || 2.5;

      easeFactor = Math.max(
        1.3,
        easeFactor + (0.1 - (5 - numericQuality) * (0.08 + (5 - numericQuality) * 0.02))
      );

      if (numericQuality >= 3) {
        repetitions += 1;
        interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.max(1, Math.round(interval * easeFactor));
      } else {
        repetitions = 0;
        interval = 1;
      }

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      await updateDoc(doc(db, 'users', currentUser.uid, 'flashcards', flashcardId), {
        interval,
        repetitions,
        easeFactor,
        nextReview,
        updatedAt: serverTimestamp()
      });

      setFlashcards((prev) => prev.map((item) =>
        item.id === flashcardId
          ? { ...item, interval, repetitions, easeFactor, nextReview, updatedAt: new Date() }
          : item
      ));
      console.info('[FLASHCARDS] Review saved:', { flashcardId, quality: numericQuality, interval, nextReview });
      return true;
    } catch (error) {
      console.error('[FLASHCARDS] Failed to save review:', error);
      addToast('Failed to save flashcard progress', 'error');
      return false;
    }
  };

  const createQuiz = async (questions, courseId = null, unitId = null) => {
    if (!currentUser || !db) {
      addToast('Please sign in before creating a quiz', 'error');
      return null;
    }
    try {
      const quizRef = doc(collection(db, 'users', currentUser.uid, 'quizzes'));
      const quiz = {
        questions: Array.isArray(questions) ? questions : [],
        courseId: courseId || null,
        unitId: unitId || null,
        createdAt: serverTimestamp(),
        completed: false,
        score: 0
      };
      await setDoc(quizRef, quiz);
      const saved = { id: quizRef.id, ...quiz, createdAt: new Date() };
      setQuizzes((prev) => [saved, ...prev]);
      console.info('[QUIZ] Created quiz record:', quizRef.id);
      return saved;
    } catch (error) {
      console.error('[QUIZ] Failed to create quiz:', error);
      addToast('Failed to create quiz', 'error');
      return null;
    }
  };

  const submitQuizResult = async (quizId, score, totalQuestions, metadata = {}) => {
    if (!currentUser || !db) {
      addToast('Please sign in to save quiz progress', 'error');
      return false;
    }

    try {
      const scoreValue = Number(score) || 0;
      const totalValue = Number(totalQuestions) || 0;
      const ref = doc(db, 'users', currentUser.uid, 'quizzes', String(quizId));

      await setDoc(ref, {
        quizId: String(quizId),
        score: scoreValue,
        totalQuestions: totalValue,
        percentage: totalValue ? Math.round((scoreValue / totalValue) * 100) : 0,
        completed: true,
        ...metadata,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setQuizzes((prev) => {
        const existing = prev.find((item) => item.id === String(quizId));
        const updated = {
          ...(existing || {}),
          id: String(quizId),
          quizId: String(quizId),
          score: scoreValue,
          totalQuestions: totalValue,
          completed: true,
          ...metadata
        };
        return existing
          ? prev.map((item) => item.id === String(quizId) ? updated : item)
          : [updated, ...prev];
      });

      addToast(`Quiz saved! Score: ${scoreValue}/${totalValue}`, 'success');
      console.info('[QUIZ] Result saved:', {
        quizId: String(quizId),
        score: scoreValue,
        totalQuestions: totalValue
      });
      return true;
    } catch (error) {
      console.error('[QUIZ] Failed to save result:', error);
      addToast(`Failed to save quiz result: ${error.message || 'unknown error'}`, 'error');
      return false;
    }
  };

  const addStudyNote = async (content, courseId = null, unitId = null, documentId = null) => {
    if (!currentUser || !db) {
      addToast('Please sign in before saving notes', 'error');
      return null;
    }

    const cleanContent = String(content || '').trim();
    if (!cleanContent) {
      addToast('Write something before saving the note', 'error');
      return null;
    }

    try {
      const noteRef = doc(collection(db, 'users', currentUser.uid, 'studyNotes'));
      const note = {
        content: cleanContent,
        courseId: courseId || null,
        unitId: unitId || null,
        documentId: documentId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        shared: false
      };

      await setDoc(noteRef, note);
      const saved = {
        ...note,
        id: noteRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setStudyNotes((prev) => [saved, ...prev]);
      console.info('[NOTES] Saved note:', noteRef.id);
      addToast('Note saved to your account!', 'success');
      return saved;
    } catch (error) {
      console.error('[NOTES] Failed to save note:', error);
      addToast(`Failed to save note: ${error.message || 'unknown error'}`, 'error');
      return null;
    }
  };

  const updateStudyNote = async (noteId, content) => {
    if (!currentUser || !db || !noteId) return false;
    const cleanContent = String(content || '').trim();
    if (!cleanContent) return false;

    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'studyNotes', noteId), {
        content: cleanContent,
        updatedAt: serverTimestamp()
      });
      setStudyNotes((prev) => prev.map((note) =>
        note.id === noteId ? { ...note, content: cleanContent, updatedAt: new Date() } : note
      ));
      return true;
    } catch (error) {
      console.error('[NOTES] Failed to update note:', error);
      addToast('Failed to update note', 'error');
      return false;
    }
  };

  const shareStudyNote = async (noteId) => {
    if (!currentUser || !db || !noteId) return false;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'studyNotes', noteId), {
        shared: true,
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setStudyNotes((prev) => prev.map((note) =>
        note.id === noteId ? { ...note, shared: true, sharedAt: new Date() } : note
      ));
      addToast('Note shared with classmates!', 'success');
      return true;
    } catch (error) {
      console.error('[NOTES] Failed to share note:', error);
      addToast('Failed to share note', 'error');
      return false;
    }
  };

  const value = {
    streak,
    badges,
    flashcards,
    quizzes,
    studyNotes,
    loading,
    recordStudySession,
    recordDocumentView,
    createFlashcard,
    updateFlashcardReview,
    createQuiz,
    submitQuizResult,
    addStudyNote,
    updateStudyNote,
    shareStudyNote,
    loadStreak,
    loadBadges,
    loadFlashcards,
    loadQuizzes,
    loadStudyNotes
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export default StudyContext;
