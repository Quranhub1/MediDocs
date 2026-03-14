// Firebase configuration for Zenith Assets
// Using environment variables for security

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Database References
const ZENITH_RESOURCES = "ZENITH RESOURCES";
const Smjhzh926ep3xwRBGzcR = "Smjhzh926ep3xwRBGzcR";

// Collection paths
const usersCollection = `${ZENITH_RESOURCES}/${Smjhzh926ep3xwRBGzcR}/users`;
const depositsCollection = `${ZENITH_RESOURCES}/${Smjhzh926ep3xwRBGzcR}/deposits`;
const withdrawalsCollection = `${ZENITH_RESOURCES}/${Smjhzh926ep3xwRBGzcR}/withdrawals`;
const investmentsCollection = `${ZENITH_RESOURCES}/${Smjhzh926ep3xwRBGzcR}/investments`;
const transactionsCollection = `${ZENITH_RESOURCES}/${Smjhzh926ep3xwRBGzcR}/transactions`;

// Helper function to get user document
export const getUser = async (phone) => {
  if (!phone) {
    console.error("getUser called with undefined phone");
    return null;
  }
  try {
    const userDoc = await getDoc(doc(db, usersCollection, phone));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

// Create or update user
export const createUser = async (userData) => {
  try {
    const { phone, ...rest } = userData;
    await setDoc(doc(db, usersCollection, phone), {
      ...rest,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: phone };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message };
  }
};

// Update user balance and other fields
export const updateUserBalance = async (phone, newBalance, field = 'balance') => {
  try {
    await updateDoc(doc(db, usersCollection, phone), {
      [field]: newBalance
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating balance:", error);
    return { success: false };
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, usersCollection));
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
};

// Add deposit
export const addDeposit = async (depositData) => {
  try {
    await setDoc(doc(db, depositsCollection, depositData.id || Date.now().toString()), {
      ...depositData,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding deposit:", error);
    return { success: false };
  }
};

// Get all deposits for a user
export const getUserDeposits = async (phone) => {
  if (!phone) {
    console.error("getUserDeposits called with undefined phone");
    return [];
  }
  try {
    const q = query(
      collection(db, depositsCollection),
      where("userId", "==", phone)
    );
    const snapshot = await getDocs(q);
    const deposits = [];
    snapshot.forEach((doc) => {
      deposits.push({ id: doc.id, ...doc.data() });
    });
    // Sort by createdAt descending manually
    deposits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return deposits;
  } catch (error) {
    console.error("Error getting deposits:", error);
    return [];
  }
};

// Get all deposits (for admin)
export const getAllDeposits = async () => {
  try {
    const snapshot = await getDocs(collection(db, depositsCollection));
    const deposits = [];
    snapshot.forEach((doc) => {
      deposits.push({ id: doc.id, ...doc.data() });
    });
    return deposits;
  } catch (error) {
    console.error("Error getting all deposits:", error);
    return [];
  }
};

// Update deposit status
export const updateDepositStatus = async (depositId, status) => {
  try {
    await updateDoc(doc(db, depositsCollection, depositId), {
      status: status
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating deposit status:", error);
    return { success: false };
  }
};

// Add withdrawal
export const addWithdrawal = async (withdrawalData) => {
  try {
    await setDoc(doc(db, withdrawalsCollection, withdrawalData.id || Date.now().toString()), {
      ...withdrawalData,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding withdrawal:", error);
    return { success: false };
  }
};

// Get all withdrawals for a user
export const getUserWithdrawals = async (phone) => {
  if (!phone) {
    console.error("getUserWithdrawals called with undefined phone");
    return [];
  }
  try {
    const q = query(
      collection(db, withdrawalsCollection),
      where("userId", "==", phone)
    );
    const snapshot = await getDocs(q);
    const withdrawals = [];
    snapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });
    // Sort by createdAt descending manually
    withdrawals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return withdrawals;
  } catch (error) {
    console.error("Error getting withdrawals:", error);
    return [];
  }
};

// Get all withdrawals (for admin)
export const getAllWithdrawals = async () => {
  try {
    const snapshot = await getDocs(collection(db, withdrawalsCollection));
    const withdrawals = [];
    snapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });
    return withdrawals;
  } catch (error) {
    console.error("Error getting all withdrawals:", error);
    return [];
  }
};

// Update withdrawal status
export const updateWithdrawalStatus = async (withdrawalId, status) => {
  try {
    await updateDoc(doc(db, withdrawalsCollection, withdrawalId), {
      status: status
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating withdrawal:", error);
    return { success: false };
  }
};

// Add investment
export const addInvestment = async (investmentData) => {
  try {
    const investmentId = investmentData?.id ? String(investmentData.id) : Date.now().toString();
    await setDoc(doc(db, investmentsCollection, investmentId), {
      ...investmentData,
      id: investmentId,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding investment:", error);
    return { success: false };
  }
};

// Get user investments
export const getUserInvestments = async (phone) => {
  if (!phone) {
    console.error("getUserInvestments called with undefined phone");
    return [];
  }
  try {
    const q = query(
      collection(db, investmentsCollection),
      where("userId", "==", phone)
    );
    const snapshot = await getDocs(q);
    const investments = [];
    snapshot.forEach((doc) => {
      investments.push({ id: doc.id, ...doc.data() });
    });
    // Sort by createdAt descending manually
    investments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return investments;
  } catch (error) {
    console.error("Error getting investments:", error);
    return [];
  }
};

// Delete user
export const deleteUser = async (phone) => {
  try {
    await deleteDoc(doc(db, usersCollection, phone));
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
};

// Ban/Unban user
export const banUser = async (phone, banned = true) => {
  try {
    await updateDoc(doc(db, usersCollection, phone), {
      banned: banned,
      bannedAt: banned ? new Date().toISOString() : null
    });
    return { success: true };
  } catch (error) {
    console.error("Error banning user:", error);
    return { success: false, error: error.message };
  }
};

// Update user balance directly
export const updateUserData = async (phone, data) => {
  try {
    await updateDoc(doc(db, usersCollection, phone), data);
    return { success: true };
  } catch (error) {
    console.error("Error updating user data:", error);
    return { success: false, error: error.message };
  }
};

// Add transaction
export const addTransaction = async (transactionData) => {
  try {
    await setDoc(doc(db, transactionsCollection, transactionData.id || Date.now().toString()), {
      ...transactionData,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false };
  }
};

// Get all transactions for a user
export const getUserTransactions = async (phone) => {
  if (!phone) {
    console.error("getUserTransactions called with undefined phone");
    return [];
  }
  try {
    const q = query(
      collection(db, transactionsCollection),
      where("userId", "==", phone)
    );
    const snapshot = await getDocs(q);
    const transactions = [];
    snapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
    // Sort by createdAt descending manually
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return transactions;
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
};

// Subscribe to user changes (real-time)
export const subscribeToUser = (phone, callback) => {
  return onSnapshot(doc(db, usersCollection, phone), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};
