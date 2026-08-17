import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  docRef,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// Get document count for a user (used to enforce 3-document limit for free users)
export const getDocumentCount = async (userId) => {
  const userRef = docRef(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return 0;
  
  // Count documents the user has viewed (excluding their own premium documents)
  const docsRef = collection(db, 'documents');
  const query = query.whereNotWhere('owner', userId);
  const snapshot = await getDocs(docsRef, query);
  return snapshot.docs.length;
};

// Subscribe payment to Firestore
export const submitPayment = async (paymentData) => {
  try {
    const paymentsRef = collection(db, 'payments');
    await addDoc(paymentsRef, {
      ...paymentData,
      createdAt: serverTimestamp(),
      status: 'pending_verification'
    });
    return { success: true };
  } catch (error) {
    console.error('Error submitting payment:', error);
    return { success: false, error: error.message };
  }
};

// Verify payment with direct Firebase (replaces Paystack)
export const verifyPayment = async (reference) => {
  try {
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reference })
    });
    return await response.json();
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error: error.message };
  }
};

// Get subscription countdown for a user
// Returns remaining time in days/hours/minutes or null if expired

export const getSubscriptionCountdown = (user) => {
  if (!user || !user.subscriptionExpiry) return null;
  
  // Safely get the expiry date
  let expiry;
  if (user.subscriptionExpiry.toDate) {
    expiry = user.subscriptionExpiry.toDate();
  } else if (user.subscriptionExpiry instanceof Date) {
    expiry = user.subscriptionExpiry;
  } else {
    return null;
  }
  
  // Ensure expiry is a valid date
  if (!(expiry instanceof Date) || isNaN(expiry.getTime())) {
    return null;
  }
  
  const now = new Date();
  const diff = expiry - now;
  
  // If expiry is in the past or exactly now, treat as expired
  if (diff <= 0) {
    return { text: 'Expired', days: 0, expired: true };
  }
  
  // Calculate days and hours with safeguards against NaN
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const hours = Math.ceil((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  // Ensure we don't return NaN
  if (Number.isNaN(days) || Number.isNaN(hours)) {
    return { text: 'Unknown', days: 0, expired: false };
  }
  
  if (days > 0) {
    return { text: `${days} day${days > 1 ? 's' : ''} remaining`, days, expired: false };
  } else if (hours > 0) {
    return { text: `${hours} hour${hours > 1 ? 's' : ''} remaining`, days: 0, expired: false };
  } else {
    const minutes = Math.ceil((diff % (1000 * 60)) / (1000 * 60));
    return { text: `${minutes} min remaining`, days: 0, expired: false };
  }
};
