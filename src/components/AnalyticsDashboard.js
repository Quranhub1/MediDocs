import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const getDateKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatStudyTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m ${safeSeconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${safeSeconds % 60}s`;
  return `${safeSeconds}s`;
};

const getLastSevenDays = () => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: getDateKey(date),
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });
};

const AnalyticsDashboard = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    documentsViewed: 0,
    documentsDownloaded: 0,
    studyTimeSeconds: 0,
    quizzesTaken: 0,
    averageScore: null,
    streak: 0,
    badges: 0
  });
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      if (!currentUser || !db) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const studyRef = doc(db, 'userStudyData', currentUser.uid);
        const [studyResult, quizResult, badgeResult] = await Promise.allSettled([
          getDoc(studyRef),
          getDocs(collection(db, 'users', currentUser.uid, 'quizzes')),
          getDocs(collection(db, 'users', currentUser.uid, 'badges'))
        ]);

        const studySnapshot = studyResult.status === 'fulfilled' ? studyResult.value : null;
        const quizSnapshot = quizResult.status === 'fulfilled' ? quizResult.value : { docs: [] };
        const badgeSnapshot = badgeResult.status === 'fulfilled' ? badgeResult.value : { size: 0 };
        if (studyResult.status !== 'fulfilled') console.error('[ANALYTICS] Study data read failed:', studyResult.reason);
        if (quizResult.status !== 'fulfilled') console.error('[ANALYTICS] Quiz data read failed:', quizResult.reason);
        if (badgeResult.status !== 'fulfilled') console.error('[ANALYTICS] Badge data read failed:', badgeResult.reason);
        const studyData = studySnapshot?.exists() ? studySnapshot.data() : {};
        const totalStudySeconds = Number(studyData.totalStudySeconds) || Math.round((Number(studyData.totalStudyTime) || 0) * 60);
        const dailyStudySeconds = studyData.dailyStudySeconds && typeof studyData.dailyStudySeconds === 'object'
          ? studyData.dailyStudySeconds
          : {};

        const completedQuizzes = quizSnapshot.docs
          .map(snapshot => snapshot.data())
          .filter(quiz => quiz.completed === true && Number.isFinite(Number(quiz.score)) && Number.isFinite(Number(quiz.totalQuestions)) && Number(quiz.totalQuestions) > 0);

        const averageScore = completedQuizzes.length > 0
          ? completedQuizzes.reduce((sum, quiz) => sum + (Number(quiz.score) / Number(quiz.totalQuestions)) * 100, 0) / completedQuizzes.length
          : null;

        const days = getLastSevenDays().map(day => ({
          ...day,
          seconds: Math.max(0, Number(dailyStudySeconds[day.key]) || 0)
        }));

        if (!cancelled) {
          setStats({
            documentsViewed: Number(studyData.documentsViewed) || 0,
            documentsDownloaded: Number(studyData.documentsDownloaded) || 0,
            studyTimeSeconds: totalStudySeconds,
            quizzesTaken: completedQuizzes.length,
            averageScore,
            streak: Number(studyData.currentStreak) || 0,
            badges: badgeSnapshot.size
          });
          setWeeklyActivity(days);
        }
      } catch (error) {
        console.error('[ANALYTICS] Failed to load user analytics:', error);
        if (!cancelled) {
          setStats({ documentsViewed: 0, documentsDownloaded: 0, studyTimeSeconds: 0, quizzesTaken: 0, averageScore: null, streak: 0, badges: 0 });
          setWeeklyActivity(getLastSevenDays().map(day => ({ ...day, seconds: 0 })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAnalytics();
    const refresh = () => loadAnalytics();
    window.addEventListener('medidocs:study-time-updated', refresh);
    window.addEventListener('medidocs:document-activity-updated', refresh);
    window.addEventListener('medidocs:document-progress-updated', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('medidocs:study-time-updated', refresh);
      window.removeEventListener('medidocs:document-activity-updated', refresh);
      window.removeEventListener('medidocs:document-progress-updated', refresh);
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-center text-gray-600 dark:text-dark-muted">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const maxWeeklySeconds = Math.max(...weeklyActivity.map(day => day.seconds), 60);

  const statCards = [
    { label: 'Documents Viewed', value: stats.documentsViewed, icon: '📄', color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Study Time', value: formatStudyTime(stats.studyTimeSeconds), icon: '⏱️', color: 'bg-blue-100 text-blue-700' },
    { label: 'Downloaded', value: stats.documentsDownloaded, icon: '⬇️', color: 'bg-cyan-100 text-cyan-700' },
    { label: 'Quizzes Taken', value: stats.quizzesTaken, icon: '📝', color: 'bg-purple-100 text-purple-700' },
    { label: 'Avg Score', value: stats.averageScore === null ? 'Not tracked' : `${Math.round(stats.averageScore)}%`, icon: '🎯', color: 'bg-amber-100 text-amber-700' },
    { label: 'Current Streak', value: `${stats.streak} days`, icon: '🔥', color: 'bg-red-100 text-red-700' },
    { label: 'Badges Earned', value: stats.badges, icon: '🏆', color: 'bg-yellow-100 text-yellow-700' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Analytics Dashboard">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Analytics Dashboard</h2>
            <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">Your activity from your MediDocs account</p>
          </div>
          <button onClick={onClose} className="touch-target shrink-0 min-w-11 min-h-11 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-dark-text text-xl" aria-label="Close analytics">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className={`p-4 rounded-xl ${stat.color}`}>
              <div className="text-2xl mb-1" aria-hidden="true">{stat.icon}</div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs opacity-75">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Weekly Study Activity</h3>
              <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">Actual study seconds recorded over the last 7 days</p>
            </div>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatStudyTime(weeklyActivity.reduce((sum, day) => sum + day.seconds, 0))}</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-3 items-end h-48">
            {weeklyActivity.map((day) => {
              const height = day.seconds > 0 ? Math.max(8, (day.seconds / maxWeeklySeconds) * 100) : 3;
              return (
                <div key={day.key} className="h-full flex flex-col items-center justify-end min-w-0" title={`${day.dateLabel}: ${formatStudyTime(day.seconds)}`}>
                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-dark-muted mb-2 truncate max-w-full">
                    {day.seconds > 0 ? formatStudyTime(day.seconds) : '0m'}
                  </span>
                  <div className="w-full max-w-10 h-32 flex items-end rounded-t-lg bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-500"
                      style={{ height: `${height}%` }}
                      aria-label={`${day.label}: ${formatStudyTime(day.seconds)}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-dark-muted mt-2">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="touch-target px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
