import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc as docRef,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export const RESOURCES_COLLECTION = 'RESOURCES_STUDYPEDIA';

// Enhanced caching system with localStorage persistence
const CACHE_KEYS = {
  COURSES: 'medidocs_courses_cache',
  DOCUMENTS: 'medidocs_documents_cache'
};

const CACHE_DURATION = {
  COURSES: 30 * 60 * 1000,
  DOCUMENTS: 15 * 60 * 1000
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
    const querySnapshot = await getDocs(coursesRef);
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
    const snapshot = await getDocs(semestersRef);
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
    const snapshot = await getDocs(unitsRef);
    const units = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: units };
  } catch (error) {
    console.error('Error fetching courseunits:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Fetch documents for a specific courseunit
export const fetchDocuments = async (courseId, semesterId, unitId) => {
  try {
    const docsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/courseunits/${unitId}/documents`);
    const snapshot = await getDocs(docsRef);
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
    const coursesSnapshot = await getDocs(coursesRef);
    
    if (coursesSnapshot.docs.length === 0) {
      setCache(CACHE_KEYS.DOCUMENTS, []);
      return { success: true, data: [] };
    }
    
    const semesterPromises = coursesSnapshot.docs.map(async (courseDoc) => {
      const courseId = courseDoc.id;
      const courseName = courseDoc.data().name || courseId;
      const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters`);
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
      const unitsRef = collection(db, `${RESOURCES_COLLECTION}/${sem.courseId}/semesters/${sem.semesterId}/courseunits`);
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
      const docsRef = collection(db, `${RESOURCES_COLLECTION}/${unit.courseId}/semesters/${unit.semesterId}/courseunits/${unit.unitId}/documents`);
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
      const semDocsRef = collection(db, `${RESOURCES_COLLECTION}/${sem.courseId}/semesters/${sem.semesterId}/documents`);
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
    setCache(CACHE_KEYS.DOCUMENTS, result.data);
    return result;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const fetchResources = async (maxItems = 20) => fetchAllDocuments(maxItems);

export { clearCache };

// Submit contact form to Firestore
export const submitContactForm = async (formData) => {
  try {
    const contactRef = collection(db, 'contact_submissions');
    await addDoc(contactRef, {
      ...formData,
      createdAt: serverTimestamp(),
      status: 'pending'
    });
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
    const response = await fetch('/api/paystack/verify', {
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

// Get all payments
export const getAllPayments = async () => {
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

// Get all users
export const getAllUsers = async () => {
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
