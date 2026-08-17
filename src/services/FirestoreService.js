import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  docRef,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// Helper to convert Firestore Timestamp to Date
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

// Fetch all documents from the RESOURCES_STUDYPEDIA collection
export const fetchAllDocuments = async (maxItems = 50, forceRefresh = false) => {
  try {
    const allDocuments = [];
    const coursesRef = collection(db, 'RESOURCES_STUDYPEDIA');
    const coursesSnapshot = await getDocs(coursesRef);

    if (coursesSnapshot.docs.length === 0) {
      return { success: true, data: [] };
    }

    const semesterPromises = coursesSnapshot.docs.map(async (courseDoc) => {
      const courseId = courseDoc.id;
      const courseName = courseDoc.data().name || courseId;
      const semestersRef = collection(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters`);
      const semestersSnapshot = await getDocs(semestersRef);
      return semestersSnapshot.docs.map(semesterDoc => ({
        courseId,
        courseName,
        semesterId: semesterDoc.id,
        semesterName: semesterDoc.data().name || semesterDoc.id
      }));
    });

    const semestersList = await Promise.all(semesterPromises);
    const flatSemesters = semestersList.flat();

    const unitsPromises = flatSemesters.map(async (sem) => {
      const unitsRef = collection(db, `RESOURCES_STUDYPEDIA/${sem.courseId}/semesters/${sem.semesterId}/courseunits`);
      const unitsSnapshot = await getDocs(unitsRef);
      return unitsSnapshot.docs.map(unitDoc => ({
        courseId: sem.courseId,
        courseName: sem.courseName,
        semesterId: sem.semesterId,
        semesterName: sem.semesterName,
        unitId: unitDoc.id,
        unitName: unitDoc.data().name || unitDoc.id
      }));
    });

    const unitsList = await Promise.all(unitsPromises);
    const flatUnits = unitsList.flat();

    const docsPromises = flatUnits.map(async (unit) => {
      const docsRef = collection(db, `RESOURCES_STUDYPEDIA/${unit.courseId}/semesters/${unit.semesterId}/courseunits/${unit.unitId}/documents`);
      const docsSnapshot = await getDocs(docsRef);
      return docsSnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          createdAtDate: convertTimestamp(docData.createdAt),
          status: docData.status || 'free',
          courseId: unit.courseId,
          semesterId: unit.semesterId,
          unitId: unit.unitId,
          courseName: unit.courseName,
          semesterName: unit.semesterName,
          unitName: unit.unitName
        };
      });
    });

    const docsResults = await Promise.all(docsPromises);
    const unitDocs = docsResults.flat();

    const semDocsPromises = flatSemesters.map(async (sem) => {
      const semDocsRef = collection(db, `RESOURCES_STUDYPEDIA/${sem.courseId}/semesters/${sem.semesterId}/documents`);
      const semDocsSnapshot = await getDocs(semDocsRef);
      return semDocsSnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          createdAtDate: convertTimestamp(docData.createdAt),
          status: docData.status || 'free',
          courseId: sem.courseId,
          semesterId: sem.semesterId,
          unitId: null,
          courseName: sem.courseName,
          semesterName: sem.semesterName,
          unitName: null
        };
      });
    });

    const semDocsResults = await Promise.all(semDocsPromises);
    const semDocs = semDocsResults.flat();

    allDocuments.push(...unitDocs, ...semDocs);

    allDocuments.sort((a, b) => {
      if (a.time === 'latest' && b.time !== 'latest') return -1;
      if (a.time !== 'latest' && b.time === 'latest') return 1;
      const dateA = a.createdAtDate || new Date(0);
      const dateB = b.createdAtDate || new Date(0);
      return dateB - dateA;
    });

    const result = { success: true, data: allDocuments.slice(0, maxItems) };
    return result;
  } catch (error) {
    console.error('Error fetching all documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

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
