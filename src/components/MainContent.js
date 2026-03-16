import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LatestDocuments from './LatestDocuments';
import CourseGrid from './CourseGrid';
import AboutSection from './AboutSection';
import ContactSection from './ContactSection';
import PrivacySection from './PrivacySection';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';

const MainContent = ({ view, user, onLoginClick, onRegisterClick, onPaymentClick, onContactClick, onAIChatClick }) => {
  const [latestDocuments, setLatestDocuments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLatestDocuments([
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
      ]);
      
      setCourses([
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
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
            <CourseGrid courses={courses} />
          </div>
        </div>
      );
    case 'courses':
      return (
        <div className="space-y-0">
          <CourseGrid courses={courses} />
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
            <CourseGrid courses={courses} />
          </div>
        </div>
      );
  }
};

export default MainContent;