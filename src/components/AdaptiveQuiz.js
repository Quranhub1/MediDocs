import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import quizBank, { generateWeeklyQuizzes, QUIZ_PASS_PERCENT } from '../data/quizBank';
import { useStudy } from '../context/StudyContext';

const getWeekKey = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);

  const yearStart = new Date(monday.getFullYear(), 0, 1);
  const week = Math.ceil((((monday - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);

  return `${monday.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const AdaptiveQuiz = ({ courseId, unitId, onClose }) => {
  const { currentUser } = useAuth();
  const { recordLearningReview } = useStudy();
  const [progress, setProgress] = useState({ completed: [], scores: {} });
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const weekKey = useMemo(() => getWeekKey(), []);

  // Generate a new quiz set for the current week. The generator is deterministic
  // for a given week, so the set is stable during the week and changes next week.
  const weeklyQuizzes = useMemo(() => {
    const generated = generateWeeklyQuizzes(weekKey, quizBank);
    console.info('[QUIZ] Generated weekly quiz set:', {
      weekKey,
      quizCount: generated.length,
      questionCount: generated.reduce((total, quiz) => total + quiz.questions.length, 0)
    });
    return generated;
  }, [weekKey]);

  const availableQuizzes = useMemo(() => {
    const scoped = weeklyQuizzes.filter((quiz) => {
      const courseMatches = !courseId || !quiz.courseId || quiz.courseId === courseId;
      const unitMatches = !unitId || !quiz.unitId || quiz.unitId === unitId;
      return courseMatches && unitMatches;
    });
    return scoped.length ? scoped : weeklyQuizzes;
  }, [courseId, unitId, weeklyQuizzes]);

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
        // Completion is scoped to the current generated week. Old results remain
        // in quiz history but never block a new week's quiz set.
        const sameWeek = data.weekKey === weekKey;
        const completed = sameWeek && Array.isArray(data.completedQuizIds)
          ? data.completedQuizIds.filter((id) => availableQuizzes.some((quiz) => quiz.id === id))
          : [];
        const scores = sameWeek && data.scores && typeof data.scores === 'object'
          ? data.scores
          : {};

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
        weekKey,
        updatedAt: serverTimestamp()
      }, { merge: true });

      for (const question of currentQuiz.questions) {
        const isCorrect = answers[question.id] === question.answer;
        void recordLearningReview(question.id, isCorrect ? 'easy' : 'again', {
          source: 'weekly-quiz',
          course: currentQuiz.course || 'General',
          courseId: courseId || null,
          unitId: unitId || null,
          correct: isCorrect,
          quizId: currentQuiz.id,
          weekKey
        });
      }

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
          updatedAt: serverTimestamp(),
          weekKey
        },
        { merge: true }
      );

      setProgress({ completed, scores });
      console.info('[QUIZ] Saved weekly result:', {
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
    <div className="adaptive-quiz-backdrop">
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
