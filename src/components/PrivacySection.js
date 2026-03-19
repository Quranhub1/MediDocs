import React from 'react';
import BackgroundImages from './BackgroundImages';

const PrivacySection = () => {
  return (
    <section className="relative min-h-screen mb-8">
      <BackgroundImages />
      <div className="relative z-10 bg-white/50 min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Privacy Policy
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Introduction
              </h3>
              <p className="text-gray-700 mb-4">
                MediDocs Uganda ("we", "our", "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you visit our website medidocs-uganda.com, use our services, 
                or otherwise interact with us.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Information We Collect
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li><strong>Personal Information:</strong> Email address, name, phone number, 
                    and other information you voluntarily provide when registering or contacting us.</li>
                <li><strong>Usage Data:</strong> Information about how you access and use our 
                    website, including IP address, browser type, pages visited, and time spent.</li>
                <li><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar 
                    tracking technologies to track activity on our website and hold certain information.</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                How We Use Your Information
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li>To provide, maintain, and improve our services</li>
                <li>To communicate with you about updates, promotions, and educational content</li>
                <li>To process payments and manage your account</li>
                <li>To respond to your inquiries and provide customer support</li>
                <li>To analyze usage trends and improve our educational materials</li>
                <li>To comply with legal obligations and protect our rights</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Data Sharing and Disclosure
              </h3>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or otherwise transfer your personally identifiable information 
                to outside parties except in the following limited circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li>Trusted third parties who assist us in operating our website and providing services</li>
                <li>Payment processors to facilitate transactions</li>
                <li>When required by law or to protect our legal rights</li>
                <li>In connection with a business transfer, such as a merger or acquisition</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Your Rights and Choices
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li>You can access, update, or delete your personal information at any time</li>
                <li>You can opt-out of receiving promotional emails from us</li>
                <li>You can manage cookie preferences through your browser settings</li>
                <li>You have the right to request a copy of your personal data we hold</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Data Security
              </h3>
              <p className="text-gray-700 mb-4">
                We implement reasonable security measures to protect your personal information 
                from unauthorized access, alteration, disclosure, or destruction. These measures 
                include encryption, firewalls, and secure socket layers (SSL) for data transmission.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Contact Us
              </h3>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li><strong>Email:</strong> kaigwaakram123@gmail.com</li>
                <li><strong>Phone:</strong> +256 749 846 848</li>
                <li><strong>Location:</strong> Kampala, Uganda</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Changes to This Privacy Policy
              </h3>
              <p className="text-gray-700">
                We may update our Privacy Policy from time to time. We will notify you of any 
                changes by posting the new Privacy Policy on this page. You are advised to review 
                this Privacy Policy periodically for any changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;
