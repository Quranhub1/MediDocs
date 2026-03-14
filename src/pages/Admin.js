import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon, CheckIcon, XIcon, TrashIcon, NoSymbolIcon, PencilIcon, UserIcon } from '../components/icons';
import { getAllUsers, getAllDeposits, getAllWithdrawals, updateUserBalance, updateDepositStatus, updateWithdrawalStatus, addTransaction, deleteUser, banUser, updateUserData } from '../firebase';

const Admin = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [bonusAmount, setBonusAmount] = useState('');
  
  // Action modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionAmount, setActionAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('zenith_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Only allow admin access
      if (parsedUser.phone !== '0749846848') {
        alert('Access denied. Admin only.');
        window.location.href = '/dashboard';
        return;
      }
      
      fetchData();
    } else {
      window.location.href = '/login';
    }
  }, []);

  const fetchData = async () => {
    try {
      const allUsers = await getAllUsers();
      const allDeposits = await getAllDeposits();
      const allWithdrawals = await getAllWithdrawals();
      
      setUsers(allUsers);
      setDeposits(allDeposits);
      setWithdrawals(allWithdrawals);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleApproveDeposit = async (deposit) => {
    try {
      await updateDepositStatus(deposit.id, 'approved');
      await updateUserBalance(deposit.userId, deposit.amount, 'balance');
      await addTransaction({
        userId: deposit.userId,
        type: 'deposit',
        amount: deposit.amount,
        description: 'Deposit approved by admin'
      });
      
      alert('Deposit approved!');
      fetchData();
    } catch (error) {
      console.error("Error approving deposit:", error);
      alert('Error approving deposit');
    }
  };

  const handleRejectDeposit = async (deposit) => {
    try {
      await updateDepositStatus(deposit.id, 'rejected');
      alert('Deposit rejected');
      fetchData();
    } catch (error) {
      console.error("Error rejecting deposit:", error);
    }
  };

  const handleApproveWithdrawal = async (withdrawal) => {
    try {
      await updateWithdrawalStatus(withdrawal.id, 'approved');
      alert('Withdrawal approved!');
      fetchData();
    } catch (error) {
      console.error("Error approving withdrawal:", error);
    }
  };

  const handleRejectWithdrawal = async (withdrawal) => {
    try {
      await updateWithdrawalStatus(withdrawal.id, 'rejected');
      const userDoc = users.find(u => u.phone === withdrawal.userId);
      if (userDoc) {
        await updateUserBalance(withdrawal.userId, userDoc.balance + withdrawal.amount, 'balance');
      }
      alert('Withdrawal rejected and amount refunded');
      fetchData();
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
    }
  };

  const handleAddBonus = async () => {
    if (!selectedUser || !bonusAmount) {
      alert('Please select a user and enter amount');
      return;
    }

    try {
      const newBalance = selectedUser.balance + parseFloat(bonusAmount);
      await updateUserBalance(selectedUser.phone, newBalance, 'balance');
      await addTransaction({
        userId: selectedUser.phone,
        type: 'bonus',
        amount: parseFloat(bonusAmount),
        description: 'Admin bonus added'
      });
      
      alert('Bonus added successfully!');
      setBonusAmount('');
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error("Error adding bonus:", error);
    }
  };

  // Handle action modal submit
  const handleActionSubmit = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      switch (actionType) {
        case 'delete':
          if (confirm(`Are you sure you want to DELETE user ${selectedUser.phone}? This action cannot be undone.`)) {
            await deleteUser(selectedUser.phone);
            alert('User deleted successfully!');
            fetchData();
            setSelectedUser(null);
          }
          break;
          
        case 'ban':
          const newBanStatus = !selectedUser.banned;
          await banUser(selectedUser.phone, newBanStatus);
          alert(`User ${newBanStatus ? 'banned' : 'unbanned'} successfully!`);
          fetchData();
          break;
          
        case 'update_balance':
          if (!actionAmount) {
            alert('Please enter an amount');
            setActionLoading(false);
            return;
          }
          await updateUserBalance(selectedUser.phone, parseFloat(actionAmount), 'balance');
          alert('Balance updated successfully!');
          break;
          
        case 'deduct':
          if (!actionAmount) {
            alert('Please enter an amount');
            setActionLoading(false);
            return;
          }
          const newDeductedBalance = selectedUser.balance - parseFloat(actionAmount);
          await updateUserBalance(selectedUser.phone, newDeductedBalance, 'balance');
          await addTransaction({
            userId: selectedUser.phone,
            type: 'deduction',
            amount: parseFloat(actionAmount),
            description: 'Admin deducted balance'
          });
          alert('Balance deducted successfully!');
          break;
          
        default:
          break;
      }
      
      setShowActionModal(false);
      setActionType('');
      setActionAmount('');
      setSelectedUser(null);
      fetchData();
      fetchData();
    } catch (error) {
      console.error("Error performing action:", error);
      alert('Error performing action');
    }
    
    setActionLoading(false);
  };

  const openActionModal = (type) => {
    setActionType(type);
    setShowActionModal(true);
    setActionAmount('');
  };

  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-pulse bg-gray-200 h-6 w-32 rounded mx-auto mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-24">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <Link to="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <UsersIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <DollarSignIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">UGX {totalBalance.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Balance</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <TrendingUpIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{pendingDeposits.length}</div>
            <div className="text-sm text-gray-600">Pending Deposits</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <TrendingDownIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{pendingWithdrawals.length}</div>
            <div className="text-sm text-gray-600">Pending Withdrawals</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'deposits' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Deposits ({pendingDeposits.length} pending)
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'withdrawals' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Withdrawals ({pendingWithdrawals.length} pending)
          </button>
          <button
            onClick={() => setActiveTab('bonus')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === 'bonus' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Add Bonus
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrals</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${selectedUser?.phone === u.phone ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input 
                          type="radio" 
                          name="selectedUser"
                          checked={selectedUser?.phone === u.phone}
                          onChange={() => setSelectedUser(u)}
                          className="h-4 w-4 text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.phone}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">UGX {u.balance?.toLocaleString() || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">UGX {u.commission?.toLocaleString() || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{u.referrals || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${u.banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {u.banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Deposits Table */}
        {activeTab === 'deposits' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deposits.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.userId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">UGX {d.amount?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${d.status === 'approved' ? 'bg-green-100 text-green-800' : d.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {d.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button onClick={() => handleApproveDeposit(d)} className="text-green-600 hover:text-green-800">
                              <CheckIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleRejectDeposit(d)} className="text-red-600 hover:text-red-800">
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Withdrawals Table */}
        {activeTab === 'withdrawals' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{w.userId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">UGX {w.amount?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${w.status === 'approved' ? 'bg-green-100 text-green-800' : w.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {w.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button onClick={() => handleApproveWithdrawal(w)} className="text-green-600 hover:text-green-800">
                              <CheckIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleRejectWithdrawal(w)} className="text-red-600 hover:text-red-800">
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Add Bonus */}
        {activeTab === 'bonus' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Bonus to User</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                <select
                  onChange={(e) => {
                    const selected = users.find(u => u.phone === e.target.value);
                    setSelectedUser(selected);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.phone}>{u.phone} - UGX {u.balance?.toLocaleString() || 0}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bonus Amount (UGX)</label>
                <input
                  type="number"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  placeholder="Enter bonus amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                onClick={handleAddBonus}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Add Bonus
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Selected User Info */}
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedUser.phone}</p>
                    <p className="text-sm text-green-600 font-bold">Balance: UGX {selectedUser.balance?.toLocaleString() || 0}</p>
                    <p className="text-xs text-gray-500">Status: {selectedUser.banned ? 'Banned' : 'Active'}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <button
                    onClick={() => openActionModal('update_balance')}
                    className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                  >
                    <DollarSignIcon className="w-4 h-4" />
                    <span>Update Balance</span>
                  </button>
                  
                  <button
                    onClick={() => openActionModal('deduct')}
                    className="flex items-center space-x-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                  >
                    <TrendingDownIcon className="w-4 h-4" />
                    <span>Deduct</span>
                  </button>
                  
                  <button
                    onClick={() => openActionModal('ban')}
                    className={`flex items-center space-x-1 px-4 py-2 rounded-lg font-semibold transition ${
                      selectedUser.banned 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <NoSymbolIcon className="w-4 h-4" />
                    <span>{selectedUser.banned ? 'Unban' : 'Ban'}</span>
                  </button>
                  
                  <button
                    onClick={() => openActionModal('delete')}
                    className="flex items-center space-x-1 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg font-semibold transition"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete</span>
                  </button>

                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-500 hover:text-gray-700 px-2 py-2"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowActionModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {actionType === 'delete' && 'Delete User'}
                {actionType === 'ban' && (selectedUser?.banned ? 'Unban User' : 'Ban User')}
                {actionType === 'update_balance' && 'Update Balance'}
                {actionType === 'deduct' && 'Deduct Balance'}
              </h3>

              {actionType === 'delete' && (
                <div className="mb-4">
                  <p className="text-gray-600">
                    Are you sure you want to delete user <strong>{selectedUser?.phone}</strong>?
                    This action cannot be undone.
                  </p>
                </div>
              )}

              {actionType === 'ban' && (
                <div className="mb-4">
                  <p className="text-gray-600">
                    {selectedUser?.banned 
                      ? `This will unban user ${selectedUser?.phone} and allow them to access the platform again.`
                      : `This will ban user ${selectedUser?.phone} and prevent them from accessing the platform.`
                    }
                  </p>
                </div>
              )}

              {(actionType === 'update_balance' || actionType === 'deduct') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {actionType === 'update_balance' ? 'New Balance (UGX)' : 'Amount to Deduct (UGX)'}
                  </label>
                  <input
                    type="number"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    placeholder={actionType === 'update_balance' ? 'Enter new balance' : 'Enter amount to deduct'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Current Balance: UGX {selectedUser?.balance?.toLocaleString() || 0}
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={actionLoading}
                  className={`flex-1 text-white px-4 py-2 rounded-lg font-semibold ${
                    actionType === 'delete' ? 'bg-red-700 hover:bg-red-800' :
                    actionType === 'ban' ? (selectedUser?.banned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700') :
                    actionType === 'update_balance' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-orange-600 hover:bg-orange-700'
                  } disabled:opacity-50`}
                >
                  {actionLoading ? 'Processing...' : 
                    actionType === 'delete' ? 'Delete' :
                    actionType === 'ban' ? (selectedUser?.banned ? 'Unban' : 'Ban') :
                    actionType === 'update_balance' ? 'Update' :
                    'Deduct'
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
