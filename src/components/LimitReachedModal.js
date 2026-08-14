import React from 'react';
import { SUBSCRIPTION_PLANS } from '../services/FirestoreService';

const PAYMENT_RECIPIENT = 'KABALI MADINA';
const PAYMENT_PHONE = '+256 749 846 848';

const LimitReachedModal = ({ show, onClose, onChoosePlan, viewedCount }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white">Free Limit Reached</h3>
          <p className="text-emerald-100 mt-1">
            You've viewed {viewedCount} free document{viewedCount === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="p-6">
          <p className="text-gray-600 text-center mb-5">
            Subscribe to unlock all documents, including premium study materials.
          </p>

          <div className="space-y-3 mb-6">
            {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
              <button
                key={key}
                onClick={() => onChoosePlan(key)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
              >
                <div>
                  <div className="font-bold text-gray-800">{plan.label} Access</div>
                  <div className="text-xs text-gray-500">Full document library</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700">UGX {plan.amount.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{plan.duration} days</div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 text-sm text-emerald-800">
            <p className="font-medium mb-1">Payment via Mobile Money</p>
            <p>Pay to <span className="font-bold">{PAYMENT_RECIPIENT}</span> ({PAYMENT_PHONE})</p>
            <p>You'll complete payment securely through Paystack.</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default LimitReachedModal;
