import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';

const QuizMode = ({ courseId, unitId, onClose }) => {
  const { quizzes, createQuiz, submitQuizResult } = useStudy();
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const sampleQuestions = [
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
    }
  ];

  const startQuiz = () => {
    setCurrentQuiz({
      id: Date.now(),
      questions: sampleQuestions,
      courseId,
      unitId
    });
    setAnswers({});
    setSubmitted(false);
    setScore(0);
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

  if (!currentQuiz) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-dark-text">Quiz Mode</h2>
          <p className="text-gray-600 dark:text-dark-muted mb-6">Test your knowledge with topic-wise quizzes.</p>
          <button
            onClick={startQuiz}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            Start Sample Quiz
          </button>
          <button onClick={onClose} className="mt-4 w-full py-2 text-gray-600 dark:text-dark-muted hover:text-gray-800">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Quiz</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-dark-text">
            ✕
          </button>
        </div>

        {submitted && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              Quiz Complete! Score: {score}/{currentQuiz.questions.length}
            </p>
          </div>
        )}

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
                  if (submitted) {
                    if (isCorrect) bgColor = 'bg-green-50 dark:bg-green-900/20';
                    else if (isSelected && !isCorrect) bgColor = 'bg-red-50 dark:bg-red-900/20';
                  }
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
                      {submitted && isCorrect && <span className="ml-2 text-green-600">✓</span>}
                      {submitted && isSelected && !isCorrect && <span className="ml-2 text-red-600">✗</span>}
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

        {submitted && (
          <button
            onClick={startQuiz}
            className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            Retry Quiz
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizMode;
