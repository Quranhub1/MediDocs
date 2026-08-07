import React, { useState, useEffect } from 'react';
import { submitPayment, verifyPayment, SUBSCRIPTION_PLANS } from '../services/FirestoreService';
import { useAuth } from '../context/AuthContext';
import { serverTimestamp } from 'firebase/firestore';

const PaymentModal = ({ show, onClose, selectedPlan = null, onPaymentSuccess }) => {
  const { userProfile, currentUser, updateUserSubscription } = useAuth();
  const [selectedPlanKey, setSelectedPlanKey] = useState(selectedPlan || 'monthly');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phone || '256749846848');
  const [email, setEmail] = useState(userProfile?.email || currentUser?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [paystackLoaded, setPaystackLoaded] = useState(false);

  useEffect(() => {
    if (show) {
      setSubmitStatus(null);
      setIsSubmitting(false);
      if (selectedPlan) {
        setSelectedPlanKey(selectedPlan);
      }
    }
  }, [show, selectedPlan]);

  useEffect(() => {
    if (show && !paystackLoaded) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => setPaystackLoaded(true);
      document.body.appendChild(script);
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [show, paystackLoaded]);

  const getPlanDetails = () => {
    return SUBSCRIPTION_PLANS[selectedPlanKey] || SUBSCRIPTION_PLANS.monthly;
  };

  const handlePaystackPayment = async () => {
    if (!paystackLoaded || !window.PaystackPop) {
      alert('Payment system is loading. Please try again in a moment.');
      return;
    }

    setIsSubmitting(true);
    const plan = getPlanDetails();
    const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;
    
    if (!publicKey || publicKey.includes('your_paystack')) {
      alert('Paystack is not configured. Please contact support.');
      setIsSubmitting(false);
      return;
    }

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: email,
      amount: plan.amount * 100,
      currency: 'UGX',
      ref: 'MEDIDOCS-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      phone: phoneNumber,
      label: 'KABALI MADINA',
      metadata: {
        custom_fields: [
          {
            display_name: 'Plan',
            variable_name: 'plan',
            value: plan.label
          },
          {
            display_name: 'Phone',
            variable_name: 'phone',
            value: phoneNumber
          }
        ]
      },
      onClose: () => {
        setIsSubmitting(false);
      },
      callback: async (response) => {
        const reference = response.reference;
        setIsSubmitting(true);
        
        try {
          const verifyResult = await verifyPayment(reference);
          
          if (verifyResult.success) {
            const paymentData = {
              reference: reference,
              amount: plan.amount.toString(),
              phoneNumber: phoneNumber,
              email: email,
              plan: selectedPlanKey,
              planLabel: plan.label,
              status: 'success',
              paidAt: serverTimestamp()
            };
            
            await submitPayment(paymentData);
            
            if (currentUser) {
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + plan.duration);
              
              await updateUserSubscription(currentUser.uid, {
                subscriptionApproved: true,
                subscriptionStatus: 'active',
                subscriptionPlan: selectedPlanKey,
                subscriptionExpiry: expiryDate
              });
            }
            
            setSubmitStatus('success');
            if (onPaymentSuccess) {
              onPaymentSuccess();
            }
          } else {
            setSubmitStatus('error');
          }
        } catch (error) {
          console.error('Payment processing error:', error);
          setSubmitStatus('error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });

    handler.openIframe();
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
          {submitStatus === 'success' && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-lg">
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">Payment successful!</p>
                  <p className="text-sm text-gray-500">Your premium access has been activated.</p>
                </div>
              </div>
            </div>
          )}
          
          {submitStatus === 'error' && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
              <p className="font-medium">Payment failed</p>
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
              <li>You will be redirected to Paystack to complete payment securely</li>
            </ol>
          </div>
          
          <button
            onClick={handlePaystackPayment}
            disabled={isSubmitting || !paystackLoaded}
            className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-200 ${
              isSubmitting || !paystackLoaded ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                <span>Processing...</span>
              </div>
            ) : !paystackLoaded ? (
              'Loading Payment...'
            ) : (
              `Pay UGX ${plan.amount.toLocaleString()}`
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
