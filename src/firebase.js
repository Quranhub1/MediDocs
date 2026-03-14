// Firebase configuration for Zenith Assets
// Using zenith-assets-4761d Firebase project

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBm-xKZJbf39aakUdKH030Bdh5TJUhg14I",
  authDomain: "zenith-assets-4761d.firebaseapp.com",
  projectId: "zenith-assets-4761d",
  storageBucket: "zenith-assets-4761d.firebasestorage.app",
  messagingSenderId: "616504759005",
  appId: "1:616504759005:web:38486adf6e850ae9a38134",
  measurementId: "G-9NB30EGW7Y"
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
  try {
    const q = query(
      collection(db, depositsCollection),
      where("userId", "==", phone),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const deposits = [];
    snapshot.forEach((doc) => {
      deposits.push({ id: doc.id, ...doc.data() });
    });
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
  try {
    const q = query(
      collection(db, withdrawalsCollection),
      where("userId", "==", phone),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const withdrawals = [];
    snapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });
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
    await setDoc(doc(db, investmentsCollection, investmentData.id || Date.now().toString()), {
      ...investmentData,
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
  try {
    const q = query(
      collection(db, investmentsCollection),
      where("userId", "==", phone),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const investments = [];
    snapshot.forEach((doc) => {
      investments.push({ id: doc.id, ...doc.data() });
    });
    return investments;
  } catch (error) {
    console.error("Error getting investments:", error);
    return [];
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
  try {
    const q = query(
      collection(db, transactionsCollection),
      where("userId", "==", phone),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const transactions = [];
    snapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
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
