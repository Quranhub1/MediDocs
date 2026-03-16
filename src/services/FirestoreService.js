import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';

export const RESOURCES_COLLECTION = 'RESOURCES_STUDYPEDIA';

// Path: RESOURCES_STUDYPEDIA/{resourceId}/courses/{courseId}/semesters/{semesterId}/course_unit/{unitId}/documents/{docId}
export const fetchAllDocuments = async (maxItems = 50) => {
  try {
    const allDocuments = [];
    
    // Get all resources
    const resourcesRef = collection(db, RESOURCES_COLLECTION);
    const resourcesSnapshot = await getDocs(resourcesRef);
    
    for (const resourceDoc of resourcesSnapshot.docs) {
      const resourceId = resourceDoc.id;
      const resourceName = resourceDoc.data().name || resourceId;
      
      // Get courses under each resource
      const coursesRef = collection(db, `${RESOURCES_COLLECTION}/${resourceId}/courses`);
      const coursesSnapshot = await getDocs(coursesRef);
      
      for (const courseDoc of coursesSnapshot.docs) {
        const courseId = courseDoc.id;
        const courseName = courseDoc.data().name || courseId;
        
        // Get semesters under each course
        const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${resourceId}/courses/${courseId}/semesters`);
        const semestersSnapshot = await getDocs(semestersRef);
        
        for (const semesterDoc of semestersSnapshot.docs) {
          const semesterId = semesterDoc.id;
          const semesterName = semesterDoc.data().name || semesterId;
          
          // Get course_units under each semester
          const unitsRef = collection(db, `${RESOURCES_COLLECTION}/${resourceId}/courses/${courseId}/semesters/${semesterId}/course_unit`);
          const unitsSnapshot = await getDocs(unitsRef);
          
          for (const unitDoc of unitsSnapshot.docs) {
            const unitId = unitDoc.id;
            const unitName = unitDoc.data().name || unitId;
            
            // Get documents under each course_unit
            const docsRef = collection(db, `${RESOURCES_COLLECTION}/${resourceId}/courses/${courseId}/semesters/${semesterId}/course_unit/${unitId}/documents`);
            const docsSnapshot = await getDocs(query(docsRef, orderBy('createdAt', 'desc'), limit(maxItems)));
            
            docsSnapshot.forEach((doc) => {
              allDocuments.push({
                id: doc.id,
                ...doc.data(),
                resourceId,
                courseId,
                semesterId,
                unitId,
                resourceName,
                courseName,
                semesterName,
                unitName
              });
            });
          }
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
    console.error('Error fetching documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const fetchResources = async (maxItems = 20) => fetchAllDocuments(maxItems);
export const fetchCourses = async () => {
  try {
    const resourcesRef = collection(db, RESOURCES_COLLECTION);
    const snapshot = await getDocs(resourcesRef);
    const courses = [];
    snapshot.forEach((doc) => courses.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: courses };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};
