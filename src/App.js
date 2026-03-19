import React, { useState, Suspense, lazy } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MainContent from './components/MainContent';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import PaymentModal from './components/PaymentModal';
import ContactModal from './components/ContactModal';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy load heavy components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AIStudyAssistant = lazy(() => import('./components/AIStudyAssistant'));

function AppContent() {
  const { currentUser, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await logout();
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };

  const handleAISearch = (query) => {
    setShowAIChatModal(true);
  };

  // Handle navigation from any component
  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-16 lg:pb-0">
        {/* Main Content Wrapper */}
        <div className="flex flex-col min-h-screen">
          <Header 
            user={currentUser} 
            currentView={currentView}
            onViewChange={handleViewChange}
            onLoginClick={() => setShowLoginModal(true)}
            onRegisterClick={() => setShowRegisterModal(true)}
            onLogoutClick={handleLogout}
            onMenuClick={toggleSidebar}
            onAISearch={handleAISearch}
          />
          
          <main className="flex-grow">
            <Sidebar 
              isOpen={isSidebarOpen} 
              onClose={closeSidebar}
              onHomeClick={() => handleViewChange('home')}
              onCoursesClick={() => handleViewChange('courses')}
              onAboutClick={() => handleViewChange('about')}
              onContactClick={() => handleViewChange('contact')}
              onPrivacyClick={() => handleViewChange('privacy')}
              onAdminClick={() => handleViewChange('admin')}
            />
            
            <div className="w-full">
              {currentView === 'admin' ? (
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                  <AdminDashboard 
                    user={currentUser}
                    onViewChange={handleViewChange}
                  />
                </Suspense>
              ) : (
                <MainContent 
                  view={currentView} 
                  user={currentUser}
                  setView={handleViewChange}
                  onLoginClick={() => setShowLoginModal(true)}
                  onRegisterClick={() => setShowRegisterModal(true)}
                  onPaymentClick={() => setShowPaymentModal(true)}
                  onContactClick={() => setShowContactModal(true)}
                  onAIChatClick={() => setShowAIChatModal(true)}
                />
              )}
            </div>
          </main>
          
          {/* Bottom Navigation - Mobile Only */}
          <BottomNav 
            currentView={currentView} 
            onViewChange={handleViewChange} 
          />
          
          {/* Footer - Desktop Only */}
          <footer className="hidden lg:block bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-8 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h4 className="font-bold text-lg mb-4">MediDocs Uganda</h4>
                  <p className="text-emerald-100 text-sm">
                    Your trusted medical education platform for Ugandan students.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-4">Quick Links</h4>
                  <ul className="space-y-2 text-sm text-emerald-100">
                    <li><button onClick={() => handleViewChange('home')} className="hover:text-white">Home</button></li>
                    <li><button onClick={() => handleViewChange('courses')} className="hover:text-white">Courses</button></li>
                    <li><button onClick={() => handleViewChange('about')} className="hover:text-white">About Us</button></li>
                    <li><button onClick={() => handleViewChange('contact')} className="hover:text-white">Contact</button></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-4">Contact</h4>
                  <ul className="space-y-2 text-sm text-emerald-100">
                    <li>Email: kaigwaakram123@gmail.com</li>
                    <li>Phone: +256 749 846 848</li>
                    <li>Kampala, Uganda</li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-emerald-500 text-center text-sm text-emerald-200">
                © 2026 MediDocs Uganda. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
        
        {/* Modals */}
        <LoginModal 
          show={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
        
        <RegisterModal 
          show={showRegisterModal} 
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
        
        <PaymentModal 
          show={showPaymentModal} 
          onClose={() => setShowPaymentModal(false)}
        />
        
        <ContactModal 
          show={showContactModal} 
          onClose={() => setShowContactModal(false)}
        />
        
        <Suspense fallback={null}>
          <AIStudyAssistant 
            show={showAIChatModal} 
            onClose={() => setShowAIChatModal(false)}
            user={currentUser}
          />
        </Suspense>
        
        {/* Floating AI Assistant Button */}
        <button
          onClick={() => setShowAIChatModal(true)}
          className="fixed bottom-20 right-6 z-40 w-16 h-16 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform animate-bounce"
          style={{ animation: 'pulse 2s infinite' }}
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </button>
        
        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            50% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          }
        `}</style>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;