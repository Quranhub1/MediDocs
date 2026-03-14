import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { updateUserBalance, addWithdrawal, addTransaction } from '../firebase';

const Withdraw = () => {
  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [receivePhone, setReceivePhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('zenith_user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!user) {
      setError('Please login to continue');
      setLoading(false);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    const amountValue = parseFloat(amount);
    
    if (amountValue < 10000) {
      setError('Minimum withdrawal is UGX 10,000');
      setLoading(false);
      return;
    }

    if (amountValue > user.balance) {
      setError('Insufficient balance');
      setLoading(false);
      return;
    }

    // Check for locked funds from investments
    const userPhone = user.phone;
    const investments = JSON.parse(localStorage.getItem('investments_' + userPhone) || '[]');
    const now = new Date().getTime();
    
    let lockedAmount = 0;
    investments.forEach(inv => {
      if (inv.status === 'active' && inv.locked) {
        const endDate = new Date(inv.endDate).getTime();
        if (now < endDate) {
          // Investment is still locked
          lockedAmount += inv.amount;
        }
      }
    });

    const availableBalance = user.balance - lockedAmount;
    if (amountValue > availableBalance) {
      setError(`Insufficient available balance. You have UGX ${availableBalance.toLocaleString()} available for withdrawal (UGX ${lockedAmount.toLocaleString()} is locked in active investments).`);
      setLoading(false);
      return;
    }

    try {
      const newBalance = user.balance - amountValue;
      await updateUserBalance(user.phone, newBalance, 'balance');
      await addWithdrawal({
        userId: user.phone,
        amount: amountValue,
        status: 'pending',
        method: 'mobile_money',
        phone: receivePhone || user.phone
      });
      await addTransaction({
        userId: user.phone,
        type: 'withdrawal',
        amount: amountValue,
        status: 'pending',
        description: 'Withdrawal request'
      });

      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser);
      localStorage.setItem('zenith_user', JSON.stringify(updatedUser));
      
      setSuccess(`Withdrawal request submitted! You will receive funds within 30 minutes to ${receivePhone || user.phone}`);
      setAmount('');
      setReceivePhone('');
    } catch (err) {
      console.error("Withdrawal error:", err);
      const newBalance = user.balance - amountValue;
      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser);
      localStorage.setItem('zenith_user', JSON.stringify(updatedUser));
      
      let withdrawals = JSON.parse(localStorage.getItem('withdrawals') || '[]');
      withdrawals.push({
        userId: user.phone,
        amount: amountValue,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('withdrawals', JSON.stringify(withdrawals));
      
      setSuccess(`Withdrawal request successful! You'll receive funds within 30 minutes to ${receivePhone || user.phone}.`);
      setAmount('');
      setReceivePhone('');
    }

    setLoading(false);
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
              Request withdrawal to mobile money
            </motion.p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6"
            >
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
                Amount to Withdraw (UGX)
              </label>
              <input
                type="number"
                name="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Minimum: UGX 10,000</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number to Receive Funds
              </label>
              <input
                type="tel"
                name="receivePhone"
                value={receivePhone}
                onChange={(e) => setReceivePhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Phone number to receive funds</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Request Withdrawal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              You will be contacted for payment confirmation
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Withdraw;
