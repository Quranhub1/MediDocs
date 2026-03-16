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

// Collection path
export const RESOURCES_COLLECTION = 'RESOURCES_STUDYPEDIA';

// Fetch all documents from nested structure
// Path: RESOURCES_STUDYPEDIA/{courseId}/courses/{courseId}/semesters/{semesterId}/courseunits/{unitId}/units
export const fetchAllDocuments = async (maxItems = 50) => {
  try {
    const allDocuments = [];
    
    // Get all courses (second level)
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const coursesSnapshot = await getDocs(coursesRef);
    
    for (const courseDoc of coursesSnapshot.docs) {
      const coursePath = courseDoc.id;
      const courseName = courseDoc.data().name || courseDoc.id;
      
      // Get courses under each resource
      const subCoursesRef = collection(db, `${RESOURCES_COLLECTION}/${coursePath}/courses`);
      const subCoursesSnapshot = await getDocs(subCoursesRef);
      
      for (const subCourseDoc of subCoursesSnapshot.docs) {
        const subCourseId = subCourseDoc.id;
        const subCourseName = subCourseDoc.data().name || subCourseId;
        
        // Get semesters under each course
        const semestersRef = collection(db, `${RESOURCES_COLLECTION}/${coursePath}/courses/${subCourseId}/semesters`);
        const semestersSnapshot = await getDocs(semestersRef);
        
        for (const semesterDoc of semestersSnapshot.docs) {
          const semesterId = semesterDoc.id;
          const semesterName = semesterDoc.data().name || semesterId;
          
          // Get courseunits under each semester
          const unitsRef = collection(db, `${RESOURCES_COLLECTION}/${coursePath}/courses/${subCourseId}/semesters/${semesterId}/courseunits`);
          const unitsSnapshot = await getDocs(unitsRef);
          
          for (const unitDoc of unitsSnapshot.docs) {
            const unitId = unitDoc.id;
            const unitName = unitDoc.data().name || unitId;
            
            // Get units under each courseunit
            const finalUnitsRef = collection(db, `${RESOURCES_COLLECTION}/${coursePath}/courses/${subCourseId}/semesters/${semesterId}/courseunits/${unitId}/units`);
            const finalUnitsSnapshot = await getDocs(query(finalUnitsRef, orderBy('createdAt', 'desc'), limit(maxItems)));
            
            finalUnitsSnapshot.forEach((doc) => {
              allDocuments.push({
                id: doc.id,
                ...doc.data(),
                courseId: coursePath,
                subCourseId,
                semesterId,
                unitId,
                courseName,
                subCourseName,
                semesterName,
                unitName: doc.data().name || doc.id
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
    console.error('Error fetching all documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Legacy support
export const fetchResources = async (maxItems = 20) => {
  return fetchAllDocuments(maxItems);
};

// Legacy support
export const fetchCourses = async () => {
  try {
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const snapshot = await getDocs(coursesRef);
    const courses = [];
    snapshot.forEach((doc) => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: courses };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};
