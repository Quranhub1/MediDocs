import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayIcon, UsersIcon } from '../components/icons';
import { getUser, updateUserBalance, addTransaction, getUserTransactions, getAllUsers, getUserInvestments, addInvestment } from '../firebase';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [canWatch, setCanWatch] = useState(true);
  const [cooldownRemaining, setCooldownRemaining] = useState('');
  const [investmentTimers, setInvestmentTimers] = useState({});
  const [userInvestments, setUserInvestments] = useState([]);
  const [watchingVideo, setWatchingVideo] = useState(null);

  // Investment timer effect - runs every minute
  useEffect(() => {
    if (!user) return;

    const checkInvestments = async () => {
      const userPhone = user.phone;
      const investments = JSON.parse(localStorage.getItem('investments_' + userPhone) || '[]');
      const now = Date.now();
      let balanceChanged = false;
      let updatedInvestments = [];
      let newBalance = user.balance;

      investments.forEach((inv, index) => {
        if (inv.status !== 'active') {
          updatedInvestments.push(inv);
          return;
        }

        const startTime = new Date(inv.startDate).getTime();
        const endTime = new Date(inv.endDate).getTime();
        const hoursPassed = (now - startTime) / (1000 * 60 * 60);
        const daysPassed = Math.floor(hoursPassed / 24);
        const lastPayoutDay = inv.lastPayoutDay || 0;

        // Check if investment period has ended
        if (now >= endTime) {
          // Investment period ended
          inv.status = 'completed';
          
          // For locked investments (packages 2-6), release principal to balance
          if (inv.locked) {
            newBalance += inv.amount;
            balanceChanged = true;
          }
          
          updatedInvestments.push(inv);
          return;
        }

        // Check if daily payout is due (every 24 hours)
        if (daysPassed > lastPayoutDay) {
          // Add daily earnings to balance
          newBalance += inv.dailyEarnings;
          inv.lastPayoutDay = daysPassed;
          balanceChanged = true;
          
          // Add transaction record
          addTransaction({
            userId: userPhone,
            type: 'investment_return',
            amount: inv.dailyEarnings,
            description: `Daily return from ${inv.packageName}`
          }).catch(console.error);
        }

        // Calculate time remaining
        const hoursRemaining = 24 - (hoursPassed % 24);
        const daysRemaining = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
        
        inv.timeRemaining = {
          hours: Math.floor(hoursRemaining),
          days: daysRemaining
        };
        
        updatedInvestments.push(inv);
      });

      // Save updated investments
      localStorage.setItem('investments_' + userPhone, JSON.stringify(updatedInvestments));

      // Also save to Firebase
      try {
        for (const inv of updatedInvestments) {
          await addInvestment(inv);
        }
      } catch (error) {
        console.error('Error saving investments to Firebase:', error);
      }

      // Update balance if changed
      if (balanceChanged) {
        const updatedUser = { ...user, balance: newBalance };
        setUser(updatedUser);
        localStorage.setItem('zenith_user', JSON.stringify(updatedUser));
        
        // Update in Firebase
        updateUserBalance(userPhone, newBalance, 'balance').catch(console.error);
      }

      // Update timer display
      const timers = {};
      updatedInvestments.forEach(inv => {
        if (inv.status === 'active' && inv.timeRemaining) {
          timers[inv.id] = inv.timeRemaining;
        }
      });
      setInvestmentTimers(timers);
      setUserInvestments(updatedInvestments);
    };

    // Run immediately
    checkInvestments();

    // Run every minute
    const interval = setInterval(checkInvestments, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const userData = localStorage.getItem('zenith_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      
      // Validate user has phone number
      if (!parsedUser.phone && !parsedUser.id) {
        console.error("User data missing phone number");
        localStorage.removeItem('zenith_user');
        window.location.href = '/login';
        return;
      }
      
      // Use phone or id as the user identifier
      const userPhone = parsedUser.phone || parsedUser.id;
      setUser(parsedUser);
      fetchUserData(userPhone);
      
      // Load user investments from Firebase and localStorage
      const loadInvestments = async () => {
        try {
          const firebaseInvestments = await getUserInvestments(userPhone);
          const localInvestments = JSON.parse(localStorage.getItem('investments_' + userPhone) || '[]');
          
          // Merge investments (prefer Firebase data if available, otherwise use local)
          const mergedInvestments = firebaseInvestments.length > 0 ? firebaseInvestments : localInvestments;
          setUserInvestments(mergedInvestments);
          
          // Also save Firebase investments to localStorage for offline access
          if (firebaseInvestments.length > 0) {
            localStorage.setItem('investments_' + userPhone, JSON.stringify(firebaseInvestments));
          }
        } catch (error) {
          console.error('Error loading investments:', error);
          const localInvestments = JSON.parse(localStorage.getItem('investments_' + userPhone) || '[]');
          setUserInvestments(localInvestments);
        }
      };
      loadInvestments();
      
      // Check if user can watch video (48 hour cooldown)
      checkVideoCooldown(parsedUser);
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

  // Check video cooldown (48 hours)
  const checkVideoCooldown = (userData) => {
    const lastWatch = userData?.lastVideoWatch;
    if (lastWatch) {
      const lastWatchTime = new Date(lastWatch).getTime();
      const now = Date.now();
      const hoursPassed = (now - lastWatchTime) / (1000 * 60 * 60);
      
      if (hoursPassed < 48) {
        setCanWatch(false);
        const hoursRemaining = Math.floor(48 - hoursPassed);
        setCooldownRemaining(`${hoursRemaining} hours`);
      }
    }
  };

  const fetchUserData = async (phone) => {
    try {
      const firebaseUser = await getUser(phone);
      if (firebaseUser) {
        // Merge with localStorage data (balance from Firebase takes precedence)
        const localUser = JSON.parse(localStorage.getItem('zenith_user') || '{}');
        const mergedUser = { ...localUser, ...firebaseUser };
        setUser(mergedUser);
        localStorage.setItem('zenith_user', JSON.stringify(mergedUser));
      }
      
      const txs = await getUserTransactions(phone);
      setTransactions(txs.slice(0, 5));
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleWatchVideo = async (video) => {
    // Check cooldown first
    if (!canWatch) {
      alert(`You can only watch one video every 48 hours. Please wait ${cooldownRemaining} before watching another video.`);
      return;
    }
    
    // Open YouTube video in new window
    window.open(video.url, '_blank', 'width=800,height=600');
    
    // Set the video as currently watching - user can claim reward after watching
    setWatchingVideo(video);
  };
  
  const handleClaimReward = async () => {
    if (!watchingVideo || !user) return;
    
    const earnings = watchingVideo.earnings;
    const now = new Date().toISOString();
    const newBalance = user.balance + earnings;
    const updatedUser = { ...user, balance: newBalance, lastVideoWatch: now };
    
    try {
      const newVideosWatched = (user.videosWatched || 0) + 1;
      await updateUserBalance(user.phone, newBalance, 'balance');
      await updateUserBalance(user.phone, now, 'lastVideoWatch');
      await updateUserBalance(user.phone, newVideosWatched, 'videosWatched');
      await addTransaction({
        userId: user.phone,
        type: 'earnings',
        amount: earnings,
        description: `Video watch earnings: ${watchingVideo.title}`
      });
      
      setUser({...updatedUser, videosWatched: newVideosWatched});
      localStorage.setItem('zenith_user', JSON.stringify({...updatedUser, videosWatched: newVideosWatched}));
      setCanWatch(false);
      setCooldownRemaining('48 hours');
      setWatchingVideo(null);
      alert(`You earned UGX ${earnings}! You can watch another video in 48 hours. Your new balance is UGX ${newBalance}`);
    } catch (error) {
      console.error("Error updating balance:", error);
      const newVideosWatched = (user.videosWatched || 0) + 1;
      setUser({...updatedUser, videosWatched: newVideosWatched});
      localStorage.setItem('zenith_user', JSON.stringify({...updatedUser, videosWatched: newVideosWatched}));
      setCanWatch(false);
      setCooldownRemaining('48 hours');
      setWatchingVideo(null);
      alert(`You earned UGX ${earnings}! You can watch another video in 48 hours. Your new balance is UGX ${newBalance}`);
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
      {/* User Info Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">Logged in as: {user.phone || user.id}</div>
          </div>
        </div>
      </div>
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4">
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
              <div className="text-2xl font-bold text-orange-600">{user.videosWatched || 0}</div>
              <div className="text-sm text-gray-600">Videos Watched</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">UGX {((user.balance || 0) + (user.commission || 0)).toLocaleString()}</div>
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
          {/* Claim Reward Banner */}
          {watchingVideo && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg mb-6 flex flex-col md:flex-row items-center justify-between">
              <div className="mb-3 md:mb-0">
                <p className="font-semibold">You've watched: {watchingVideo.title}</p>
                <p className="text-sm">Reward: UGX {watchingVideo.earnings}</p>
              </div>
              <button
                onClick={handleClaimReward}
                className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Claim Reward
              </button>
            </div>
          )}
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
                  disabled={!canWatch}
                  className={`w-full text-white px-4 py-2 rounded-lg font-semibold transition ${canWatch ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                  {canWatch ? 'Watch Now' : `Available in ${cooldownRemaining}`}
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
              <p className="text-sm text-gray-600">Earn 10% commission</p>
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

      {/* Floating Deposit Button */}
      <Link
        to="/deposit"
        className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 font-semibold transition z-50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Deposit</span>
      </Link>
    </div>
  );
};

export default Dashboard;
