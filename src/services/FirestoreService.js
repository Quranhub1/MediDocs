import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';

// Collection paths
export const RESOURCES_COLLECTION = 'RESOURCES_STUDYPEDIA';

// Fetch all documents from nested structure
// Path: RESOURCES_STUDYPEDIA/{course}/courses/{semester}/courseunit/{unit}/documents
export const fetchAllDocuments = async (maxItems = 50) => {
  try {
    const allDocuments = [];
    
    // Get all courses
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const coursesSnapshot = await getDocs(coursesRef);
    
    for (const courseDoc of coursesSnapshot.docs) {
      const courseId = courseDoc.id;
      
      // Get semesters under each course
      const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/courses`);
      const semestersSnapshot = await getDocs(semestersRef);
      
      for (const semesterDoc of semestersSnapshot.docs) {
        const semesterId = semesterDoc.id;
        
        // Get course units under each semester
        const unitsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/courses/${semesterId}/courseunit`);
        const unitsSnapshot = await getDocs(unitsRef);
        
        for (const unitDoc of unitsSnapshot.docs) {
          const unitId = unitDoc.id;
          
          // Get documents under each unit
          const docsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/courses/${semesterId}/courseunit/${unitId}/documents`);
          const docsSnapshot = await getDocs(query(docsRef, orderBy('createdAt', 'desc'), limit(maxItems)));
          
          docsSnapshot.forEach((doc) => {
            allDocuments.push({
              id: doc.id,
              ...doc.data(),
              // Add path info for display
              courseId,
              semesterId,
              unitId,
              courseName: courseDoc.data().name || courseId,
              semesterName: semesterDoc.data().name || semesterId,
              unitName: unitDoc.data().name || unitId
            });
          });
        }
      }
    }
    
    // Sort by createdAt descending
    allDocuments.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    return { success: true, data: allDocuments.slice(0, maxItems) };
  } catch (error) {
    console.error('Error fetching all documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Fetch documents by course
export const fetchDocumentsByCourse = async (courseId, maxItems = 20) => {
  try {
    const allDocuments = [];
    
    const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/courses`);
    const semestersSnapshot = await getDocs(semestersRef);
    
    for (const semesterDoc of semestersSnapshot.docs) {
      const semesterId = semesterDoc.id;
      
      const unitsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/courses/${semesterId}/courseunit`);
      const unitsSnapshot = await getDocs(unitsRef);
      
      for (const unitDoc of unitsSnapshot.docs) {
        const unitId = unitDoc.id;
        
        const docsRef = collection(db, `${RESOURCES_COLLECTION}/${courseId}/courses/${semesterId}/courseunit/${unitId}/documents`);
        const docsSnapshot = await getDocs(query(docsRef, orderBy('createdAt', 'desc'), limit(maxItems)));
        
        docsSnapshot.forEach((doc) => {
          allDocuments.push({
            id: doc.id,
            ...doc.data(),
            courseId,
            semesterId,
            unitId,
            courseName: courseId,
            semesterName: semesterDoc.data().name || semesterId,
            unitName: unitDoc.data().name || unitId
          });
        });
      }
    }
    
    return { success: true, data: allDocuments };
  } catch (error) {
    console.error('Error fetching documents by course:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Fetch all courses (first level)
export const fetchAllCourses = async () => {
  try {
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const snapshot = await getDocs(coursesRef);
    
    const courses = [];
    snapshot.forEach((doc) => {
      courses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: courses };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Legacy support - fetch from RESOURCES_STUDYPEDIA directly
export const fetchResources = async (maxItems = 20) => {
  return fetchAllDocuments(maxItems);
};

// Legacy support
export const fetchCourses = async (maxItems = 20) => {
  return fetchAllCourses();
};
