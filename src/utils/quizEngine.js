import quizBank, { QUIZ_PASS_PERCENT } from '../data/quizBank';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const getWeekNumber = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / MS_PER_WEEK);
};

export const getWeeklyQuiz = (completedIds = [], date = new Date()) => {
  const completed = new Set(completedIds);
  const week = getWeekNumber(date);
  const unseen = quizBank.filter((quiz) => !completed.has(quiz.id));
  const pool = unseen.length ? unseen : quizBank;
  return pool[week % pool.length] || null;
};

export const getNextQuiz = (currentQuizId, completedIds = []) => {
  const completed = new Set(completedIds);
  const currentIndex = quizBank.findIndex((quiz) => quiz.id === currentQuizId);
  const ordered = [...quizBank.slice(currentIndex + 1), ...quizBank.slice(0, Math.max(0, currentIndex + 1))];
  return ordered.find((quiz) => !completed.has(quiz.id)) || null;
};

export const getQuizProgress = (completedIds = [], date = new Date()) => {
  const completed = new Set(completedIds);
  const weeklyQuiz = getWeeklyQuiz(completedIds, date);
  const nextQuiz = weeklyQuiz ? getNextQuiz(weeklyQuiz.id, completedIds) : null;
  return {
    weeklyQuiz,
    nextQuiz,
    completedCount: completed.size,
    totalQuizzes: quizBank.length,
    passPercent: QUIZ_PASS_PERCENT,
    weekNumber: getWeekNumber(date)
  };
};

export { quizBank };
