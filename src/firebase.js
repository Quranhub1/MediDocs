// Firebase configuration for Zenith Assets
// Using studypedia-app Firebase project

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Firebase configuration
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      [field]: newBalance,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating balance:", error);
    return { success: false, error: error.message };
  }
};

// Add deposit record
export const addDeposit = async (depositData) => {
  try {
    const depositRef = doc(collection(db, depositsCollection));
    await setDoc(depositRef, {
      ...depositData,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return { success: true, id: depositRef.id };
  } catch (error) {
    console.error("Error adding deposit:", error);
    return { success: false, error: error.message };
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
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting deposits:", error);
    return [];
  }
};

// Add withdrawal record
export const addWithdrawal = async (withdrawalData) => {
  try {
    const withdrawalRef = doc(collection(db, withdrawalsCollection));
    await setDoc(withdrawalRef, {
      ...withdrawalData,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return { success: true, id: withdrawalRef.id };
  } catch (error) {
    console.error("Error adding withdrawal:", error);
    return { success: false, error: error.message };
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
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting withdrawals:", error);
    return [];
  }
};

// Add investment package
export const addInvestment = async (investmentData) => {
  try {
    const investmentRef = doc(collection(db, investmentsCollection));
    await setDoc(investmentRef, {
      ...investmentData,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    return { success: true, id: investmentRef.id };
  } catch (error) {
    console.error("Error adding investment:", error);
    return { success: false, error: error.message };
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
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting investments:", error);
    return [];
  }
};

// Add transaction record
export const addTransaction = async (transactionData) => {
  try {
    const transactionRef = doc(collection(db, transactionsCollection));
    await setDoc(transactionRef, {
      ...transactionData,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: transactionRef.id };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false, error: error.message };
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
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
};

// Get all users (for admin)
export const getAllUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, usersCollection));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
};

// Get all deposits (for admin)
export const getAllDeposits = async () => {
  try {
    const snapshot = await getDocs(query(collection(db, depositsCollection), orderBy("createdAt", "desc")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting all deposits:", error);
    return [];
  }
};

// Get all withdrawals (for admin)
export const getAllWithdrawals = async () => {
  try {
    const snapshot = await getDocs(query(collection(db, withdrawalsCollection), orderBy("createdAt", "desc")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting all withdrawals:", error);
    return [];
  }
};

// Update deposit status
export const updateDepositStatus = async (depositId, status) => {
  try {
    await updateDoc(doc(db, depositsCollection, depositId), {
      status: status,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating deposit:", error);
    return { success: false, error: error.message };
  }
};

// Update withdrawal status
export const updateWithdrawalStatus = async (withdrawalId, status) => {
  try {
    await updateDoc(doc(db, withdrawalsCollection, withdrawalId), {
      status: status,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating withdrawal:", error);
    return { success: false, error: error.message };
  }
};

// Subscribe to user changes (real-time)
export const subscribeToUser = (phone, callback) => {
  return onSnapshot(doc(db, usersCollection, phone), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

export { db, auth, ZENITH_RESOURCES, Smjhzh926ep3xwRBGzcR };
