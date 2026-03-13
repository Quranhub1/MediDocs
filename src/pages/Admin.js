import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UsersIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon, CheckIcon, XIcon } from '../components/icons';
import { getAllUsers, getAllDeposits, getAllWithdrawals, updateUserBalance, updateDepositStatus, updateWithdrawalStatus, addTransaction } from '../firebase';

const Admin = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [bonusAmount, setBonusAmount] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Only allow admin access (you can set a specific phone as admin)
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
      // Refund the amount back to user
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'deposits' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Deposits ({pendingDeposits.length} pending)
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'withdrawals' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Withdrawals ({pendingWithdrawals.length} pending)
          </button>
          <button
            onClick={() => setActiveTab('bonus')}
            className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'bonus' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrals</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">UGX {u.balance?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">UGX {u.commission?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.referrals || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
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
    </div>
  );
};

export default Admin;
