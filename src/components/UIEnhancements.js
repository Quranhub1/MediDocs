import React, { useEffect, useMemo, useState } from 'react';
import { subscribeToAllResources, subscribeToCourses } from '../services/FirestoreService';
import { useStudy } from '../context/StudyContext';

const SETTINGS_KEY = 'medidocs_ui_settings_v1';

const ProgressRing = ({ value = 0, label = 'Progress' }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  return <div className="relative w-20 h-20 shrink-0" role="img" aria-label={`${label}: ${Math.round(safeValue)} percent`}><svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80"><circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-gray-200 dark:text-gray-700" /><circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className="text-emerald-500 transition-all duration-1000" strokeDasharray={circumference} strokeDashoffset={offset} /></svg><span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800 dark:text-dark-text">{Math.round(safeValue)}%</span></div>;
};

const DashboardEnhancements = ({ courses: suppliedCourses = [], documents: suppliedDocuments = [], userProfile }) => {
  const [courses, setCourses] = useState(suppliedCourses);
  const [documents, setDocuments] = useState(suppliedDocuments);
  const [courseCounts, setCourseCounts] = useState([]);
  const [totalResources, setTotalResources] = useState(0);
  useEffect(() => {
    let mounted = true;
    const unsubscribeCourses = subscribeToCourses((nextCourses) => {
      if (!mounted) return;
      setCourses(nextCourses);
    }, (error) => console.error('[REALTIME] Dashboard courses:', error));

    const unsubscribeResources = subscribeToAllResources((nextDocuments) => {
      if (!mounted) return;
      setDocuments(nextDocuments);
      setTotalResources(nextDocuments.length);

      const counts = nextDocuments.reduce((acc, item) => {
        const key = item.courseId || item.courseName || 'Other';
        if (!acc[key]) {
          acc[key] = {
            courseId: key,
            courseName: item.courseName || item.courseId || 'Other',
            count: 0
          };
        }
        acc[key].count += 1;
        return acc;
      }, {});
      setCourseCounts(Object.values(counts));
    }, (error) => console.error('[REALTIME] Dashboard resources:', error));

    return () => {
      mounted = false;
      unsubscribeCourses();
      unsubscribeResources();
    };
  }, []);
  const { streak } = useStudy();
  const activityByCourse = streak?.activityByCourse || {};
  const documentsViewed = Number(streak?.documentsViewed) || 0;
  const totalStudySeconds = Number(streak?.totalStudySeconds) || 0;
  const totalResourceCount = Math.max(Number(totalResources) || 0, documentsViewed);
  const progress = totalResourceCount > 0 ? Math.min(100, (documentsViewed / totalResourceCount) * 100) : 0;

  const formatStudyTime = (seconds) => { const safe = Math.max(0, Math.floor(Number(seconds) || 0)); const h = Math.floor(safe / 3600); const m = Math.floor((safe % 3600) / 60); const s = safe % 60; if (h) return `${h}h ${m}m`; if (m) return `${m}m ${s}s`; return `${s}s`; };
  const normalizeCourseKey = (value) => String(value || '')
    .trim()
    .replaceAll('.', '_')
    .replaceAll('/', '_')
    .replaceAll('\\\\', '_')
    .slice(0, 120);

  const grouped = useMemo(() => {
    const activityEntries = Object.entries(activityByCourse).map(([key, value]) => ({
      key,
      keyNormalized: normalizeCourseKey(key),
      courseId: String(value?.courseId || ''),
      courseName: String(value?.courseName || ''),
      courseIdNormalized: normalizeCourseKey(value?.courseId),
      courseNameNormalized: normalizeCourseKey(value?.courseName),
      viewed: Number(value?.viewed) || 0,
      downloads: Number(value?.downloads) || 0
    }));

    return courses.map((course) => {
      const name = course.name || course.id || 'Other';
      const id = String(course.id || '');
      const nameNormalized = normalizeCourseKey(name);
      const idNormalized = normalizeCourseKey(id);
      const match = activityEntries.find((item) =>
        item.key === id ||
        item.key === name ||
        item.keyNormalized === idNormalized ||
        item.keyNormalized === nameNormalized ||
        item.courseId === id ||
        item.courseName === name ||
        item.courseIdNormalized === idNormalized ||
        item.courseNameNormalized === nameNormalized
      );
      const stats = match
        ? { viewed: match.viewed, downloads: match.downloads }
        : { viewed: 0, downloads: 0 };
      const resourceCount = Number(
        courseCounts.find((item) => String(item.courseId) === id)?.count
      ) || 0;
      return [name, {
        ...stats,
        total: resourceCount
      }];
    }).sort((a, b) => b[1].viewed - a[1].viewed);
  }, [activityByCourse, courseCounts, courses]);
  const maxCount = Math.max(1, ...grouped.map(([, item]) => item.total || item.viewed || 0));
  const cards = [{ label: 'Courses', value: courses.length, icon: '📚', detail: 'Available to you' }, { label: 'Resources', value: totalResourceCount, icon: '📄', detail: 'Files in Firestore' }, { label: 'Documents Viewed', value: documentsViewed, icon: '👀', detail: 'Your study activity' }, { label: 'Study Time', value: formatStudyTime(totalStudySeconds), icon: '⏱️', detail: 'Time spent learning' }];
  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-label="Learning overview"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{cards.map((card, index) => <article key={card.label} className="md-dashboard-card group rounded-2xl border border-gray-200 dark:border-dark-border bg-white/90 dark:bg-dark-card/95 p-4 sm:p-5 shadow-sm hover:shadow-xl" style={{ animationDelay: `${index * 70}ms` }}><div className="flex items-start justify-between gap-2"><div><p className="text-xs sm:text-sm text-gray-500 dark:text-dark-muted">{card.label}</p><p className="mt-1 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-dark-text">{card.value}</p><p className="mt-1 text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">{card.detail}</p></div><span className="text-2xl md-card-icon" aria-hidden="true">{card.icon}</span></div></article>)}</div><div className="grid lg:grid-cols-[auto_1fr] gap-4 mt-4"><article className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 flex items-center gap-4"><ProgressRing value={progress} label="Course progress" /><div><h3 className="font-bold text-gray-900 dark:text-dark-text">Your progress</h3><p className="text-sm text-gray-500 dark:text-dark-muted mt-1">{documentsViewed} of {totalResourceCount} files viewed.</p></div></article><article className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5"><div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900 dark:text-dark-text">Resource activity</h3><span className="text-xs text-gray-500 dark:text-dark-muted">By course</span></div>{grouped.length ? <div className="space-y-3">{grouped.map(([name, item]) => <div key={name}><div className="flex justify-between text-xs mb-1 text-gray-600 dark:text-dark-muted"><span className="truncate pr-3">{name}</span><span>{item.viewed} viewed · {item.downloads} downloads</span></div><div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="md-chart-bar h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.min(100, ((item.viewed || 0) / Math.max(1, item.total || maxCount)) * 100)}%` }} /></div></div>)}</div> : <div className="md-empty-state text-center py-4"><span className="text-2xl" aria-hidden="true">📊</span><p className="text-sm text-gray-500 dark:text-dark-muted mt-2">Open or download resources to see your activity here.</p></div>}</article></div></section>;
};

export const AccessibilityControls = () => { const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } }); useEffect(() => { document.documentElement.classList.toggle('low-bandwidth', !!settings.lowBandwidth); document.documentElement.classList.toggle('large-text', !!settings.largeText); document.documentElement.classList.toggle('high-contrast', !!settings.highContrast); document.documentElement.classList.toggle('force-reduced-motion', !!settings.reducedMotion); try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {} }, [settings]); const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] })); return <section className="w-full max-w-5xl mx-auto mb-6 px-4 sm:px-6 lg:px-8" aria-labelledby="display-settings-title"><div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm p-5 sm:p-6"><div className="mb-4"><h2 id="display-settings-title" className="text-xl font-bold text-gray-900 dark:text-dark-text">Accessibility & Display</h2><p className="text-sm text-gray-500 dark:text-dark-muted mt-1">Customize how MediDocs looks and behaves on this device.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[['largeText','Larger text'],['highContrast','Higher contrast'],['reducedMotion','Reduce motion'],['lowBandwidth','Low-bandwidth mode']].map(([key,label]) => <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg px-4 py-3 cursor-pointer text-sm text-gray-700 dark:text-dark-text"><span>{label}</span><input type="checkbox" checked={!!settings[key]} onChange={() => toggle(key)} className="w-5 h-5 accent-emerald-600" /></label>)}</div><p className="text-[11px] text-gray-500 dark:text-dark-muted mt-4">Settings are saved automatically on this device.</p></div></section>; };

export default DashboardEnhancements;
