import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  docRef,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { escapeHtml } from '../utils/documentActions';

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  weekly: { amount: 5000, label: 'Weekly', duration: 7 },
  monthly: { amount: 10000, label: 'Monthly', duration: 30 },
  yearly: { amount: 50000, label: 'Yearly', duration: 365 }
};

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
      const docsRef = collection(db, `RESOURCES_STUDYPEDIA/${unit.courseId}/semesters/${sem.semesterId}/courseunits/${unit.unitId}/documents`);
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

// Get all users
export const getAllUsers = async (forceRefresh = false) => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get all payments
export const getAllPayments = async (forceRefresh = false) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const snapshot = await getDocs(paymentsRef);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAtDate: convertTimestamp(doc.data().createdAt)
    }));
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error fetching payments:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Subscribe payment to Firestore
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

// Upload thumbnail to Firebase Storage
export const uploadThumbnail = async (file, path = 'thumbnails') => {
  try {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../firebase');
    
    const fileName = `${path}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return { success: false, error: error.message };
  }
};

// Upload document to Firebase Storage
export const uploadDocument = async (file, path = 'documents') => {
  try {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../firebase');
    
    const fileName = `${path}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { success: false, error: error.message };
  }
};

// List files from Firebase Storage
export const listStorageFiles = async (folder = '') => {
  try {
    const { ref, listAll, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../firebase');
    
    const storageRef = ref(storage, folder);
    const result = await listAll(storageRef);
    
    const files = await Promise.all(
      result.items.map(async (item) => {
        const url = await getDownloadURL(item);
        return {
          name: item.name,
          fullPath: item.fullPath,
          url: url,
          size: item.size,
          contentType: item.contentType,
          updated: item.updated
        };
      })
    );
    
    return { success: true, files };
  } catch (error) {
    console.error('Error listing storage files:', error);
    return { success: false, error: error.message, files: [] };
  }
};

// Delete file from Firebase Storage
export const deleteStorageFile = async (filePath) => {
  try {
    const { ref, deleteObject } = await import('firebase/storage');
    const { storage } = await import('../firebase');
    
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting storage file:', error);
    return { success: false, error: error.message };
  }
};

// Create folder in Firebase Storage
export const createStorageFolder = async (folderName) => {
  try {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../firebase');
    
    const folderRef = ref(storage, `${folderName}/.keep`);
    const blob = new Blob([''], { type: 'text/plain' });
    await uploadBytes(folderRef, blob);
    return { success: true, message: 'Folder created successfully' };
  } catch (error) {
    console.error('Error creating folder:', error);
    return { success: false, error: error.message };
  }
};

// Decline payment
export const declinePayment = async (paymentId) => {
  try {
    const paymentRef = docRef(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      status: 'declined',
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error declining payment:', error);
    return { success: false, error: error.message };
  }
};

// Update subscription expiry
export const updateSubscriptionExpiry = async (userId, expiryDate) => {
  try {
    const userDocRef = docRef(db, 'users', userId);
    await updateDoc(userDocRef, {
      subscriptionExpiry: expiryDate,
      subscriptionStatus: 'active',
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription expiry:', error);
    return { success: false, error: error.message };
  }
};

// Get users with expiring subscriptions (within 5 days)
export const getExpiringSubscriptions = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    
    const expiringUsers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => {
        if (!user.subscriptionExpiry || !user.subscriptionApproved) return false;
        const expiry = user.subscriptionExpiry.toDate ? user.subscriptionExpiry.toDate() : new Date(user.subscriptionExpiry);
        return expiry <= fiveDaysFromNow && expiry > new Date();
      });
    
    return { success: true, data: expiringUsers };
  } catch (error) {
    console.error('Error fetching expiring subscriptions:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Lock expired subscriptions
export const lockExpiredSubscriptions = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const now = new Date();
    
    const expiredUsers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => {
        if (!user.subscriptionExpiry || !user.subscriptionApproved) return false;
        const expiry = user.subscriptionExpiry.toDate ? user.subscriptionExpiry.toDate() : new Date(user.subscriptionExpiry);
        return expiry < now;
      });
    
    for (const user of expiredUsers) {
      await updateDoc(docRef(db, 'users', user.id), {
        subscriptionStatus: 'expired',
        banned: true,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true, lockedCount: expiredUsers.length };
  } catch (error) {
    console.error('Error locking expired subscriptions:', error);
    return { success: false, error: error.message };
  }
};

// Get subscription countdown
export function getSubscriptionCountdown(user) {
  if (!user || !user.subscriptionExpiry) return null;
   
  const expiry = user.subscriptionExpiry.toDate ? user.subscriptionExpiry.toDate() : new Date(user.subscriptionExpiry);
  const now = new Date();
  const diff = expiry - now;
   
  if (diff <= 0) {
    return { text: 'Expired', days: 0, expired: true };
  }
   
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const hours = Math.ceil((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
   
  if (days > 0) {
    return { text: `${days} day${days > 1 ? 's' : ''} remaining`, days, expired: false };
  } else if (hours > 0) {
    return { text: `${hours} hour${hours > 1 ? 's' : ''} remaining`, days: 0, expired: false };
  } else {
    const minutes = Math.ceil((diff % (1000 * 60)) / (1000 * 60));
    return { text: `${minutes} min remaining`, days: 0, expired: false };
  }
}

// Submit contact form via email endpoint
export const submitContactForm = async (formData) => {
  try {
    const { name, email, subject, message } = formData;
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      return { success: false, error: 'All fields are required' };
    }
    
    // Escape HTML special characters to prevent XSS
    const escapedName = escapeHtml(name.trim());
    const escapedEmail = escapeHtml(email.trim());
    const escapedSubject = escapeHtml(subject.trim());
    const escapedMessage = escapeHtml(message.trim());
    
    // Prepare email data
    const emailData = {
      to: 'kaigwaakram123@gmail.com', // Admin email
      subject: escapedSubject,
      message: `Name: ${escapedName}\\nEmail: ${escapedEmail}\\n\\nMessage:\\n${escapedMessage}`,
      eventType: 'Contact Form Submission',
      userEmail: escapedEmail,
      userName: escapedName
    };
    
    const response = await fetch('/api/notify/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.message || 'Failed to send message' };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return { success: false, error: error.message };
  }
};