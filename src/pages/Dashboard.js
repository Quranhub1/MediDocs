import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserIcon, ClockIcon, PlayIcon, UsersIcon, TrendingUpIcon, DollarSignIcon, TrendingDownIcon, XIcon } from '../components/icons';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Simulate videos
    setVideos([
      { id: 1, title: 'How to Make Money Online', duration: '5:30', views: '1.2K', earnings: 0.50 },
      { id: 2, title: 'Top 10 Investment Tips', duration: '3:45', views: '850', earnings: 0.30 },
      { id: 3, title: 'Financial Freedom Guide', duration: '7:20', views: '2.1K', earnings: 0.80 },
      { id: 4, title: 'Passive Income Ideas', duration: '4:15', views: '1.5K', earnings: 0.60 },
      { id: 5, title: 'Stock Market Basics', duration: '6:00', views: '980', earnings: 0.40 }
    ]);
    
    setLoading(false);
  }, []);

  const handleWatchVideo = (video) => {
    // Simulate watching video
    const earnings = video.earnings;
    
    // Update user balance
    if (user) {
      const updatedUser = { ...user, balance: user.balance + earnings };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    alert(`You earned $${earnings.toFixed(2)}! Your new balance is $${(user?.balance || 0) + earnings}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-pulse bg-gray-200 h-6 w-32 rounded mx-auto mb-4"></div>
            <div className="animate-pulse bg-gray-200 h-4 w-48 rounded mx-auto mb-6"></div>
            <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mx-auto mb-6"></div>
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
            <Link to="/login" className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Stats Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">${user.balance.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Balance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${(user.commission || 0).toFixed(2)}</div>
              <div className="text-sm text-gray-600">Referral Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{user.referrals || 0}</div>
              <div className="text-sm text-gray-600">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">${(user.balance + (user.commission || 0)).toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Earnings</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Available Videos */}
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
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{video.views} views</span>
                  <span className="text-green-600">+${video.earnings.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleWatchVideo(video)}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition"
                >
                  Watch & Earn
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/withdraw" className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition">
              <DollarSignIcon className="w-5 h-5 inline mr-2" />
              Withdraw
            </Link>
            <Link to="/referrals" className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 transition">
              <UsersIcon className="w-5 h-5 inline mr-2" />
              Referrals
            </Link>
            <Link to="/profile" className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:from-purple-700 hover:via-pink-700 hover:to-red-700 transition">
              <UserIcon className="w-5 h-5 inline mr-2" />
              Profile
            </Link>
            <button 
              onClick={() => {
                const updatedUser = { ...user, balance: 0, commission: 0, referrals: 0 };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                alert('Account reset for demo purposes');
              }}
              className="bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 transition"
            >
              <XIcon className="w-5 h-5 inline mr-2" />
              Reset
            </button>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Watched "How to Make Money Online"</span>
                <span className="text-sm text-green-600">+ $0.50</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Referral bonus from John</span>
                <span className="text-sm text-green-600">+ $0.30</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Watched "Top 10 Investment Tips"</span>
                <span className="text-sm text-green-600">+ $0.30</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New referral sign up</span>
                <span className="text-sm text-green-600">+ $0.00</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
