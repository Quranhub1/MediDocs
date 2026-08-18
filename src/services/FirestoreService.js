import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc as docRef,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { retryOperation, isNetworkError } from '../utils/network';

export const RESOURCES_COLLECTION = 'RESOURCES_STUDYPEDIA';

// Enhanced caching system with localStorage persistence
const CACHE_KEYS = {
  COURSES: 'medidocs_courses_cache',
  DOCUMENTS: 'medidocs_documents_cache',
  USERS: 'medidocs_users_cache',
  PAYMENTS: 'medidocs_payments_cache'
};

const CACHE_DURATION = {
  COURSES: 30 * 60 * 1000,
  DOCUMENTS: 15 * 60 * 1000,
  USERS: 5 * 60 * 1000,
  PAYMENTS: 5 * 60 * 1000
};

const MAX_CACHE_SIZE = 50;

const getCache = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const isCourses = key === CACHE_KEYS.COURSES;
    const cacheType = isCourses ? 'COURSES' : 'DOCUMENTS';
    if (now - timestamp > CACHE_DURATION[cacheType]) {
      localStorage.removeItem(key);
      return null;
    }
    return { data, timestamp };
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
};

const setCache = (key, data) => {
  try {
    const cacheData = data.slice(0, MAX_CACHE_SIZE);
    const cacheEntry = {
      data: cacheData,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
};

const clearCache = (key = null) => {
  if (key) {
    localStorage.removeItem(key);
  } else {
    localStorage.removeItem(CACHE_KEYS.COURSES);
    localStorage.removeItem(CACHE_KEYS.DOCUMENTS);
  }
};

// Fetch all courses - simple fetch
export const fetchCourses = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCache(CACHE_KEYS.COURSES);
    if (cached) {
      return { success: true, data: cached.data };
    }
  }

  try {
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const querySnapshot = await retryOperation(() => getDocs(coursesRef), 3, 1000);
    const courses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCache(CACHE_KEYS.COURSES, courses);
    return { success: true, data: courses };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Fetch semesters for a specific course
export const fetchSemesters = async (courseId) => {
  try {
    const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters`);
    const snapshot = await retryOperation(() => getDocs(semestersRef), 3, 1000);
    const semesters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: semesters };
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Fetch courseunits for a specific semester
export const fetchCourseUnits = async (courseId, semesterId) => {
  try {
    const unitsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/courseunits`);
    const snapshot = await retryOperation(() => getDocs(unitsRef), 3, 1000);
    const units = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: units };
  } catch (error) {
    console.error('Error fetching course units:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Fetch documents for a specific courseunit
export const fetchDocuments = async (courseId, semesterId, unitId) => {
  try {
    const docsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/courseunits/${unitId}/documents`);
    const snapshot = await retryOperation(() => getDocs(docsRef), 3, 1000);
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: documents };
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { success: false, error: error.message, data: [] };
  }
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

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  weekly: { amount: 5000, label: 'Weekly', duration: 7 },
  monthly: { amount: 15000, label: 'Monthly', duration: 30 },
  yearly: { amount: 60000, label: 'Yearly', duration: 365 }
};

// Path: RESOURCES_STUDYPEDIA/{courseId}/semesters/{semesterId}/courseunits/{unitId}/documents/{docId}
export const fetchAllDocuments = async (maxItems = 50, forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCache(CACHE_KEYS.DOCUMENTS);
    if (cached && cached.data && cached.data.length > 0) {
      return { success: true, data: cached.data };
    }
  }

  try {
    const allDocuments = [];
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const coursesSnapshot = await retryOperation(() => getDocs(coursesRef), 3, 1000);
    
    if (coursesSnapshot.docs.length === 0) {
      setCache(CACHE_KEYS.DOCUMENTS, []);
      return { success: true, data: [] };
    }
    
    const semesterPromises = coursesSnapshot.docs.map(async (courseDoc) => {
      const courseId = courseDoc.id;
      const courseName = courseDoc.data().name || courseId;
      const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters`);
      const semestersSnapshot = await retryOperation(() => getDocs(semestersRef), 3, 1000);
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
      const unitsRef = collection(db, `${RESOURCES_COLLECTION}/${sem.courseId}/semesters/${sem.semesterId}/courseunits`);
      const unitsSnapshot = await retryOperation(() => getDocs(unitsRef), 3, 1000);
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
      const docsRef = collection(db, `${RESOURCES_COLLECTION}/${unit.courseId}/semesters/${unit.semesterId}/courseunits/${unit.unitId}/documents`);
      const docsSnapshot = await retryOperation(() => getDocs(docsRef), 3, 1000);
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
      const semDocsRef = collection(db, `${RESOURCES_COLLECTION}/${sem.courseId}/semesters/${sem.semesterId}/documents`);
      const semDocsSnapshot = await retryOperation(() => getDocs(semDocsRef), 3, 1000);
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
    setCache(CACHE_KEYS.DOCUMENTS, result.data);
    return result;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const fetchResources = async (maxItems = 20) => fetchAllDocuments(maxItems);

export { clearCache };

// Submit contact form to Firestore and notify the admin via email
export const submitContactForm = async (formData) => {
  try {
    const contactRef = collection(db, 'contact_submissions');
    await addDoc(contactRef, {
      ...formData,
      createdAt: serverTimestamp(),
      status: 'pending'
    });

    try {
      const response = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'kaigwaakram123@gmail.com',
          subject: `MediDocs Contact: ${formData.subject || 'New message'}`,
          message: `You have a new contact form submission.\n\nName: ${formData.name || 'N/A'}\nEmail: ${formData.email || 'N/A'}\nSubject: ${formData.subject || 'N/A'}\n\nMessage:\n${formData.message || ''}`,
          eventType: 'Contact Form',
          userEmail: formData.email,
          userName: formData.name
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('Contact email notification failed:', data.error || response.statusText);
      }
    } catch (emailError) {
      console.error('Contact email notification failed:', emailError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return { success: false, error: error.message };
  }
};

// Submit payment to Firestore
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

// Verify payment with Paystack
export const verifyPayment = async (reference) => {
  try {
<<<<<<< ours
    const response = await fetch('/api/paystack/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reference })
    });
    return await response.json();
=======
    if (!courseId || !semesterId || !unitId) return { success: false, error: 'Course ID, Semester ID, and Unit ID required', data: [] };
    const docsRef = collection(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters/${semesterId}/courseunits/${unitId}/documents`);
    const snapshot = await getDocs(docsRef);
    const documents = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        createdAtDate: convertTimestamp(docData.createdAt),
        status: docData.status || 'free'
      };
    });
    return { success: true, data: documents };
>>>>>>> theirs
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

// Get all payments
export const getAllPayments = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCache(CACHE_KEYS.PAYMENTS);
    if (cached && cached.data && cached.data.length > 0) {
      return { success: true, data: cached.data };
    }
  }
  try {
    const paymentsRef = collection(db, 'payments');
    const snapshot = await getDocs(paymentsRef);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAtDate: convertTimestamp(doc.data().createdAt)
    }));
    setCache(CACHE_KEYS.PAYMENTS, payments);
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error fetching payments:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get all users
export const getAllUsers = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCache(CACHE_KEYS.USERS);
    if (cached && cached.data && cached.data.length > 0) {
      return { success: true, data: cached.data };
    }
  }
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCache(CACHE_KEYS.USERS, users);
    return { success: true, data: users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message, data: [] };
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

// Get document content for AI context
export const getDocumentForAI = async (docId, courseId, semesterId, unitId) => {
  try {
    let docRefPath = `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/courseunits/${unitId}/documents/${docId}`;
    let docSnap = await getDoc(docRef(db, docRefPath));
    
    if (!docSnap.exists()) {
      docRefPath = `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/documents/${docId}`;
      docSnap = await getDoc(docRef(db, docRefPath));
    }
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: 'Document not found' };
  } catch (error) {
    console.error('Error fetching document for AI:', error);
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
