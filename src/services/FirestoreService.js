import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export const RESOURCES_COLLECTION = 'RESOURCES_STUDYPEDIA';

// Enhanced caching system with localStorage persistence
const CACHE_KEYS = {
  COURSES: 'medidocs_courses_cache',
  DOCUMENTS: 'medidocs_documents_cache'
};

const CACHE_DURATION = {
  COURSES: 30 * 60 * 1000, // 30 minutes for courses
  DOCUMENTS: 15 * 60 * 1000  // 15 minutes for documents
};

const MAX_CACHE_SIZE = 50; // Maximum items to cache

// Cache management utilities
const getCache = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp, maxItems } = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    const isCourses = key === CACHE_KEYS.COURSES;
    const cacheType = isCourses ? 'COURSES' : 'DOCUMENTS';
    if (now - timestamp > CACHE_DURATION[cacheType]) {
      localStorage.removeItem(key);
      return null;
    }
    
    return { data, timestamp, maxItems };
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
};

const setCache = (key, data, maxItems = null) => {
  try {
    // Limit cache size if specified
    const cacheData = maxItems ? data.slice(0, maxItems) : data;
    
    const cacheEntry = {
      data: cacheData,
      timestamp: Date.now(),
      maxItems
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
const fetchCourses = async (forceRefresh = false) => {
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

    // Cache the results
    setCache(CACHE_KEYS.COURSES, courses, MAX_CACHE_SIZE);
    
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

// Legacy function - exports for backward compatibility
export { fetchCourses };

// Helper to convert Firestore Timestamp to Date
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // Handle string timestamps
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

// Path: RESOURCES_STUDYPEDIA/{courseId}/semesters/{semesterId}/courseunits/{unitId}/documents/{docId}
export const fetchAllDocuments = async (maxItems = 50, forceRefresh = false) => {
  console.log('fetchAllDocuments called with maxItems:', maxItems, 'forceRefresh:', forceRefresh);
  
  // Always try cache first unless force refresh
  if (!forceRefresh) {
    const cached = getCache(CACHE_KEYS.DOCUMENTS);
    console.log('Cache check, cached data:', cached ? cached.data?.length : 'none');
    if (cached && cached.data && cached.data.length > 0) {
      return { success: true, data: cached.data };
    }
  }

  try {
    const allDocuments = [];
    
    // Get all courses (top-level) - single query
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const coursesSnapshot = await getDocs(coursesRef);
    console.log('Courses found:', coursesSnapshot.docs.length);
    
    if (coursesSnapshot.docs.length === 0) {
      console.log('No courses found in:', RESOURCES_COLLECTION);
      const result = { success: true, data: [] };
      setCache(CACHE_KEYS.DOCUMENTS, [], MAX_CACHE_SIZE);
      return result;
    }
    
    // Build all semester paths first
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
    console.log('Total semesters:', flatSemesters.length);
    
    // Now get all units in parallel for all semesters
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
    console.log('Total units:', flatUnits.length);
    
    // Now fetch all documents in parallel for all units
    const docsPromises = flatUnits.map(async (unit) => {
      const docsRef = collection(db, `${RESOURCES_COLLECTION}/${unit.courseId}/semesters/${unit.semesterId}/courseunits/${unit.unitId}/documents`);
      const docsSnapshot = await getDocs(docsRef);
      
      return docsSnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          createdAtDate: convertTimestamp(docData.createdAt), // Store as Date for sorting
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
    console.log('Documents from units:', unitDocs.length);
    
    // Also fetch semester-level documents in parallel
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
    console.log('Documents from semesters:', semDocs.length);
    
    // Combine all documents
    allDocuments.push(...unitDocs, ...semDocs);
    
    console.log('Total documents fetched:', allDocuments.length);
    if (allDocuments.length > 0) {
      console.log('Sample document:', JSON.stringify(allDocuments[0]));
    }
    
    // Sort by time field first (latest first), then by createdAtDate for others
    allDocuments.sort((a, b) => {
      // First prioritize 'latest' flagged documents
      if (a.time === 'latest' && b.time !== 'latest') return -1;
      if (a.time !== 'latest' && b.time === 'latest') return 1;
      
      // Then sort by createdAtDate (newest first)
      const dateA = a.createdAtDate || new Date(0);
      const dateB = b.createdAtDate || new Date(0);
      return dateB - dateA;
    });
    
    // Show all documents
    console.log('Total docs before slice:', allDocuments.length, 'maxItems:', maxItems);
    const result = { success: true, data: allDocuments.slice(0, maxItems) };
    console.log('Returning result with', result.data.length, 'documents');
    
    // Cache the results (but not during force refresh to avoid caching empty/stale data)
    if (!forceRefresh) {
      setCache(CACHE_KEYS.DOCUMENTS, result.data, MAX_CACHE_SIZE);
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const fetchResources = async (maxItems = 20) => fetchAllDocuments(maxItems);

// Clear cache (useful for logout or refresh)
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
