import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  getDocsFromCache,
  onSnapshot,
  addDoc,
  updateDoc,
  doc as docRef,
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

// Realtime resource listeners. These deliberately bypass the legacy cache helpers.
// One listener covers every nested documents subcollection, and one covers courses.
// Firestore sends the initial snapshot once, then only changed documents afterwards.
export const subscribeToCourses = (onData, onError) => {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, 'RESOURCES_STUDYPEDIA'),
    (snapshot) => {
      const courses = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        name: item.data().name || item.id,
        createdAtDate: convertTimestamp(item.data().createdAt)
      }));
      onData(courses);
    },
    (error) => {
      console.error('[REALTIME] Courses listener failed:', error);
      if (onError) onError(error);
    }
  );
};

export const subscribeToAllResources = (onData, onError) => {
  if (!db) return () => {};
  return onSnapshot(
    collectionGroup(db, 'documents'),
    (snapshot) => {
      const data = snapshot.docs.map((item) => {
        const docData = item.data();
        const parts = item.ref.path.split('/');
        const courseId = parts[1] || docData.courseId || '';
        const semesterId = parts[3] || docData.semesterId || '';
        const unitId = parts[5] === 'courseunits' ? parts[6] : null;
        const courseName = docData.courseName || docData.course || courseId;
        const semesterName = docData.semesterName || semesterId;
        const unitName = docData.unitName || unitId;
        return {
          id: item.id,
          ...docData,
          courseId,
          courseName,
          semesterId,
          semesterName,
          unitId,
          unitName,
          fullPath: item.ref.path,
          createdAtDate: convertTimestamp(docData.createdAt),
          status: docData.status || 'free'
        };
      });
      data.sort((a, b) => {
        if (a.time === 'latest' && b.time !== 'latest') return -1;
        if (a.time !== 'latest' && b.time === 'latest') return 1;
        return (b.createdAtDate?.getTime() || 0) - (a.createdAtDate?.getTime() || 0);
      });
      onData(data);
    },
    (error) => {
      console.error('[REALTIME] Resource listener failed:', error);
      if (onError) onError(error);
    }
  );
};

export const subscribeToSemesters = (courseId, onData, onError) => {
  if (!db || !courseId) return () => {};
  return onSnapshot(
    collection(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters`),
    (snapshot) => onData(snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
      name: item.data().name || item.id,
      createdAtDate: convertTimestamp(item.data().createdAt)
    }))),
    (error) => {
      console.error('[REALTIME] Semesters listener failed:', error);
      if (onError) onError(error);
    }
  );
};

export const subscribeToCourseUnits = (courseId, semesterId, onData, onError) => {
  if (!db || !courseId || !semesterId) return () => {};
  return onSnapshot(
    collection(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters/${semesterId}/courseunits`),
    (snapshot) => onData(snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
      name: item.data().name || item.id,
      createdAtDate: convertTimestamp(item.data().createdAt)
    }))),
    (error) => {
      console.error('[REALTIME] Course units listener failed:', error);
      if (onError) onError(error);
    }
  );
};

export const subscribeToDocuments = (courseId, semesterId, unitId, onData, onError) => {
  if (!db || !courseId || !semesterId || !unitId) return () => {};
  return onSnapshot(
    collection(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters/${semesterId}/courseunits/${unitId}/documents`),
    (snapshot) => onData(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        ...data,
        courseId,
        semesterId,
        unitId,
        courseName: data.courseName || data.course || courseId,
        semesterName: data.semesterName || semesterId,
        unitName: data.unitName || unitId,
        fullPath: item.ref.path,
        createdAtDate: convertTimestamp(data.createdAt),
        status: data.status || 'free'
      };
    })),
    (error) => {
      console.error('[REALTIME] Documents listener failed:', error);
      if (onError) onError(error);
    }
  );
};

// Fetch all documents from the RESOURCES_STUDYPEDIA collection
let resourceIndexCache = null;
let resourceIndexCacheAt = 0;
const RESOURCE_INDEX_CACHE_MS = 30 * 60 * 1000;
const RESOURCE_INDEX_FAILURE_BACKOFF_MS = 15 * 60 * 1000;
let resourceIndexFailureAt = 0;
let resourceIndexFailureError = null;

const collectionCache = new Map();
const getCachedCollection = async (path, forceRefresh = false) => {
  if (!db) return { success: false, error: 'Firestore is not configured', data: [] };
  const ref = collection(db, path);
  if (!forceRefresh) {
    try {
      const cached = await getDocsFromCache(ref);
      if (!cached.empty) {
        const data = cached.docs.map((item) => ({ id: item.id, ...item.data() }));
        collectionCache.set(path, data);
        return { success: true, data, fromCache: true };
      }
    } catch (error) {
      console.info('[CACHE] No local cache for', path);
    }
    const memory = collectionCache.get(path);
    if (memory) return { success: true, data: memory, fromCache: true };
  }
  const snapshot = await getDocs(ref);
  const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  collectionCache.set(path, data);
  return { success: true, data };
};

const fetchResourceIndexFromApi = async (maxItems = 50, forceRefresh = false) => {
  if (!forceRefresh) {
    if (resourceIndexCache && Date.now() - resourceIndexCacheAt < RESOURCE_INDEX_CACHE_MS) {
      return { ...resourceIndexCache, data: resourceIndexCache.data.slice(0, maxItems) };
    }
    try {
      const stored = localStorage.getItem('medidocs_resource_index_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.cachedAt && Date.now() - parsed.cachedAt < RESOURCE_INDEX_CACHE_MS && parsed?.data) {
          resourceIndexCache = parsed.data;
          resourceIndexCacheAt = parsed.cachedAt;
          return { ...parsed.data, data: (parsed.data.data || []).slice(0, maxItems), cached: true };
        }
      }
    } catch (error) {
      console.info('[CACHE] Resource index local cache unavailable');
    }
  }
  if (!forceRefresh && resourceIndexFailureAt && Date.now() - resourceIndexFailureAt < RESOURCE_INDEX_FAILURE_BACKOFF_MS) {
    return resourceIndexCache
      ? { ...resourceIndexCache, stale: true, data: resourceIndexCache.data.slice(0, maxItems) }
      : { success: false, quotaExceeded: true, error: resourceIndexFailureError || 'Resource index temporarily unavailable', data: [], courseCounts: [], totalDocuments: 0 };
  }
  try {
    const response = await fetch(`/api/resources/index?limit=${Math.max(1, Math.min(10000, Number(maxItems) || 50))}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      const error = new Error(result.error || `Resource index request failed: ${response.status}`);
      if (response.status === 429 || response.status === 503 || result.quotaExceeded) {
        resourceIndexFailureAt = Date.now();
        resourceIndexFailureError = result.error || 'Firestore quota temporarily exceeded';
        if (resourceIndexCache) return { ...resourceIndexCache, stale: true, data: resourceIndexCache.data.slice(0, maxItems) };
        return { success: false, quotaExceeded: true, error: resourceIndexFailureError, data: [], courseCounts: [], totalDocuments: 0 };
      }
      throw error;
    }
    resourceIndexFailureAt = 0;
    resourceIndexFailureError = null;
    resourceIndexCache = result;
    resourceIndexCacheAt = Date.now();
    try {
      localStorage.setItem('medidocs_resource_index_v1', JSON.stringify({
        cachedAt: resourceIndexCacheAt,
        data: result
      }));
    } catch (error) {
      console.info('[CACHE] Resource index too large for local storage');
    }
    return { ...result, data: (result.data || []).slice(0, maxItems) };
  } catch (error) {
    console.warn('[RESOURCES] Server index unavailable:', error.message);
    return resourceIndexCache
      ? { ...resourceIndexCache, stale: true, data: resourceIndexCache.data.slice(0, maxItems) }
      : { success: false, error: error.message, data: [], courseCounts: [], totalDocuments: 0 };
  }
};

const RESOURCE_COUNT_CACHE_KEY = 'medidocs_resource_count_v1';
const RESOURCE_COUNT_CACHE_MS = 30 * 60 * 1000;

export const fetchTotalResourceCount = async (forceRefresh = false) => {
  if (!forceRefresh) {
    try {
      const stored = JSON.parse(localStorage.getItem(RESOURCE_COUNT_CACHE_KEY) || 'null');
      if (stored?.cachedAt && Date.now() - stored.cachedAt < RESOURCE_COUNT_CACHE_MS) {
        return { success: true, totalDocuments: Number(stored.totalDocuments) || 0, cached: true };
      }
    } catch {}
  }
  try {
    const response = await fetch('/api/resources/count');
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      return { success: false, totalDocuments: 0, quotaExceeded: Boolean(result.quotaExceeded), error: result.error || 'Resource count unavailable' };
    }
    const totalDocuments = Number(result.totalDocuments) || 0;
    try {
      localStorage.setItem(RESOURCE_COUNT_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), totalDocuments }));
    } catch {}
    return { success: true, totalDocuments };
  } catch (error) {
    return { success: false, totalDocuments: 0, error: error?.message || 'Resource count unavailable' };
  }
};
export const fetchAllDocuments = async (maxItems = 50, forceRefresh = false) => {
  const apiResult = await fetchResourceIndexFromApi(maxItems, forceRefresh);
  if (apiResult) {
    // Never fall back to a full client-side hierarchy scan after the server
    // reports quota exhaustion. That simply moves the same read storm to every
    // browser and makes the incident worse.
    if (apiResult.success === false && apiResult.quotaExceeded) return apiResult;
    return apiResult;
  }
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

    // Count every document discovered in Firestore before applying maxItems.
    // This prevents the dashboard from reporting counts based on only the latest 50 files.
    const courseCounts = allDocuments.reduce((counts, item) => {
      const key = item.courseId || item.courseName || 'Other';
      const label = item.courseName || item.courseId || 'Other';
      if (!counts[key]) counts[key] = { courseId: key, courseName: label, count: 0 };
      counts[key].count += 1;
      return counts;
    }, {});

    const result = {
      success: true,
      data: allDocuments.slice(0, maxItems),
      courseCounts: Object.values(courseCounts).sort((a, b) => b.count - a.count),
      totalDocuments: allDocuments.length
    };
    return result;
  } catch (error) {
    console.error('Error fetching all documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get courses only. No hierarchy-wide document scan.
export const fetchCourses = async (forceRefresh = false) => {
  try {
    const result = await getCachedCollection('RESOURCES_STUDYPEDIA', forceRefresh);
    return { success: true, data: result.data.map((item) => ({
      ...item,
      createdAtDate: convertTimestamp(item.createdAt),
      resourceCount: Number(item.resourceCount || item.documentCount || 0)
    })) };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get semesters only for the selected course.
export const fetchSemesters = async (courseId, forceRefresh = false) => {
  try {
    if (!courseId) return { success: false, error: 'Course ID required', data: [] };
    const result = await getCachedCollection(`RESOURCES_STUDYPEDIA/${courseId}/semesters`, forceRefresh);
    return { success: true, data: result.data.map((item) => ({
      ...item,
      createdAtDate: convertTimestamp(item.createdAt)
    })) };
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get units only for the selected semester.
export const fetchCourseUnits = async (courseId, semesterId, forceRefresh = false) => {
  try {
    if (!courseId || !semesterId) return { success: false, error: 'Course ID and Semester ID required', data: [] };
    const result = await getCachedCollection(`RESOURCES_STUDYPEDIA/${courseId}/semesters/${semesterId}/courseunits`, forceRefresh);
    return { success: true, data: result.data.map((item) => ({
      ...item,
      createdAtDate: convertTimestamp(item.createdAt)
    })) };
  } catch (error) {
    console.error('Error fetching course units:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get documents only for the selected course unit.
export const fetchDocuments = async (courseId, semesterId, unitId, forceRefresh = false) => {
  try {
    if (!courseId || !semesterId || !unitId) return { success: false, error: 'Course ID, Semester ID, and Unit ID required', data: [] };
    const result = await getCachedCollection(`RESOURCES_STUDYPEDIA/${courseId}/semesters/${semesterId}/courseunits/${unitId}/documents`, forceRefresh);
    return { success: true, data: result.data.map((docData) => ({
      ...docData,
      createdAtDate: convertTimestamp(docData.createdAt),
      status: docData.status || 'free'
    })) };
  } catch (error) {
    console.error('Error fetching documents:', error);
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

export const submitPayment = async (paymentData) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const docRef = await addDoc(paymentsRef, paymentData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error submitting payment:', error);
    return { success: false, error: error.message };
  }
};