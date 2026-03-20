import React from 'react';
import BackgroundImages from './BackgroundImages';

const HeroSection = ({ user, onLoginClick, onRegisterClick }) => {

  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 py-16 md:py-24 overflow-hidden">
      <BackgroundImages />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110 4 2 2 0 010-4zM3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"></path>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            MediDocs Uganda
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
            Your trusted medical education platform for Ugandan students. Access comprehensive study materials for Certificate and Diploma programs, Nursing, and Clinical Medicine programs.
          </p>

          {/* CTA Buttons */}
          {!user ? (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={onRegisterClick}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.1 0-2 .9-2 2s1 2 2 2 2-.9 2-2-1-2-2-2zm0 12c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2z"></path>
                </svg>
                <span>Start Learning</span>
              </button>
              <button
                onClick={onLoginClick}
                className="px-8 py-4 bg-white border-2 border-emerald-500 text-emerald-600 font-semibold rounded-full hover:bg-emerald-50 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110 4 2 2 0 010-4zM3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"></path>
                </svg>
                <span>Login</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">{user.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-gray-300">{user.email}</p>
                </div>
              </div>

            </div>
          )}

          {/* Stats row */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-sm text-gray-300">Documents</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-3xl font-bold text-white">4+</p>
              <p className="text-sm text-gray-300">Courses</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-3xl font-bold text-white">10K+</p>
              <p className="text-sm text-gray-300">Students</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-3xl font-bold text-white">24/7</p>
              <p className="text-sm text-gray-300">AI Support</p>
            </div>
          </div>

          {/* Trust message */}
          <p className="mt-8 text-sm text-gray-300">
            Join thousands of Ugandan medical students achieving their dreams
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
