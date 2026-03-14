import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const Disclaimer = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 mb-8">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Disclaimer</h1>
          </div>
          
          <div className="prose max-w-none text-gray-600">
            <p className="mb-4"><strong>Last Updated: 2026</strong></p>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
              <p className="text-yellow-800 font-semibold">
                IMPORTANT: Investment in any platform involves risk. Please read this disclaimer carefully.
              </p>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. No Financial Advice</h2>
            <p className="mb-4">
              The information provided on Zenith Assets is for educational and informational purposes only.
              We do not provide financial, investment, or legal advice. Any investment decisions you make
              are at your own risk.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. Risk Warning</h2>
            <p className="mb-4">
              All investments carry risk. The value of investments can go down as well as up.
              You may lose some or all of your initial investment. Past performance is not
              indicative of future results.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. No Guarantees</h2>
            <p className="mb-4">
              We do not guarantee any specific returns or profits. Any earnings or returns
              mentioned on our platform are for illustration purposes only and should not
              be considered as guarantees.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4. Referral Earnings</h2>
            <p className="mb-4">
              Referral commissions are paid based on the activity of referred users.
              We do not guarantee that you will earn any specific amount from referrals.
              Commissions depend on the deposits and activity of your referrals.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5. Third-Party Services</h2>
            <p className="mb-4">
              We use third-party payment services (Airtel Money/Yo! Payments). We are not
              responsible for any issues arising from these third-party services.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6. Accuracy of Information</h2>
            <p className="mb-4">
              While we strive to provide accurate and up-to-date information, we make no
              representations or warranties of any kind about the completeness, accuracy,
              reliability, or suitability of the information on this platform.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7. Limitation of Liability</h2>
            <p className="mb-4">
              Zenith Assets, its owners, directors, and employees shall not be liable for
              any loss or damage including without limitation indirect or consequential
              loss or damage arising out of or in connection with your use of this platform.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">8. Regulatory Compliance</h2>
            <p className="mb-4">
              Investment platforms may be subject to regulatory requirements in different
              jurisdictions. You are responsible for ensuring that your use of our platform
              complies with all applicable laws and regulations in your country.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">9. User Responsibility</h2>
            <p className="mb-4">
              Before investing, you should:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Understand the risks involved</li>
              <li>Only invest money you can afford to lose</li>
              <li>Seek independent financial advice if needed</li>
              <li>Read all terms and conditions carefully</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">10. Contact</h2>
            <p className="mb-4">
              If you have questions about this Disclaimer, please contact us at info@zenithassets.com
            </p>
            
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-8">
              <p className="text-red-800">
                By using Zenith Assets, you acknowledge that you have read, understood,
                and agree to this Disclaimer. If you do not agree, please do not use our platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
