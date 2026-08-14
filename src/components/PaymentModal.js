import React, { useState, useEffect } from 'react';
import { submitPayment, SUBSCRIPTION_PLANS } from '../services/FirestoreService';
import { useAuth } from '../context/AuthContext';
import { serverTimestamp } from 'firebase/firestore';

const PAYMENT_RECIPIENT_NAME = 'Kabali Marina';
const PAYMENT_RECIPIENT_NUMBER = '256749846848';

const PaymentModal = ({ show, onClose, selectedPlan = null, onPaymentSuccess }) => {
  const { userProfile, currentUser } = useAuth();
  const [selectedPlanKey, setSelectedPlanKey] = useState(selectedPlan || 'monthly');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phone || '');
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

  const handleManualPayment = async () => {
    if (!phoneNumber.trim() || !email.trim()) {
      alert('Please enter your Mobile Money number and email before submitting.');
      return;
    }

    setIsSubmitting(true);
    const plan = getPlanDetails();

    const promptMessage =
      `Send UGX ${plan.amount.toLocaleString()} to ${PAYMENT_RECIPIENT_NUMBER} ` +
      `(${PAYMENT_RECIPIENT_NAME}) via Mobile Money, then submit for verification.`;

    if (!window.confirm(promptMessage)) {
      setIsSubmitting(false);
      return;
    }

    try {
      const paymentData = {
        reference: 'MEDIDOCS-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        amount: plan.amount.toString(),
        phoneNumber: phoneNumber,
        email: email,
        plan: selectedPlanKey,
        planLabel: plan.label,
        recipientName: PAYMENT_RECIPIENT_NAME,
        recipientNumber: PAYMENT_RECIPIENT_NUMBER,
        status: 'pending_verification',
        submittedAt: serverTimestamp()
      };

      const result = await submitPayment(paymentData);

      if (result.success) {
        setSubmitStatus('pending');
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        setSubmitStatus('error');
      }
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
          {submitStatus === 'pending' && (
            <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-amber-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Payment submitted for verification</p>
                  <p className="text-sm text-gray-500">Send UGX to {PAYMENT_RECIPIENT_NUMBER} ({PAYMENT_RECIPIENT_NAME}). Your access will be activated once the payment is confirmed.</p>
                </div>
              </div>
            </div>
          )}
          
          {submitStatus === 'error' && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
              <p className="font-medium">Submission failed</p>
              <p className="text-sm text-gray-500">Please try again or contact support.</p>
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
              <label htmlFor="payment-phone" className="block text-sm font-medium text-gray-700 mb-2">Your Mobile Money Number</label>
              <input
                type="tel"
                id="payment-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="2567XXXXXX"
              />
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <p className="font-medium text-emerald-800 mb-2">Payment Instructions:</p>
            <ol className="list-decimal list-inside text-sm text-emerald-700 space-y-1">
              <li>Plan: <span className="font-bold">{plan.label}</span></li>
              <li>Amount: <span className="font-bold">UGX {plan.amount.toLocaleString()}</span></li>
              <li>
                Send the amount to{' '}
                <span className="font-bold">{PAYMENT_RECIPIENT_NUMBER}</span>{' '}
                (<span className="font-bold">{PAYMENT_RECIPIENT_NAME}</span>) via Mobile Money.
              </li>
              <li>After sending, submit below. Access is activated once the payment is verified.</li>
            </ol>
          </div>
          
          <button
            onClick={handleManualPayment}
            disabled={isSubmitting}
            className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-200 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              `Send UGX ${plan.amount.toLocaleString()} to ${PAYMENT_RECIPIENT_NUMBER}`
            )}
          </button>
          
          <div className="mt-4 pt-4 border-t text-center text-sm text-gray-500">
            <p>Need help? Contact: <a href="tel:+256749846848" className="text-emerald-600 font-medium">+256 749 846 848</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
