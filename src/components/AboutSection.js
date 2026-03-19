import React from 'react';
import BackgroundImages from './BackgroundImages';

const AboutSection = () => {
  return (
    <section className="relative min-h-screen mb-8">
      <BackgroundImages />
      <div className="relative z-10 bg-white/90 backdrop-blur-sm min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
        About MediDocs Uganda
      </h2>
      <div className="space-y-6">
        <div className="text-gray-700">
          <p className="mb-4">
            MediDocs Uganda is a premier online medical education platform dedicated to providing 
            comprehensive study resources for students pursuing Certificate and Diploma programs across Uganda.
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
            <li>Comprehensive Certificate and Diploma study materials</li>
            <li>Past papers and marking guides</li>
            <li>Topic-specific revision notes</li>
            <li>AI-powered search and question answering</li>
            <li>Secure payment processing for premium content</li>
            <li>Mobile-responsive learning platform</li>
          </ul>
        </div>
        
        <div className="text-center">
          <p className="text-gray-600">
            Join thousands of Ugandan medical students who trust MediDocs Uganda 
            for their academic success.
          </p>
        </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;