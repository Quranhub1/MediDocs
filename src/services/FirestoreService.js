import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  orderBy, 
  limit,
  where 
} from 'firebase/firestore';
import { db } from '../firebase';

// Collection names
export const RESOURCES_COLLECTION = 'RESOURCES_STUDYPEDIA';
export const COURSES_COLLECTION = 'courses';
export const DOCUMENTS_COLLECTION = 'documents';

// Fetch all resources (public - no auth required)
export const fetchResources = async (maxItems = 20) => {
  try {
    const q = query(
      collection(db, RESOURCES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    
    const querySnapshot = await getDocs(q);
    const resources = [];
    
    querySnapshot.forEach((doc) => {
      resources.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: resources };
  } catch (error) {
    console.error('Error fetching resources:', error);
    return { success: false, error: error.message };
  }
};

// Fetch resources by category
export const fetchResourcesByCategory = async (category, maxItems = 20) => {
  try {
    const q = query(
      collection(db, RESOURCES_COLLECTION),
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    
    const querySnapshot = await getDocs(q);
    const resources = [];
    
    querySnapshot.forEach((doc) => {
      resources.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: resources };
  } catch (error) {
    console.error('Error fetching resources by category:', error);
    return { success: false, error: error.message };
  }
};

// Fetch single resource by ID
export const fetchResourceById = async (resourceId) => {
  try {
    const docRef = doc(db, RESOURCES_COLLECTION, resourceId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Resource not found' };
    }
  } catch (error) {
    console.error('Error fetching resource:', error);
    return { success: false, error: error.message };
  }
};

// Fetch courses
export const fetchCourses = async (maxItems = 20) => {
  try {
    const q = query(
      collection(db, COURSES_COLLECTION),
      orderBy('name', 'asc'),
      limit(maxItems)
    );
    
    const querySnapshot = await getDocs(q);
    const courses = [];
    
    querySnapshot.forEach((doc) => {
      courses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: courses };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message };
  }
};

// Fetch documents
export const fetchDocuments = async (maxItems = 20) => {
  try {
    const q = query(
      collection(db, DOCUMENTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    
    const querySnapshot = await getDocs(q);
    const documents = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: documents };
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { success: false, error: error.message };
  }
};
