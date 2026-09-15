import React, { useState, useEffect } from 'react';
import { submitPayment, SUBSCRIPTION_PLANS } from '../services/FirestoreService';
import { useAuth } from '../context/AuthContext';
import { serverTimestamp } from 'firebase/firestore';

const PaymentModal = ({ show, onClose, selectedPlan = null, onPaymentSuccess }) => {
  const { userProfile, currentUser } = useAuth();
  const [selectedPlanKey, setSelectedPlanKey] = useState(selectedPlan || 'monthly');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    if (show) {
      setSubmitStatus(null);
      setIsSubmitting(false);
      setTransactionId('');
      setSelectedPlanKey(selectedPlan || 'monthly');
      setPhoneNumber(userProfile?.phone || '');
      setEmail(userProfile?.email || currentUser?.email || '');
    }
  }, [show, selectedPlan, userProfile?.phone, userProfile?.email, currentUser?.email]);

  const getPlanDetails = () => SUBSCRIPTION_PLANS[selectedPlanKey] || SUBSCRIPTION_PLANS.monthly;

  const handleSubmit = async () => {
    const plan = getPlanDetails();
    if (!currentUser?.uid || !phoneNumber.trim() || !email.trim() || !transactionId.trim()) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    const paymentData = {
      userId: currentUser.uid,
      reference: transactionId.trim(),
      amount: plan.amount,
      phoneNumber: phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      plan: selectedPlanKey,
      planLabel: plan.label,
      status: 'pending_review',
      createdAt: serverTimestamp()
    };

    try {
      await submitPayment(paymentData);
      setSubmitStatus('submitted');
      onPaymentSuccess?.();
    } catch (error) {
      console.error('Payment submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;
  const plan = getPlanDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
          <div className="flex items-center justify-between">
            <div><h3 id="payment-modal-title" className="text-2xl font-bold text-white">Choose Your Plan</h3><p className="text-emerald-100">Renew your MediDocs membership</p></div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close payment dialog">✕</button>
          </div>
        </div>

        <div className="p-6">
          {submitStatus === 'submitted' && (
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 mb-6 rounded-lg">
              <p className="font-bold">Payment submitted</p>
              <p className="text-sm mt-1">Reference recorded. Your subscription will be activated after admin verification.</p>
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-6 rounded-lg">
              <p className="font-bold">Please complete all fields</p>
              <p className="text-sm mt-1">Enter your email, mobile money number and transaction ID.</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Select Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(SUBSCRIPTION_PLANS).map(([key, planData]) => (
                  <button key={key} type="button" onClick={() => setSelectedPlanKey(key)} className={`p-3 rounded-xl border-2 text-center transition-all ${selectedPlanKey === key ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-dark-border hover:border-emerald-300'}`} aria-pressed={selectedPlanKey === key}>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300">{planData.label}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-muted">UGX {planData.amount.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="payment-email" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Email</label>
              <input type="email" id="payment-email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="w-full px-4 py-3 border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="your@email.com" />
            </div>
            <div>
              <label htmlFor="payment-phone" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Mobile Money Number</label>
              <input type="tel" id="payment-phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} autoComplete="tel" className="w-full px-4 py-3 border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="2567XXXXXXXX" />
            </div>
            <div>
              <label htmlFor="transaction-id" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Transaction ID</label>
              <input type="text" id="transaction-id" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} autoComplete="off" className="w-full px-4 py-3 border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-gray-800 text-gray-900 dark:text-dark-text rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter transaction ID" />
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 mb-6">
            <p className="font-medium text-emerald-800 dark:text-emerald-200 mb-2">Payment Details</p>
            <ol className="list-decimal list-inside text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
              <li>Plan: <span className="font-bold">{plan.label}</span></li>
              <li>Amount: <span className="font-bold">UGX {plan.amount.toLocaleString()}</span></li>
              <li>Pay to: <span className="font-bold">KABALI MADINA (+256 749 846 848)</span></li>
              <li>Enter the transaction ID after payment</li>
              <li>Admin verifies the payment before activation</li>
            </ol>
          </div>

          <button type="button" onClick={handleSubmit} disabled={isSubmitting || submitStatus === 'submitted'} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {isSubmitting ? 'Submitting…' : submitStatus === 'submitted' ? 'Payment Submitted' : `Submit Payment · UGX ${plan.amount.toLocaleString()}`}
          </button>
          <div className="mt-4 pt-4 border-t dark:border-dark-border text-center text-sm text-gray-500 dark:text-dark-muted">Need help? <a href="tel:+256749846848" className="text-emerald-600 dark:text-emerald-400 font-medium">+256 749 846 848</a></div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
