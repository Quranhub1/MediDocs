import React, { useState, useEffect } from 'react';
import { fetchAllDocuments } from '../services/FirestoreService';
import { 
  collection, 
  getDocs, 
  doc as docRef, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

const AdminDashboard = ({ user, onViewChange }) => {
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    latestDocuments: 0,
    premiumDocuments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Admin phone number from environment or default
  const ADMIN_PHONE = '256749846848';

  // Check if user is admin
  const ADMIN_EMAIL = 'kaigwaakram123@gmail.com';
  const isAdmin = user?.phone === ADMIN_PHONE || 
    (user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDocuments(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
    setLoading(false);
  };

  const loadDocuments = async () => {
    try {
      // Use the shared fetch function with caching
      const result = await fetchAllDocuments(100, false);
      
      if (result.success && result.data) {
        const allDocs = result.data.map(doc => ({
          ...doc,
          fullPath: doc.fullPath || `RESOURCES_STUDYPEDIA/${doc.courseId}/semesters/${doc.semesterId}/courseunits/${doc.unitId}/documents/${doc.id}`
        }));
        
        setDocuments(allDocs);
        
        // Update stats
        const latestDocs = allDocs.filter(d => d.time === 'latest').length;
        const premiumDocs = allDocs.filter(d => d.status === 'premium').length;
        setStats(prev => ({
          ...prev,
          totalDocuments: allDocs.length,
          latestDocuments: latestDocs,
          premiumDocuments: premiumDocs
        }));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersList = usersSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setUsers(usersList);
      setStats(prev => ({
        ...prev,
        totalUsers: usersList.length
      }));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Update document to be latest
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

  // Remove latest status
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

  // Delete document
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

  // Approve user subscription
  const approveSubscription = async (userId) => {
    try {
      const userDocRef = docRef(db, 'users', userId);
      await updateDoc(userDocRef, { subscriptionApproved: true });
      alert('Subscription approved!');
      loadData();
    } catch (error) {
      console.error('Error approving subscription:', error);
      alert('Failed to approve subscription');
    }
  };

  // Ban/Unban user
  const toggleUserBan = async (userId, currentStatus) => {
    try {
      const userDocRef = docRef(db, 'users', userId);
      await updateDoc(userDocRef, { banned: !currentStatus });
      alert(`User ${currentStatus ? 'unbanned' : 'banned'}!`);
      loadData();
    } catch (error) {
      console.error('Error toggling ban:', error);
      alert('Failed to update user status');
    }
  };

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => 
    doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.courseId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <button 
            onClick={() => onViewChange('home')}
            className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-emerald-100 mt-1">Manage your MediDocs platform</p>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl font-bold text-emerald-600">{stats.totalDocuments}</div>
            <div className="text-gray-500 text-sm">Total Documents</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl font-bold text-teal-600">{stats.latestDocuments}</div>
            <div className="text-gray-500 text-sm">Latest Documents</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl font-bold text-amber-600">{stats.premiumDocuments}</div>
            <div className="text-gray-500 text-sm">Premium Documents</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
            <div className="text-gray-500 text-sm">Total Users</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'documents' 
                ? 'border-b-2 border-emerald-500 text-emerald-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 Documents
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'users' 
                ? 'border-b-2 border-emerald-500 text-emerald-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Users
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{doc.title || doc.id}</div>
                        <div className="text-sm text-gray-500">{doc.description?.substring(0, 50)}...</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {doc.courseId?.toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.status === 'premium' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status || 'free'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.time === 'latest' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.time || 'normal'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {doc.time !== 'latest' ? (
                            <button
                              onClick={() => markAsLatest(doc)}
                              className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-sm hover:bg-emerald-200"
                            >
                              Mark Latest
                            </button>
                          ) : (
                            <button
                              onClick={() => removeLatest(doc)}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                            >
                              Remove Latest
                            </button>
                          )}
                          <button
                            onClick={() => deleteDocument(doc)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
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
              <div className="text-center py-12 text-gray-500">
                No documents found
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{u.name || 'No name'}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {u.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          u.subscriptionApproved 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {u.subscriptionApproved ? 'Premium' : 'Free'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          u.banned 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {u.banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {!u.subscriptionApproved && (
                            <button
                              onClick={() => approveSubscription(u.id)}
                              className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-sm hover:bg-emerald-200"
                            >
                              Approve Sub
                            </button>
                          )}
                          <button
                            onClick={() => toggleUserBan(u.id, u.banned)}
                            className={`px-3 py-1 rounded text-sm ${
                              u.banned 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
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
              <div className="text-center py-12 text-gray-500">
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
