import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthLoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    fontFamily: 'Inter, sans-serif',
    color: '#ffffff'
  }}>
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>MediDocs</h1>
      <p style={{ fontSize: '1rem', opacity: 0.85 }}>Loading...</p>
      <div style={{ marginTop: '1.25rem', width: '220px', height: '6px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(255,255,255,0.25)', marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ display: 'block', height: '100%', borderRadius: '999px', background: '#ffffff', animation: 'loader-slide 1.2s ease-in-out infinite' }}></span>
      </div>
      <style>{`
        @keyframes loader-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  </div>
);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      console.warn('Firebase not initialized - skipping auth state listener');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsBanned(false);

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data();
            setUserProfile(profile);
            if (profile.banned) {
              setIsBanned(true);
            }
          } else {
            setUserProfile(null);
            setIsBanned(false);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
          setIsBanned(false);
        }
      } else {
        setUserProfile(null);
        setIsBanned(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email, password, name, phone = '') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email,
        name,
        phone,
        createdAt: serverTimestamp(),
        role: 'user',
        subscription: 'free',
        subscriptionApproved: false,
        subscriptionStatus: 'inactive',
        banned: false
      });
      
      try {
        const response = await fetch('/api/notify/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'kaigwaakram123@gmail.com',
            subject: 'New User Signup - MediDocs',
            message: `A new user has signed up on MediDocs.`,
            eventType: 'User Signup',
            userEmail: email,
            userName: name
          })
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.warn('Signup email notification failed:', data.error || response.statusText);
        }
      } catch (emailError) {
        console.error('Failed to send signup notification email:', emailError);
      }
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      try {
        const response = await fetch('/api/notify/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'kaigwaakram123@gmail.com',
            subject: 'User Login Alert - MediDocs',
            message: `A user has logged into MediDocs.`,
            eventType: 'User Login',
            userEmail: email,
            userName: userCredential.user.displayName || 'User'
          })
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.warn('Login email notification failed:', data.error || response.statusText);
        }
      } catch (emailError) {
        console.error('Failed to send login notification email:', emailError);
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setIsBanned(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const createUser = async (email, password, name, phone = '') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email,
        name,
        phone,
        createdAt: serverTimestamp(),
        role: 'user',
        subscription: 'free',
        subscriptionApproved: false,
        subscriptionStatus: 'inactive',
        banned: false
      });
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const banUser = async (userId, banned) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { banned: !banned });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateUserSubscription = async (userId, subscriptionData) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, subscriptionData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    userProfile,
    isBanned,
    register,
    login,
    logout,
    resetPassword,
    createUser,
    banUser,
    updateUserSubscription,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <AuthLoadingScreen /> : children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
