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

// Path: RESOURCES_STUDYPEDIA/{courseId}/semesters/{semesterId}/courseunits/{unitId}/documents/{docId}
export const fetchAllDocuments = async (maxItems = 50, forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCache(CACHE_KEYS.DOCUMENTS);
    if (cached) {
      return { success: true, data: cached.data };
    }
  }

  try {
    const allDocuments = [];
    
    // Get all courses (top-level)
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const coursesSnapshot = await getDocs(coursesRef);
    console.log('Courses found:', coursesSnapshot.docs.length);
    if (coursesSnapshot.docs.length === 0) {
      console.log('No courses found in:', RESOURCES_COLLECTION);
    }
    
    for (const courseDoc of coursesSnapshot.docs) {
      const courseId = courseDoc.id;
      const courseName = courseDoc.data().name || courseId;
      
      // Get semesters under each course
      const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters`);
      const semestersSnapshot = await getDocs(semestersRef);
      
      for (const semesterDoc of semestersSnapshot.docs) {
        const semesterId = semesterDoc.id;
        const semesterName = semesterDoc.data().name || semesterId;
        
        // Get courseunits under each semester
        const unitsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/courseunits`);
        const unitsSnapshot = await getDocs(unitsRef);
        
        for (const unitDoc of unitsSnapshot.docs) {
          const unitId = unitDoc.id;
          const unitName = unitDoc.data().name || unitId;
          
          // Get documents under each courseunit - without query ordering
          const docsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/courseunits/${unitId}/documents`);
          const docsSnapshot = await getDocs(docsRef);
          
          docsSnapshot.forEach((doc) => {
            const docData = doc.data();
            // Use status field directly (premium/free)
            const documentStatus = docData.status || 'free';
            
            allDocuments.push({
              id: doc.id,
              ...docData,
              status: documentStatus,
              courseId,
              semesterId,
              unitId,
              courseName,
              semesterName,
              unitName
            });
          });
        }
        
        // Also get documents directly under semesters - without query ordering
        const semDocsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/documents`);
        const semDocsSnapshot = await getDocs(semDocsRef);
        
        semDocsSnapshot.forEach((doc) => {
          const docData = doc.data();
          // Use status field directly (premium/free)
          const documentStatus = docData.status || 'free';
          
          allDocuments.push({
            id: doc.id,
            ...docData,
            status: documentStatus,
            courseId,
            semesterId,
            unitId: null,
            courseName,
            semesterName,
            unitName: null
          });
        });
      }
    }
    
    console.log('Total documents fetched:', allDocuments.length);
    if (allDocuments.length > 0) {
      console.log('Sample document:', JSON.stringify(allDocuments[0]));
    }
    // Sort by time field - show latest first
    allDocuments.sort((a, b) => {
      if (a.time === 'latest' && b.time !== 'latest') return -1;
      if (a.time !== 'latest' && b.time === 'latest') return 1;
      return 0;
    });
    
    // Show all documents
    const result = { success: true, data: allDocuments.slice(0, maxItems) };
    
    // Cache the results
    setCache(CACHE_KEYS.DOCUMENTS, result.data, MAX_CACHE_SIZE);
    
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
