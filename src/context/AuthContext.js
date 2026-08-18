import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  calculateProration,
  recordDocumentView,
  getUserSubscriptionAnalytics,
  recordReferral,
  completeReferral,
  createGiftSubscription,
  acceptGiftSubscription,
  recordPaymentFailure,
  checkGracePeriod,
  extendSubscriptionGracePeriod as extendSubscriptionGracePeriodService,
  recordSubscriptionEvent
} from '../services/FirestoreService';
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

    const changeSubscriptionPlan = async (newPlan) => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        // Get current user data
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          return { success: false, error: 'User not found' };
        }
        
        const userData = userDoc.data();
        const currentPlan = userData.subscriptionPlan || 'monthly';
        
        // If same plan, nothing to do
        if (currentPlan === newPlan) {
          return { success: true, message: 'Already on this plan' };
        }
        
        // Calculate proration
        const prorationResult = await calculateProration(
          currentUser.uid, 
          currentPlan, 
          newPlan, 
          userData.subscriptionExpiry ? 
            (userData.subscriptionExpiry.toDate ? userData.subscriptionExpiry.toDate() : new Date(userData.subscriptionExpiry)) : 
            undefined
        );
        
        if (!prorationResult.success) {
          return prorationResult;
        }
        
        // Prepare subscription data
        const subscriptionData = {
          subscriptionPlan: newPlan,
          subscriptionApproved: true,
          subscriptionStatus: 'active'
        };
        
        // If there's a proration amount owed, we might need to handle payment
        // For now, we'll just update the expiry date and let the frontend handle payment
        if (prorationResult.newExpiryDate) {
          subscriptionData.subscriptionExpiry = prorationResult.newExpiryDate;
        }
        
        // Update user's subscription
        await updateDoc(doc(db, 'users', currentUser.uid), subscriptionData);
        
        // Record the event
        await recordSubscriptionEvent(currentUser.uid, 'plan_change', {
          oldPlan: currentPlan,
          newPlan: newPlan,
          prorationAmount: prorationResult.prorationAmount
        });
        
        // Refresh user profile
        await refreshUserProfile();
        
        return { 
          success: true, 
          ...prorationResult,
          message: prorationResult.message
        };
      } catch (error) {
        console.error('Error changing subscription plan:', error);
        return { success: false, error: error.message };
      }
    };

    const cancelSubscription = async (reason = '') => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        // Get current user data
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          return { success: false, error: 'User not found' };
        }
        
        const userData = userDoc.data();
        
        // Update subscription to cancelled
        await updateDoc(doc(db, 'users', currentUser.uid), {
          subscriptionStatus: 'cancelled',
          subscriptionApproved: false,
          cancellationReason: reason,
          cancelledAt: serverTimestamp()
          // Keep subscriptionExpiry so they can access until period ends
        });
        
        // Record the event
        await recordSubscriptionEvent(currentUser.uid, 'subscription_cancelled', {
          reason: reason,
          plan: userData.subscriptionPlan
        });
        
        // Refresh user profile
        await refreshUserProfile();
        
        return { 
          success: true, 
          message: 'Subscription cancelled successfully. You will continue to have access until your current period ends.' 
        };
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        return { success: false, error: error.message };
      }
    };

    const recordDocumentViewAnalytics = async (documentId, courseId, semesterId, unitId) => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        await recordDocumentView(
          currentUser.uid,
          documentId,
          courseId,
          semesterId,
          unitId
        );
        return { success: true };
      } catch (error) {
        console.error('Error recording document view:', error);
        return { success: false, error: error.message };
      }
    };

    const getSubscriptionUsageAnalytics = async (days = 30) => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        return await getUserSubscriptionAnalytics(currentUser.uid, days);
      } catch (error) {
        console.error('Error getting subscription usage analytics:', error);
        return { success: false, error: error.message };
      }
    };

    const referFriend = async (refereeId, referralType = 'signup') => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        await recordReferral(currentUser.uid, refereeId, referralType);
        return { success: true };
      } catch (error) {
        console.error('Error recording referral:', error);
        return { success: false, error: error.message };
      }
    };

    const completeReferralReward = async (referralId, rewardAmount = 5000) => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        await completeReferral(referralId, rewardAmount);
        return { success: true };
      } catch (error) {
        console.error('Error completing referral:', error);
        return { success: false, error: error.message };
      }
    };

    const createGiftSubscriptionForFriend = async (recipientEmail, plan, message) => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        const result = await createGiftSubscription({
          senderId: currentUser.uid,
          recipientEmail: recipientEmail,
          plan: plan,
          message: message
        });
        return result;
      } catch (error) {
        console.error('Error creating gift subscription:', error);
        return { success: false, error: error.message };
      }
    };

    const acceptGiftSubscriptionOffer = async (giftId) => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        const result = await acceptGiftSubscription(giftId, currentUser.uid);
        return result;
      } catch (error) {
        console.error('Error accepting gift subscription:', error);
        return { success: false, error: error.message };
      }
    };

    const recordPaymentFailureEvent = async (paymentData, failureReason) => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        await recordPaymentFailure(currentUser.uid, paymentData, failureReason);
        return { success: true };
      } catch (error) {
        console.error('Error recording payment failure:', error);
        return { success: false, error: error.message };
      }
    };

    const checkSubscriptionGracePeriod = async () => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        return await checkGracePeriod(currentUser.uid);
      } catch (error) {
        console.error('Error checking grace period:', error);
        return { success: false, error: error.message };
      }
    };

    const extendSubscriptionGracePeriod = async (extensionDays = 3) => {
      if (!currentUser) return { success: false, error: 'No user logged in' };
      
      try {
        return await extendSubscriptionGracePeriodService(currentUser.uid, extensionDays);
      } catch (error) {
        console.error('Error extending subscription grace period:', error);
        return { success: false, error: error.message };
      }
    };

    const refreshUserProfile = async () => {
    if (!auth || !db || !currentUser) return null;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        setUserProfile(profile);
        setIsBanned(!!profile.banned);
        return profile;
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
      refreshUserProfile,
      register,
      login,
      logout,
      resetPassword,
      createUser,
      banUser,
      updateUserSubscription,
      changeSubscriptionPlan,
      cancelSubscription,
      recordDocumentViewAnalytics,
      getSubscriptionUsageAnalytics,
      referFriend,
      completeReferralReward,
      createGiftSubscriptionForFriend,
      acceptGiftSubscriptionOffer,
      recordPaymentFailureEvent,
      checkSubscriptionGracePeriod,
      extendSubscriptionGracePeriod,
      loading
    };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
