import React, { useState, useEffect } from 'react';
import LatestDocuments from './LatestDocuments';
import CourseGrid from './CourseGrid';
import AboutSection from './AboutSection';
import ContactSection from './ContactSection';
import PrivacySection from './PrivacySection';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
import { fetchCourses, fetchResources } from '../services/FirestoreService';

const MainContent = ({ view, user, onLoginClick, onRegisterClick, onPaymentClick, onContactClick, onAIChatClick, setView }) => {
  const [latestDocuments, setLatestDocuments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  useEffect(() => {
    // Only fetch data if user is logged in
    if (!user) {
      setLoading(false);
      return;
    }
    
    let mounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch courses
        const coursesResult = await fetchCourses();
        if (mounted && coursesResult.success) {
          setCourses(coursesResult.data);
        }
        
        // Fetch resources
        const resourcesResult = await fetchResources(12);
        if (mounted && resourcesResult.success) {
          setLatestDocuments(resourcesResult.data);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching data:', err);
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => { mounted = false; };
  }, [user]);

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

  // Show login prompt if not logged in
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">Please login or create an account to access our medical education resources and documents.</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={onLoginClick}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              Login
            </button>
            <button 
              onClick={onRegisterClick}
              className="px-6 py-3 bg-white text-emerald-600 border-2 border-emerald-500 rounded-xl font-medium hover:bg-emerald-50 transition-colors"
            >
              Register
            </button>
          </div>
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
