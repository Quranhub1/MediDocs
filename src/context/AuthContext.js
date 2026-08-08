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

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
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
        await fetch('/api/notify/email', {
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
        await fetch('/api/notify/email', {
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
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
