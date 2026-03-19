import React, { useState, useEffect } from 'react';
import LatestDocuments from './LatestDocuments';
import CourseGrid from './CourseGrid';
import AboutSection from './AboutSection';
import ContactSection from './ContactSection';
import PrivacySection from './PrivacySection';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
import BackgroundImages from './BackgroundImages';
import DocumentCarousel from './DocumentCarousel';
import { fetchCourses, fetchSemesters, fetchCourseUnits, fetchDocuments, fetchAllDocuments } from '../services/FirestoreService';

const MainContent = ({ view, user, onLoginClick, onRegisterClick, onPaymentClick, onContactClick, onAIChatClick, setView }) => {
  const [courses, setCourses] = useState([]);
  const [latestDocuments, setLatestDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [courseUnits, setCourseUnits] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Fetch initial data when app loads
  useEffect(() => {
    // Load latest documents regardless of login status
    loadLatestDocuments();
    
    // Load courses only when user logs in
    if (user) {
      loadCourses();
    }
  }, [user]);

  const loadLatestDocuments = async () => {
    try {
      setLoading(true);
      // Use caching (false) for faster initial load
      const result = await fetchAllDocuments(10, false);
      console.log('Fetch result:', result);
      console.log('Documents loaded:', result.data?.length || 0);
      if (result.success) {
        setLatestDocuments(result.data || []);
      }
    } catch (err) {
      console.error('Error loading latest documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      const result = await fetchCourses();
      if (result.success) {
        setCourses(result.data);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = async (course) => {
    setSelectedCourse(course);
    setSelectedSemester(null);
    setSelectedUnit(null);
    setSemesters([]);
    setCourseUnits([]);
    setDocuments([]);
    setSubLoading(true);
    setView('semesters');
    
    const result = await fetchSemesters(course.id);
    if (result.success) {
      setSemesters(result.data);
    }
    setSubLoading(false);
  };

  const handleSemesterClick = async (semester) => {
    setSelectedSemester(semester);
    setSelectedUnit(null);
    setCourseUnits([]);
    setDocuments([]);
    setSubLoading(true);
    setView('courseunits');
    
    const result = await fetchCourseUnits(selectedCourse.id, semester.id);
    if (result.success) {
      setCourseUnits(result.data);
    }
    setSubLoading(false);
  };

  const handleUnitClick = async (unit) => {
    setSelectedUnit(unit);
    setDocuments([]);
    setSubLoading(true);
    setView('documents');
    
    const result = await fetchDocuments(selectedCourse.id, selectedSemester.id, unit.id);
    if (result.success) {
      setDocuments(result.data);
    }
    setSubLoading(false);
  };

  const handleDownload = (doc) => {
    // Use filePath for read online URL - open in same tab
    const url = doc.filePath;
    if (url) {
      window.location.href = url;
    } else {
      alert('No link available for this document');
    }
  };

  const handleReadOnline = (doc) => {
    // Use filePath for read online URL - open in same tab
    const url = doc.filePath;
    if (url) {
      window.location.href = url;
    } else {
      alert('No read online link available for this document');
    }
  };

  const goBack = () => {
    if (view === 'documents' && selectedSemester) {
      setSelectedUnit(null);
      setDocuments([]);
      setView('courseunits');
    } else if (view === 'courseunits' && selectedCourse) {
      setSelectedSemester(null);
      setCourseUnits([]);
      setView('semesters');
    } else if (view === 'semesters') {
      setSelectedCourse(null);
      setSemesters([]);
      setView('courses');
    }
  };

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

  // Show carousel even for non-logged in users
  if (view === 'home' && latestDocuments.length > 0) {
    return (
      <div>
        <HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
        <DocumentCarousel documents={latestDocuments} />
        {!user && (
          <div className="max-w-2xl mx-auto px-4 py-8 text-center">
            <p className="text-gray-600 mb-4">Login to access all documents</p>
            <button 
              onClick={onLoginClick}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              Login
            </button>
          </div>
        )}
        {user && (
          <>
            <StatsSection />
            <div className="space-y-0">
              <LatestDocuments 
                documents={latestDocuments} 
                user={user}
                onViewChange={setView}
                onPaymentClick={onPaymentClick}
              />
              <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
            </div>
          </>
        )}
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
              user={user}
              onViewChange={setView}
              onDocumentClick={(doc) => console.log('Document clicked:', doc)}
              onDownloadClick={(doc) => console.log('Download clicked:', doc)}
            />
            <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
          </div>
        </div>
      );
    case 'courses':
      return (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 min-h-screen py-8">
            <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
          </div>
        </div>
      );
    case 'semesters':
      return (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 min-h-screen py-8">
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
              {subLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {semesters.map((semester) => (
                    <div 
                      key={semester.id}
                      onClick={() => handleSemesterClick(semester)}
                      className="bg-gradient-to-br from-emerald-400 to-teal-500 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 border border-emerald-300"
                    >
                      <h3 className="text-lg font-bold text-white">{semester.name || semester.id}</h3>
                      <p className="text-emerald-100 text-sm mt-2">Click to view course units</p>
                    </div>
                  ))}
                  {semesters.length === 0 && (
                    <p className="text-gray-500">No semesters found for this course.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    case 'courseunits':
      return (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 min-h-screen py-8">
            <DocumentCarousel documents={documents} />
            <div className="max-w-7xl mx-auto px-4">
              <button 
                onClick={goBack}
                className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Semesters
              </button>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                {selectedSemester?.name || 'Select a Semester'}
              </h2>
              {subLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courseUnits.map((unit) => (
                    <div 
                      key={unit.id}
                      onClick={() => handleUnitClick(unit)}
                      className="bg-gradient-to-br from-emerald-400 to-teal-500 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 border border-emerald-300"
                    >
                      <h3 className="text-lg font-bold text-white">{unit.name || unit.id}</h3>
                      <p className="text-emerald-100 text-sm mt-2">Click to view documents</p>
                    </div>
                  ))}
                  {courseUnits.length === 0 && (
                    <p className="text-gray-500">No course units found for this semester.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    case 'documents':
      return (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 min-h-screen py-8">
            <div className="max-w-7xl mx-auto px-4">
              <button 
                onClick={goBack}
                className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Course Units
              </button>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                {selectedUnit?.name || 'Documents'}
              </h2>
              {subLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all border border-emerald-400"
                    >
                      <h3 className="text-lg font-bold text-white mb-2">{doc.title || doc.id}</h3>
                      <p className="text-emerald-100 text-sm mb-4">{doc.description || 'No description'}</p>
                      <div className="flex flex-wrap gap-2">
                        {doc.filePath && (
                          <button
                            onClick={() => handleReadOnline(doc)}
                            className="px-4 py-2 bg-white text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-50"
                          >
                            Read Online
                          </button>
                        )}
                        {doc.filePath && (
                          <button
                            onClick={() => handleDownload(doc)}
                            className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-sm font-medium hover:bg-emerald-900"
                          >
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-gray-500">No documents found for this course unit.</p>
                  )}
                </div>
              )}
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
              user={user}
              onViewChange={setView}
              onDocumentClick={(doc) => console.log('Document clicked:', doc)}
              onDownloadClick={(doc) => console.log('Download clicked:', doc)}
            />
            <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
          </div>
        </div>
      );
  }
};

export default MainContent;
