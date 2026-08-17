import React, { useState, useEffect } from 'react';
import { submitPayment, SUBSCRIPTION_PLANS } from '../services/FirestoreService';
import { useAuth } from '../context/AuthContext';
import { serverTimestamp } from 'firebase/firestore';

const PaymentModal = ({ show, onClose, selectedPlan = null, onPaymentSuccess }) => {
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  const [selectedPlanKey, setSelectedPlanKey] = useState(selectedPlan || 'monthly');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phone || '256749846848');
  const [email, setEmail] = useState(userProfile?.email || currentUser?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    if (show) {
      setSubmitStatus(null);
      setIsSubmitting(false);
      if (selectedPlan) {
        setSelectedPlanKey(selectedPlan);
      }
    }
  }, [show, selectedPlan]);

  const getPlanDetails = () => {
    return SUBSCRIPTION_PLANS[selectedPlanKey] || SUBSCRIPTION_PLANS.monthly;
  };

  const handleConfirmPayment = async () => {
    const plan = getPlanDetails();

    if (!phoneNumber || !email) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);

    const paymentData = {
      reference: 'INITIALIZED-' + Date.now(),
      amount: plan.amount.toString(),
      phoneNumber: phoneNumber,
      email: email,
      plan: selectedPlanKey,
      planLabel: plan.label,
      status: 'pending_review',
      createdAt: serverTimestamp()
    };

    try {
      await submitPayment(paymentData);
      setSubmitStatus('payment_initiated');
    } catch (error) {
      console.error('Payment submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToAdmin = async () => {
    const plan = getPlanDetails();

    const paymentData = {
      reference: 'ADMIN-REVIEW-' + Date.now(),
      amount: plan.amount.toString(),
      phoneNumber: phoneNumber,
      email: email,
      plan: selectedPlanKey,
      planLabel: plan.label,
      status: 'pending_review',
      createdAt: serverTimestamp()
    };

    setIsSubmitting(true);
    try {
      await submitPayment(paymentData);
      setSubmitStatus('sent_to_admin');
    } catch (error) {
      console.error('Error sending to admin:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  const plan = getPlanDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Choose Your Plan</h3>
              <p className="text-emerald-100">Unlock premium medical study materials</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {submitStatus === 'payment_initiated' && (
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-lg">
              <p className="font-medium">Payment initiated</p>
              <p className="text-sm text-gray-500">Your payment request has been recorded. Please complete payment to {plan.label} access.</p>
            </div>
          )}

          {submitStatus === 'sent_to_admin' && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Sent to admin</p>
                  <p className="text-sm text-gray-500">Your payment request has been sent to the admin team for review.</p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm text-gray-500">Something went wrong. Please try again.</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(SUBSCRIPTION_PLANS).map(([key, planData]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlanKey(key)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      selectedPlanKey === key
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="font-bold text-emerald-700">{planData.label}</div>
                    <div className="text-xs text-gray-500">UGX {planData.amount.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="payment-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                id="payment-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="payment-phone" className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Number</label>
              <input
                type="tel"
                id="payment-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="256749846848"
              />
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <p className="font-medium text-emerald-800 mb-2">Payment Details:</p>
            <ol className="list-decimal list-inside text-sm text-emerald-700 space-y-1">
              <li>Plan: <span className="font-bold">{plan.label}</span></li>
              <li>Amount: <span className="font-bold">UGX {plan.amount.toLocaleString()}</span></li>
              <li>Pay to: <span className="font-bold">KABALI MADINA (+256 749 846 848)</span></li>
              <li>Payment will be recorded and sent to admin for review</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirmPayment}
              disabled={isSubmitting}
              className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-200 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Processing...' : `Pay UGX ${plan.amount.toLocaleString()}`}
            </button>
            <button
              onClick={handleSendToAdmin}
              disabled={isSubmitting}
              className={`flex-1 py-3 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold rounded-xl transition-all duration-200 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Send to Admin'}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t text-center text-sm text-gray-500">
            <p>Need help? Contact: <a href="tel:+256749846848" className="text-emerald-600 font-medium">+256 749 846 848</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;