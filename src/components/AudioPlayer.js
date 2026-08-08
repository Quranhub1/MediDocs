import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const AudioPlayer = ({ text, onClose }) => {
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (utteranceRef.current) window.speechSynthesis.cancel();
    };
  }, []);

  const speak = () => {
    if (!window.speechSynthesis) return;
    
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      return;
    }

    const plainText = text.replace(/<[^>]*>/g, '').replace(/[#*_]/g, '').substring(0, 5000);
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = rate;
    utterance.pitch = 1;
    
    utterance.onend = () => {
      setIsPlaying(false);
      setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    window.speechSynthesis.speak(utterance);
    utteranceRef.current = utterance;
    setIsPlaying(true);

    intervalRef.current = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 99));
    }, 1000);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const changeRate = (newRate) => {
    setRate(newRate);
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setTimeout(() => speak(), 100);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-4 w-80 border border-gray-200 dark:border-dark-border">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-gray-900 dark:text-dark-text">Audio Player</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-dark-text">
          ✕
        </button>
      </div>

      <div className="mb-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-dark-muted">
          <span>{Math.floor(progress)}%</span>
          <span>Speed: {rate}x</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={speak}
          className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
        <button
          onClick={stop}
          className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
          <button
            key={r}
            onClick={() => changeRate(r)}
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              rate === r
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text hover:bg-gray-300'
            }`}
          >
            {r}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default AudioPlayer;
