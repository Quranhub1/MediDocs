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
      thumbnail: 'https://example.com/thumbnails/anatomy_thumb.jpg',
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
            <CourseGrid courses={courses} onBrowseClick={() => setView && setView('courses')} />
          </div>
        </div>
      );
    case 'courses':
      return (
        <div className="space-y-0">
          <CourseGrid courses={courses} onBrowseClick={() => setView && setView('courses')} />
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
            <CourseGrid courses={courses} onBrowseClick={() => setView && setView('courses')} />
          </div>
        </div>
      );
  }
};

export default MainContent;
