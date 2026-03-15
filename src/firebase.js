// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZLoJZVVCVAWafhd4Oh8bhEGV4waN1B5g",
  authDomain: "studypedia-app.firebaseapp.com",
  projectId: "studypedia-app",
  storageBucket: "studypedia-app.firebasestorage.app",
  messagingSenderId: "793261754970",
  appId: "1:793261754970:web:49bbd2bea1ab4d46486663",
  measurementId: "G-6CTGP0MF8Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
