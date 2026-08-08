import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-8 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-300 flex items-center px-1"
      aria-label="Toggle dark mode"
    >
      <div className={`w-6 h-6 rounded-full bg-white dark:bg-emerald-500 shadow-md transform transition-transform duration-300 flex items-center justify-center ${
        isDark ? 'translate-x-6' : 'translate-x-0'
      }`}>
        {isDark ? (
          <span className="text-xs">🌙</span>
        ) : (
          <span className="text-xs">☀️</span>
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
