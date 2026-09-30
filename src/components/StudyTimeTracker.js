import { useEffect, useRef } from 'react';
import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const FLUSH_INTERVAL_MS = 60000;
const MIN_TRACKED_SECONDS = 5;
const QUOTA_BACKOFF_MS = 15 * 60 * 1000;

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  return {
    hours: Math.floor(safeSeconds / 3600),
    minutes: Math.floor((safeSeconds % 3600) / 60),
    seconds: safeSeconds % 60
  };
};

const getStudyDay = (date) => {
  if (!date) return null;
  const value = date?.toDate?.() || (date instanceof Date ? date : new Date(date));
  return Number.isNaN(value.getTime()) ? null : getDateKey(value);
};

const getPreviousDateKey = (date = new Date()) => {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return getDateKey(previous);
};

const isQuotaError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return error?.code === 'resource-exhausted' ||
    message.includes('quota exceeded') ||
    message.includes('resource_exhausted');
};

const StudyTimeTracker = () => {
  const { currentUser } = useAuth();
  const lastTickRef = useRef(null);
  const pendingSecondsRef = useRef(0);
  const minuteCarryRef = useRef(0);
  const flushingRef = useRef(false);
  const quotaBackoffUntilRef = useRef(0);
  const quotaWarningShownRef = useRef(false);
  const streakAttemptDayRef = useRef(null);

  useEffect(() => {
    if (!currentUser || !db) return undefined;

    let intervalId = null;
    let active = document.visibilityState === 'visible';
    lastTickRef.current = Date.now();
    pendingSecondsRef.current = 0;
    minuteCarryRef.current = 0;
    flushingRef.current = false;
    quotaBackoffUntilRef.current = 0;
    quotaWarningShownRef.current = false;
    streakAttemptDayRef.current = null;

    const studyRef = doc(db, 'userStudyData', currentUser.uid);

    const syncDailyStreak = async (dateKey, recordedAt) => {
      if (streakAttemptDayRef.current === dateKey) return;
      // Only attempt the daily streak read once. A transaction is deliberately
      // avoided here: when Firestore is quota-exhausted, transaction retries can
      // generate a long chain of BatchGetDocuments requests and make the app
      // appear stuck while the rest of the UI is trying to load.
      streakAttemptDayRef.current = dateKey;

      try {
        const snapshot = await getDoc(studyRef);
        const existing = snapshot.exists() ? snapshot.data() : {};
        const previousStudyDate = getStudyDay(existing.lastStudyDate);
        const yesterday = getPreviousDateKey(recordedAt);

        let currentStreak = Number(existing.currentStreak) || 0;
        let longestStreak = Number(existing.longestStreak) || 0;

        if (!previousStudyDate) {
          currentStreak = 1;
        } else if (previousStudyDate === dateKey) {
          currentStreak = Math.max(1, currentStreak);
        } else if (previousStudyDate === yesterday) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }

        longestStreak = Math.max(longestStreak, currentStreak);

        await setDoc(studyRef, {
          currentStreak,
          longestStreak,
          lastStudyDate: recordedAt,
          lastStudyAt: recordedAt,
          updatedAt: recordedAt
        }, { merge: true });
      } catch (error) {
        if (isQuotaError(error)) {
          quotaBackoffUntilRef.current = Math.max(
            quotaBackoffUntilRef.current,
            Date.now() + QUOTA_BACKOFF_MS
          );
        }
        console.warn('[STUDY TIME] Daily streak sync skipped:', error?.message || error);
      }
    };

    const flush = async (force = false) => {
      if (flushingRef.current || !currentUser || !db) return;

      const now = Date.now();
      if (active && lastTickRef.current) {
        pendingSecondsRef.current += Math.max(0, (now - lastTickRef.current) / 1000);
      }
      lastTickRef.current = now;

      if (Date.now() < quotaBackoffUntilRef.current) return;

      const seconds = Math.floor(pendingSecondsRef.current);
      if (seconds < MIN_TRACKED_SECONDS && !force) return;
      if (seconds < MIN_TRACKED_SECONDS) return;

      pendingSecondsRef.current -= seconds;

      const dateKey = getDateKey();
      const recordedAt = new Date();
      const status = active ? 'active' : 'away';
      const duration = formatDuration(seconds);

      const minutesAvailable = minuteCarryRef.current + seconds;
      const wholeMinutes = Math.floor(minutesAvailable / 60);
      const nextMinuteCarry = minutesAvailable % 60;

      flushingRef.current = true;

      try {
        // The streak calculation is the only remaining transaction and happens
        // at most once per calendar day. Time itself uses atomic increments,
        // avoiding a read/modify/write transaction every heartbeat.
        await syncDailyStreak(dateKey, recordedAt);

        await setDoc(studyRef, {
          totalStudySeconds: increment(seconds),
          ...(wholeMinutes > 0 ? { totalStudyTime: increment(wholeMinutes) } : {}),
          [`dailyStudySeconds.${dateKey}`]: increment(seconds),
          lastStudyDate: recordedAt,
          lastStudyAt: recordedAt,
          studyStatus: status,
          updatedAt: serverTimestamp()
        }, { merge: true });

        minuteCarryRef.current = nextMinuteCarry;

        console.info('[STUDY TIME]', {
          uid: currentUser.uid,
          recordedSeconds: seconds,
          recordedDuration: `${duration.hours}h ${duration.minutes}m ${duration.seconds}s`,
          dateKey,
          status
        });

        window.dispatchEvent(new CustomEvent('medidocs:study-time-updated', {
          detail: {
            recordedSeconds: seconds,
            dateKey,
            status
          }
        }));
      } catch (error) {
        pendingSecondsRef.current += seconds;

        if (isQuotaError(error)) {
          quotaBackoffUntilRef.current = Date.now() + QUOTA_BACKOFF_MS;
          if (!quotaWarningShownRef.current) {
            quotaWarningShownRef.current = true;
            console.warn('[STUDY TIME] Firestore quota is exhausted; study-time writes are temporarily paused and will resume automatically.');
          }
        } else {
          console.error('[STUDY TIME] Failed to persist study time:', error);
        }
      } finally {
        flushingRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (active) {
        pendingSecondsRef.current += Math.max(0, (now - (lastTickRef.current || now)) / 1000);
      }
      active = document.visibilityState === 'visible';
      lastTickRef.current = now;
      if (!active) void flush(true);
    };

    const handleFocus = () => {
      active = true;
      lastTickRef.current = Date.now();
    };

    const handleBlur = () => {
      const now = Date.now();
      if (active) {
        pendingSecondsRef.current += Math.max(0, (now - (lastTickRef.current || now)) / 1000);
      }
      active = false;
      lastTickRef.current = now;
      void flush(true);
    };

    intervalId = window.setInterval(() => {
      if (active) void flush(false);
    }, FLUSH_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      void flush(true);
    };
  }, [currentUser]);

  return null;
};

export default StudyTimeTracker;
