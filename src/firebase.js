// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Firebase configuration - must be set in environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Check if config is valid
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase only if config is valid and not already initialized
let app;
if (isConfigValid && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    app = null;
  }
} else if (getApps().length > 0) {
  app = getApps()[0];
} else {
  app = null;
  console.warn("Firebase not initialized - missing config");
}

// Initialize Firebase services (may be null if initialization failed)
export const auth = app ? getAuth(app) : null;
export const db = (() => {
  if (!app) return null;
  try {
    // Keep Firestore data available through short connectivity gaps and across
    // multiple tabs. If the browser cannot use persistent storage, fall back
    // to the normal Firestore client instead of blocking app startup.
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (error) {
    console.warn("Firestore persistence unavailable; using standard cache:", error?.message || error);
    return getFirestore(app);
  }
})();

export default app;
