import React, { useState } from 'react';
import { submitPayment } from '../services/FirestoreService';

const PaymentModal = ({ show, onClose }) => {
  const [amount, setAmount] = useState('50000');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !phoneNumber || !referenceNumber) return;
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      const result = await submitPayment({
        amount,
        phoneNumber,
        referenceNumber
      });
      if (result.success) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Manual Payment</h3>
              <p className="text-emerald-100">Complete your payment to access premium content</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {submitStatus === 'success' && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Payment submitted successfully!</p>
                  <p className="text-sm text-gray-500">
                    Your access will be granted within 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount */}
            <div>
              <label htmlFor="payment-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (UGX)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">UGX</span>
                <input
                  type="number"
                  id="payment-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1000"
                  className="w-full pl-16 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Standard access: 50,000 UGX
              </p>
            </div>
            
            {/* Phone Number */}
            <div>
              <label htmlFor="payment-phone" className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Money Number
              </label>
              <input
                type="tel"
                id="payment-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                pattern="[0-9]{10,12}"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="e.g., 0772345678"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepts MTN, Airtel, and Africell
              </p>
            </div>
            
            {/* Reference Number */}
            <div>
              <label htmlFor="reference-number" className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Reference
              </label>
              <input
                type="text"
                id="reference-number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter your transaction reference"
              />
            </div>
            
            {/* Payment Instructions */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="font-medium text-emerald-800 mb-2">How to Pay:</p>
              <ol className="list-decimal list-inside text-sm text-emerald-700 space-y-1">
                <li>Send 50,000 UGX to: <span className="font-bold">0772 345 678</span></li>
                <li>Save your transaction reference number</li>
                <li>Enter the reference above and submit</li>
              </ol>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-200 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                'Submit Payment'
              )}
            </button>
          </form>
          
          {/* Contact */}
          <div className="mt-6 pt-4 border-t text-center text-sm text-gray-500">
            <p>Need help? Contact: <a href="tel:+256749846848" className="text-emerald-600 font-medium">+256 749 846 848</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;