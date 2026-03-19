import React, { useState, useEffect } from 'react';
import LatestDocuments from './LatestDocuments';
import CourseGrid from './CourseGrid';
import AboutSection from './AboutSection';
import ContactSection from './ContactSection';
import PrivacySection from './PrivacySection';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
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
      const result = await fetchAllDocuments(10, true); // forceRefresh to bypass cache
      if (result.success) {
        setLatestDocuments(result.data);
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
      return <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />;
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
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all border border-gray-100"
                  >
                    <h3 className="text-lg font-bold text-gray-800">{semester.name || semester.id}</h3>
                    <p className="text-gray-500 text-sm mt-2">Click to view course units</p>
                  </div>
                ))}
                {semesters.length === 0 && (
                  <p className="text-gray-500">No semesters found for this course.</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    case 'courseunits':
      return (
        <div className="min-h-screen bg-gray-50 py-8">
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
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all border border-gray-100"
                  >
                    <h3 className="text-lg font-bold text-gray-800">{unit.name || unit.id}</h3>
                    <p className="text-gray-500 text-sm mt-2">Click to view documents</p>
                  </div>
                ))}
                {courseUnits.length === 0 && (
                  <p className="text-gray-500">No course units found for this semester.</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    case 'about':
                      <div className="mb-4">
                        <img 
                          src={doc.thumbnail} 
                          alt={doc.title || 'Document thumbnail'}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-800">
                      {doc.title || doc.id}
                    </h3>
                    
                    {/* Description */}
                    {doc.description && (
                      <p className="text-gray-600 mt-2">{doc.description}</p>
                    )}
                    
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                      {/* Status */}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doc.status === 'premium' ? 'Premium' : 'Free'}
                      </span>
                      
                      {/* Latest/Old indicator - using time field */}
                      {doc.time && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          doc.time === 'latest' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {doc.time === 'latest' ? 'Latest' : 'Old'}
                        </span>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => handleDownload(doc)}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Download
                      </button>
                      <button 
                        onClick={() => handleReadOnline(doc)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                        Read Online
                      </button>
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
