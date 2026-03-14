import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function Deposit() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('zenith_user') || 'null');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login first');
      navigate('/login');
      return;
    }

    if (!amount || amount < 1000) {
      alert('Minimum deposit is UGX 1,000');
      return;
    }

    setShowInstructions(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12">
      <div className="max-w-md mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Deposit Funds</h1>
            <p className="text-gray-600 mt-2">Manual deposit via Airtel Money</p>
          </div>

          {!showInstructions ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone || user?.phone || ''}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0749846848"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Your registered phone number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (UGX)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: UGX 10,000</p>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold text-lg transition"
              >
                Get Deposit Instructions
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">📱 Deposit Instructions</h3>
                
                <div className="space-y-3 text-green-800">
                  <p><strong>Step 1:</strong> Send <strong>UGX {parseInt(amount || 0).toLocaleString()}</strong></p>
                  <p><strong>Step 2:</strong> To number: <strong>0749846848</strong></p>
                  <p><strong>Step 3:</strong> Network: <strong>Airtel Money</strong></p>
                  <hr className="border-green-300 my-2" />
                  <p className="text-sm"><strong>Step 4:</strong> After sending, contact admin take a screenshot of your deposit  to confirm your deposit.</p>
                  <p className="text-sm"><strong>Step 5:</strong> Your balance will be credited within 24 hours.</p>
                  <p className="text-sm"><strong>Step 5:</strong> Minimum deposit is 10,000ugx.</p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm("Open phone dialer to send money?")) {
                    window.location.href = "tel:*185*8*6*1*74846848*1#";
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold text-lg transition"
              >
                📞 Open Phone Dialer
              </button>

              <button
                onClick={() => setShowInstructions(false)}
                className="w-full text-gray-600 hover:text-gray-800 py-2"
              >
                ← Change Amount
              </button>
            </div>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-4 text-gray-600 hover:text-gray-800 py-2"
          >
            ← Back to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default Deposit;
