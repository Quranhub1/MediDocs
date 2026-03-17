import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  where 
} from 'firebase/firestore';
import { db } from '../firebase';

export const RESOURCES_COLLECTION = 'RESOURCES_STUDYPEDIA';

// Enhanced caching system with localStorage persistence
const CACHE_KEYS = {
  COURSES: 'studypedia_courses_cache',
  DOCUMENTS: 'studypedia_documents_cache'
};

const CACHE_DURATION = {
  COURSES: 10 * 60 * 1000, // 10 minutes for courses
  DOCUMENTS: 5 * 60 * 1000  // 5 minutes for documents
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
    if (now - timestamp > CACHE_DURATION[key === CACHE_KEYS.COURSES ? 'COURSES' : 'DOCUMENTS']) {
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

// Helper function to determine if a document should be marked as 'latest' based on recency
const isLatestDocument = (createdAt, hoursThreshold = 72) => {
  if (!createdAt) return false;
  
  const docDate = createdAt?.toDate?.() || new Date(createdAt);
  const now = new Date();
  const hoursDifference = (now - docDate) / (1000 * 60 * 60);
  
  return hoursDifference <= hoursThreshold;
};

// Fetch all courses with enhanced caching
export const fetchCourses = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCache(CACHE_KEYS.COURSES);
    if (cached) {
      console.log('Returning cached courses');
      return cached.data;
    }
  }

  try {
    console.log('Fetching courses from Firestore...');
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const q = query(coursesRef, where('type', '==', 'course'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const courses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isLatest: isLatestDocument(doc.data().createdAt)
    }));

    // Cache the results
    setCache(CACHE_KEYS.COURSES, courses, MAX_CACHE_SIZE);
    
    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

// Fetch semesters for a specific course
const fetchSemesters = async (courseId) => {
  try {
    const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters`);
    const snapshot = await getDocs(semestersRef);
    const semesters = [];
    snapshot.forEach((doc) => semesters.push({ id: doc.id, ...doc.data() }));
    return semesters;
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return [];
  }
};

// Path: RESOURCES_STUDYPEDIA/{courseId}/semesters/{semesterId}/courseunits/{unitId}/documents/{docId}
export const fetchAllDocuments = async (maxItems = 50, forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCache(CACHE_KEYS.DOCUMENTS);
    if (cached) {
      console.log('Returning cached documents');
      return { success: true, data: cached.data };
    }
  }

  try {
    console.log('Fetching documents from Firestore...');
    const allDocuments = [];
    
    // Get all courses (top-level)
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const coursesSnapshot = await getDocs(coursesRef);
    
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
          
          // Get documents under each courseunit
          const docsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/courseunits/${unitId}/documents`);
          const docsSnapshot = await getDocs(query(docsRef, orderBy('createdAt', 'desc')));
          
          docsSnapshot.forEach((doc) => {
            const docData = doc.data();
            const documentStatus = docData.status || 'standard';
            
            // Mark as 'latest' if it's recent, otherwise keep the existing status or mark as 'standard'
            let finalStatus = documentStatus === 'premium' ? 'premium' : 'standard';
            if (isLatestDocument(docData.createdAt)) {
              finalStatus = 'premium';
            }
            
            allDocuments.push({
              id: doc.id,
              ...docData,
              status: finalStatus,
              courseId,
              semesterId,
              unitId,
              courseName,
              semesterName,
              unitName
            });
          });
        }
        
        // Also get documents directly under semesters
        const semDocsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/semesters/${semesterId}/documents`);
        const semDocsSnapshot = await getDocs(query(semDocsRef, orderBy('createdAt', 'desc')));
        
        semDocsSnapshot.forEach((doc) => {
          const docData = doc.data();
          const documentStatus = docData.status || 'standard';
          
          // Mark as 'latest' if it's recent, otherwise keep the existing status or mark as 'standard'
          let finalStatus = documentStatus === 'premium' ? 'premium' : 'standard';
          if (isLatestDocument(docData.createdAt)) {
            finalStatus = 'premium';
          }
          
          allDocuments.push({
            id: doc.id,
            ...docData,
            status: finalStatus,
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
    
    // Sort by createdAt descending to get latest first
    allDocuments.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    // Filter to show only 'premium' or 'latest' status documents
    const filteredDocuments = allDocuments.filter(doc => doc.status === 'premium');
    
    const result = { success: true, data: filteredDocuments.slice(0, maxItems) };
    
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
