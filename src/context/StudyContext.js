import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const StudyContext = createContext();

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
};

export const StudyProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [streak, setStreak] = useState({ current: 0, longest: 0, lastStudyDate: null });
  const [badges, setBadges] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studyNotes, setStudyNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadStreak();
      loadBadges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadStreak = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'userStudyData', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStreak({
          current: data.currentStreak || 0,
          longest: data.longestStreak || 0,
          lastStudyDate: data.lastStudyDate?.toDate?.() || data.lastStudyDate
        });
      }
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };

  const loadBadges = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'badges'), orderBy('earnedAt', 'desc'));
      const snapshot = await getDocs(q);
      setBadges(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const recordStudySession = async (durationMinutes = 0) => {
    if (!user) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'userStudyData', user.uid);
      const docSnap = await getDoc(docRef);
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      let newStreak = streak.current;
      let newLongest = streak.longest;
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lastDate = data.lastStudyDate?.toDate?.() || new Date(data.lastStudyDate);
        const lastDateStr = lastDate.toDateString();
        
        if (lastDateStr === today) {
          newStreak = data.currentStreak || 1;
        } else if (lastDateStr === yesterday) {
          newStreak = (data.currentStreak || 0) + 1;
        } else {
          newStreak = 1;
        }
        newLongest = Math.max(newLongest, newStreak);
        
        await updateDoc(docRef, {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastStudyDate: serverTimestamp(),
          totalStudyTime: (data.totalStudyTime || 0) + durationMinutes,
          updatedAt: serverTimestamp()
        });
      } else {
        newStreak = 1;
        newLongest = 1;
        await setDoc(docRef, {
          currentStreak: 1,
          longestStreak: 1,
          lastStudyDate: serverTimestamp(),
          totalStudyTime: durationMinutes,
          createdAt: serverTimestamp()
        });
      }
      
      setStreak({
        current: newStreak,
        longest: newLongest,
        lastStudyDate: new Date()
      });

      await checkAndAwardBadges(newStreak, durationMinutes);
      
      if (newStreak > 0 && newStreak % 7 === 0) {
        addToast(`🔥 ${newStreak} day streak! Keep it up!`, 'success');
      }
    } catch (error) {
      console.error('Error recording study session:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAndAwardBadges = async (streakDays, studyMinutes) => {
    if (!user) return;
    const newBadges = [];
    
    if (streakDays >= 7 && !badges.find(b => b.type === 'streak_7')) {
      newBadges.push({ type: 'streak_7', name: 'Week Warrior', description: '7 day study streak', icon: '🔥' });
    }
    if (streakDays >= 30 && !badges.find(b => b.type === 'streak_30')) {
      newBadges.push({ type: 'streak_30', name: 'Monthly Master', description: '30 day study streak', icon: '🏆' });
    }
    if (studyMinutes >= 60 && !badges.find(b => b.type === 'study_1h')) {
      newBadges.push({ type: 'study_1h', name: 'Dedicated Learner', description: 'Studied for 1 hour', icon: '📚' });
    }
    
    for (const badge of newBadges) {
      try {
        await setDoc(doc(collection(db, 'users', user.uid, 'badges')), {
          ...badge,
          earnedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error awarding badge:', error);
      }
    }
    
    if (newBadges.length > 0) {
      setBadges(prev => [...newBadges.map(b => ({ ...b, id: Date.now() + Math.random() })), ...prev]);
      addToast(`🎉 New badge earned: ${newBadges[0].name}!`, 'success');
    }
  };

  const createFlashcard = async (front, back, courseId, unitId) => {
    if (!user) return;
    try {
      const flashcard = {
        front,
        back,
        courseId,
        unitId,
        createdAt: serverTimestamp(),
        nextReview: serverTimestamp(),
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5
      };
      const docRef = await setDoc(doc(collection(db, 'users', user.uid, 'flashcards')), flashcard);
      setFlashcards(prev => [...prev, { id: docRef.id, ...flashcard }]);
      addToast('Flashcard created!', 'success');
      return docRef;
    } catch (error) {
      console.error('Error creating flashcard:', error);
      addToast('Failed to create flashcard', 'error');
    }
  };

  const updateFlashcardReview = async (flashcardId, quality) => {
    if (!user) return;
    try {
      const flashcard = flashcards.find(f => f.id === flashcardId);
      if (!flashcard) return;

      let { interval, repetitions, easeFactor } = flashcard;
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      
      if (quality >= 3) {
        repetitions += 1;
        interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(interval * easeFactor);
      } else {
        repetitions = 0;
        interval = 1;
      }

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      await updateDoc(doc(db, 'users', user.uid, 'flashcards', flashcardId), {
        interval,
        repetitions,
        easeFactor,
        nextReview: serverTimestamp()
      });

      setFlashcards(prev => prev.map(f => 
        f.id === flashcardId ? { ...f, interval, repetitions, easeFactor, nextReview } : f
      ));
    } catch (error) {
      console.error('Error updating flashcard:', error);
    }
  };

  const createQuiz = async (questions, courseId, unitId) => {
    if (!user) return;
    try {
      const quiz = {
        questions,
        courseId,
        unitId,
        createdAt: serverTimestamp(),
        completed: false,
        score: 0
      };
      const docRef = await setDoc(doc(collection(db, 'users', user.uid, 'quizzes')), quiz);
      setQuizzes(prev => [...prev, { id: docRef.id, ...quiz }]);
      return docRef;
    } catch (error) {
      console.error('Error creating quiz:', error);
    }
  };

  const submitQuizResult = async (quizId, score, totalQuestions) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'quizzes', quizId), {
        completed: true,
        score,
        totalQuestions,
        completedAt: serverTimestamp()
      });
      setQuizzes(prev => prev.map(q => 
        q.id === quizId ? { ...q, completed: true, score, totalQuestions } : q
      ));
      addToast(`Quiz completed! Score: ${score}/${totalQuestions}`, 'success');
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const addStudyNote = async (content, courseId, unitId, documentId) => {
    if (!user) return;
    try {
      const note = {
        content,
        courseId,
        unitId,
        documentId,
        createdAt: serverTimestamp(),
        shared: false
      };
      const docRef = await setDoc(doc(collection(db, 'users', user.uid, 'studyNotes')), note);
      setStudyNotes(prev => [...prev, { id: docRef.id, ...note }]);
      addToast('Note saved!', 'success');
      return docRef;
    } catch (error) {
      console.error('Error adding note:', error);
      addToast('Failed to save note', 'error');
    }
  };

  const shareStudyNote = async (noteId) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'studyNotes', noteId), {
        shared: true,
        sharedAt: serverTimestamp()
      });
      setStudyNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, shared: true } : n
      ));
      addToast('Note shared with classmates!', 'success');
    } catch (error) {
      console.error('Error sharing note:', error);
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
    createFlashcard,
    updateFlashcardReview,
    createQuiz,
    submitQuizResult,
    addStudyNote,
    shareStudyNote,
    loadStreak,
    loadBadges
  };

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  );
};

export default StudyContext;
