import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MainContent from './components/MainContent';
import AdminDashboard from './components/AdminDashboard';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import PaymentModal from './components/PaymentModal';
import ContactModal from './components/ContactModal';
import AIStudyAssistant from './components/AIStudyAssistant';
import ThemeToggle from './components/ThemeToggle';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { StudyProvider } from './context/StudyContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { AnomalyProvider, useAnomaly } from './context/AnomalyContext';

function AppContent() {
  const { currentUser, userProfile, isBanned, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { checkLoginAnomaly } = useAnomaly();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => console.log('SW registered:', registration))
        .catch((error) => console.log('SW registration failed:', error));
    }
  }, []);

  useEffect(() => {
    if (currentUser && checkLoginAnomaly) {
      checkLoginAnomaly(currentUser.email, 'unknown', navigator.userAgent);
    }
  }, [currentUser]);

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

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  };

  const installPWA = async () => {
    if (pwaInstallPrompt) {
      pwaInstallPrompt.prompt();
      const { outcome } = await pwaInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setPwaInstallPrompt(null);
      }
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-16 lg:pb-0 transition-colors duration-300 overflow-x-hidden">
        {isBanned && (
          <div className="fixed inset-0 z-50 bg-red-50 dark:bg-red-900/20 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-md text-center">
              <div className="text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text mb-2">Account Banned</h2>
              <p className="text-gray-600 dark:text-dark-muted mb-6">Your account has been banned. Please contact support for assistance.</p>
              <button onClick={handleLogout} className="px-6 py-2 bg-red-500 text-white rounded-lg">Logout</button>
            </div>
          </div>
        )}
        
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
                  <AdminDashboard 
                    user={currentUser}
                    onViewChange={handleViewChange}
                  />
              ) : (
                <MainContent 
                  view={currentView} 
                  user={currentUser}
                  userProfile={userProfile}
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
          
          <BottomNav 
            currentView={currentView} 
            onViewChange={handleViewChange} 
            user={currentUser}
          />
          
          <footer className="hidden lg:block bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-8 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h4 className="font-bold text-lg mb-4">MediDocs Uganda</h4>
                  <p className="text-emerald-100 text-sm">Your trusted medical education platform for Ugandan students.</p>
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
                2026 MediDocs Uganda. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
        
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
        
        <AIStudyAssistant 
          show={showAIChatModal} 
          onClose={() => setShowAIChatModal(false)}
          user={currentUser}
          userProfile={userProfile}
        />
        
        <button
          onClick={() => setShowAIChatModal(true)}
          className="fixed bottom-20 right-6 z-40 w-16 h-16 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
          style={{ animation: 'pulse 2s infinite' }}
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </button>

        {pwaInstallPrompt && (
          <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-white dark:bg-dark-card rounded-xl shadow-2xl p-4 z-50 border border-gray-200 dark:border-dark-border">
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text mb-3">Install MediDocs App</p>
            <div className="flex gap-2">
              <button onClick={installPWA} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                Install
              </button>
              <button onClick={() => setPwaInstallPrompt(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg text-sm">
                Later
              </button>
            </div>
          </div>
        )}
        
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
      <ThemeProvider>
        <ToastProvider>
          <StudyProvider>
            <BookmarkProvider>
              <AnomalyProvider>
                <AppContent />
              </AnomalyProvider>
            </BookmarkProvider>
          </StudyProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
