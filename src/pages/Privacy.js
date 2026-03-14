import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 mb-8">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
          
          <div className="prose max-w-none text-gray-600">
            <p className="mb-4"><strong>Last Updated: 2026</strong></p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. Information We Collect</h2>
            <p className="mb-4">
              We collect personal information that you provide to us, including:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Phone number (for account verification and transactions)</li>
              <li>Email address (for account communications)</li>
              <li>Transaction history</li>
              <li>Referral information</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. How We Use Your Information</h2>
            <p className="mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Process your deposits and withdrawals</li>
              <li>Provide customer support</li>
              <li>Send you important updates about your account</li>
              <li>Track referrals and commissions</li>
              <li>Comply with legal obligations</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. Information Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or otherwise transfer your personal information to outside parties.
              We may share information with:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Payment processors (Airtel/YO! Payments)</li>
              <li>Service providers who assist in our operations</li>
              <li>Legal authorities when required by law</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4. Data Security</h2>
            <p className="mb-4">
              We implement appropriate security measures to protect your personal information.
              However, no method of transmission over the internet is 100% secure.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5. Cookies</h2>
            <p className="mb-4">
              We use cookies to enhance your experience. You can choose to disable cookies
              through your browser settings, but this may affect site functionality.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6. Third-Party Links</h2>
            <p className="mb-4">
              Our website may contain links to third-party sites. We have no control over
              the content or practices of these sites.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7. Your Rights</h2>
            <p className="mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">8. Children's Privacy</h2>
            <p className="mb-4">
              Our service is not intended for children under 18. We do not knowingly
              collect information from children.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">9. Changes to Privacy Policy</h2>
            <p className="mb-4">
              We may update this privacy policy periodically. We will notify you of
              any material changes.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">10. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy, please contact us at info@zenithassets.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
