import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
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

const restoreAdminState = async (user) => {
  if (!user) return { isAdmin: false };

  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/status', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      console.warn('Admin status check failed:', response.status);
      return { isAdmin: false };
    }

    const data = await response.json();
    return {
      isAdmin: data.isAdmin === true,
      profile: data.profile || null
    };
  } catch (error) {
    console.warn('Unable to restore admin state:', error);
    return { isAdmin: false };
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      console.warn('Firebase not initialized - skipping auth state listener');
      setLoading(false);
      return;
    }

    let active = true;

    const initializeAuth = async () => {
      try {
        // Explicitly persist the Firebase session across hard refreshes and browser restarts.
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        console.warn('Could not enable local Firebase auth persistence:', error);
      }

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        setCurrentUser(user);
        setIsBanned(false);
        setIsAdmin(false);

        if (user) {
          try {
            // The server is authoritative for admin identity. It re-applies lifetime
            // admin fields in Firestore, so a hard refresh cannot downgrade the account.
            const adminState = await restoreAdminState(user);
            if (!active) return;
            setIsAdmin(adminState.isAdmin);

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!active) return;
            if (userDoc.exists()) {
              const profile = userDoc.data();
              setUserProfile(profile);
              setIsBanned(!!profile.banned);
            } else if (adminState.profile) {
              setUserProfile(adminState.profile);
              setIsBanned(!!adminState.profile.banned);
            } else {
              setUserProfile(null);
              setIsBanned(false);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            if (!active) return;
            setUserProfile(null);
            setIsBanned(false);
          }
        } else {
          setUserProfile(null);
          setIsBanned(false);
        }

        if (active) setLoading(false);
      });

      return unsubscribe;
    };

    let unsubscribe;
    initializeAuth().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
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
      setIsAdmin(false);
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

  const refreshUserProfile = async () => {
    if (!auth || !db || !currentUser) return null;
    try {
      const adminState = await restoreAdminState(currentUser);
      setIsAdmin(adminState.isAdmin);

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        setUserProfile(profile);
        setIsBanned(!!profile.banned);
        return profile;
      }
      if (adminState.profile) {
        setUserProfile(adminState.profile);
        setIsBanned(!!adminState.profile.banned);
        return adminState.profile;
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
    return null;
  };

  const value = {
    currentUser,
    userProfile,
    isBanned,
    isAdmin,
    refreshUserProfile,
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
