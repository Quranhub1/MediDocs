import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchAllDocuments,
  getAllUsers,
  getAllPayments,
  approveUserSubscription,
  uploadThumbnail,
  uploadDocument,
  listStorageFiles,
  deleteStorageFile,
  createStorageFolder,
  declinePayment,
  updateSubscriptionExpiry,
  getExpiringSubscriptions,
  lockExpiredSubscriptions,
  getSubscriptionCountdown,
  SUBSCRIPTION_PLANS
} from '../services/FirestoreService';
import { generateThumbnail } from '../utils/thumbnailGenerator';
import {
  collection,
  getDocs,
  doc as docRef,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = ({ user, onViewChange }) => {
  const { createUser, banUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    totalPayments: 0,
    latestDocuments: 0,
    premiumDocuments: 0,
    totalCourses: 0,
    totalSemesters: 0,
    totalUnits: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackSecretKey, setPaystackSecretKey] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [paymentActionLoading, setPaymentActionLoading] = useState({});
  const [subscriptionCountdowns, setSubscriptionCountdowns] = useState({});

  const [newDoc, setNewDoc] = useState({
    title: '',
    filePath: '',
    thumbnailUrl: '',
    thumbnailFile: null,
    description: '',
    time: 'normal',
    status: 'free',
    courseId: '',
    semesterId: '',
    unitId: ''
  });
  const [addingDoc, setAddingDoc] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const fileInputRef = useRef(null);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [addingCourse, setAddingCourse] = useState(false);

  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState('');
  const [addingSemester, setAddingSemester] = useState(false);

  const [showUnitForm, setShowUnitForm] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);

  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [updatingCourse, setUpdatingCourse] = useState(false);

  const [editingSemester, setEditingSemester] = useState(null);
  const [editSemesterName, setEditSemesterName] = useState('');
  const [updatingSemester, setUpdatingSemester] = useState(false);

  const [editingUnit, setEditingUnit] = useState(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [updatingUnit, setUpdatingUnit] = useState(false);

  const [editingDocument, setEditingDocument] = useState(null);
  const [editDocForm, setEditDocForm] = useState({
    title: '',
    filePath: '',
    thumbnailUrl: '',
    description: '',
    time: 'normal',
    status: 'free',
    courseId: '',
    semesterId: '',
    unitId: ''
  });
  const [updatingDocument, setUpdatingDocument] = useState(false);
  const [storageFiles, setStorageFiles] = useState([]);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [storageFolder, setStorageFolder] = useState('');
  const [storageMessage, setStorageMessage] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const ADMIN_EMAIL = 'kaigwaakram123@gmail.com';
  const ADMIN_PHONE = '256749846848';
  const isAdmin = user?.phone === ADMIN_PHONE ||
    (user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const [docsResult, usersResult, paymentsResult, coursesList] = await Promise.all([
        loadDocuments(forceRefresh),
        loadUsers(forceRefresh),
        loadPayments(forceRefresh),
        loadCourses(forceRefresh)
      ]);

      const latestDocs = (docsResult || []).filter(d => d.time === 'latest').length;
      const premiumDocs = (docsResult || []).filter(d => d.status === 'premium').length;

      setStats({
        totalDocuments: (docsResult || []).length,
        totalUsers: (usersResult || []).length,
        totalPayments: (paymentsResult || []).length,
        latestDocuments: latestDocs,
        premiumDocuments: premiumDocs,
        totalCourses: coursesList.length,
        totalSemesters: semesters.length,
        totalUnits: units.length
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
    setLoading(false);
  }, [semesters.length, units.length]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      loadSubscriptionCountdowns();
    }
  }, [isAdmin, loadData]);

  const loadDocuments = async (forceRefresh = false) => {
    try {
      const result = await fetchAllDocuments(100, forceRefresh);
      if (result.success && result.data) {
        const allDocs = result.data.map(doc => ({
          ...doc,
          fullPath: doc.fullPath || `RESOURCES_STUDYPEDIA/${doc.courseId}/semesters/${doc.semesterId}/courseunits/${doc.unitId}/documents/${doc.id}`
        }));
        setDocuments(allDocs);
        return allDocs;
      }
      return [];
    } catch (error) {
      console.error('Error loading documents:', error);
      return [];
    }
  };

  const loadUsers = async (forceRefresh = false) => {
    try {
      const result = await getAllUsers(forceRefresh);
      if (result.success) {
        setUsers(result.data || []);
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  };

  const loadPayments = async (forceRefresh = false) => {
    try {
      const result = await getAllPayments(forceRefresh);
      if (result.success) {
        setPayments(result.data || []);
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading payments:', error);
      return [];
    }
  };

  const loadStorageFiles = async () => {
    setLoadingStorage(true);
    setStorageMessage('');
    try {
      const result = await listStorageFiles(storageFolder);
      if (result.success) {
        setStorageFiles(result.files || []);
      } else {
        setStorageMessage(result.error || 'Failed to load storage files');
      }
    } catch (error) {
      setStorageMessage('Error loading storage files');
    }
    setLoadingStorage(false);
  };

  const handleDeleteStorageFile = async (filePath) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      const result = await deleteStorageFile(filePath);
      if (result.success) {
        setStorageMessage('File deleted successfully');
        loadStorageFiles();
      } else {
        setStorageMessage(result.error || 'Failed to delete file');
      }
    } catch (error) {
      setStorageMessage('Error deleting file');
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    setStorageMessage('');
    try {
      const result = await createStorageFolder(newFolderName.trim());
      if (result.success) {
        setStorageMessage('Folder created successfully');
        setNewFolderName('');
        loadStorageFiles();
      } else {
        setStorageMessage(result.error || 'Failed to create folder');
      }
    } catch (error) {
      setStorageMessage('Error creating folder');
    }
    setCreatingFolder(false);
  };

  const loadConfig = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/config/paystack', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPaystackPublicKey(data.publicKey || '');
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/config/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          publicKey: paystackPublicKey,
          secretKey: paystackSecretKey
        })
      });
      const data = await response.json();
      if (response.ok) {
        setConfigMessage('Paystack configuration saved successfully');
        setPaystackSecretKey('');
      } else {
        setConfigMessage(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      setConfigMessage('Error saving configuration');
    }
    setSavingConfig(false);
  };

  const loadCourses = async (forceRefresh = false) => {
    try {
      const coursesRef = collection(db, 'RESOURCES_STUDYPEDIA');
      const coursesSnapshot = await getDocs(coursesRef);
      const coursesList = coursesSnapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name || d.id
      }));
      setCourses(coursesList);
      return coursesList;
    } catch (error) {
      console.error('Error loading courses:', error);
      return [];
    }
  };

  const loadSemesters = async (courseId) => {
    if (!courseId) {
      setSemesters([]);
      setUnits([]);
      return;
    }
    try {
      const semestersRef = collection(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters`);
      const semestersSnapshot = await getDocs(semestersRef);
      const semestersList = semestersSnapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name || d.id
      }));
      setSemesters(semestersList);
      setUnits([]);
    } catch (error) {
      console.error('Error loading semesters:', error);
    }
  };

  const loadUnits = async (courseId, semesterId) => {
    if (!courseId || !semesterId) {
      setUnits([]);
      return;
    }
    try {
      const unitsRef = collection(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters/${semesterId}/courseunits`);
      const unitsSnapshot = await getDocs(unitsRef);
      const unitsList = unitsSnapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name || d.id
      }));
      setUnits(unitsList);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    setAddingCourse(true);
    try {
      await addDoc(collection(db, 'RESOURCES_STUDYPEDIA'), {
        name: newCourseName.trim(),
        createdAt: serverTimestamp()
      });
      setNewCourseName('');
      setShowCourseForm(false);
      loadCourses();
      loadData();
    } catch (error) {
      console.error('Error adding course:', error);
      alert('Failed to add course: ' + error.message);
    } finally {
      setAddingCourse(false);
    }
  };

  const handleAddSemester = async (e) => {
    e.preventDefault();
    if (!newSemesterName.trim() || !newDoc.courseId) return;
    setAddingSemester(true);
    try {
      await addDoc(collection(db, `RESOURCES_STUDYPEDIA/${newDoc.courseId}/semesters`), {
        name: newSemesterName.trim(),
        createdAt: serverTimestamp()
      });
      setNewSemesterName('');
      setShowSemesterForm(false);
      loadSemesters(newDoc.courseId);
      loadData();
    } catch (error) {
      console.error('Error adding semester:', error);
      alert('Failed to add semester: ' + error.message);
    } finally {
      setAddingSemester(false);
    }
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim() || !newDoc.courseId || !newDoc.semesterId) return;
    setAddingUnit(true);
    try {
      await addDoc(collection(db, `RESOURCES_STUDYPEDIA/${newDoc.courseId}/semesters/${newDoc.semesterId}/courseunits`), {
        name: newUnitName.trim(),
        createdAt: serverTimestamp()
      });
      setNewUnitName('');
      setShowUnitForm(false);
      loadUnits(newDoc.courseId, newDoc.semesterId);
      loadData();
    } catch (error) {
      console.error('Error adding unit:', error);
      alert('Failed to add unit: ' + error.message);
    } finally {
      setAddingUnit(false);
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse || !editCourseName.trim()) return;
    setUpdatingCourse(true);
    try {
      await updateDoc(docRef(db, `RESOURCES_STUDYPEDIA/${editingCourse.id}`), {
        name: editCourseName.trim()
      });
      setEditingCourse(null);
      setEditCourseName('');
      loadCourses();
      loadData();
      alert('Course updated successfully!');
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Failed to update course: ' + error.message);
    } finally {
      setUpdatingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This will also delete all semesters, units, and documents under it.')) return;
    try {
      await deleteDoc(docRef(db, `RESOURCES_STUDYPEDIA/${courseId}`));
      alert('Course deleted successfully!');
      loadCourses();
      setSemesters([]);
      setUnits([]);
      loadData();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course: ' + error.message);
    }
  };

  const handleUpdateSemester = async (e) => {
    e.preventDefault();
    if (!editingSemester || !editSemesterName.trim() || !newDoc.courseId) return;
    setUpdatingSemester(true);
    try {
      await updateDoc(docRef(db, `RESOURCES_STUDYPEDIA/${newDoc.courseId}/semesters/${editingSemester.id}`), {
        name: editSemesterName.trim()
      });
      setEditingSemester(null);
      setEditSemesterName('');
      loadSemesters(newDoc.courseId);
      loadData();
      alert('Semester updated successfully!');
    } catch (error) {
      console.error('Error updating semester:', error);
      alert('Failed to update semester: ' + error.message);
    } finally {
      setUpdatingSemester(false);
    }
  };

  const handleDeleteSemester = async (courseId, semesterId) => {
    if (!window.confirm('Are you sure you want to delete this semester? This will also delete all units and documents under it.')) return;
    try {
      await deleteDoc(docRef(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters/${semesterId}`));
      alert('Semester deleted successfully!');
      loadSemesters(courseId);
      setUnits([]);
      loadData();
    } catch (error) {
      console.error('Error deleting semester:', error);
      alert('Failed to delete semester: ' + error.message);
    }
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!editingUnit || !editUnitName.trim() || !newDoc.courseId || !newDoc.semesterId) return;
    setUpdatingUnit(true);
    try {
      await updateDoc(docRef(db, `RESOURCES_STUDYPEDIA/${newDoc.courseId}/semesters/${newDoc.semesterId}/courseunits/${editingUnit.id}`), {
        name: editUnitName.trim()
      });
      setEditingUnit(null);
      setEditUnitName('');
      loadUnits(newDoc.courseId, newDoc.semesterId);
      loadData();
      alert('Unit updated successfully!');
    } catch (error) {
      console.error('Error updating unit:', error);
      alert('Failed to update unit: ' + error.message);
    } finally {
      setUpdatingUnit(false);
    }
  };

  const handleDeleteUnit = async (courseId, semesterId, unitId) => {
    if (!window.confirm('Are you sure you want to delete this unit? This will also delete all documents under it.')) return;
    try {
      await deleteDoc(docRef(db, `RESOURCES_STUDYPEDIA/${courseId}/semesters/${semesterId}/courseunits/${unitId}`));
      alert('Unit deleted successfully!');
      loadUnits(courseId, semesterId);
      loadData();
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert('Failed to delete unit: ' + error.message);
    }
  };

  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    if (!editingDocument) return;
    setUpdatingDocument(true);
    try {
      const docPath = editingDocument.fullPath || `RESOURCES_STUDYPEDIA/${editDocForm.courseId}/semesters/${editDocForm.semesterId}/courseunits/${editDocForm.unitId}/documents/${editingDocument.id}`;
      await updateDoc(docRef(db, docPath), {
        title: editDocForm.title,
        filePath: editDocForm.filePath,
        thumbnailUrl: editDocForm.thumbnailUrl || '',
        description: editDocForm.description || '',
        time: editDocForm.time,
        status: editDocForm.status
      });
      setEditingDocument(null);
      setEditDocForm({
        title: '',
        filePath: '',
        thumbnailUrl: '',
        description: '',
        time: 'normal',
        status: 'free',
        courseId: '',
        semesterId: '',
        unitId: ''
      });
      loadDocuments();
      loadData();
      alert('Document updated successfully!');
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Failed to update document: ' + error.message);
    } finally {
      setUpdatingDocument(false);
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewDoc({ ...newDoc, thumbnailFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addDocument = async (e) => {
    e.preventDefault();

    if (!newDoc.courseId || !newDoc.semesterId || !newDoc.unitId) {
      alert('Please select Course, Semester, and Unit');
      return;
    }

    setAddingDoc(true);
    try {
      let thumbnailUrl = newDoc.thumbnailUrl;

      if (newDoc.thumbnailFile) {
        const uploadResult = await uploadThumbnail(newDoc.thumbnailFile);
        if (uploadResult.success) {
          thumbnailUrl = uploadResult.url;
        }
      }

      const docRef = collection(db, `RESOURCES_STUDYPEDIA/${newDoc.courseId}/semesters/${newDoc.semesterId}/courseunits/${newDoc.unitId}/documents`);

      await addDoc(docRef, {
        title: newDoc.title,
        filePath: newDoc.filePath,
        thumbnailUrl: thumbnailUrl || '',
        description: newDoc.description || '',
        time: newDoc.time,
        status: newDoc.status,
        createdAt: serverTimestamp()
      });

      alert('Document added successfully!');
      setNewDoc({
        title: '',
        filePath: '',
        thumbnailUrl: '',
        thumbnailFile: null,
        description: '',
        time: 'normal',
        status: 'free',
        courseId: '',
        semesterId: '',
        unitId: ''
      });
      setThumbnailPreview('');
      setActiveTab('documents');
      loadData();
    } catch (error) {
      console.error('Error adding document:', error);
      alert('Failed to add document: ' + error.message);
    } finally {
      setAddingDoc(false);
    }
  };

  const markAsLatest = async (document) => {
    try {
      const docRefUpdate = docRef(db, document.fullPath);
      await updateDoc(docRefUpdate, { time: 'latest' });
      alert('Document marked as latest!');
      loadData();
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Failed to update document');
    }
  };

  const removeLatest = async (document) => {
    try {
      const docRefUpdate = docRef(db, document.fullPath);
      await updateDoc(docRefUpdate, { time: 'normal' });
      alert('Latest status removed!');
      loadData();
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Failed to update document');
    }
  };

  const deleteDocument = async (document) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const docRefDelete = docRef(db, document.fullPath);
      await deleteDoc(docRefDelete);
      alert('Document deleted!');
      loadData();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const handleApproveSubscription = async (userId, plan = 'monthly') => {
    if (!userId) return;
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (SUBSCRIPTION_PLANS[plan]?.duration || 30));

      const result = await approveUserSubscription(userId, plan, expiryDate);
      if (result.success) {
        alert('Subscription approved successfully!');
        loadData();
      } else {
        alert('Failed to approve subscription: ' + result.error);
      }
    } catch (error) {
      console.error('Error approving subscription:', error);
      alert('Failed to approve subscription: ' + error.message);
    }
  };

  const handleDeclinePayment = async (paymentId) => {
    if (!paymentId) return;
    try {
      const result = await declinePayment(paymentId);
      if (result.success) {
        alert('Payment declined');
        loadData();
      } else {
        alert('Failed to decline payment: ' + result.error);
      }
    } catch (error) {
      console.error('Error declining payment:', error);
      alert('Failed to decline payment: ' + error.message);
    }
  };

  const handleApprovePayment = async (paymentId, userId, plan = 'monthly') => {
    if (!paymentId || !userId) return;
    setPaymentActionLoading(prev => ({ ...prev, [paymentId]: true }));
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (SUBSCRIPTION_PLANS[plan]?.duration || 30));

      await approveUserSubscription(userId, plan, expiryDate);
      await declinePayment(paymentId);
      alert('Payment approved and subscription activated!');
      loadData();
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve payment: ' + error.message);
    } finally {
      setPaymentActionLoading(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  const handleLockExpiredSubscriptions = async () => {
    try {
      const result = await lockExpiredSubscriptions();
      if (result.success) {
        alert(`Locked ${result.lockedCount} expired subscriptions`);
        loadData();
      } else {
        alert('Failed to lock expired subscriptions: ' + result.error);
      }
    } catch (error) {
      console.error('Error locking expired subscriptions:', error);
      alert('Failed to lock expired subscriptions: ' + error.message);
    }
  };

  const loadSubscriptionCountdowns = async () => {
    try {
      let usersToCheck = users;
      if (!usersToCheck || usersToCheck.length === 0) {
        const result = await getAllUsers();
        usersToCheck = result.success ? (result.data || []) : [];
      }
      const countdowns = {};
      usersToCheck.forEach(user => {
        const countdown = getSubscriptionCountdown(user);
        if (countdown) {
          countdowns[user.id] = countdown;
        }
      });
      setSubscriptionCountdowns(countdowns);
    } catch (error) {
      console.error('Error loading subscription countdowns:', error);
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.regEmail.value;
    const password = form.regPassword.value;
    const name = form.regName.value;
    const phone = form.regPhone.value;

    if (!email || !password || !name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const result = await createUser(email, password, name, phone);
      if (result.success) {
        alert('User registered successfully!');
        form.reset();
        loadData();
      } else {
        alert('Failed to register user: ' + result.error);
      }
    } catch (error) {
      alert('Failed to register user: ' + error.message);
    }
  };

  const handleBanUser = async (userId, currentBanned) => {
    if (!userId) return;
    try {
      const result = await banUser(userId, currentBanned);
      if (result.success) {
        alert(`User ${currentBanned ? 'unbanned' : 'banned'} successfully!`);
        loadData();
      } else {
        alert('Failed to update user: ' + result.error);
      }
    } catch (error) {
      console.error('Error toggling ban:', error);
      alert('Failed to update user: ' + error.message);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.courseId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  const filteredPayments = payments.filter(p =>
    p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phoneNumber?.includes(searchTerm) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">You don't have permission to access this page. Please contact your system administrator if you believe this is an error.</p>
          <button
            onClick={() => onViewChange('home')}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">Loading admin data...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait while we fetch the latest information</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon, label, value, color }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mobile-admin admin-fluid min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-500 mt-1">Manage your MediDocs platform and monitor activity</p>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Platform Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              }
              label="Total Documents"
              value={stats.totalDocuments}
              color="bg-emerald-500"
            />
            <StatCard
              icon={
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              }
              label="Total Users"
              value={stats.totalUsers}
              color="bg-blue-500"
            />
            <StatCard
              icon={
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
              }
              label="Total Payments"
              value={stats.totalPayments}
              color="bg-purple-500"
            />
            <StatCard
              icon={
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              }
              label="Premium Documents"
              value={stats.premiumDocuments}
              color="bg-amber-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'documents', label: 'Documents', icon: '📄' },
                 { id: 'add', label: 'Add Content', icon: '➕' },
                 { id: 'users', label: 'Users', icon: '👥' },
                 { id: 'payments', label: 'Payments', icon: '💳' },
                 { id: 'register', label: 'Register', icon: '📝' },
                 { id: 'alerts', label: 'Alerts', icon: '🔔' },
                 { id: 'settings', label: 'Settings', icon: '⚙️' },
                 { id: 'storage', label: 'Storage', icon: '📁' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {activeTab !== 'add' && activeTab !== 'register' && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="max-w-md">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <input
                    id="search"
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Structure</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Courses</p>
                            <p className="text-sm text-gray-500">Main categories</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.totalCourses}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Semesters</p>
                            <p className="text-sm text-gray-500">Academic periods</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.totalSemesters}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Course Units</p>
                            <p className="text-sm text-gray-500">Subject modules</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.totalUnits}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('add')}
                        className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-sm transition-all text-left"
                      >
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Add New Content</p>
                          <p className="text-sm text-gray-500">Upload documents or create courses</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('users')}
                        className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-sm transition-all text-left"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Manage Users</p>
                          <p className="text-sm text-gray-500">View and manage user accounts</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('payments')}
                        className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-sm transition-all text-left"
                      >
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Review Payments</p>
                          <p className="text-sm text-gray-500">Approve subscription payments</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Platform Health</h3>
                  <p className="text-emerald-100 mb-4">Your platform is running smoothly with {stats.totalDocuments} documents across {stats.totalCourses} courses.</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-emerald-100">All systems operational</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thumbnail</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            {doc.thumbnailUrl ? (
                              <img src={doc.thumbnailUrl} alt={doc.title} className="w-16 h-12 object-cover rounded-lg shadow-sm" />
                            ) : (
                              <div className="w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                                {doc.filePath?.endsWith('pdf') ? '📕' : doc.filePath?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️' : '📄'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{doc.title || doc.id}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">{doc.description?.substring(0, 50)}...</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {doc.courseId?.toUpperCase()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${doc.status === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                              {doc.status || 'free'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${doc.time === 'latest' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                              {doc.time || 'normal'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {doc.time !== 'latest' ? (
                                <button
                                  onClick={() => markAsLatest(doc)}
                                  className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                                >
                                  Mark Latest
                                </button>
                              ) : (
                                <button
                                  onClick={() => removeLatest(doc)}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                  Remove Latest
                                </button>
                              )}
                              <button
                                onClick={() => deleteDocument(doc)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredDocuments.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No documents found</div>
                )}
              </div>
            )}

            {activeTab === 'add' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Courses</h3>
                    <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                      {courses.map((course) => (
                        <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          {editingCourse?.id === course.id ? (
                            <form onSubmit={handleUpdateCourse} className="flex gap-2 w-full">
                              <input
                                value={editCourseName}
                                onChange={(e) => setEditCourseName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                              />
                              <button type="submit" disabled={updatingCourse} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-sm disabled:bg-gray-400">
                                {updatingCourse ? '...' : 'Save'}
                              </button>
                              <button type="button" onClick={() => { setEditingCourse(null); setEditCourseName(''); }} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                            </form>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-gray-700 flex-1">{course.name}</span>
                              <div className="flex gap-1">
                                <button onClick={() => { setEditingCourse(course); setEditCourseName(course.name); }} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200">Edit</button>
                                <button onClick={() => handleDeleteCourse(course.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200">Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {courses.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No courses yet</p>}
                    </div>
                    {!showCourseForm ? (
                      <button onClick={() => setShowCourseForm(true)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors text-sm">
                        + Add Course
                      </button>
                    ) : (
                      <form onSubmit={handleAddCourse} className="space-y-2">
                        <input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} placeholder="Course name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                        <div className="flex gap-2">
                          <button type="submit" disabled={addingCourse} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:bg-gray-400">{addingCourse ? 'Saving...' : 'Save'}</button>
                          <button type="button" onClick={() => { setShowCourseForm(false); setNewCourseName(''); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Semesters</h3>
                    <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                      {!newDoc.courseId ? (
                        <p className="text-sm text-gray-500 text-center py-4">Select a course first</p>
                      ) : semesters.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No semesters yet</p>
                      ) : (
                        semesters.map((semester) => (
                          <div key={semester.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            {editingSemester?.id === semester.id ? (
                              <form onSubmit={handleUpdateSemester} className="flex gap-2 w-full">
                                <input
                                  value={editSemesterName}
                                  onChange={(e) => setEditSemesterName(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  required
                                />
                                <button type="submit" disabled={updatingSemester} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-sm disabled:bg-gray-400">
                                  {updatingSemester ? '...' : 'Save'}
                                </button>
                                <button type="button" onClick={() => { setEditingSemester(null); setEditSemesterName(''); }} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                              </form>
                            ) : (
                              <>
                                <span className="text-sm font-medium text-gray-700 flex-1">{semester.name}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingSemester(semester); setEditSemesterName(semester.name); }} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200">Edit</button>
                                  <button onClick={() => handleDeleteSemester(newDoc.courseId, semester.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200">Delete</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {!showSemesterForm ? (
                      <button onClick={() => setShowSemesterForm(true)} disabled={!newDoc.courseId} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        + Add Semester
                      </button>
                    ) : (
                      <form onSubmit={handleAddSemester} className="space-y-2">
                        <input value={newSemesterName} onChange={(e) => setNewSemesterName(e.target.value)} placeholder="Semester name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                        <div className="flex gap-2">
                          <button type="submit" disabled={addingSemester} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:bg-gray-400">{addingSemester ? 'Saving...' : 'Save'}</button>
                          <button type="button" onClick={() => { setShowSemesterForm(false); setNewSemesterName(''); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Units</h3>
                    <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                      {!newDoc.semesterId ? (
                        <p className="text-sm text-gray-500 text-center py-4">Select course and semester first</p>
                      ) : units.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No units yet</p>
                      ) : (
                        units.map((unit) => (
                          <div key={unit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            {editingUnit?.id === unit.id ? (
                              <form onSubmit={handleUpdateUnit} className="flex gap-2 w-full">
                                <input
                                  value={editUnitName}
                                  onChange={(e) => setEditUnitName(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  required
                                />
                                <button type="submit" disabled={updatingUnit} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-sm disabled:bg-gray-400">
                                  {updatingUnit ? '...' : 'Save'}
                                </button>
                                <button type="button" onClick={() => { setEditingUnit(null); setEditUnitName(''); }} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                              </form>
                            ) : (
                              <>
                                <span className="text-sm font-medium text-gray-700 flex-1">{unit.name}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingUnit(unit); setEditUnitName(unit.name); }} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200">Edit</button>
                                  <button onClick={() => handleDeleteUnit(newDoc.courseId, newDoc.semesterId, unit.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200">Delete</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {!showUnitForm ? (
                      <button onClick={() => setShowUnitForm(true)} disabled={!newDoc.semesterId} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        + Add Unit
                      </button>
                    ) : (
                      <form onSubmit={handleAddUnit} className="space-y-2">
                        <input value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="Unit name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                        <div className="flex gap-2">
                          <button type="submit" disabled={addingUnit} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:bg-gray-400">{addingUnit ? 'Saving...' : 'Save'}</button>
                          <button type="button" onClick={() => { setShowUnitForm(false); setNewUnitName(''); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Documents</h3>
                  {editingDocument ? (
                    <form onSubmit={handleUpdateDocument} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                          <input type="text" value={editDocForm.title} onChange={(e) => setEditDocForm({ ...editDocForm, title: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">File Path (URL)</label>
                          <input type="text" value={editDocForm.filePath} onChange={(e) => setEditDocForm({ ...editDocForm, filePath: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
                          <input type="text" value={editDocForm.thumbnailUrl} onChange={(e) => setEditDocForm({ ...editDocForm, thumbnailUrl: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                          <select value={editDocForm.status} onChange={(e) => setEditDocForm({ ...editDocForm, status: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                          <select value={editDocForm.time} onChange={(e) => setEditDocForm({ ...editDocForm, time: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="normal">Normal</option>
                            <option value="latest">Latest</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <textarea value={editDocForm.description} onChange={(e) => setEditDocForm({ ...editDocForm, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" rows="3" />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button type="submit" disabled={updatingDocument} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:bg-gray-400 transition-colors shadow-sm">
                          {updatingDocument ? 'Updating...' : 'Update Document'}
                        </button>
                        <button type="button" onClick={() => { setEditingDocument(null); setEditDocForm({ title: '', filePath: '', thumbnailUrl: '', description: '', time: 'normal', status: 'free', courseId: '', semesterId: '', unitId: '' }); }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filteredDocuments.map((doc) => (
                              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{doc.title || doc.id}</div>
                                  <div className="text-sm text-gray-500">{doc.description?.substring(0, 50)}...</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{doc.courseId?.toUpperCase()}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${doc.status === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {doc.status || 'free'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2">
                                    <button onClick={() => { setEditingDocument(doc); setEditDocForm({ title: doc.title || '', filePath: doc.filePath || '', thumbnailUrl: doc.thumbnailUrl || '', description: doc.description || '', time: doc.time || 'normal', status: doc.status || 'free', courseId: doc.courseId || '', semesterId: doc.semesterId || '', unitId: doc.unitId || '' }); }} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">Edit</button>
                                    <button onClick={() => deleteDocument(doc)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {filteredDocuments.length === 0 && (
                        <div className="text-center py-12 text-gray-500">No documents found</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Users Management</h2>
                  <button
                    onClick={handleLockExpiredSubscriptions}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Lock Expired Subscriptions
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{u.name || 'No name'}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {u.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${u.subscriptionApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                              {u.subscriptionApproved ? 'Premium' : 'Free'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                              {u.subscriptionPlan ? SUBSCRIPTION_PLANS[u.subscriptionPlan]?.label || u.subscriptionPlan : 'None'}
                            </span>
                          </td>
                           <td className="px-6 py-4">
                             <span className={`px-2 py-1 text-xs rounded-full font-medium ${u.banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                               {u.banned ? 'Banned' : 'Active'}
                             </span>
                           </td>
                           <td className="px-6 py-4">
                             {subscriptionCountdowns[u.id] ? (
                               <span className={`px-2 py-1 text-xs rounded-full font-medium ${subscriptionCountdowns[u.id].expired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                 {subscriptionCountdowns[u.id].text}
                               </span>
                             ) : (
                               <span className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800">N/A</span>
                             )}
                           </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 flex-wrap">
                              {!u.subscriptionApproved && (
                                <select
                                  onChange={(e) => handleApproveSubscription(u.id, e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Approve</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                  <option value="yearly">Yearly</option>
                                </select>
                              )}
                              <button
                                onClick={() => handleBanUser(u.id, u.banned)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${u.banned ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                              >
                                {u.banned ? 'Unban' : 'Ban'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No users found</div>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.reference || p.id}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{p.userName || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{p.userEmail || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">UGX {p.amount ? Number(p.amount).toLocaleString() : 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{p.phoneNumber || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                              {p.planLabel || p.plan || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${p.status === 'success' ? 'bg-green-100 text-green-800' : p.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                              {p.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {p.createdAtDate ? new Date(p.createdAtDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            {p.userId && subscriptionCountdowns[p.userId] ? (
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${subscriptionCountdowns[p.userId].expired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                {subscriptionCountdowns[p.userId].text}
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {p.status === 'pending_verification' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprovePayment(p.id, p.userId, p.plan)}
                                  disabled={paymentActionLoading[p.id]}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:bg-gray-200"
                                >
                                  {paymentActionLoading[p.id] ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleDeclinePayment(p.id)}
                                  disabled={paymentActionLoading[p.id]}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:bg-gray-200"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredPayments.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No payments found</div>
                )}
              </div>
            )}

            {activeTab === 'register' && (
              <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Register New User</h2>
                <form onSubmit={handleRegisterUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      name="regName"
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      name="regEmail"
                      type="email"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      name="regPhone"
                      type="tel"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="256749846848"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      name="regPassword"
                      type="password"
                      required
                      minLength="6"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Register User
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Paystack Configuration</h2>
                <form onSubmit={saveConfig} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Public Key</label>
                    <input
                      type="text"
                      value={paystackPublicKey}
                      onChange={(e) => setPaystackPublicKey(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="pk_test_..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                    <input
                      type="password"
                      value={paystackSecretKey}
                      onChange={(e) => setPaystackSecretKey(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="sk_test_..."
                    />
                  </div>
                  {configMessage && (
                    <p className={`text-sm ${configMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                      {configMessage}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Firebase Storage</h2>
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={storageFolder}
                    onChange={(e) => setStorageFolder(e.target.value)}
                    placeholder="Folder path (e.g., thumbnails, documents)"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={loadStorageFiles}
                    disabled={loadingStorage}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400"
                  >
                    {loadingStorage ? 'Loading...' : 'Load Files'}
                  </button>
                </div>
                <form onSubmit={handleCreateFolder} className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={creatingFolder}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {creatingFolder ? 'Creating...' : 'Create Folder'}
                  </button>
                </form>
                {storageMessage && (
                  <p className={`text-sm mb-4 ${storageMessage.includes('success') || storageMessage.includes('deleted') || storageMessage.includes('created') ? 'text-green-600' : 'text-red-600'}`}>
                    {storageMessage}
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {storageFiles.map((file, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{file.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{file.fullPath}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{file.size ? (file.size / 1024).toFixed(1) + ' KB' : 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{file.contentType || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{file.updated ? new Date(file.updated).toLocaleString() : 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                              >
                                View
                              </a>
                              <button
                                onClick={() => handleDeleteStorageFile(file.fullPath)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {storageFiles.length === 0 && !loadingStorage && (
                    <div className="text-center py-12 text-gray-500">No files found in this folder</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
