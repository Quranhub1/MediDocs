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
import DocumentReader from './DocumentReader';
import FlashcardStudy from './FlashcardStudy';
import QuizMode from './QuizMode';
import CollaborativeNotes from './CollaborativeNotes';
import AnalyticsDashboard from './AnalyticsDashboard';
import AdvancedSearch from './AdvancedSearch';
import { useStudy } from '../context/StudyContext';
import { useToast } from '../context/ToastContext';
import { fetchCourses, fetchSemesters, fetchCourseUnits, fetchDocuments, fetchAllDocuments } from '../services/FirestoreService';

const MainContent = ({ view, user, userProfile, onLoginClick, onRegisterClick, onContactClick, onAIChatClick, setView }) => {
  const { recordStudySession } = useStudy();
  const { addToast } = useToast();
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
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showReader, setShowReader] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await fetchAllDocuments(50, false);
        if (result.success) {
          setLatestDocuments(result.data || []);
        }
        if (user) {
          const coursesResult = await fetchCourses(false);
          if (coursesResult.success) {
            setCourses(coursesResult.data);
          } else if (coursesResult.error) {
            setLoadError(coursesResult.error);
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        setLoadError(error.message);
      }
      setLoading(false);
    };
    initData();
  }, [user]);

  useEffect(() => {
    if (view !== 'home' && user) {
      recordStudySession(5);
    }
  }, [view, user, recordStudySession]);

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

  const handleReadOnline = (doc) => {
    setSelectedDocument(doc);
    setShowReader(true);
  };

  const handleDownload = async (doc) => {
    if (!doc.filePath) {
      addToast('No download link available for this document', 'error');
      return;
    }
    try {
      const response = await fetch(doc.filePath);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title || 'document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast('Download started!', 'success');
    } catch (error) {
      window.open(doc.filePath, '_blank');
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

  if (loadError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Issue</h2>
          <p className="text-gray-600 mb-6">
            We couldn't load your content. This might be due to a temporary network issue.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <div>
        <HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
        <DocumentCarousel documents={latestDocuments} user={user} userProfile={userProfile} />
        {!user && (
          <div className="max-w-2xl mx-auto px-4 py-8 text-center">
            <p className="text-gray-600 mb-4">Login to access all documents</p>
            <button onClick={onLoginClick} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
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
                userProfile={userProfile}
                onViewChange={setView}
                onDocumentClick={(doc) => console.log('Document clicked:', doc)}
                onDownloadClick={(doc) => console.log('Download clicked:', doc)}
              />
              <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
            </div>
          </>
        )}
      </div>
    );
  }

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
            <button onClick={onLoginClick} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">Login</button>
            <button onClick={onRegisterClick} className="px-6 py-3 bg-white text-emerald-600 border-2 border-emerald-500 rounded-xl font-medium hover:bg-emerald-50 transition-colors">Register</button>
          </div>
        </div>
      </div>
    );
  }

  let content;
  switch (view) {
    case 'home':
      content = (
        <>
          <HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
          <StatsSection />
          <div className="flex justify-center gap-4 py-4">
            <button onClick={() => setShowFlashcards(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Flashcards</button>
            <button onClick={() => setShowQuiz(true)} className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700">Quiz</button>
            <button onClick={() => setShowNotes(true)} className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700">Notes</button>
            <button onClick={() => setShowAnalytics(true)} className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700">Analytics</button>
            <button onClick={() => setShowAdvancedSearch(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Search</button>
          </div>
          <div className="space-y-0">
            <LatestDocuments 
              documents={latestDocuments} 
              user={user}
              userProfile={userProfile}
              onViewChange={setView}
              onDocumentClick={(doc) => console.log('Document clicked:', doc)}
              onDownloadClick={(doc) => console.log('Download clicked:', doc)}
            />
            <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
          </div>
          {showFlashcards && <FlashcardStudy courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowFlashcards(false)} />}
          {showQuiz && <QuizMode courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowQuiz(false)} />}
          {showNotes && <CollaborativeNotes courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowNotes(false)} />}
          {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
          {showAdvancedSearch && <AdvancedSearch onClose={() => setShowAdvancedSearch(false)} onViewChange={setView} />}
        </>
      );
      break;
    case 'courses':
      content = (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
          </div>
        </div>
      );
      break;
    case 'semesters':
      content = (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
              <button onClick={() => { setSelectedCourse(null); setView && setView('courses'); }} className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Courses
              </button>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-6">{selectedCourse?.name || 'Select a Course'}</h2>
              {subLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {semesters.map((semester) => (
                    <div key={semester.id} onClick={() => handleSemesterClick(semester)} className="bg-gradient-to-br from-emerald-400 to-teal-500 p-8 md:p-10 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 border border-emerald-300">
                      <h3 className="text-2xl font-bold text-white">{semester.name || semester.id}</h3>
                      <p className="text-emerald-100 text-base mt-2">Click to view course units</p>
                    </div>
                  ))}
                  {semesters.length === 0 && <p className="text-gray-500">No semesters found for this course.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      );
      break;
    case 'courseunits':
      content = (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <DocumentCarousel documents={documents} user={user} userProfile={userProfile} />
            <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
              <button onClick={goBack} className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Semesters
              </button>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-6">{selectedSemester?.name || 'Select a Semester'}</h2>
              {subLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {courseUnits.map((unit) => (
                    <div key={unit.id} onClick={() => handleUnitClick(unit)} className="bg-gradient-to-br from-emerald-400 to-teal-500 p-8 md:p-10 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 border border-emerald-300">
                      <h3 className="text-2xl font-bold text-white">{unit.name || unit.id}</h3>
                      <p className="text-emerald-100 text-base mt-2">Click to view documents</p>
                    </div>
                  ))}
                  {courseUnits.length === 0 && <p className="text-gray-500">No course units found for this semester.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      );
      break;
    case 'documents':
      content = (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
              <button onClick={goBack} className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Course Units
              </button>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-6">{selectedUnit?.name || 'Documents'}</h2>
              {subLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 md:p-10 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-emerald-400">
                      <h3 className="text-2xl font-bold text-white mb-3">{doc.title || doc.id}</h3>
                      <p className="text-emerald-100 text-base mb-6">{doc.description || 'No description'}</p>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => handleReadOnline(doc)} className="px-6 py-3 bg-white text-emerald-600 rounded-xl text-base font-medium hover:bg-emerald-50">
                          Read Online
                        </button>
                        <button onClick={() => handleDownload(doc)} className="px-6 py-3 bg-emerald-800 text-white rounded-xl text-base font-medium hover:bg-emerald-900">
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && <p className="text-gray-500">No documents found for this course unit.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      );
      break;
    case 'about':
      content = <AboutSection />;
      break;
    case 'contact':
      content = <ContactSection onContactClick={onContactClick} />;
      break;
    case 'privacy':
      content = <PrivacySection />;
      break;
    default:
      content = (
        <div className="space-y-0">
          <HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
          <StatsSection />
          <div className="flex justify-center gap-4 py-4">
            <button onClick={() => setShowFlashcards(true)} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Flashcards</button>
            <button onClick={() => setShowQuiz(true)} className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700">Quiz</button>
            <button onClick={() => setShowNotes(true)} className="px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700">Notes</button>
            <button onClick={() => setShowAnalytics(true)} className="px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700">Analytics</button>
            <button onClick={() => setShowAdvancedSearch(true)} className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Search</button>
          </div>
          <div className="space-y-0">
            <LatestDocuments 
              documents={latestDocuments} 
              user={user}
              userProfile={userProfile}
              onViewChange={setView}
              onDocumentClick={(doc) => console.log('Document clicked:', doc)}
              onDownloadClick={(doc) => console.log('Download clicked:', doc)}
            />
            <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
          </div>
        </div>
      );
      break;
  }

  return (
    <>
      {content}
      {showReader && selectedDocument && <DocumentReader document={selectedDocument} onClose={() => setShowReader(false)} />}
      {showFlashcards && <FlashcardStudy courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowFlashcards(false)} />}
      {showQuiz && <QuizMode courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowQuiz(false)} />}
      {showNotes && <CollaborativeNotes courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowNotes(false)} />}
      {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
      {showAdvancedSearch && <AdvancedSearch onClose={() => setShowAdvancedSearch(false)} onViewChange={setView} />}
    </>
  );
};

export default MainContent;
