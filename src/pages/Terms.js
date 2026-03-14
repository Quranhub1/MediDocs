import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 mb-8">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
          
          <div className="prose max-w-none text-gray-600">
            <p className="mb-4"><strong>Last Updated: 2026</strong></p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using Zenith Assets, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. Description of Service</h2>
            <p className="mb-4">
              Zenith Assets is an investment platform that allows users to earn money by watching videos and referring others. 
              Users can deposit funds, invest in packages, and withdraw their earnings.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. User Accounts</h2>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account credentials. 
              You agree to accept responsibility for all activities that occur under your account.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4. Investment and Earnings</h2>
            <p className="mb-4">
              All investments are subject to risk. Past performance does not guarantee future results.
              Earnings from referrals are paid at a rate of 20% of your referrer's deposits.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5. Deposits and Withdrawals</h2>
            <p className="mb-4">
              All deposits are processed through Airtel Money (Yo! Payments). 
              Withdrawals are processed within 24-48 hours. A minimum withdrawal amount may apply.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6. Prohibited Activities</h2>
            <p className="mb-4">
              You agree not to engage in any illegal activities or any activities that could harm the platform.
              Multiple accounts per person are prohibited.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7. Limitation of Liability</h2>
            <p className="mb-4">
              Zenith Assets shall not be liable for any indirect, incidental, or consequential damages
              arising from the use of our platform.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">8. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these terms at any time. Continued use of the platform
              constitutes acceptance of any changes.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">9. Contact Information</h2>
            <p className="mb-4">
              For questions about these Terms of Service, please contact us at info@zenithassets.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
