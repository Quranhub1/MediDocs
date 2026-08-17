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

// Approve subscription for user
export const approveUserSubscription = async (userId, plan, expiryDate) => {
  try {
    const userDocRef = docRef(db, 'users', userId);
    await updateDoc(userDocRef, {
      subscriptionApproved: true,
      subscriptionStatus: 'active',
      subscriptionPlan: plan,
      subscriptionExpiry: expiryDate
    });
    return { success: true };
  } catch (error) {
    console.error('Error approving subscription:', error);
    return { success: false, error: error.message };
  }
};
