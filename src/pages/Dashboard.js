import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayIcon, UsersIcon } from '../components/icons';
import { getUser, updateUserBalance, addTransaction, getUserTransactions, getAllUsers } from '../firebase';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('zenith_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchUserData(parsedUser.phone);
    }
    
    setVideos([
      { id: 1, title: 'How to Make Money Online', duration: '5:30', views: '1.2K', earnings: 500, url: 'https://youtu.be/DhEMFeo_gL8' },
      { id: 2, title: 'Top 10 Investment Tips', duration: '3:45', views: '850', earnings: 300, url: 'https://www.youtube.com/shorts/unWPUqnNG4U' },
      { id: 3, title: 'Financial Freedom Guide', duration: '7:20', views: '2.1K', earnings: 800, url: 'https://www.youtube.com/shorts/FfgUuVt540Q' },
      { id: 4, title: 'Passive Income Ideas', duration: '4:15', views: '1.5K', earnings: 600, url: 'https://youtu.be/XOs_X0CB_ms' },
      { id: 5, title: 'Stock Market Basics', duration: '6:00', views: '980', earnings: 400, url: 'https://youtu.be/p7HKvqRI_Bo' },
      { id: 6, title: 'Money Making Secrets', duration: '5:00', views: '750', earnings: 350, url: 'https://youtu.be/zQ0Ojy-0VEs' }
    ]);
    
    setLoading(false);
  }, []);

  const fetchUserData = async (phone) => {
    try {
      const firebaseUser = await getUser(phone);
      if (firebaseUser) {
        setUser(firebaseUser);
        localStorage.setItem('user', JSON.stringify(firebaseUser));
      }
      
      const txs = await getUserTransactions(phone);
      setTransactions(txs.slice(0, 5));
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleWatchVideo = async (video) => {
    const earnings = video.earnings;
    
    // Open YouTube video in new window
    window.open(video.url, '_blank', 'width=800,height=600');
    
    // Show message that earnings will be credited after watching
    alert(`Please watch the video! After watching, you'll earn UGX ${earnings}. The earnings will be added to your balance.`);
    
    if (user) {
      const newBalance = user.balance + earnings;
      const updatedUser = { ...user, balance: newBalance };
      
      try {
        await updateUserBalance(user.phone, newBalance, 'balance');
        await addTransaction({
          userId: user.phone,
          type: 'earnings',
          amount: earnings,
          description: `Video watch earnings: ${video.title}`
        });
        
        setUser(updatedUser);
        localStorage.setItem('zenith_user', JSON.stringify(updatedUser));
        alert(`You earned UGX ${earnings}! Your new balance is UGX ${newBalance}`);
      } catch (error) {
        console.error("Error updating balance:", error);
        setUser(updatedUser);
        localStorage.setItem('zenith_user', JSON.stringify(updatedUser));
        alert(`You earned UGX ${earnings}! Your new balance is UGX ${newBalance}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-pulse bg-gray-200 h-6 w-32 rounded mx-auto mb-4"></div>
            <div className="animate-pulse bg-gray-200 h-4 w-48 rounded mx-auto mb-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please login to continue</h2>
            <Link to="/login" className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">UGX {user.balance?.toLocaleString() || 0}</div>
              <div className="text-sm text-gray-600">Total Balance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">UGX {(user.commission || 0).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Referral Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{user.referrals || 0}</div>
              <div className="text-sm text-gray-600">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">UGX {((user.balance || 0) + (user.commission || 0)).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Earnings</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Videos</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <motion.div 
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: (video.id - 1) * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <PlayIcon className="w-6 h-6 text-blue-600" />
                  <span className="text-sm text-gray-500">{video.duration}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h3>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">{video.views} views</span>
                  <span className="text-sm font-semibold text-green-600">+UGX {video.earnings}</span>
                </div>
                <button
                  onClick={() => handleWatchVideo(video)}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition"
                >
                  Watch Now
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Transactions</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {transactions.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tx.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {tx.type === 'withdrawal' ? '-' : '+'}UGX {tx.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No transactions yet. Start watching videos to earn!
              </div>
            )}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/referrals" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition">
              <UsersIcon className="w-8 h-8 text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Refer Friends</h3>
              <p className="text-sm text-gray-600">Earn 20% commission</p>
            </Link>
            <Link to="/withdraw" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Withdraw</h3>
              <p className="text-sm text-gray-600">Request payout</p>
            </Link>
            <Link to="/deposit" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Deposit</h3>
              <p className="text-sm text-gray-600">Add funds to your account</p>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
