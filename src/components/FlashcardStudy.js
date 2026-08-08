import React, { useState, useEffect } from 'react';
import { useStudy } from '../context/StudyContext';
import { useTheme } from '../context/ThemeContext';

const FlashcardStudy = ({ courseId, unitId, onClose }) => {
  const { flashcards, createFlashcard, updateFlashcardReview } = useStudy();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [newFlashcard, setNewFlashcard] = useState({ front: '', back: '' });
  const [isCreating, setIsCreating] = useState(false);

  const filteredCards = flashcards.filter(card => 
    (!courseId || card.courseId === courseId) && 
    (!unitId || card.unitId === unitId)
  );

  const currentCard = filteredCards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!isFlipped);
  };

  const handleRating = (quality) => {
    if (currentCard) {
      updateFlashcardReview(currentCard.id, quality);
      nextCard();
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newFlashcard.front.trim() || !newFlashcard.back.trim()) return;
    await createFlashcard(newFlashcard.front, newFlashcard.back, courseId, unitId);
    setNewFlashcard({ front: '', back: '' });
    setIsCreating(false);
  };

  if (filteredCards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-dark-text">Flashcards</h2>
          <p className="text-gray-600 dark:text-dark-muted mb-6">No flashcards yet. Create your first flashcard to start studying!</p>
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              Create Flashcard
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-muted mb-2">Front</label>
                <textarea
                  value={newFlashcard.front}
                  onChange={(e) => setNewFlashcard({ ...newFlashcard, front: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                  rows="2"
                  placeholder="Question or term"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-muted mb-2">Back</label>
                <textarea
                  value={newFlashcard.back}
                  onChange={(e) => setNewFlashcard({ ...newFlashcard, back: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                  rows="2"
                  placeholder="Answer or definition"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <button onClick={onClose} className="mt-4 w-full py-2 text-gray-600 dark:text-dark-muted hover:text-gray-800">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Flashcards</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-dark-text">
            ✕
          </button>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-dark-muted">
            Card {currentIndex + 1} of {filteredCards.length}
          </span>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
          >
            + Add Card
          </button>
        </div>

        <div
          onClick={handleFlip}
          className="relative w-full h-64 cursor-pointer perspective-1000"
        >
          <div
            className={`w-full h-full transition-transform duration-500 transform-style-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          >
            <div
              className="absolute w-full h-full backface-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-8 flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-700"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-xl text-center font-medium text-gray-900 dark:text-dark-text">
                {currentCard?.front}
              </p>
            </div>
            <div
              className="absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-8 flex items-center justify-center border-2 border-blue-200 dark:border-blue-700"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="text-xl text-center font-medium text-gray-900 dark:text-dark-text">
                {currentCard?.back}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={prevCard}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300"
          >
            Previous
          </button>
          <div className="flex gap-2">
            {!showAnswer ? (
              <button
                onClick={handleFlip}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Show Answer
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleRating(1)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Again
                </button>
                <button
                  onClick={() => handleRating(3)}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                >
                  Good
                </button>
                <button
                  onClick={() => handleRating(5)}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  Easy
                </button>
              </div>
            )}
          </div>
          <button
            onClick={nextCard}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardStudy;
