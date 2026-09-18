import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';

const sampleQuestionBank = [
  {
    id: 1,
    question: 'What is the normal range of human body temperature?',
    options: ['36.5-37.5°C', '35-36°C', '37.5-38.5°C', '38-39°C'],
    correct: 0
  },
  {
    id: 2,
    question: 'Which organ produces insulin?',
    options: ['Liver', 'Kidney', 'Pancreas', 'Heart'],
    correct: 2
  },
  {
    id: 3,
    question: 'How many bones are in the adult human body?',
    options: ['196', '206', '216', '226'],
    correct: 1
  },
  {
    id: 4,
    question: 'What is the largest organ in the human body?',
    options: ['Liver', 'Heart', 'Skin', 'Brain'],
    correct: 2
  },
  {
    id: 5,
    question: 'Which blood type is the universal donor?',
    options: ['A+', 'B-', 'AB+', 'O-'],
    correct: 3
  },
  {
    id: 6,
    question: 'What is the normal resting heart rate for adults?',
    options: ['40-60 bpm', '60-100 bpm', '100-120 bpm', '120-140 bpm'],
    correct: 1
  },
  {
    id: 7,
    question: 'Which vitamin is produced by the human body when exposed to sunlight?',
    options: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'],
    correct: 3
  },
  {
    id: 8,
    question: 'How many chambers does the human heart have?',
    options: ['2', '3', '4', '5'],
    correct: 2
  }
];

const generateQuiz = (quizNumber, courseId, unitId) => {
  const start = ((quizNumber - 1) * 3) % sampleQuestionBank.length;
  const questions = [];
  for (let i = 0; i < 3; i++) {
    questions.push(sampleQuestionBank[(start + i) % sampleQuestionBank.length]);
  }
  return {
    id: `quiz_${Date.now()}_${quizNumber}`,
    quizNumber,
    title: `Quiz ${quizNumber}`,
    questions,
    courseId,
    unitId,
    createdAt: new Date(),
    completed: false,
    score: 0
  };
};

const QuizMode = ({ courseId, unitId, onClose }) => {
  const { quizzes, createQuiz, submitQuizResult } = useStudy();
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [nextQuizNumber, setNextQuizNumber] = useState(1);

  const filteredQuizzes = quizzes
    .filter(q => (!courseId || q.courseId === courseId) && (!unitId || q.unitId === unitId))
    .sort((a, b) => (a.quizNumber || 0) - (b.quizNumber || 0));

  const getNextIncompleteQuiz = () => {
    return filteredQuizzes.find(q => !q.completed);
  };

  const startQuiz = async (quiz) => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setCurrentQuiz(quiz);
  };

  const startNewQuiz = async () => {
    const quiz = generateQuiz(nextQuizNumber, courseId, unitId);
    await createQuiz(quiz.questions, courseId, unitId);
    setNextQuizNumber(prev => prev + 1);
    startQuiz(quiz);
  };

  const handleAnswer = (questionId, answerIndex) => {
    if (!submitted) {
      setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    }
  };

  const submitQuiz = async () => {
    if (!currentQuiz) return;
    let correct = 0;
    currentQuiz.questions.forEach(q => {
      if (answers[q.id] === q.correct) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    await submitQuizResult(currentQuiz.id, correct, currentQuiz.questions.length);
  };

  if (submitted && currentQuiz) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Quiz</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-dark-text">✕</button>
          </div>

          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              Quiz Complete! Score: {score}/{currentQuiz.questions.length}
            </p>
          </div>

          <div className="space-y-6">
            {currentQuiz.questions.map((q, idx) => (
              <div key={q.id} className="border border-gray-200 dark:border-dark-border rounded-xl p-6">
                <p className="font-medium text-gray-900 dark:text-dark-text mb-4">
                  {idx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = answers[q.id] === optIdx;
                    const isCorrect = optIdx === q.correct;
                    let bgColor = 'bg-gray-50 dark:bg-gray-800';
                    if (isCorrect) bgColor = 'bg-green-50 dark:bg-green-900/20';
                    else if (isSelected && !isCorrect) bgColor = 'bg-red-50 dark:bg-red-900/20';
                    return (
                      <div
                        key={optIdx}
                        className={`w-full text-left p-3 rounded-lg border-2 ${isSelected ? 'border-emerald-500' : 'border-gray-200 dark:border-dark-border'} ${bgColor}`}
                      >
                        <span className="text-gray-700 dark:text-dark-text">{option}</span>
                        {isCorrect && <span className="ml-2 text-green-600">✓</span>}
                        {isSelected && !isCorrect && <span className="ml-2 text-red-600">✗</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => startQuiz(currentQuiz)}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              Retry Quiz
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-xl hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentQuiz) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Quiz {currentQuiz.quizNumber || ''}</h2>
            <button onClick={() => setCurrentQuiz(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-dark-text">✕</button>
          </div>

          <div className="space-y-6">
            {currentQuiz.questions.map((q, idx) => (
              <div key={q.id} className="border border-gray-200 dark:border-dark-border rounded-xl p-6">
                <p className="font-medium text-gray-900 dark:text-dark-text mb-4">
                  {idx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = answers[q.id] === optIdx;
                    let bgColor = 'bg-gray-50 dark:bg-gray-800';
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswer(q.id, optIdx)}
                        disabled={submitted}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          isSelected ? 'border-emerald-500' : 'border-gray-200 dark:border-dark-border'
                        } ${bgColor} ${submitted ? 'cursor-default' : 'hover:border-emerald-300'}`}
                      >
                        <span className="text-gray-700 dark:text-dark-text">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {!submitted && (
            <button
              onClick={submitQuiz}
              disabled={Object.keys(answers).length !== currentQuiz.questions.length}
              className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  const incompleteCount = filteredQuizzes.filter(q => !q.completed).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Quizzes</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-dark-text">✕</button>
        </div>

        {filteredQuizzes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-dark-muted mb-6">No quizzes yet. Start your first quiz to begin studying!</p>
            <button onClick={startNewQuiz} className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
              Start First Quiz
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-dark-muted">
                {incompleteCount > 0
                  ? `${incompleteCount} quiz${incompleteCount > 1 ? 's' : ''} available`
                  : 'You have completed all available quizzes for this study area.'}
              </p>
            </div>

            <div className="space-y-3">
              {filteredQuizzes.map((quiz) => {
                const isCompleted = quiz.completed;
                return (
                  <button
                    key={quiz.id}
                    onClick={() => !isCompleted && startQuiz(quiz)}
                    disabled={isCompleted}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isCompleted
                        ? 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-gray-800 opacity-75 cursor-default'
                        : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-dark-text">
                          {quiz.title || `Quiz ${quiz.quizNumber || ''}`}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-dark-muted">
                          {quiz.questions?.length || 0} questions
                        </p>
                      </div>
                      {isCompleted && (
                        <span className="text-green-600 font-semibold">✓ Completed</span>
                      )}
                      {!isCompleted && (
                        <span className="text-emerald-600 font-semibold">Start →</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={startNewQuiz} className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
              + New Quiz
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default QuizMode;
