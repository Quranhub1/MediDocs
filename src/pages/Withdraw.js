import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSignIcon, XIcon } from '../components/icons';

const Withdraw = () => {
  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please login to continue');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amountValue = parseFloat(amount);
    if (amountValue > user.balance) {
      setError('Insufficient balance');
      return;
    }

    // Simulate withdrawal
    const updatedUser = { ...user, balance: user.balance - amountValue };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    setSuccess(`Successfully withdrew UGX ${amountValue.toLocaleString()}. Check your mobile money.`);
    setAmount('');
  };

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
        >
          <div className="text-center mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Withdraw Earnings
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-600"
            >
              Cash out your earnings to mobile money
            </motion.p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6"
            >
              <XIcon className="w-5 h-5 inline mr-2" />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded mb-6"
            >
              <DollarSignIcon className="w-5 h-5 inline mr-2" />
              {success}
            </motion.div>
          )}

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">UGX {user.balance.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Available Balance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">UGX {(user.commission || 0).toLocaleString()}</div>
                <div className="text-sm text-gray-600">Referral Earnings</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Withdraw
              </label>
              <div className="relative">
                <span className="absolute left-0 top-0 ml-3 mt-3 text-gray-500">UGX</span>
                <input
                  type="number"
                  name="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <p className="mb-2">Minimum withdrawal: UGX 1,000</p>
              <p className="mb-2">Processing fee: UGX 200</p>
              <p className="text-green-600 font-medium">No withdrawal fees for amounts above UGX 50,000</p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition"
            >
              Withdraw Now
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Payments processed within 24 hours
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Withdraw;
