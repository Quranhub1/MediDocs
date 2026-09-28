import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="toggle-container">
      <div className="toggle-wrap">
        <input
          className="toggle-input"
          id="holo-toggle"
          type="checkbox"
          checked={isDark}
          onChange={toggleTheme}
        />
        <label className="toggle-track" htmlFor="holo-toggle">
          <div className="track-lines">
            <div className="track-line" />
          </div>

          <div className="toggle-thumb">
            <div className="thumb-core" />
            <div className="thumb-inner" />
            <div className="thumb-scan" />
            <div className="thumb-particles">
              <div className="thumb-particle" />
              <div className="thumb-particle" />
              <div className="thumb-particle" />
              <div className="thumb-particle" />
              <div className="thumb-particle" />
            </div>
          </div>

          <div className="toggle-data">
            <div className="data-text off">OFF</div>
            <div className="data-text on">ON</div>
            <div className="status-indicator off" />
            <div className="status-indicator on" />
          </div>

          <div className="energy-rings">
            <div className="energy-ring" />
            <div className="energy-ring" />
            <div className="energy-ring" />
          </div>

          <div className="interface-lines">
            <div className="interface-line" />
            <div className="interface-line" />
            <div className="interface-line" />
            <div className="interface-line" />
            <div className="interface-line" />
            <div className="interface-line" />
          </div>

          <div className="toggle-reflection" />
          <div className="holo-glow" />
        </label>
      </div>
      <div className="toggle-label">{isDark ? 'Dark Mode' : 'Light Mode'}</div>
    </div>
  );
};

export default ThemeToggle;
