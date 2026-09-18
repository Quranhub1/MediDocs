import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import quizBank, { QUIZ_PASS_PERCENT } from '../data/quizBank';

const weekKey = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 1);
  return `${date.getFullYear()}-W${Math.floor((date - start) / (7 * 24 * 60 * 60 * 1000))}`;
};

const getNextQuiz = (completedIds, currentId) => {
  const completed = new Set(completedIds);
  const currentIndex = quizBank.findIndex((quiz) => quiz.id === currentId);
  const ordered = [...quizBank.slice(currentIndex + 1), ...quizBank.slice(0, currentIndex + 1)];
  return ordered.find((quiz) => !completed.has(quiz.id)) || null;
};

const AdaptiveQuiz = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState({ completed: [], scores: {} });
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const key = useMemo(() => weekKey(), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!currentUser || !db) { setLoading(false); return; }
      try {
        const ref = doc(db, 'userQuizProgress', currentUser.uid);
        const snapshot = await getDoc(ref);
        const data = snapshot.exists() ? snapshot.data() : {};
        const completed = Array.isArray(data.completedQuizIds) ? data.completedQuizIds : [];
        const scores = data.scores && typeof data.scores === 'object' ? data.scores : {};
        const unseen = quizBank.filter((quiz) => !completed.includes(quiz.id));
        const weeklyIndex = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        const selected = unseen[weeklyIndex % unseen.length] || quizBank[weeklyIndex % quizBank.length];
        if (!cancelled) {
          setProgress({ completed, scores });
          setCurrentQuiz(selected || null);
        }
      } catch (error) {
        console.error('[QUIZ] Failed to load progress:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentUser]);

  const choose = (questionId, value) => {
    if (!submitted) setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submit = async () => {
    if (!currentQuiz || saving) return;
    const correct = currentQuiz.questions.reduce((total, question) => total + (answers[question.id] === question.answer ? 1 : 0), 0);
    const percentage = Math.round((correct / currentQuiz.questions.length) * 100);
    const passed = percentage >= QUIZ_PASS_PERCENT;
    setScore(percentage);
    setSubmitted(true);
    setSaving(true);
    try {
      const completed = passed && !progress.completed.includes(currentQuiz.id)
        ? [...progress.completed, currentQuiz.id]
        : progress.completed;
      const scores = { ...progress.scores, [currentQuiz.id]: percentage };
      await setDoc(doc(db, 'userQuizProgress', currentUser.uid), {
        completedQuizIds: completed,
        scores,
        lastQuizId: currentQuiz.id,
        lastScore: percentage,
        lastPassed: passed,
        lastWeekKey: key,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setProgress({ completed, scores });
    } catch (error) {
      console.error('[QUIZ] Failed to save result:', error);
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    const nextQuiz = getNextQuiz(progress.completed, currentQuiz?.id);
    if (nextQuiz) {
      setCurrentQuiz(nextQuiz);
      setAnswers({});
      setScore(null);
      setSubmitted(false);
    }
  };

  if (loading) return <div className="card"><p>Loading your quiz...</p></div>;
  if (!currentUser) return <div className="card"><p>Sign in to track your quiz progress.</p></div>;
  if (!currentQuiz) return <div className="card"><h3>Quiz complete</h3><p>You have completed every quiz currently in the bank. New weekly content can be added without changing the tracking system.</p></div>;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <section className="card adaptive-quiz max-w-3xl w-full max-h-[92vh] overflow-y-auto relative">
      <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white text-xl" aria-label="Close quiz">✕</button>
      <div className="quiz-header pr-8">
        <div><span className="badge">Week {key.split('-W')[1]}</span><h2>{currentQuiz.title}</h2><p>{currentQuiz.course} · Difficulty {currentQuiz.difficulty}</p></div>
        <strong>{progress.completed.length}/{quizBank.length} completed</strong>
      </div>
      {currentQuiz.questions.map((question, index) => (
        <div className="quiz-question" key={question.id}>
          <h3>{index + 1}. {question.question}</h3>
          <div className="quiz-options">
            {question.options.map((option) => (
              <button type="button" key={option} className={answers[question.id] === option ? 'selected' : ''} onClick={() => choose(question.id, option)} disabled={submitted}>{option}</button>
            ))}
          </div>
        </div>
      ))}
      {!submitted ? (
        <button type="button" className="primary-btn" onClick={submit} disabled={Object.keys(answers).length !== currentQuiz.questions.length || saving}>{saving ? 'Saving...' : 'Submit Quiz'}</button>
      ) : (
        <div className="quiz-result">
          <h3>{score >= QUIZ_PASS_PERCENT ? 'Quiz passed' : 'Review and retry'}</h3>
          <p>Your score: <strong>{score}%</strong>. Passing score: {QUIZ_PASS_PERCENT}%.</p>
          {score >= QUIZ_PASS_PERCENT ? <button type="button" className="primary-btn" onClick={next}>Unlock Next Quiz</button> : <button type="button" className="primary-btn" onClick={() => { setAnswers({}); setScore(null); setSubmitted(false); }}>Retry with this quiz</button>}
        </div>
      )}
      </section>
    </div>
  );
};

export default AdaptiveQuiz;
