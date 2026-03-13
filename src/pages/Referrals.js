import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UsersIcon, TrendingUpIcon, XIcon } from '../components/icons';

const Referrals = () => {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Simulate referrals
    setReferrals([
      { id: 1, name: 'John Doe', phone: '256752123456', joined: '2 days ago', earnings: 0.30 },
      { id: 2, name: 'Jane Smith', phone: '256789654321', joined: '5 days ago', earnings: 0.25 },
      { id: 3, name: 'Mike Johnson', phone: '256712345678', joined: '1 week ago', earnings: 0.20 },
      { id: 4, name: 'Sarah Brown', phone: '256723456789', joined: '10 days ago', earnings: 0.15 },
      { id: 5, name: 'Tom Wilson', phone: '256734567890', joined: '2 weeks ago', earnings: 0.10 }
    ]);
    
    setLoading(false);
  }, []);

  const referralLink = "https://zenith-assets.onrender.com/register?ref=" + (user?.phone || "763912608");

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
              <div className="text-2xl font-bold text-blue-600">{user.referrals || 0}</div>
              <div className="text-sm text-gray-600">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">UGX {(user.commission || 0).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Referral Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">20%</div>
              <div className="text-sm text-gray-600">Commission Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">UGX 1,000</div>
              <div className="text-sm text-gray-600">Per Referral</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Referral Link */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Referral Link</h2>
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="w-full bg-white px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  alert('Referral link copied to clipboard!');
                }}
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition"
              >
                Copy
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Share this link with friends to earn 20% commission on their earnings
            </p>
          </div>
        </motion.div>

        {/* Referral Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Referral Stats</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{referrals.length}</div>
                <div className="text-sm text-gray-600">Active Referrals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">UGX {(referrals.reduce((sum, r) => sum + r.earnings, 0)).toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Earnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{((referrals.reduce((sum, r) => sum + r.earnings, 0) / 5) * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Commission Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">UGX {(referrals.reduce((sum, r) => sum + r.earnings, 0) * 0.2).toLocaleString()}</div>
                <div className="text-sm text-gray-600">Your Earnings</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Referral Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Referrals</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Commission</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {referral.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {referral.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {referral.joined}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      UGX {referral.earnings.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      UGX {(referral.earnings * 0.2).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Referral Tips */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
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
              <div className="flex items-start">
                <UsersIcon className="w-6 h-6 text-purple-600 mt-1 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Create Content</h3>
                  <p className="text-sm text-gray-600">Make tutorial videos about how the platform works</p>
                </div>
              </div>
              <div className="flex items-start">
                <DollarSignIcon className="w-6 h-6 text-orange-600 mt-1 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Set Goals</h3>
                  <p className="text-sm text-gray-600">Aim for 10 referrals to earn UGX 10,000 in commission</p>
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
