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
import AdaptiveQuiz from './AdaptiveQuiz';
import CollaborativeNotes from './CollaborativeNotes';
import AnalyticsDashboard from './AnalyticsDashboard';
import AdvancedSearch from './AdvancedSearch';
import LearningHub from './LearningHub';
import StudyGroups from './StudyGroups';
import { useTheme } from '../context/ThemeContext';
import { useStudy } from '../context/StudyContext';
import { useBookmarks } from '../context/BookmarkContext';
import { useToast } from '../context/ToastContext';
import { fetchCourses, fetchSemesters, fetchCourseUnits, fetchDocuments, subscribeToAllResources, subscribeToCourses } from '../services/FirestoreService';
import { getDocumentUrl, downloadDocument } from '../utils/documentActions';

const getAnalyticsDocumentId = (doc) => {
  if (!doc) return 'unknown';
  if (doc.filePath) return String(doc.filePath);
  const parts = [doc.courseId, doc.semesterId, doc.unitId, doc.id || doc.title].filter(Boolean);
  return parts.length ? parts.join('/') : String(doc.id || doc.title || doc.fileUrl || 'unknown');
};

const MainContent = ({ view, user, userProfile, onLoginClick, onRegisterClick, onContactClick, onAIChatClick, setView }) => {
  const { theme } = useTheme();
  const { recordDocumentView, recordDocumentDownload, recordDocumentProgress } = useStudy();
  const { addToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [latestDocuments, setLatestDocuments] = useState([]);
  const [allRealtimeDocuments, setAllRealtimeDocuments] = useState([]);
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
  const [showLearningHub, setShowLearningHub] = useState(false);
  const [showStudyGroups, setShowStudyGroups] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Keep the homepage resource feed live. This intentionally bypasses the
  // legacy resource-index/localStorage cache so newly added documents appear
  // immediately and survive navigation without a stale "latest" list.
  useEffect(() => {
    if (!user) {
      setCourses([]);
      setLatestDocuments([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setLoadError(null);
    let mounted = true;

    const unsubscribeResources = subscribeToAllResources((allResources) => {
      if (!mounted) return;
      const latest = (allResources || [])
        .filter((item) => item?.status !== 'deleted')
        .slice(0, 10);
      setAllRealtimeDocuments(allResources || []);
      setLatestDocuments(latest);
      setLoading(false);
    }, (error) => {
      if (!mounted) return;
      console.error('[REALTIME] MainContent resources:', error);
      setLoadError(error?.message || 'Unable to load resources');
      setLoading(false);
    });

    const unsubscribeCourses = subscribeToCourses((nextCourses) => {
      if (!mounted) return;
      setCourses(nextCourses || []);
    }, (error) => console.error('[REALTIME] MainContent courses:', error));

    return () => {
      mounted = false;
      unsubscribeResources();
      unsubscribeCourses();
    };
  }, [user]);

  useEffect(() => {
    // Preserve the selected hierarchy across browser reloads. The previous
    // implementation stored only "#view=documents", so a reload recreated the
    // view with no selected course/semester/unit and rendered "No documents".
    try {
      const saved = JSON.parse(sessionStorage.getItem('medidocs_navigation_state_v1') || 'null');
      if (!saved) return;
      if (saved.course) setSelectedCourse(saved.course);
      if (saved.semester) setSelectedSemester(saved.semester);
      if (saved.unit) setSelectedUnit(saved.unit);
      if (Array.isArray(saved.semesters)) setSemesters(saved.semesters);
      if (Array.isArray(saved.courseUnits)) setCourseUnits(saved.courseUnits);
      if (Array.isArray(saved.documents)) setDocuments(saved.documents);
    } catch (error) {
      console.info('[NAVIGATION] Saved navigation state unavailable:', error?.message);
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('medidocs_navigation_state_v1', JSON.stringify({
        course: selectedCourse,
        semester: selectedSemester,
        unit: selectedUnit,
        semesters,
        courseUnits,
        documents
      }));
    } catch (error) {
      console.info('[NAVIGATION] Could not persist navigation state:', error?.message);
    }
  }, [selectedCourse, selectedSemester, selectedUnit, semesters, courseUnits, documents]);

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setSelectedSemester(null);
    setSelectedUnit(null);
    setSemesters([]);
    setCourseUnits([]);
    setDocuments([]);
    setSubLoading(true);
    setView('semesters');
  };

  useEffect(() => {
    if (!selectedCourse?.id) return undefined;
    setSemesters([]);
    setSubLoading(true);
    const unsubscribe = subscribeToSemesters(
      selectedCourse.id,
      (items) => {
        setSemesters(items);
        setSubLoading(false);
      },
      (error) => {
        console.error('[REALTIME] Semesters:', error);
        setSubLoading(false);
      }
    );
    return unsubscribe;
  }, [selectedCourse?.id]);

  const handleSemesterClick = (semester) => {
    setSelectedSemester(semester);
    setSelectedUnit(null);
    setCourseUnits([]);
    setDocuments([]);
    setSubLoading(true);
    setView('courseunits');
  };

  useEffect(() => {
    if (!selectedCourse?.id || !selectedSemester?.id) return undefined;
    setCourseUnits([]);
    setSubLoading(true);
    const unsubscribe = subscribeToCourseUnits(
      selectedCourse.id,
      selectedSemester.id,
      (items) => {
        setCourseUnits(items);
        setSubLoading(false);
      },
      (error) => {
        console.error('[REALTIME] Course units:', error);
        setSubLoading(false);
      }
    );
    return unsubscribe;
  }, [selectedCourse?.id, selectedSemester?.id]);

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit);
    setDocuments([]);
    setSubLoading(true);
    setView('documents');
  };

  useEffect(() => {
    if (!selectedCourse?.id || !selectedSemester?.id || !selectedUnit?.id) return undefined;
    setDocuments([]);
    setSubLoading(true);
    const unsubscribe = subscribeToDocuments(
      selectedCourse.id,
      selectedSemester.id,
      selectedUnit.id,
      (items) => {
        setDocuments(items.filter((item) => item.status !== 'deleted'));
        setSubLoading(false);
      },
      (error) => {
        console.error('[REALTIME] Documents:', error);
        setSubLoading(false);
      }
    );
    return unsubscribe;
  }, [selectedCourse?.id, selectedSemester?.id, selectedUnit?.id]);

  useEffect(() => {
    if (!selectedCourse || !selectedSemester || !selectedUnit) return;
    const liveDocuments = allRealtimeDocuments.filter((item) =>
      item.courseId === selectedCourse.id &&
      item.semesterId === selectedSemester.id &&
      item.unitId === selectedUnit.id &&
      item.status !== 'deleted'
    );
    setDocuments(liveDocuments);
  }, [allRealtimeDocuments, selectedCourse, selectedSemester, selectedUnit]);

  const handleReadOnline = (doc) => {
    const documentId = getAnalyticsDocumentId(doc);
    setSelectedDocument(doc);
    void recordDocumentView(documentId, {
      title: doc?.title || null,
      courseId: doc?.courseId || selectedCourse?.id || null,
      semesterId: doc?.semesterId || selectedSemester?.id || null,
      unitId: doc?.unitId || selectedUnit?.id || null,
      courseName: doc?.courseName || selectedCourse?.name || null
    });
    setShowReader(true);
  };

  const handleDownload = async (doc) => {
    const documentId = getAnalyticsDocumentId(doc);
    // A download is its own activity. Do not also count it as a read.
    // Using the same canonical ID as Read Online keeps per-document stats aligned.
    void recordDocumentDownload(documentId, {
      title: doc?.title || null,
      courseId: doc?.courseId || selectedCourse?.id || null,
      semesterId: doc?.semesterId || selectedSemester?.id || null,
      unitId: doc?.unitId || selectedUnit?.id || null,
      courseName: doc?.courseName || selectedCourse?.name || null
    });
    const url = getDocumentUrl(doc);
    if (!url) {
      addToast('No download link available for this document', 'error');
      return;
    }
    console.info('[MainContent] download', { id: doc?.id || null, title: doc?.title || null, url });
    await downloadDocument(doc);
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
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4 mx-auto"></div><p className="text-gray-500">Loading...</p></div></div>;
  }

  if (loadError) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center max-w-md mx-auto p-8"><div className="text-red-500 text-5xl mb-4">⚠️</div><h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Issue</h2><p className="text-gray-600 mb-6">We couldn't load your content. This might be due to a temporary network issue.</p><button onClick={() => window.location.reload()} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">Try Again</button></div></div>;
  }

  if (view === 'home') {
    return (
      <div>
        <HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
        <DocumentCarousel documents={latestDocuments} user={user} userProfile={userProfile} onReadDocument={handleReadOnline} onDownloadDocument={handleDownload} />
        {!user && <div className="max-w-2xl mx-auto px-4 py-8 text-center"><p className="text-gray-600 mb-4">Login to access all documents</p><button onClick={onLoginClick} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">Login</button></div>}
        {user && <><StatsSection /><div className="space-y-0"><LatestDocuments documents={latestDocuments} user={user} userProfile={userProfile} onViewChange={setView} onReadDocument={handleReadOnline} onDownloadDocument={handleDownload} /><CourseGrid courses={courses} onBrowseClick={handleCourseClick} /></div></>}
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-[60vh] flex items-center justify-center bg-gray-50"><div className="text-center max-w-md mx-auto p-8"><div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-6"><svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div><h2 className="text-2xl font-bold text-gray-800 mb-4">Login Required</h2><p className="text-gray-600 mb-6">Please login or create an account to access our medical education resources and documents.</p><div className="flex gap-4 justify-center"><button onClick={onLoginClick} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">Login</button><button onClick={onRegisterClick} className="px-6 py-3 bg-white text-emerald-600 border-2 border-emerald-500 rounded-xl font-medium hover:bg-emerald-50 transition-colors">Register</button></div></div></div>;
  }

  let content;
  switch (view) {
    case 'courses':
      content = (
        <div className="relative min-h-screen">
          <BackgroundImages />
          <div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8">
            <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-dark-text">Courses & Study Tools</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">Choose a course, or jump straight into your study tools.</p>
              </div>

              <div className="mb-10 rounded-3xl bg-white/90 dark:bg-gray-800/90 p-5 md:p-7 shadow-xl border border-emerald-100 dark:border-gray-700">
                <div className="mb-5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xl">📚</div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Study Tools</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Quizzes, flashcards, notes, analytics and search are all here now.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                  <button onClick={() => setShowQuiz(true)} className="group rounded-2xl p-4 md:p-5 text-left bg-purple-600 text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="text-2xl mb-2">📝</div><div className="font-bold">Quizzes</div><div className="text-xs text-purple-100 mt-1">Test your knowledge</div>
                  </button>
                  <button onClick={() => setShowFlashcards(true)} className="group rounded-2xl p-4 md:p-5 text-left bg-blue-600 text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="text-2xl mb-2">🗂️</div><div className="font-bold">Flashcards</div><div className="text-xs text-blue-100 mt-1">Review key facts</div>
                  </button>
                  <button onClick={() => setShowNotes(true)} className="group rounded-2xl p-4 md:p-5 text-left bg-teal-600 text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="text-2xl mb-2">🗒️</div><div className="font-bold">Notes</div><div className="text-xs text-teal-100 mt-1">Keep study notes</div>
                  </button>
                  <button onClick={() => setShowAnalytics(true)} className="group rounded-2xl p-4 md:p-5 text-left bg-amber-600 text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="text-2xl mb-2">📊</div><div className="font-bold">Analytics</div><div className="text-xs text-amber-100 mt-1">Track your progress</div>
                  </button>
                  <button onClick={() => setShowAdvancedSearch(true)} className="group rounded-2xl p-4 md:p-5 text-left bg-indigo-600 text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="text-2xl mb-2">🔎</div><div className="font-bold">Search</div><div className="text-xs text-indigo-100 mt-1">Find resources fast</div>
                  </button>
                  <button onClick={() => setShowLearningHub(true)} className="group rounded-2xl p-4 md:p-5 text-left bg-emerald-700 text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="text-2xl mb-2">🧠</div><div className="font-bold">Learning Hub</div><div className="text-xs text-emerald-100 mt-1">Daily 20, cases, labs & calculators</div>
                  </button>
<button onClick={() => setShowStudyGroups(true)} className="group rounded-2xl p-4 md:p-5 text-left bg-emerald-700 text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="text-2xl mb-2">🧠</div><div className="font-bold">Study Groups</div><div className="text-xs text-emerald-100 mt-1">Collaborate, share resources & discuss</div>
                  </button>
                </div>
              </div>

              <CourseGrid courses={courses} onBrowseClick={handleCourseClick} />
            </div>
          </div>
        </div>
      );
      break;
    case 'semesters':
      content = <div className="relative min-h-screen"><BackgroundImages /><div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8"><div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8"><button onClick={() => { setSelectedCourse(null); setView && setView('courses'); }} className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>Back to Courses</button><h2 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-6">{selectedCourse?.name || 'Select a Course'}</h2>{subLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div> : <div className="grid grid-cols-1 gap-6">{semesters.map((semester) => <div key={semester.id} onClick={() => handleSemesterClick(semester)} className="bg-gradient-to-br from-emerald-400 to-teal-500 p-8 md:p-10 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 border border-emerald-300"><h3 className="text-2xl font-bold text-white">{semester.name || semester.id}</h3><p className="text-emerald-100 text-base mt-2">Click to view course units</p></div>)}{semesters.length === 0 && <p className="text-gray-500">No semesters found for this course.</p>}</div>}</div></div></div>;
      break;
    case 'courseunits':
      content = <div className="relative min-h-screen"><BackgroundImages /><div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8"><DocumentCarousel documents={documents} user={user} userProfile={userProfile} /><div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8"><button onClick={goBack} className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>Back to Semesters</button><h2 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-6">{selectedSemester?.name || 'Select a Semester'}</h2>{subLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div> : <div className="grid grid-cols-1 gap-6">{courseUnits.map((unit) => <div key={unit.id} onClick={() => handleUnitClick(unit)} className="bg-gradient-to-br from-emerald-400 to-teal-500 p-8 md:p-10 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 border border-emerald-300"><h3 className="text-2xl font-bold text-white">{unit.name || unit.id}</h3><p className="text-emerald-100 text-base mt-2">Click to view documents</p></div>)}{courseUnits.length === 0 && <p className="text-gray-500">No course units found for this semester.</p>}</div>}</div></div></div>;
      break;
    case 'documents':
      content = <div className="relative min-h-screen"><BackgroundImages /><div className="relative z-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 min-h-screen py-8"><div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8"><button onClick={goBack} className="mb-6 flex items-center text-emerald-600 hover:text-emerald-700"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>Back to Course Units</button><h2 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-6">{selectedUnit?.name || 'Documents'}</h2>{subLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div> : <div className="grid grid-cols-1 gap-8">{documents.map((doc) => <div key={doc.id} className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 md:p-10 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-emerald-400"><h3 className="text-2xl font-bold text-white mb-3">{doc.title || doc.id}</h3><p className="text-emerald-100 text-base mb-6">{doc.description || 'No description'}</p><div className="flex flex-wrap gap-3"><button onClick={() => handleReadOnline(doc)} className="px-6 py-3 bg-white text-emerald-600 rounded-xl text-base font-medium hover:bg-emerald-50">Read Online</button><button onClick={() => handleDownload(doc)} className="px-6 py-3 bg-emerald-800 text-white rounded-xl text-base font-medium hover:bg-emerald-900">Download</button></div></div>)}{documents.length === 0 && <p className="text-gray-500">No documents found for this course unit.</p>}</div>}</div></div></div>;
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
      content = <div className="space-y-0"><HeroSection user={user} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} /><StatsSection /><LatestDocuments documents={latestDocuments} user={user} userProfile={userProfile} onViewChange={setView} onReadDocument={handleReadOnline} onDownloadDocument={handleDownload} /><CourseGrid courses={courses} onBrowseClick={handleCourseClick} /></div>;
      break;
  }

  return (
    <>
      {content}
      {showReader && selectedDocument && <DocumentReader
        document={selectedDocument}
        onProgress={(seconds, progressPercent) => recordDocumentProgress(
          getAnalyticsDocumentId(selectedDocument),
          seconds,
          progressPercent,
          { title: selectedDocument?.title || null }
        )}
        onClose={() => setShowReader(false)}
        onDownload={handleDownload}
      />
      {showFlashcards && <FlashcardStudy courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowFlashcards(false)} />}
      {showQuiz && <AdaptiveQuiz courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowQuiz(false)} />}
      {showNotes && <CollaborativeNotes courseId={selectedCourse?.id} unitId={selectedUnit?.id} onClose={() => setShowNotes(false)} />}
      {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
      {showAdvancedSearch && <AdvancedSearch onClose={() => setShowAdvancedSearch(false)} onViewChange={setView} />}
      {showStudyGroups && <StudyGroups onClose={() => setShowStudyGroups(false)} user={user} />}
      {showLearningHub && <LearningHub onClose={() => setShowLearningHub(false)} onOpenQuiz={() => { setShowLearningHub(false); setShowQuiz(true); }} onOpenAIChat={(prompt) => { setShowLearningHub(false); onAIChatClick?.(prompt); }} />}
    </>
  );
};

export default MainContent;
