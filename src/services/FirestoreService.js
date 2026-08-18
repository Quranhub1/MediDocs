import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc as docRef,
  setDoc,
  updateDoc,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { retryOperation } from '../utils/network';

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
    const { ref, uploadBytes } = await import('firebase/storage');
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

// Update payment status (used by admin to confirm/approve payments via transaction ID)
export const updatePaymentStatus = async (paymentId, status) => {
  try {
    const paymentRef = docRef(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
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

// Proration calculation for plan changes
export const calculateProration = async (userId, currentPlan, newPlan, currentExpiryDate) => {
  try {
    const userDocRef = docRef(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    const currentExpiry = currentExpiryDate || (userData.subscriptionExpiry ? 
      (userData.subscriptionExpiry.toDate ? userData.subscriptionExpiry.toDate() : new Date(userData.subscriptionExpiry)) : 
      new Date());
    
    const now = new Date();
    
    // If not subscribed or expired, no proration needed
    if (!userData.subscriptionApproved || 
        userData.subscriptionStatus !== 'active' || 
        currentExpiry <= now) {
      return { success: true, prorationAmount: 0, message: 'No active subscription to prorate' };
    }
    
    // Get plan details
    const currentPlanDetails = SUBSCRIPTION_PLANS[currentPlan];
    const newPlanDetails = SUBSCRIPTION_PLANS[newPlan];
    
    if (!currentPlanDetails || !newPlanDetails) {
      return { success: false, error: 'Invalid plan specified' };
    }
    
    // Calculate time remaining in current subscription
    const timeRemainingMs = currentExpiry.getTime() - now.getTime();
    const timeRemainingDays = Math.max(0, timeRemainingMs / (1000 * 60 * 60 * 24));
    
    // Calculate daily rate for current plan
    const currentDailyRate = currentPlanDetails.amount / currentPlanDetails.duration;
    
    // Calculate value of remaining time
    const remainingValue = timeRemainingDays * currentDailyRate;
    
    // Calculate what the remaining time would be worth in new plan
    const newDailyRate = newPlanDetails.amount / newPlanDetails.duration;
    const equivalentNewPlanDays = remainingValue / newDailyRate;
    
    // Calculate new expiry date based on equivalent time in new plan
    const newExpiryDate = new Date(now.getTime() + (equivalentNewPlanDays * 1000 * 60 * 60 * 24));
    
    // Calculate any additional amount owed or refund due
    // If new plan is more expensive per day, user owes difference
    // If new plan is less expensive per day, user gets credit
    const dailyRateDifference = newDailyRate - currentDailyRate;
    const prorationAmount = dailyRateDifference * timeRemainingDays;
    
    return {
      success: true,
      prorationAmount: Math.round(prorationAmount * 100) / 100, // Round to 2 decimal places
      newExpiryDate: newExpiryDate.toISOString(),
      timeRemainingDays: Math.round(timeRemainingDays * 100) / 100,
      currentDailyRate: Math.round(currentDailyRate * 100) / 100,
      newDailyRate: Math.round(newDailyRate * 100) / 100,
      message: prorationAmount > 0 
        ? `You owe UGX ${prorationAmount.toFixed(0)} for upgrading to a more expensive plan`
        : prorationAmount < 0
        ? `You'll receive a credit of UGX ${Math.abs(prorationAmount).toFixed(0)} for downgrading to a less expensive plan`
        : 'No proration amount - plans have equivalent daily rates'
    };
  } catch (error) {
    console.error('Error calculating proration:', error);
    return { success: false, error: error.message };
  }
};

// Record subscription analytics event
export const recordSubscriptionEvent = async (userId, eventType, eventData = {}) => {
  try {
    const eventsRef = collection(db, 'subscription_events');
    await addDoc(eventsRef, {
      userId,
      eventType,
      timestamp: serverTimestamp(),
      ...eventData
    });
    return { success: true };
  } catch (error) {
    console.error('Error recording subscription event:', error);
    return { success: false, error: error.message };
  }
};

// Record document view for usage analytics
export const recordDocumentView = async (userId, documentId, courseId, semesterId, unitId) => {
  try {
    const viewsRef = collection(db, 'document_views');
    await addDoc(viewsRef, {
      userId,
      documentId,
      courseId,
      semesterId,
      unitId,
      viewedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error recording document view:', error);
    return { success: false, error: error.message };
  }
};

// Get user's subscription usage analytics
export const getUserSubscriptionAnalytics = async (userId, days = 30) => {
  try {
    const viewsRef = collection(db, 'document_views');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const q = query(
      viewsRef,
      where('userId', '==', userId),
      where('viewedAt', '>=', startDate)
    );
    
    const snapshot = await getDocs(q);
    const views = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      viewedAt: doc.data().viewedAt ? 
        (doc.data().viewedAt.toDate ? doc.data().viewedAt.toDate() : new Date(doc.data().viewedAt)) : 
        new Date()
    }));
    
    // Group by course/semester/unit
    const usageByCourse = {};
    views.forEach(view => {
      const key = `${view.courseId || 'unknown'}-${view.semesterId || 'unknown'}-${view.unitId || 'unknown'}`;
      if (!usageByCourse[key]) {
        usageByCourse[key] = {
          courseId: view.courseId,
          semesterId: view.semesterId,
          unitId: view.unitId,
          count: 0,
          lastViewed: view.viewedAt
        };
      }
      usageByCourse[key].count++;
      if (view.viewedAt > usageByCourse[key].lastViewed) {
        usageByCourse[key].lastViewed = view.viewedAt;
      }
    });
    
    return {
      success: true,
      totalViews: views.length,
      viewsPerDay: Math.round((views.length / days) * 100) / 100,
      usageByCourse: Object.values(usageByCourse),
      periodDays: days
    };
  } catch (error) {
    console.error('Error getting user subscription analytics:', error);
    return { success: false, error: error.message };
  }
};

// Record referral
export const recordReferral = async (referrerId, refereeId, referralType = 'signup') => {
  try {
    const referralsRef = collection(db, 'referrals');
    await addDoc(referralsRef, {
      referrerId,
      refereeId,
      referralType,
      timestamp: serverTimestamp(),
      completed: false
    });
    return { success: true };
  } catch (error) {
    console.error('Error recording referral:', error);
    return { success: false, error: error.message };
  }
};

// Complete referral (when referee subscribes)
export const completeReferral = async (referralId, rewardAmount = 5000) => {
  try {
    const referralRef = docRef(db, 'referrals', referralId);
    const referralDoc = await getDoc(referralRef);
    
    if (!referralDoc.exists()) {
      return { success: false, error: 'Referral not found' };
    }
    
    const referralData = referralDoc.data();
    
    // Update referral as completed
    await updateDoc(referralRef, {
      completed: true,
      completedAt: serverTimestamp(),
      rewardAmount: rewardAmount
    });
    
    // Award credit to referrer (could be stored as a balance or applied to next invoice)
    // For now, we'll just record the event
    await recordSubscriptionEvent(referralData.referrerId, 'referral_reward', {
      referralId: referralId,
      refereeId: referralData.refereeId,
      rewardAmount: rewardAmount,
      rewardType: 'credit'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error completing referral:', error);
    return { success: false, error: error.message };
  }
};

// Create gift subscription
export const createGiftSubscription = async (giftData) => {
  try {
    const { senderId, recipientEmail, plan, message } = giftData;
    
    // Find recipient by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', recipientEmail));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'No user found with that email' };
    }
    
    const recipientDoc = snapshot.docs[0];
    const recipientId = recipientDoc.id;
    const recipientData = recipientDoc.data();
    
    // Create gift record
    const giftsRef = collection(db, 'gift_subscriptions');
    const giftDocRef = await addDoc(giftsRef, {
      senderId,
      recipientId: recipientId,
      plan: plan,
      message: message || '',
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    // Notify recipient
    try {
      const response = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `You've received a MediDocs gift subscription!`,
          message: `You have been gifted a ${SUBSCRIPTION_PLANS[plan]?.label || plan} subscription to MediDocs!\n\n${message || ''}\n\nTo accept this gift, please log into your account and visit the subscription page.`,
          eventType: 'Gift Subscription',
          userEmail: recipientEmail,
          userName: recipientData.name || 'there'
        })
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('Gift subscription email notification failed:', data.error || response.statusText);
      }
    } catch (emailError) {
      console.error('Failed to send gift subscription notification email:', emailError);
    }
    
    return { success: true, giftId: giftDocRef.id };
  } catch (error) {
    console.error('Error creating gift subscription:', error);
    return { success: false, error: error.message };
  }
};

// Accept gift subscription
export const acceptGiftSubscription = async (giftId, userId) => {
  try {
    const giftRef = docRef(db, 'gift_subscriptions', giftId);
    const giftDoc = await getDoc(giftRef);
    
    if (!giftDoc.exists()) {
      return { success: false, error: 'Gift not found' };
    }
    
    const giftData = giftDoc.data();
    
    if (giftData.recipientId !== userId) {
      return { success: false, error: 'This gift is not for you' };
    }
    
    if (giftData.status !== 'pending') {
      return { success: false, error: 'This gift has already been processed' };
    }
    
    // Calculate expiry date based on plan
    const planDetails = SUBSCRIPTION_PLANS[giftData.plan];
    if (!planDetails) {
      return { success: false, error: 'Invalid plan in gift' };
    }
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + planDetails.duration);
    
    // Update user's subscription
    const userDocRef = docRef(db, 'users', userId);
    await updateDoc(userDocRef, {
      subscriptionApproved: true,
      subscriptionStatus: 'active',
      subscriptionPlan: giftData.plan,
      subscriptionExpiry: expiryDate.toISOString(),
      giftSubscriptionId: giftId
    });
    
    // Update gift status
    await updateDoc(giftRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp()
    });
    
    // Record event
    await recordSubscriptionEvent(userId, 'gift_subscription_accepted', {
      giftId: giftId,
      senderId: giftData.senderId,
      plan: giftData.plan
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error accepting gift subscription:', error);
    return { success: false, error: error.message };
  }
};

// Record payment failure
export const recordPaymentFailure = async (userId, paymentData, failureReason) => {
  try {
    const failuresRef = collection(db, 'payment_failures');
    await addDoc(failuresRef, {
      userId,
      paymentData: {
        ...paymentData,
        // Don't store sensitive payment info
        amount: paymentData.amount,
        plan: paymentData.plan,
        reference: paymentData.reference
      },
      failureReason: failureReason,
      attemptedAt: serverTimestamp()
    });
    
    // Update user status if needed (e.g., after multiple failures)
    const failureCountDoc = await getDoc(docRef(db, 'payment_failure_counts', userId));
    let failureCount = 1;
    
    if (failureCountDoc.exists()) {
      failureCount = failureCountDoc.data().count + 1;
    }
    
    await setDoc(docRef(db, 'payment_failure_counts', userId), {
      count: failureCount,
      lastFailure: serverTimestamp()
    }, { merge: true });
    
    // If 3 consecutive failures, suspend subscription
    if (failureCount >= 3) {
      const userDocRef = docRef(db, 'users', userId);
      await updateDoc(userDocRef, {
        subscriptionStatus: 'past_due',
        subscriptionApproved: false
      });
      
      // Notify user via server API
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          await fetch('/api/notify/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: userData.email,
              subject: 'Important: Your MediDocs subscription payment is past due',
              message: `Hi ${userData.name || 'user'},\n\nWe've noticed that your recent payment attempts have failed. To avoid interruption of service, please update your payment method.\n\nYour subscription will be suspended if payment is not received within 7 days.`,
              eventType: 'Payment Past Due',
              userEmail: userData.email,
              userName: userData.name || 'user'
            })
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment failure notification email:', emailError);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error recording payment failure:', error);
    return { success: false, error: error.message };
  }
};

// Check if user is in grace period
export const checkGracePeriod = async (userId) => {
  try {
    const userDocRef = docRef(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    
    // Check if subscription is expired but within grace period (e.g., 3 days)
    if (userData.subscriptionExpiry) {
      const expiryDate = userData.subscriptionExpiry.toDate ? 
        userData.subscriptionExpiry.toDate() : 
        new Date(userData.subscriptionExpiry);
      
      const now = new Date();
      const gracePeriodDays = 3; // 3 day grace period
      const gracePeriodEnd = new Date(expiryDate.getTime() + (gracePeriodDays * 1000 * 60 * 60 * 24));
      
      const isExpired = expiryDate <= now;
      const isInGracePeriod = !isExpired && now <= gracePeriodEnd;
      
      return {
        success: true,
        isExpired: isExpired,
        isInGracePeriod: isInGracePeriod,
        gracePeriodEnds: gracePeriodEnd.toISOString(),
        daysUntilGracePeriodEnds: Math.max(0, Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        canAccess: isInGracePeriod || !isExpired // Can access if not expired or in grace period
      };
    }
    
    return {
      success: true,
      isExpired: true,
      isInGracePeriod: false,
      canAccess: false
    };
  } catch (error) {
    console.error('Error checking grace period:', error);
    return { success: false, error: error.message };
  }
};

// Extend subscription due to grace period or payment delay
export const extendSubscriptionGracePeriod = async (userId, extensionDays = 3) => {
  try {
    const userDocRef = docRef(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    
    let newExpiryDate;
    if (userData.subscriptionExpiry) {
      const currentExpiry = userData.subscriptionExpiry.toDate ? 
        userData.subscriptionExpiry.toDate() : 
        new Date(userData.subscriptionExpiry);
      
      newExpiryDate = new Date(currentExpiry.getTime() + (extensionDays * 1000 * 60 * 60 * 24));
    } else {
      // If no expiry date, set from now
      newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + extensionDays);
    }
    
    // Update subscription
    await updateDoc(userDocRef, {
      subscriptionExpiry: newExpiryDate.toISOString(),
      subscriptionStatus: 'active', // Keep active during grace period
      gracePeriodExtended: true,
      gracePeriodExtendedAt: serverTimestamp(),
      gracePeriodExtensionDays: extensionDays
    });
    
    return { 
      success: true, 
      newExpiryDate: newExpiryDate.toISOString(),
      message: `Subscription extended by ${extensionDays} days due to grace period`
    };
  } catch (error) {
    console.error('Error extending subscription grace period:', error);
    return { success: false, error: error.message };
  }
};
