import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UsersIcon, TrendingUpIcon } from '../components/icons';
import { getAllUsers } from '../firebase';

const Referrals = () => {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchReferrals(parsedUser.phone);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchReferrals = async (phone) => {
    try {
      const allUsers = await getAllUsers();
      const userReferrals = allUsers.filter(u => u.referredBy === phone);
      
      setReferrals(userReferrals.map((u, index) => ({
        id: index + 1,
        name: u.phone,
        phone: u.phone,
        joined: new Date(u.createdAt).toLocaleDateString(),
        earnings: u.balance || 0,
        commission: (u.balance || 0) * 0.2
      })));
    } catch (error) {
      console.error("Error fetching referrals:", error);
      const storedReferrals = JSON.parse(localStorage.getItem('referrals_' + phone) || '[]');
      setReferrals(storedReferrals);
    }
    setLoading(false);
  };

  const referralLink = user ? 
    `${window.location.origin}/register?ref=${user.phone}` : 
    `${window.location.origin}/register`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarnings = referrals.reduce((sum, r) => sum + (r.commission || 0), 0);

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
              <div className="text-2xl font-bold text-blue-600">{referrals.length}</div>
              <div className="text-sm text-gray-600">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">UGX {totalEarnings.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Referral Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">20%</div>
              <div className="text-sm text-gray-600">Commission Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">UGX {user.referrals || 0}</div>
              <div className="text-sm text-gray-600">Active Referrals</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Referral Link</h2>
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="w-full bg-white px-4 py-2 rounded-lg border border-gray-300"
                />
              </div>
              <button
                onClick={handleCopyLink}
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Share this link with friends to earn 20% commission on their earnings
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Referrals</h2>
          {referrals.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Your Commission (20%)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {referral.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {referral.joined}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        UGX {referral.earnings.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        UGX {referral.commission.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">You don't have any referrals yet. Share your referral link to start earning!</p>
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tips to Earn More</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <UsersIcon className="w-6 h-6 text-blue-600 mt-1 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Share on Social Media</h3>
                  <p className="text-sm text-gray-600">Post your referral link on Facebook, Twitter, and WhatsApp</p>
                </div>
              </div>
              <div className="flex items-start">
                <TrendingUpIcon className="w-6 h-6 text-green-600 mt-1 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Target Active Users</h3>
                  <p className="text-sm text-gray-600">Focus on people who are likely to watch videos regularly</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Referrals;
