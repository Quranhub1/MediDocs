import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import quizBank, { QUIZ_PASS_PERCENT } from '../data/quizBank';

const getWeekKey = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date - start) / 86400000);
  return `${date.getFullYear()}-W${Math.floor(day / 7) + 1}`;
};

const AdaptiveQuiz = ({ courseId, unitId, onClose }) => {
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState({ completed: [], scores: {} });
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const weekKey = useMemo(() => getWeekKey(), []);

  // The bank currently contains general Anatomy content. If future bank entries
  // carry courseId/unitId, this automatically scopes them to the selected study area.
  const availableQuizzes = useMemo(() => {
    const scoped = quizBank.filter((quiz) => {
      const courseMatches = !courseId || !quiz.courseId || quiz.courseId === courseId;
      const unitMatches = !unitId || !quiz.unitId || quiz.unitId === unitId;
      return courseMatches && unitMatches;
    });
    return scoped.length ? scoped : quizBank;
  }, [courseId, unitId]);

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async () => {
      if (!currentUser || !db) {
        setLoading(false);
        return;
      }

      setError('');
      try {
        const ref = doc(db, 'userQuizProgress', currentUser.uid);
        const snapshot = await getDoc(ref);
        const data = snapshot.exists() ? snapshot.data() : {};
        const completed = Array.isArray(data.completedQuizIds) ? data.completedQuizIds : [];
        const scores = data.scores && typeof data.scores === 'object' ? data.scores : {};

        // Prefer the first unseen quiz. This makes the sequence deterministic
        // and prevents modulo-by-zero / random repeated selection.
        const unseen = availableQuizzes.filter((quiz) => !completed.includes(quiz.id));
        const selected = unseen[0] || availableQuizzes[0] || null;

        if (!cancelled) {
          setProgress({ completed, scores });
          setCurrentQuiz(selected);
          setAnswers({});
          setSubmitted(false);
          setScore(null);
        }
      } catch (err) {
        console.error('[QUIZ] Failed to load progress:', err);
        if (!cancelled) setError(err.message || 'Could not load quiz progress.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProgress();
    return () => { cancelled = true; };
  }, [currentUser, availableQuizzes]);

  const choose = (questionId, value) => {
    if (!submitted && !saving) {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    }
  };

  const submit = async () => {
    if (!currentQuiz || !currentUser || !db || saving) return;

    const totalQuestions = currentQuiz.questions.length;
    const answered = currentQuiz.questions.filter((question) => answers[question.id] !== undefined).length;
    if (answered !== totalQuestions) {
      setError('Please answer every question before submitting.');
      return;
    }

    const correct = currentQuiz.questions.reduce(
      (total, question) => total + (answers[question.id] === question.answer ? 1 : 0),
      0
    );
    const percentage = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
    const passed = percentage >= QUIZ_PASS_PERCENT;

    setScore(percentage);
    setSubmitted(true);
    setSaving(true);
    setError('');

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
        lastWeekKey: weekKey,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Keep a durable history record as well as aggregate progress.
      await setDoc(
        doc(db, 'users', currentUser.uid, 'quizzes', currentQuiz.id),
        {
          quizId: currentQuiz.id,
          title: currentQuiz.title,
          course: currentQuiz.course || null,
          courseId: courseId || null,
          unitId: unitId || null,
          score: correct,
          totalQuestions,
          percentage,
          passed,
          completed: true,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setProgress({ completed, scores });
      console.info('[QUIZ] Saved result:', {
        quizId: currentQuiz.id,
        percentage,
        passed,
        userId: currentUser.uid
      });
    } catch (err) {
      console.error('[QUIZ] Failed to save result:', err);
      setError(`Quiz could not be saved: ${err.message || 'unknown error'}`);
      // Do not hide the result. The user can retry the save.
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    const nextQuiz = availableQuizzes.find((quiz) => !progress.completed.includes(quiz.id));
    if (!nextQuiz) {
      setCurrentQuiz(null);
      return;
    }
    setCurrentQuiz(nextQuiz);
    setAnswers({});
    setScore(null);
    setSubmitted(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="adaptive-quiz-backdrop" role="dialog" aria-modal="true" aria-label="Loading quiz">
        <div className="adaptive-quiz-loading">
          <div className="adaptive-quiz-spinner" aria-hidden="true" />
          <h2>Preparing your quiz</h2>
          <p>Loading questions and your progress...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="adaptive-quiz-backdrop" role="dialog" aria-modal="true">
        <div className="adaptive-quiz-loading">
          <h3 className="text-xl font-bold mb-3">Login required</h3>
          <p>Sign in to take quizzes and save your progress.</p>
          <button type="button" onClick={onClose} className="primary-btn mt-5">Close</button>
        </div>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div className="adaptive-quiz-backdrop" role="dialog" aria-modal="true">
        <div className="adaptive-quiz-loading">
          <h3 className="text-xl font-bold mb-3">Quiz complete</h3>
          <p>You have completed the available quizzes for this study area.</p>
          <button type="button" onClick={onClose} className="primary-btn mt-5">Close</button>
        </div>
      </div>
    );
  }

  const passed = score !== null && score >= QUIZ_PASS_PERCENT;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <section className="card adaptive-quiz max-w-3xl w-full max-h-[92vh] overflow-y-auto relative">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white text-xl" aria-label="Close quiz">✕</button>

        <div className="quiz-header pr-8">
          <div>
            <span className="badge">Week {weekKey.split('-W')[1]}</span>
            <h2>{currentQuiz.title}</h2>
            <p>{currentQuiz.course || 'Medical studies'} · Difficulty {currentQuiz.difficulty || 1}</p>
          </div>
          <strong>{progress.completed.length}/{availableQuizzes.length} completed</strong>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 p-3" role="alert">
            {error}
          </div>
        )}

        {currentQuiz.questions.map((question, index) => (
          <div className="quiz-question" key={question.id}>
            <h3>{index + 1}. {question.question}</h3>
            <div className="quiz-options">
              {question.options.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={answers[question.id] === option ? 'selected' : ''}
                  onClick={() => choose(question.id, option)}
                  disabled={submitted || saving}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}

        {!submitted ? (
          <button
            type="button"
            className="primary-btn"
            onClick={submit}
            disabled={saving || Object.keys(answers).length !== currentQuiz.questions.length}
          >
            {saving ? 'Saving...' : 'Submit Quiz'}
          </button>
        ) : (
          <div className="quiz-result">
            <h3>{passed ? 'Quiz passed' : 'Review and retry'}</h3>
            <p>Your score: <strong>{score}%</strong>. Passing score: {QUIZ_PASS_PERCENT}%.</p>
            {saving && <p className="text-sm">Saving your result...</p>}
            {!saving && error && (
              <button type="button" className="primary-btn" onClick={submit}>Retry Save</button>
            )}
            {!saving && !error && passed && (
              <button type="button" className="primary-btn" onClick={next}>Next Quiz</button>
            )}
            {!saving && !error && !passed && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setAnswers({});
                  setScore(null);
                  setSubmitted(false);
                  setError('');
                }}
              >
                Retry Quiz
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdaptiveQuiz;
