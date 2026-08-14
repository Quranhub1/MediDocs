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
import { useTheme } from '../context/ThemeContext';
import { useStudy } from '../context/StudyContext';
import { useBookmarks } from '../context/BookmarkContext';
import { useToast } from '../context/ToastContext';
import { fetchCourses, fetchSemesters, fetchCourseUnits, fetchDocuments, fetchAllDocuments } from '../services/FirestoreService';
import { useViewLimit } from '../hooks/useViewLimit';
import PaymentModal from './PaymentModal';
import LimitReachedModal from './LimitReachedModal';

const ADMIN_EMAIL = 'kaigwaakram123@gmail.com';

const canAccessDocument = (doc, userProfile, userEmail) => {
  if (!doc) return true;
  if (doc.status === 'free') return true;
  if (userEmail === ADMIN_EMAIL) return true;
  if (!userProfile) return false;
  if (userProfile.banned) return false;
  if (userProfile.subscriptionApproved && userProfile.subscriptionStatus === 'active') {
    if (userProfile.subscriptionExpiry) {
      const expiry = new Date(userProfile.subscriptionExpiry);
      return expiry > new Date();
    }
    return true;
  }
  return false;
};

const MainContent = ({ view, user, userProfile, onLoginClick, onRegisterClick, onPaymentClick, onContactClick, onAIChatClick, setView }) => {
  const { theme } = useTheme();
  const { recordStudySession } = useStudy();
  const { addToast } = useToast();
  const { viewedCount, limitReached, recordView, isSubscriber } = useViewLimit(userProfile);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
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
  }, [view, user]);

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

  // Gate document access:
  // - Premium docs -> always require subscription (payment modal)
  // - Free docs -> free users may open up to FREE_VIEW_LIMIT distinct docs,
  //   then the limit modal appears.
  const attemptAccess = (doc, onGranted) => {
    if (!doc) return;
    if (doc.status === 'premium' || !canAccessDocument(doc, userProfile, user?.email)) {
      setShowPayment(true);
      return;
    }
    if (!isSubscriber && limitReached && !recordView(doc.id)) {
      setShowLimitModal(true);
      return;
    }
    recordView(doc.id);
    onGranted();
  };

  const handleReadOnline = (doc) => {
    attemptAccess(doc, () => {
      setSelectedDocument(doc);
      setShowReader(true);
    });
  };

  const handleDownload = async (doc) => {
    attemptAccess(doc, async () => {
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
    });
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
    const getSubscriptionCountdown = () => {
      if (!userProfile || !userProfile.subscriptionExpiry || !userProfile.subscriptionApproved) return null;
      
      const expiry = userProfile.subscriptionExpiry.toDate ? userProfile.subscriptionExpiry.toDate() : new Date(userProfile.subscriptionExpiry);
      const now = new Date();
      const diff = expiry - now;
      
      if (diff <= 0) {
        return { text: 'Subscription Expired', days: 0, expired: true };
      }
      
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      const hours = Math.ceil((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return { text: `${days} day${days > 1 ? 's' : ''} remaining`, days, expired: false };
      } else if (hours > 0) {
        return { text: `${hours} hour${hours > 1 ? 's' : ''} remaining`, days: 0, expired: false };
      } else {
        const minutes = Math.ceil((diff % (1000 * 60)) / (1000 * 60));
        return { text: `${minutes} min remaining`, days: 0, expired: false };
      }
    };

    const subscriptionCountdown = getSubscriptionCountdown();

    return (
      <div>
        <HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
        {user && subscriptionCountdown && (
          <div className={`max-w-2xl mx-auto px-4 py-3 rounded-xl mb-4 text-center ${
            subscriptionCountdown.expired 
              ? 'bg-red-100 border border-red-400 text-red-700' 
              : subscriptionCountdown.days <= 5 
                ? 'bg-amber-100 border border-amber-400 text-amber-700'
                : 'bg-emerald-100 border border-emerald-400 text-emerald-700'
          }`}>
            <p className="font-medium">
              {subscriptionCountdown.expired 
                ? 'Your subscription has expired. Please renew to access premium content.' 
                : `Subscription expires in ${subscriptionCountdown.text}`}
            </p>
            {subscriptionCountdown.days <= 5 && !subscriptionCountdown.expired && (
              <button 
                onClick={onPaymentClick}
                className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Renew Now
              </button>
            )}
          </div>
        )}
        <DocumentCarousel documents={latestDocuments} user={user} userProfile={userProfile} onPaymentClick={onPaymentClick} onLockedAccess={attemptAccess} />
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
              onPaymentClick={onPaymentClick}
              onLockedAccess={attemptAccess}
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

  switch (view) {
    case 'home':
      return (
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
          {showReader && selectedDocument && <DocumentReader document={selectedDocument} onClose={() => setShowReader(false)} />}
          {showFlashcards && <FlashcardStudy courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowFlashcards(false)} />}
          {showQuiz && <QuizMode courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowQuiz(false)} />}
          {showNotes && <CollaborativeNotes courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowNotes(false)} />}
          {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
          {showAdvancedSearch && <AdvancedSearch onClose={() => setShowAdvancedSearch(false)} onViewChange={setView} />}
          {showLimitModal && (
            <LimitReachedModal
              show={showLimitModal}
              viewedCount={viewedCount}
              onClose={() => setShowLimitModal(false)}
              onChoosePlan={(plan) => {
                setPendingPlan(plan);
                setShowLimitModal(false);
                setShowPayment(true);
              }}
            />
          )}
          {showPayment && (
            <PaymentModal
              show={showPayment}
              selectedPlan={pendingPlan}
              onClose={() => { setShowPayment(false); setPendingPlan(null); }}
              onPaymentSuccess={() => { setShowPayment(false); setPendingPlan(null); }}
            />
          )}
        </>
      );
    case 'courses':
      return (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
          </div>
        </div>
      );
    case 'semesters':
      return (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <div className="max-w-7xl mx-auto px-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {semesters.map((semester) => (
                    <div key={semester.id} onClick={() => handleSemesterClick(semester)} className="bg-gradient-to-br from-emerald-400 to-teal-500 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 border border-emerald-300">
                      <h3 className="text-lg font-bold text-white">{semester.name || semester.id}</h3>
                      <p className="text-emerald-100 text-sm mt-2">Click to view course units</p>
                    </div>
                  ))}
                  {semesters.length === 0 && <p className="text-gray-500">No semesters found for this course.</p>}
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
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <DocumentCarousel documents={documents} user={user} userProfile={userProfile} onPaymentClick={onPaymentClick} onLockedAccess={attemptAccess} />
            <div className="max-w-7xl mx-auto px-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courseUnits.map((unit) => (
                    <div key={unit.id} onClick={() => handleUnitClick(unit)} className="bg-gradient-to-br from-emerald-400 to-teal-500 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 border border-emerald-300">
                      <h3 className="text-lg font-bold text-white">{unit.name || unit.id}</h3>
                      <p className="text-emerald-100 text-sm mt-2">Click to view documents</p>
                    </div>
                  ))}
                  {courseUnits.length === 0 && <p className="text-gray-500">No course units found for this semester.</p>}
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
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <div className="max-w-7xl mx-auto px-4">
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
                <div className="grid grid-cols-1 gap-6">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all border border-emerald-400">
                      <h3 className="text-lg font-bold text-white mb-2">{doc.title || doc.id}</h3>
                      <p className="text-emerald-100 text-sm mb-4">{doc.description || 'No description'}</p>
                      <div className="flex flex-wrap gap-2">
                        {doc.filePath && (
                          <button onClick={() => handleReadOnline(doc)} className="px-4 py-2 bg-white text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-50">
                            Read Online
                          </button>
                        )}
                        {doc.filePath && (
                          <button onClick={() => handleDownload(doc)} className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-sm font-medium hover:bg-emerald-900">
                            Download
                          </button>
                        )}
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
              onPaymentClick={onPaymentClick}
              onLockedAccess={attemptAccess}
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
