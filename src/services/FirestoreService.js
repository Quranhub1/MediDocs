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

// Helper function to determine if a document should be marked as 'latest' based on recency
const isLatestDocument = (createdAt, hoursThreshold = 72) => {
  if (!createdAt) return false;
  
  const docDate = createdAt?.toDate?.() || new Date(createdAt);
  const now = new Date();
  const hoursDifference = (now - docDate) / (1000 * 60 * 60);
  
  return hoursDifference <= hoursThreshold;
};

// Path: RESOURCES_STUDYPEDIA/{courseId}/semesters/{semesterId}/courseunits/{unitId}/documents/{docId}
export const fetchAllDocuments = async (maxItems = 50) => {
  try {
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
    
    return { success: true, data: filteredDocuments.slice(0, maxItems) };
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const fetchResources = async (maxItems = 20) => fetchAllDocuments(maxItems);

export const fetchCourses = async () => {
  try {
    const coursesRef = collection(db, RESOURCES_COLLECTION);
    const snapshot = await getDocs(coursesRef);
    const courses = [];
    snapshot.forEach((doc) => courses.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: courses };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};
