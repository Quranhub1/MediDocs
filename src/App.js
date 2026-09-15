import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MainContent from './components/MainContent';
import AdminDashboard from './components/AdminDashboard';
import SubscriptionManager from './components/SubscriptionManager';
import AdminUserRegistry from './components/AdminUserRegistry';
import UserSubscriptionPanel from './components/UserSubscriptionPanel';
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

const PWA_PROMPT_SHOWN_KEY = 'medidocs_pwa_install_prompt_shown_v1';
const PWA_INSTALLED_KEY = 'medidocs_pwa_installed_v1';

function AppContent() {
  const { currentUser, userProfile, isBanned, logout, refreshUserProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { checkLoginAnomaly } = useAnomaly();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    try { return localStorage.getItem('medidocs_current_view') || 'home'; } catch { return 'home'; }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPromptSeen, setInstallPromptSeen] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);
    try {
      const installed = localStorage.getItem(PWA_INSTALLED_KEY) === 'true';
      const promptSeen = localStorage.getItem(PWA_PROMPT_SHOWN_KEY) === 'true';
      if (installed) setIsStandalone(true);
      setInstallPromptSeen(promptSeen || installed);
    } catch {}

    const handler = (event) => {
      try {
        if (standalone || localStorage.getItem(PWA_INSTALLED_KEY) === 'true' || localStorage.getItem(PWA_PROMPT_SHOWN_KEY) === 'true') return;
        event.preventDefault();
        localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true');
      } catch {
        if (standalone) return;
        event.preventDefault();
      }
      setInstallPromptSeen(true);
      setPwaInstallPrompt(event);
      setShowInstallHelp(false);
    };
    const installedHandler = () => {
      try { localStorage.setItem(PWA_INSTALLED_KEY, 'true'); localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true'); } catch {}
      setPwaInstallPrompt(null);
      setShowInstallHelp(false);
      setInstallPromptSeen(true);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  useEffect(() => {
    if (currentUser && checkLoginAnomaly) checkLoginAnomaly(currentUser.email, 'unknown', navigator.userAgent);
  }, [currentUser, checkLoginAnomaly]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const handleLogout = async () => { await logout(); setShowLoginModal(false); setShowRegisterModal(false); };
  const handleAISearch = () => setShowAIChatModal(true);
  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    try { localStorage.setItem('medidocs_current_view', viewId); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  };
  const openRenewal = (plan = null) => {
    setSelectedPaymentPlan(plan);
    setShowPaymentModal(true);
  };
  const installPWA = async () => {
    if (!pwaInstallPrompt) return;
    try {
      pwaInstallPrompt.prompt();
      const { outcome } = await pwaInstallPrompt.userChoice;
      setPwaInstallPrompt(null);
      if (outcome === 'accepted') {
        try { localStorage.setItem(PWA_INSTALLED_KEY, 'true'); localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true'); } catch {}
        setIsStandalone(true);
        setInstallPromptSeen(true);
      }
    } catch (error) {
      console.warn('PWA installation prompt failed:', error);
      setPwaInstallPrompt(null);
    }
  };
  const canShowInstall = !isStandalone && (pwaInstallPrompt || showInstallHelp);
  const isAdminView = currentView === 'admin';

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-16 lg:pb-0 transition-colors duration-300 overflow-x-hidden">
        {isBanned && (
          <div className="fixed inset-0 z-50 bg-red-50 dark:bg-red-900/20 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="banned-title">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-md text-center">
              <div className="text-6xl mb-4" aria-hidden="true">🚫</div>
              <h2 id="banned-title" className="text-2xl font-bold text-gray-800 dark:text-dark-text mb-2">Account Banned</h2>
              <p className="text-gray-600 dark:text-dark-muted mb-6">Your account has been banned. Please contact support for assistance.</p>
              <button onClick={handleLogout} className="px-6 py-2 bg-red-500 text-white rounded-lg">Logout</button>
            </div>
          </div>
        )}
        <div className="flex flex-col min-h-screen">
          <Header user={currentUser} currentView={currentView} onViewChange={handleViewChange} onLoginClick={() => setShowLoginModal(true)} onRegisterClick={() => setShowRegisterModal(true)} onLogoutClick={handleLogout} onMenuClick={toggleSidebar} onAISearch={handleAISearch} />
          <main id="main-content" tabIndex="-1" className="flex-grow">
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} onHomeClick={() => handleViewChange('home')} onCoursesClick={() => handleViewChange('courses')} onAboutClick={() => handleViewChange('about')} onContactClick={() => handleViewChange('contact')} onPrivacyClick={() => handleViewChange('privacy')} onAdminClick={() => handleViewChange('admin')} />
            <div className="w-full">
              {isAdminView ? (
                <>
                  <AdminDashboard user={currentUser} onViewChange={handleViewChange} />
                  <AdminUserRegistry />
                  <SubscriptionManager />
                </>
              ) : (
                <>
                  <MainContent view={currentView} user={currentUser} userProfile={userProfile} setView={handleViewChange} onLoginClick={() => setShowLoginModal(true)} onRegisterClick={() => setShowRegisterModal(true)} onContactClick={() => setShowContactModal(true)} onAIChatClick={() => setShowAIChatModal(true)} />
                  {currentUser && currentView === 'home' && (
                    <UserSubscriptionPanel user={currentUser} userProfile={userProfile} onRenew={openRenewal} />
                  )}
                </>
              )}
            </div>
          </main>
          <BottomNav currentView={currentView} onViewChange={handleViewChange} user={currentUser} />
          <footer className="hidden lg:block bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-8 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div><h4 className="font-bold text-lg mb-4">MediDocs Uganda</h4><p className="text-emerald-100 text-sm">Your trusted medical education platform for Ugandan students.</p></div>
                <div><h4 className="font-bold text-lg mb-4">Quick Links</h4><ul className="space-y-2 text-sm text-emerald-100"><li><button onClick={() => handleViewChange('home')} className="hover:text-white">Home</button></li><li><button onClick={() => handleViewChange('courses')} className="hover:text-white">Courses</button></li><li><button onClick={() => handleViewChange('about')} className="hover:text-white">About Us</button></li><li><button onClick={() => handleViewChange('contact')} className="hover:text-white">Contact</button></li></ul></div>
                <div><h4 className="font-bold text-lg mb-4">Contact</h4><ul className="space-y-2 text-sm text-emerald-100"><li>Email: kaigwaakram123@gmail.com</li><li>Phone: +256 749 846 848</li><li>Kampala, Uganda</li></ul></div>
              </div>
              <div className="mt-8 pt-4 border-t border-emerald-500 text-center text-sm text-emerald-200">2026 MediDocs Uganda. All rights reserved.</div>
            </div>
          </footer>
        </div>

        <LoginModal show={showLoginModal} onClose={() => setShowLoginModal(false)} onSwitchToRegister={() => { setShowLoginModal(false); setShowRegisterModal(true); }} />
        <RegisterModal show={showRegisterModal} onClose={() => setShowRegisterModal(false)} onSwitchToLogin={() => { setShowRegisterModal(false); setShowLoginModal(true); }} />
        <PaymentModal show={showPaymentModal} selectedPlan={selectedPaymentPlan} onClose={() => setShowPaymentModal(false)} onPaymentSuccess={async () => { await refreshUserProfile(); }} />
        <ContactModal show={showContactModal} onClose={() => setShowContactModal(false)} />
        <AIStudyAssistant show={showAIChatModal} onClose={() => setShowAIChatModal(false)} user={currentUser} userProfile={userProfile} />

        <button onClick={() => setShowAIChatModal(true)} className="fixed bottom-20 right-6 z-40 w-16 h-16 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform" style={{ animation: 'pulse 2s infinite' }} aria-label="Open AI study assistant">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </button>

        {canShowInstall && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-96 bg-white dark:bg-dark-card rounded-xl shadow-2xl p-4 z-[60] border border-gray-200 dark:border-dark-border" role="dialog" aria-label="Install MediDocs">
            <div className="flex items-start gap-3"><img src="/medidocs-icon.svg" alt="MediDocs app icon" className="w-12 h-12 rounded-xl flex-shrink-0" /><div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-dark-text">Install MediDocs</p><p className="text-xs text-gray-600 dark:text-dark-muted mt-1">Install MediDocs as an app for a cleaner, standalone experience without the normal browser address bar.</p></div></div>
            {pwaInstallPrompt ? (
              <div className="flex gap-2 mt-4"><button onClick={installPWA} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700">Install App</button><button onClick={() => setPwaInstallPrompt(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg text-sm">Close</button></div>
            ) : (
              <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800 p-3"><p className="text-xs font-semibold text-gray-800 dark:text-dark-text">Add MediDocs from your browser</p><p className="text-xs text-gray-600 dark:text-dark-muted mt-1">On iPhone/iPad, use your browser's Share menu and choose <strong>Add to Home Screen</strong>. On supported desktop or Android browsers, choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><button onClick={() => { setShowInstallHelp(false); setInstallPromptSeen(true); try { localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true'); } catch {} }} className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">Dismiss</button></div>
            )}
          </div>
        )}
        {!isStandalone && !installPromptSeen && !pwaInstallPrompt && !showInstallHelp && <button onClick={() => { setShowInstallHelp(true); setInstallPromptSeen(true); try { localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true'); } catch {} }} className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-3 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg text-xs font-semibold text-gray-700 dark:text-dark-text" aria-label="Show instructions to install MediDocs">Install MediDocs</button>}
        <style>{`@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 50% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); } }`}</style>
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
              <AnomalyProvider><AppContent /></AnomalyProvider>
            </BookmarkProvider>
          </StudyProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
