import React, { useState, useEffect } from 'react';
import LatestDocuments from './LatestDocuments';
import CourseGrid from './CourseGrid';
import AboutSection from './AboutSection';
import ContactSection from './ContactSection';
import PrivacySection from './PrivacySection';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';

// Default courses - show immediately without Firebase
const DEFAULT_COURSES = [
  { id: 'clt1', name: 'Certificate in Clinical Medicine', stats: '4 Semesters', icon: 'stethoscope' },
  { id: 'clt2', name: 'Certificate in Laboratory Technology', stats: '4 Semesters', icon: 'flask' },
  { id: 'dip1', name: 'Diploma in Nursing', stats: '6 Semesters', icon: 'heart-pulse' },
  { id: 'dip2', name: 'Diploma in Pharmacy', stats: '6 Semesters', icon: 'microscope' },
  { id: 'dip3', name: 'Diploma in Medical Records', stats: '4 Semesters', icon: 'stethoscope' },
  { id: 'dip4', name: 'Diploma in Public Health', stats: '4 Semesters', icon: 'heart-pulse' },
  { id: 'cert1', name: 'Certificate in HIV/AIDS Care', stats: '2 Semesters', icon: 'flask' },
  { id: 'cert2', name: 'Certificate in Community Health', stats: '2 Semesters', icon: 'microscope' }
];

const MainContent = ({ view, user, onLoginClick, onRegisterClick, onPaymentClick, onContactClick, onAIChatClick, setView }) => {
  const [latestDocuments] = useState([]);
  const [courses] = useState(DEFAULT_COURSES);
  const [loading] = useState(false); // Never show loading - always show default
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Show courses immediately - no Firebase loading

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4 mx-auto"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  switch (view) {
    case 'home':
      return (
        <div className="space-y-0">
          <HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
          <StatsSection />
          <div className="space-y-0">
            <LatestDocuments 
              documents={latestDocuments} 
              onDocumentClick={(doc) => console.log('Document clicked:', doc)}
              onDownloadClick={(doc) => console.log('Download clicked:', doc)}
            />
            <CourseGrid courses={courses} onBrowseClick={(course) => { setSelectedCourse(course); setView && setView('semesters'); }} />
          </div>
        </div>
      );
    case 'courses':
      return (
        <div className="space-y-0">
          <CourseGrid courses={courses} onBrowseClick={(course) => { setSelectedCourse(course); setView && setView('semesters'); }} />
        </div>
      );
    case 'semesters':
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4">
            <button 
              onClick={() => { setSelectedCourse(null); setView && setView('courses'); }}
              className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back to Courses
            </button>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              {selectedCourse?.name || 'Select a Course'}
            </h2>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600">Semesters for: {selectedCourse?.id}</p>
              <p className="text-sm text-gray-400 mt-2">Fetching from: RESOURCES_STUDYPEDIA/{selectedCourse?.id || 'courseId'}/semesters</p>
            </div>
          </div>
        </div>
      );
    case 'about':
      return <AboutSection />;
    case 'contact':
      return <ContactSection onContactClick={onContactClick} />;
    case 'privacy':
      return <PrivacySection />;
    default:
      return (
        <div className="space-y-0">
          <HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
          <StatsSection />
          <div className="space-y-0">
            <LatestDocuments 
              documents={latestDocuments} 
              onDocumentClick={(doc) => console.log('Document clicked:', doc)}
              onDownloadClick={(doc) => console.log('Download clicked:', doc)}
            />
            <CourseGrid courses={courses} onBrowseClick={(course) => { setSelectedCourse(course); setView && setView('semesters'); }} />
          </div>
        </div>
      );
  }
};

export default MainContent;
