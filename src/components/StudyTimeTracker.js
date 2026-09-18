import React, { useEffect, useRef } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const FLUSH_INTERVAL_MS = 10000;
const MIN_TRACKED_SECONDS = 1;

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

const StudyTimeTracker = () => {
  const { currentUser } = useAuth();
  const lastTickRef = useRef(null);
  const pendingSecondsRef = useRef(0);
  const flushingRef = useRef(false);

  useEffect(() => {
    if (!currentUser || !db) return undefined;

    let intervalId = null;
    let active = document.visibilityState === 'visible';
    lastTickRef.current = Date.now();
    pendingSecondsRef.current = 0;

    const flush = async (force = false) => {
      if (flushingRef.current || !currentUser || !db) return;

      const now = Date.now();
      if (active && lastTickRef.current) {
        pendingSecondsRef.current += Math.max(0, (now - lastTickRef.current) / 1000);
      }
      lastTickRef.current = now;

      const seconds = Math.floor(pendingSecondsRef.current);
      if (seconds < MIN_TRACKED_SECONDS && !force) return;
      if (seconds < MIN_TRACKED_SECONDS) return;

      pendingSecondsRef.current -= seconds;
      flushingRef.current = true;

      const studyRef = doc(db, 'userStudyData', currentUser.uid);
      const dateKey = getDateKey();
      const duration = formatDuration(seconds);
      const recordedAt = new Date();
      const status = active ? 'active' : 'away';

      try {
        let result = null;

        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(studyRef);
          const existing = snapshot.exists() ? snapshot.data() : {};
          const previousStudyDate = getStudyDay(existing.lastStudyDate);
          const today = dateKey;
          const yesterday = getPreviousDateKey(recordedAt);

          let currentStreak = Number(existing.currentStreak) || 0;
          let longestStreak = Number(existing.longestStreak) || 0;

          if (!previousStudyDate) {
            currentStreak = 1;
          } else if (previousStudyDate === today) {
            currentStreak = Math.max(1, currentStreak);
          } else if (previousStudyDate === yesterday) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }

          longestStreak = Math.max(longestStreak, currentStreak);

          const existingTotalSeconds = Number(existing.totalStudySeconds) || Math.round((Number(existing.totalStudyTime) || 0) * 60);
          const totalStudySeconds = existingTotalSeconds + seconds;
          const existingDaily = existing.dailyStudySeconds?.[dateKey];
          const dailyStudySeconds = (Number(existingDaily) || 0) + seconds;

          const data = {
            totalStudySeconds,
            totalStudyTime: Math.floor(totalStudySeconds / 60),
            [`dailyStudySeconds.${dateKey}`]: dailyStudySeconds,
            currentStreak,
            longestStreak,
            lastStudyDate: recordedAt,
            lastStudyAt: recordedAt,
            studyStatus: status,
            updatedAt: recordedAt
          };

          if (snapshot.exists()) {
            transaction.update(studyRef, data);
          } else {
            transaction.set(studyRef, {
              ...data,
              createdAt: recordedAt
            });
          }

          result = { currentStreak, longestStreak, totalStudySeconds, dailyStudySeconds };
        });

        console.info('[STUDY TIME]', {
          uid: currentUser.uid,
          recordedSeconds: seconds,
          recordedDuration: `${duration.hours}h ${duration.minutes}m ${duration.seconds}s`,
          totalStudySeconds: result?.totalStudySeconds,
          totalStudyDuration: result ? `${formatDuration(result.totalStudySeconds).hours}h ${formatDuration(result.totalStudySeconds).minutes}m ${formatDuration(result.totalStudySeconds).seconds}s` : undefined,
          dailyStudySeconds: result?.dailyStudySeconds,
          currentStreak: result?.currentStreak,
          longestStreak: result?.longestStreak,
          dateKey,
          status
        });

        window.dispatchEvent(new CustomEvent('medidocs:study-time-updated', {
          detail: result
        }));
      } catch (error) {
        pendingSecondsRef.current += seconds;
        console.error('[STUDY TIME] Failed to persist study time:', error);
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
