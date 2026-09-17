import React, { useEffect, useRef } from 'react';
import { doc, setDoc, updateDoc, getDoc, increment, serverTimestamp } from 'firebase/firestore';
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

const StudyTimeTracker = () => {
  const { user } = useAuth();
  const lastTickRef = useRef(null);
  const pendingSecondsRef = useRef(0);
  const flushingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!user || !db) return undefined;

    let intervalId = null;
    let active = document.visibilityState === 'visible';
    lastTickRef.current = Date.now();
    pendingSecondsRef.current = 0;

    const flush = async (force = false) => {
      if (flushingRef.current || !user || !db) return;
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
      const studyRef = doc(db, 'userStudyData', user.uid);
      const dateKey = getDateKey();
      const duration = formatDuration(seconds);

      try {
        const snapshot = await getDoc(studyRef);
        const payload = {
          totalStudySeconds: increment(seconds),
          [`dailyStudySeconds.${dateKey}`]: increment(seconds),
          lastStudyAt: serverTimestamp(),
          studyStatus: active ? 'active' : 'away',
          updatedAt: serverTimestamp()
        };

        if (snapshot.exists()) {
          await updateDoc(studyRef, payload);
        } else {
          await setDoc(studyRef, {
            totalStudySeconds: seconds,
            [`dailyStudySeconds.${dateKey}`]: seconds,
            currentStreak: 1,
            longestStreak: 1,
            lastStudyDate: serverTimestamp(),
            lastStudyAt: serverTimestamp(),
            studyStatus: active ? 'active' : 'away',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }

        console.info('[STUDY TIME]', {
          uid: user.uid,
          recordedSeconds: seconds,
          recordedDuration: `${duration.hours}h ${duration.minutes}m ${duration.seconds}s`,
          dateKey,
          status: active ? 'active' : 'away'
        });
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
      if (!active) {
        void flush(true);
      }
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
  }, [user]);

  return null;
};

export default StudyTimeTracker;
