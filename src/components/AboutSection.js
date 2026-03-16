import React from 'react';

const AboutSection = () => {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        About Studypedia Uganda
      </h2>
      <div className="space-y-6">
        <div className="text-gray-700">
          <p className="mb-4">
            Studypedia Uganda is a premier online medical education platform dedicated to providing 
            comprehensive study resources for students pursuing Certificate in Laboratory Technology 
            (CLT) and Diploma programs across Uganda.
          </p>
          <p className="mb-4">
            Our mission is to democratize access to quality medical education by offering free and 
            affordable learning materials, past papers, revision notes, and AI-powered study assistance 
            to help students excel in their academic pursuits.
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            What We Offer
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Comprehensive CLT and Diploma study materials</li>
            <li>Past papers and marking guides</li>
            <li>Topic-specific revision notes</li>
            <li>AI-powered search and question answering</li>
            <li>Secure payment processing for premium content</li>
            <li>Mobile-responsive learning platform</li>
          </ul>
        </div>
        
        <div className="text-center">
          <p className="text-gray-600">
            Join thousands of Ugandan medical students who trust Studypedia Uganda 
            for their academic success.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;