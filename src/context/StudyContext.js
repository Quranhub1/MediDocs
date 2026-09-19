import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  onSnapshot,
  runTransaction
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
  totalStudySeconds: 0,
  documentsViewed: 0,
  documentsDownloaded: 0,
  activityByCourse: {}
};

const getDateKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Firestore document IDs cannot contain "/" because it is a path separator.
// Analytics IDs are full Firestore paths, so encode them before using them as
// documentStats document IDs while keeping the original ID in the stored data.
const getSafeStatId = (documentId) => encodeURIComponent(String(documentId)).slice(0, 1500);

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
  const [learningReviews, setLearningReviews] = useState([]);
  const [learningStatsByCourse, setLearningStatsByCourse] = useState({});

  const loadStreak = useCallback(async () => {
    if (!currentUser || !db) {
      setStreak(emptyStreak);
      setLearningStatsByCourse({});
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'userStudyData', currentUser.uid));
      if (!snap.exists()) {
        setStreak(emptyStreak);
        setLearningStatsByCourse({});
        return;
      }
      const data = snap.data();
      const totalStudySeconds =
        Number(data.totalStudySeconds) ||
        Math.round((Number(data.totalStudyTime) || 0) * 60);
      setLearningStatsByCourse(data.learningStatsByCourse || {});
      setStreak({
        current: Number(data.currentStreak) || 0,
        longest: Number(data.longestStreak) || 0,
        lastStudyDate: normalizeDate(data.lastStudyDate),
        totalStudyTime: Math.floor(totalStudySeconds / 60),
        totalStudySeconds,
        documentsViewed: Number(data.documentsViewed) || 0,
        documentsDownloaded: Number(data.documentsDownloaded) || 0,
        activityByCourse: data.activityByCourse || {}
      });
    } catch (error) {
      console.error('[STUDY] Failed to load streak:', error);
    }
  }, [currentUser]);

  const loadLearningReviews = useCallback(async () => {
    if (!currentUser || !db) {
      setLearningReviews([]);
      return;
    }
    try {
      const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'learningReviews'));
      const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setLearningReviews(items);
      console.info('[LEARNING] Loaded review schedule:', items.length);
    } catch (error) {
      console.error('[LEARNING] Failed to load review schedule:', error);
      setLearningReviews([]);
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
      setLearningStatsByCourse({});
      setBadges([]);
      setFlashcards([]);
      setQuizzes([]);
      setStudyNotes([]);
      setLearningReviews([]);
      return undefined;
    }

    const unsubscribeStudy = onSnapshot(
      doc(db, 'userStudyData', currentUser.uid),
      (snap) => {
        if (!snap.exists()) {
          setStreak(emptyStreak);
          setLearningStatsByCourse({});
          return;
        }
        const data = snap.data();
        const totalStudySeconds =
          Number(data.totalStudySeconds) ||
          Math.round((Number(data.totalStudyTime) || 0) * 60);
        setLearningStatsByCourse(data.learningStatsByCourse || {});
        setStreak({
          current: Number(data.currentStreak) || 0,
          longest: Number(data.longestStreak) || 0,
          lastStudyDate: normalizeDate(data.lastStudyDate),
          totalStudyTime: Math.floor(totalStudySeconds / 60),
          totalStudySeconds,
          documentsViewed: Number(data.documentsViewed) || 0,
          documentsDownloaded: Number(data.documentsDownloaded) || 0,
          activityByCourse: data.activityByCourse || {}
        });
      },
      (error) => console.error('[REALTIME] Study data listener failed:', error)
    );

    void Promise.all([
      loadBadges(),
      loadFlashcards(),
      loadQuizzes(),
      loadStudyNotes(),
      loadLearningReviews()
    ]).catch((error) => {
      console.error('[STUDY] Failed to initialise study data:', error);
    });

    return unsubscribeStudy;
  }, [
    currentUser,
    loadBadges,
    loadFlashcards,
    loadQuizzes,
    loadStudyNotes,
    loadLearningReviews
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
      const addedMinutes = Math.max(0, Number(durationMinutes) || 0);
      const newTotal = total + addedMinutes;
      const todayKey = getDateKey(new Date());
      const dailyStudySeconds = { ...(old.dailyStudySeconds || {}) };
      dailyStudySeconds[todayKey] = (Number(dailyStudySeconds[todayKey]) || 0) + (addedMinutes * 60);

      await setDoc(docRef, {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastStudyDate: serverTimestamp(),
        totalStudyTime: newTotal,
        totalStudySeconds: newTotal * 60,
        dailyStudySeconds,
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

  const recordDocumentView = async (documentId, metadata = {}) => {
    if (!currentUser || !db || !documentId) return false;
    const cleanId = String(documentId);
    try {
      const studyRef = doc(db, 'userStudyData', currentUser.uid);
      const statRef = doc(db, 'users', currentUser.uid, 'documentStats', getSafeStatId(cleanId));
      const result = await runTransaction(db, async (transaction) => {
        const statSnap = await transaction.get(statRef);
        const studySnap = await transaction.get(studyRef);
        const stat = statSnap.exists() ? statSnap.data() : {};
        const viewedBefore = Boolean(stat.viewed);
        const views = (Number(stat.views) || 0) + 1;
        const study = studySnap.exists() ? studySnap.data() : {};
        const uniqueViewed = (Number(study.documentsViewed) || 0) + (viewedBefore ? 0 : 1);
        const courseKey = String(metadata.courseId || metadata.courseName || metadata.course || 'Other')
          .replaceAll('.', '_').replaceAll('/', '_').replaceAll('\\\\', '_').slice(0, 120) || 'Other';
        const activityByCourse = { ...(study.activityByCourse || {}) };
        const currentCourse = activityByCourse[courseKey] || { viewed: 0, downloads: 0 };
        if (!viewedBefore) currentCourse.viewed = (Number(currentCourse.viewed) || 0) + 1;
        activityByCourse[courseKey] = currentCourse;
        const update = {
          viewed: true,
          views,
          lastViewedAt: serverTimestamp(),
          ...metadata
        };
        transaction.set(statRef, update, { merge: true });
        transaction.set(studyRef, {
          documentsViewed: uniqueViewed,
          totalDocumentViews: increment(1),
          activityByCourse,
          lastDocumentViewedId: cleanId,
          lastDocumentViewedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        return { uniqueViewed, views };
      });
      setStreak((prev) => ({ ...prev, documentsViewed: result.uniqueViewed }));
      window.dispatchEvent(new CustomEvent('medidocs:document-activity-updated', { detail: { type: 'view', documentId: cleanId, uniqueViewed: result.uniqueViewed } }));
      console.info('[ANALYTICS] Document view recorded:', { documentId: cleanId, ...result });
      return true;
    } catch (error) {
      console.error('[ANALYTICS] Failed to record document view:', error);
      return false;
    }
  };

  const recordDocumentDownload = async (documentId, metadata = {}) => {
    if (!currentUser || !db || !documentId) return false;
    const cleanId = String(documentId);
    try {
      const studyRef = doc(db, 'userStudyData', currentUser.uid);
      const statRef = doc(db, 'users', currentUser.uid, 'documentStats', cleanId);
      await runTransaction(db, async (transaction) => {
        const statSnap = await transaction.get(statRef);
        const studySnap = await transaction.get(studyRef);
        const stat = statSnap.exists() ? statSnap.data() : {};
        const study = studySnap.exists() ? studySnap.data() : {};
        const courseKey = String(metadata.courseId || metadata.courseName || metadata.course || 'Other')
          .replaceAll('.', '_').replaceAll('/', '_').replaceAll('\\\\', '_').slice(0, 120) || 'Other';
        const activityByCourse = { ...(study.activityByCourse || {}) };
        const currentCourse = activityByCourse[courseKey] || { viewed: 0, downloads: 0 };
        currentCourse.downloads = (Number(currentCourse.downloads) || 0) + 1;
        activityByCourse[courseKey] = currentCourse;
        transaction.set(statRef, {
          viewed: true,
          downloads: (Number(stat.downloads) || 0) + 1,
          lastDownloadedAt: serverTimestamp(),
          ...metadata
        }, { merge: true });
        transaction.set(studyRef, {
          documentsDownloaded: increment(1),
          activityByCourse,
          lastDocumentDownloadedId: cleanId,
          lastDocumentDownloadedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      });
      setStreak((prev) => ({ ...prev, documentsDownloaded: (Number(prev.documentsDownloaded) || 0) + 1 }));
      window.dispatchEvent(new CustomEvent('medidocs:document-activity-updated', { detail: { type: 'download', documentId: cleanId } }));
      console.info('[ANALYTICS] Document download recorded:', { documentId: cleanId });
      return true;
    } catch (error) {
      console.error('[ANALYTICS] Failed to record document download:', error);
      return false;
    }
  };

  const recordDocumentProgress = async (documentId, seconds = 0, progressPercent = null, metadata = {}) => {
    if (!currentUser || !db || !documentId) return false;
    const cleanId = String(documentId);
    const addedSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    if (addedSeconds < 1 && progressPercent == null) return false;
    try {
      const statRef = doc(db, 'users', currentUser.uid, 'documentStats', cleanId);
      const studyRef = doc(db, 'userStudyData', currentUser.uid);
      await runTransaction(db, async (transaction) => {
        const statSnap = await transaction.get(statRef);
        const stat = statSnap.exists() ? statSnap.data() : {};
        const currentProgress = Number(stat.progressPercent) || 0;
        const nextProgress = progressPercent == null
          ? currentProgress
          : Math.max(currentProgress, Math.min(100, Number(progressPercent) || 0));
        transaction.set(statRef, {
          viewed: true,
          totalSeconds: (Number(stat.totalSeconds) || 0) + addedSeconds,
          progressPercent: nextProgress,
          lastProgressAt: serverTimestamp(),
          ...metadata
        }, { merge: true });
        transaction.set(studyRef, {
          totalDocumentStudySeconds: increment(addedSeconds),
          updatedAt: serverTimestamp()
        }, { merge: true });
      });
      window.dispatchEvent(new CustomEvent('medidocs:document-progress-updated', {
        detail: { documentId: cleanId, seconds: addedSeconds, progressPercent }
      }));
      return true;
    } catch (error) {
      console.error('[ANALYTICS] Failed to record document progress:', error);
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

  const recordLearningReview = async (itemId, rating, metadata = {}) => {
    if (!currentUser || !db || !itemId) return false;
    const cleanRating = ['again', 'hard', 'easy'].includes(rating) ? rating : 'again';
    try {
      const reviewRef = doc(db, 'users', currentUser.uid, 'learningReviews', String(itemId));
      const studyRef = doc(db, 'userStudyData', currentUser.uid);
      // Keep performance aggregates keyed by the human-readable course name.
      // Quiz records may also carry courseId, but LearningHub ranks questions by
      // course name. Using one canonical key keeps adaptive prioritisation aligned.
      const courseKey = String(metadata.course || metadata.courseId || 'General')
        .replaceAll('.', '_')
        .replaceAll('/', '_')
        .replaceAll('\\\\', '_')
        .slice(0, 120) || 'General';

      const result = await runTransaction(db, async (transaction) => {
        const previousSnap = await transaction.get(reviewRef);
        const studySnap = await transaction.get(studyRef);
        const previousData = previousSnap.exists() ? previousSnap.data() : {};
        const intervals = {
          again: 1,
          hard: Math.max(1, Math.round(Number(previousData.interval) || 1)),
          easy: Math.max(2, Math.round((Number(previousData.interval) || 1) * 2.5))
        };
        const interval = intervals[cleanRating];
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + interval);
        const hasCorrect = typeof metadata.correct === 'boolean';
        const correct = hasCorrect ? metadata.correct : null;

        transaction.set(reviewRef, {
          itemId: String(itemId),
          rating: cleanRating,
          interval,
          repetitions: cleanRating === 'again' ? 0 : (Number(previousData.repetitions) || 0) + 1,
          nextReview,
          correct,
          course: metadata.course || previousData.course || null,
          ...metadata,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        const previousStats = studySnap.exists()
          ? (studySnap.data().learningStatsByCourse || {})
          : {};
        const currentStats = previousStats[courseKey] || { attempts: 0, correct: 0 };
        const nextStats = {
          attempts: Number(currentStats.attempts) || 0,
          correct: Number(currentStats.correct) || 0
        };

        // Only count an answer as a performance attempt when the caller supplied
        // an explicit correctness value. Re-rating a review without an answer
        // must not inflate course accuracy.
        if (hasCorrect) {
          nextStats.attempts += 1;
          if (correct) nextStats.correct += 1;
        }

        const learningStatsByCourse = {
          ...previousStats,
          [courseKey]: nextStats
        };
        transaction.set(studyRef, {
          learningStatsByCourse,
          updatedAt: serverTimestamp()
        }, { merge: true });

        return { interval, nextReview, correct, learningStatsByCourse };
      });

      setLearningStatsByCourse(result.learningStatsByCourse || {});
      setLearningReviews((prev) => {
        const next = {
          id: String(itemId),
          itemId: String(itemId),
          rating: cleanRating,
          interval: result.interval,
          nextReview: result.nextReview,
          correct: result.correct,
          ...metadata
        };
        return [next, ...prev.filter((item) => item.id !== String(itemId))];
      });
      console.info('[LEARNING] Review saved:', {
        itemId: String(itemId),
        rating: cleanRating,
        interval: result.interval,
        course: metadata.course || 'General'
      });
      return true;
    } catch (error) {
      console.error('[LEARNING] Failed to save review:', error);
      return false;
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
    learningReviews,
    learningStatsByCourse,
    loading,
    recordStudySession,
    recordDocumentView,
    recordDocumentDownload,
    createFlashcard,
    updateFlashcardReview,
    recordLearningReview,
    createQuiz,
    submitQuizResult,
    addStudyNote,
    updateStudyNote,
    shareStudyNote,
    loadStreak,
    loadBadges,
    loadFlashcards,
    loadQuizzes,
    loadStudyNotes,
    loadLearningReviews
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export default StudyContext;
