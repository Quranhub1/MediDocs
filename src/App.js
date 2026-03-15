import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MainContent from './components/MainContent';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import PaymentModal from './components/PaymentModal';
import ContactModal from './components/ContactModal';
import AIChatModal from './components/AIChatModal';
import AuthContext from './context/AuthContext';

function App() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogin = (userData) => {
    setUser(userData);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setShowRegisterModal(false);
  };

  const handleAISearch = (query) => {
    console.log('AI Search triggered:', query);
    setShowAIChatModal(true);
  };

  // Handle navigation from any component
  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  };

  return (
    <AuthContext.Provider value={{ user, login: handleLogin, logout: handleLogout }}>
      <div className="min-h-screen bg-gray-50 pb-16 lg:pb-0">
        {/* Main Content Wrapper */}
        <div className="flex flex-col min-h-screen">
          <Header 
            user={user} 
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
            />
            
            <div className="w-full">
              <MainContent 
                view={currentView} 
                user={user}
                onLoginClick={() => setShowLoginModal(true)}
                onRegisterClick={() => setShowRegisterModal(true)}
                onPaymentClick={() => setShowPaymentModal(true)}
                onContactClick={() => setShowContactModal(true)}
                onAIChatClick={() => setShowAIChatModal(true)}
              />
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
                    <li>Email: support@medidocs.ug</li>
                    <li>Phone: +256 772 345 678</li>
                    <li>Kampala, Uganda</li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-emerald-500 text-center text-sm text-emerald-200">
                © 2024 MediDocs Uganda. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
        
        {/* Modals */}
        <LoginModal 
          show={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
        
        <RegisterModal 
          show={showRegisterModal} 
          onClose={() => setShowRegisterModal(false)}
          onRegister={handleRegister}
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
        
        <AIChatModal 
          show={showAIChatModal} 
          onClose={() => setShowAIChatModal(false)}
        />
      </div>
    </AuthContext.Provider>
  );
}

export default App;