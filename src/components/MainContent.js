import React, { useState, useEffect } from 'react';
import LatestDocuments from './LatestDocuments';
import CourseGrid from './CourseGrid';
import AboutSection from './AboutSection';
import ContactSection from './ContactSection';
import PrivacySection from './PrivacySection';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
import { fetchResources, fetchCourses } from '../services/FirestoreService';

const MainContent = ({ view, user, onLoginClick, onRegisterClick, onPaymentClick, onContactClick, onAIChatClick, setView }) => {
  const [latestDocuments, setLatestDocuments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Always try to fetch courses (they're publicly readable)
      const coursesResult = await fetchCourses(10);
      
      if (coursesResult.success && coursesResult.data.length > 0) {
        setCourses(coursesResult.data);
      } else {
        setCourses(getMockCourses());
      }
      
      // Only fetch documents if user is authenticated
      if (user) {
        const resourcesResult = await fetchResources(12);
        
        if (resourcesResult.success && resourcesResult.data.length > 0) {
          setLatestDocuments(resourcesResult.data);
        } else {
          setLatestDocuments(getMockDocuments());
        }
      } else {
        setLatestDocuments(getMockDocuments());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLatestDocuments(getMockDocuments());
      setCourses(getMockCourses());
    } finally {
      setLoading(false);
    }
  };

  const getMockDocuments = () => [
    {
      id: '1',
      title: 'Anatomy Chapter 1: Introduction to Human Body',
      description: 'Comprehensive overview of human anatomy basics',
      filePath: 'https://example.com/documents/anatomy_chapter1.pdf',
      thumbnail: 'data:image/jpeg;base64,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',
      status: 'latest',
      courseId: 'clt1',
      semesterId: 'semester1',
      unitId: 'unit1'
    },
    {
      id: '2',
      title: 'Physiology Notes: Cell Function and Metabolism',
      description: 'Detailed notes on cellular physiology',
      filePath: 'https://example.com/documents/physiology_notes.pdf',
      thumbnail: 'https://example.com/thumbnails/physiology_thumb.jpg',
      status: 'latest',
      courseId: 'clt1',
      semesterId: 'semester1',
      unitId: 'unit2'
    },
    {
      id: '3',
      title: 'Biochemistry Basics: Biomolecules and Enzymes',
      description: 'Fundamental concepts in medical biochemistry',
      filePath: 'https://example.com/documents/biochemistry_basics.pdf',
      thumbnail: 'https://example.com/thumbnails/biochemistry_thumb.jpg',
      status: 'popular',
      courseId: 'clt1',
      semesterId: 'semester1',
      unitId: 'unit3'
    }
  ];

  const getMockCourses = () => [
    {
      id: 'clt1',
      name: 'Certificate in Laboratory Technology',
      icon: 'flask',
      stats: '120+ Resources'
    },
    {
      id: 'clt2',
      name: 'Certificate in Medical Laboratory Sciences',
      icon: 'microscope',
      stats: '95+ Resources'
    },
    {
      id: 'dip1',
      name: 'Diploma in Nursing',
      icon: 'heart-pulse',
      stats: '150+ Resources'
    },
    {
      id: 'dip2',
      name: 'Diploma in Clinical Medicine',
      icon: 'stethoscope',
      stats: '110+ Resources'
    }
  ];

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
