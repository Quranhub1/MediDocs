import React, { useEffect, useMemo, useState } from 'react';

const SETTINGS_KEY = 'medidocs_ui_settings_v1';

const ProgressRing = ({ value = 0, label = 'Progress' }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  return (
    <div className="relative w-20 h-20 shrink-0" role="img" aria-label={`${label}: ${Math.round(safeValue)} percent`}>
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-gray-200 dark:text-gray-700" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className="text-emerald-500 transition-all duration-1000" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800 dark:text-dark-text">{Math.round(safeValue)}%</span>
    </div>
  );
};

const DashboardEnhancements = ({ courses = [], documents = [], userProfile }) => {
  const progress = Number(userProfile?.courseProgress ?? userProfile?.progress ?? 0);
  const grouped = useMemo(() => {
    const counts = {};
    documents.forEach((doc) => {
      const name = doc.courseName || doc.courseId || 'Other';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [documents]);
  const maxCount = Math.max(1, ...grouped.map(([, count]) => count));

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-label="Learning overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Courses', value: courses.length, icon: '📚', detail: 'Available to you' },
          { label: 'Resources', value: documents.length, icon: '📄', detail: 'Latest indexed' },
          { label: 'Study Progress', value: `${Math.round(Math.max(0, Math.min(100, progress)))}%`, icon: '🎯', detail: 'Keep going' },
          { label: 'Study Mode', value: 'Ready', icon: '🧠', detail: 'Learn smarter' }
        ].map((card, index) => (
          <article key={card.label} className="md-dashboard-card group rounded-2xl border border-gray-200 dark:border-dark-border bg-white/90 dark:bg-dark-card/95 p-4 sm:p-5 shadow-sm hover:shadow-xl" style={{ animationDelay: `${index * 70}ms` }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-muted">{card.label}</p>
                <p className="mt-1 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-dark-text">{card.value}</p>
                <p className="mt-1 text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">{card.detail}</p>
              </div>
              <span className="text-2xl md-card-icon" aria-hidden="true">{card.icon}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-4 mt-4">
        <article className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 flex items-center gap-4">
          <ProgressRing value={progress} label="Course progress" />
          <div><h3 className="font-bold text-gray-900 dark:text-dark-text">Your progress</h3><p className="text-sm text-gray-500 dark:text-dark-muted mt-1">Small sessions add up. Humanity continues to discover this approximately every century.</p></div>
        </article>
        <article className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900 dark:text-dark-text">Resource activity</h3><span className="text-xs text-gray-500 dark:text-dark-muted">By course</span></div>
          {grouped.length ? <div className="space-y-3">{grouped.map(([name, count]) => <div key={name}><div className="flex justify-between text-xs mb-1 text-gray-600 dark:text-dark-muted"><span className="truncate pr-3">{name}</span><span>{count}</span></div><div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="md-chart-bar h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${(count / maxCount) * 100}%` }} /></div></div>)}</div> : <div className="md-empty-state text-center py-4"><span className="text-2xl" aria-hidden="true">📊</span><p className="text-sm text-gray-500 dark:text-dark-muted mt-2">Your activity chart will appear as resources are added.</p></div>}
        </article>
      </div>
    </section>
  );
};

export const AccessibilityControls = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } });
  useEffect(() => {
    document.documentElement.classList.toggle('low-bandwidth', !!settings.lowBandwidth);
    document.documentElement.classList.toggle('large-text', !!settings.largeText);
    document.documentElement.classList.toggle('high-contrast', !!settings.highContrast);
    document.documentElement.classList.toggle('force-reduced-motion', !!settings.reducedMotion);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);
  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));
  return (
    <div className="fixed right-3 bottom-20 lg:bottom-4 z-40">
      {open && <div className="mb-2 w-64 rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl p-4" role="dialog" aria-label="Accessibility and display settings">
        <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-gray-900 dark:text-dark-text">Display & Access</h2><button className="touch-target text-gray-500" onClick={() => setOpen(false)} aria-label="Close settings">✕</button></div>
        {[['largeText','Larger text'],['highContrast','Higher contrast'],['reducedMotion','Reduce motion'],['lowBandwidth','Low-bandwidth mode']].map(([key,label]) => <label key={key} className="flex items-center justify-between gap-3 py-2 cursor-pointer text-sm text-gray-700 dark:text-dark-text"><span>{label}</span><input type="checkbox" checked={!!settings[key]} onChange={() => toggle(key)} className="w-5 h-5 accent-emerald-600" /></label>)}
        <p className="text-[11px] text-gray-500 dark:text-dark-muted mt-2">Settings are saved on this device.</p>
      </div>}
      <button onClick={() => setOpen(!open)} className="touch-target w-12 h-12 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:bg-emerald-700 transition-transform hover:scale-105" aria-expanded={open} aria-label="Open accessibility and display settings">⚙️</button>
    </div>
  );
};

export default DashboardEnhancements;
