import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MainContent from './components/MainContent';
import AdminDashboard from './components/AdminDashboard';
import SubscriptionManager from './components/SubscriptionManager';
import AdminUserRegistry from './components/AdminUserRegistry';
import UserProfile from './components/UserProfile';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import PaymentModal from './components/PaymentModal';
import ContactModal from './components/ContactModal';
import AIStudyAssistant from './components/AIStudyAssistant';
import StudyTimeTracker from './components/StudyTimeTracker';
import DashboardEnhancements, { AccessibilityControls } from './components/UIEnhancements';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { StudyProvider, useStudy } from './context/StudyContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { AnomalyProvider, useAnomaly } from './context/AnomalyContext';

const PWA_PROMPT_SHOWN_KEY = 'medidocs_pwa_install_prompt_shown_v1';
const PWA_INSTALLED_KEY = 'medidocs_pwa_installed_v1';
const VIEW_STORAGE_KEY = 'medidocs_current_view';
const VIEW_HASH_PREFIX = '#view=';
const VALID_VIEWS = new Set(['home', 'courses', 'about', 'contact', 'privacy', 'profile', 'admin', 'semesters', 'courseunits', 'documents']);

const getViewFromHash = () => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (!hash.startsWith(VIEW_HASH_PREFIX)) return null;
  const view = decodeURIComponent(hash.slice(VIEW_HASH_PREFIX.length));
  return VALID_VIEWS.has(view) ? view : null;
};

const getInitialView = () => {
  const hashView = getViewFromHash();
  if (hashView) return hashView;
  try {
    const storedView = localStorage.getItem(VIEW_STORAGE_KEY);
    return VALID_VIEWS.has(storedView) ? storedView : 'home';
  } catch {
    return 'home';
  }
};

function AppContent() {
  const { currentUser, userProfile, isBanned, logout, refreshUserProfile } = useAuth();
  const { checkLoginAnomaly } = useAnomaly();
  const { learningStatsByCourse, learningReviews } = useStudy();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState(getInitialView);
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
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    setIsStandalone(standalone);

    try {
      const installed = localStorage.getItem(PWA_INSTALLED_KEY) === 'true';
      const promptSeen = localStorage.getItem(PWA_PROMPT_SHOWN_KEY) === 'true';

      if (installed) {
        setIsStandalone(true);
      }
      setInstallPromptSeen(promptSeen || installed);
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }

    const handler = (event) => {
      try {
        if (
          standalone ||
          localStorage.getItem(PWA_INSTALLED_KEY) === 'true' ||
          localStorage.getItem(PWA_PROMPT_SHOWN_KEY) === 'true'
        ) {
          return;
        }
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
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
        localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true');
      } catch {
        // Ignore storage errors.
      }
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
    const syncViewFromHistory = () => {
      const view = getViewFromHash();
      if (!view) return;
      setCurrentView(view);
      try {
        localStorage.setItem(VIEW_STORAGE_KEY, view);
      } catch {
        // Ignore storage errors.
      }
    };

    window.addEventListener('popstate', syncViewFromHistory);
    window.addEventListener('hashchange', syncViewFromHistory);

    if (!getViewFromHash()) {
      window.history.replaceState({ view: currentView }, '', `${VIEW_HASH_PREFIX}${encodeURIComponent(currentView)}`);
    }

    return () => {
      window.removeEventListener('popstate', syncViewFromHistory);
      window.removeEventListener('hashchange', syncViewFromHistory);
    };
  }, [currentView]);

  useEffect(() => {
    if (currentUser && checkLoginAnomaly) {
      checkLoginAnomaly(currentUser.email, 'unknown', navigator.userAgent);
    }
  }, [currentUser, checkLoginAnomaly]);

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await logout();
    setShowLoginModal(false);
    setShowRegisterModal(false);
    setCurrentView('home');
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, 'home');
    } catch {
      // Ignore storage errors.
    }
  };

  const handleViewChange = (viewId) => {
    if (!VALID_VIEWS.has(viewId)) return;
    setCurrentView(viewId);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewId);
    } catch {
      // Ignore storage errors.
    }
    const nextHash = `${VIEW_HASH_PREFIX}${encodeURIComponent(viewId)}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState({ view: viewId }, '', nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  };

  const handleAISearch = () => setShowAIChatModal(true);

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
        try {
          localStorage.setItem(PWA_INSTALLED_KEY, 'true');
          localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true');
        } catch {
          // Ignore storage errors.
        }
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
      <StudyTimeTracker />
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-16 lg:pb-0 transition-colors duration-300 overflow-x-hidden">
        {isBanned && (
          <div
            className="fixed inset-0 z-50 bg-red-50 dark:bg-red-900/20 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="banned-title"
          >
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-8 max-w-md text-center">
              <div className="text-6xl mb-4" aria-hidden="true">
                🚫
              </div>
              <h2 id="banned-title" className="text-2xl font-bold text-gray-800 dark:text-dark-text mb-2">
                Account Banned
              </h2>
              <p className="text-gray-600 dark:text-dark-muted mb-6">
                Your account has been banned. Please contact support for assistance.
              </p>
              <button onClick={handleLogout} className="touch-target px-6 py-2 bg-red-500 text-white rounded-lg">
                Logout
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col min-h-screen">
          <Header
            user={currentUser}
            userProfile={userProfile}
            currentView={currentView}
            onViewChange={handleViewChange}
            onLoginClick={() => setShowLoginModal(true)}
            onRegisterClick={() => setShowRegisterModal(true)}
            onLogoutClick={handleLogout}
            onMenuClick={toggleSidebar}
            onAISearch={handleAISearch}
          />

          <main id="main-content" tabIndex="-1" className="flex-grow md-page-transition">
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
              {isAdminView ? (
                <>
                  <AdminDashboard user={currentUser} onViewChange={handleViewChange} />
                  <AdminUserRegistry />
                  <SubscriptionManager />
                </>
              ) : currentView === 'profile' && currentUser ? (
                <>
                  <UserProfile
                    onViewChange={handleViewChange}
                    onLogout={handleLogout}
                    onRenew={openRenewal}
                  />
                  <AccessibilityControls />
                </>
              ) : (
                <MainContent
                  view={currentView}
                  user={currentUser}
                  userProfile={userProfile}
                  setView={handleViewChange}
                  onLoginClick={() => setShowLoginModal(true)}
                  onRegisterClick={() => setShowRegisterModal(true)}
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
            userProfile={userProfile}
          />

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
                    <li>
                      <button onClick={() => handleViewChange('home')} className="touch-target hover:text-white">
                        Home
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleViewChange('courses')} className="touch-target hover:text-white">
                        Courses
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleViewChange('about')} className="touch-target hover:text-white">
                        About Us
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleViewChange('contact')} className="touch-target hover:text-white">
                        Contact
                      </button>
                    </li>
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

        {currentView === 'courses' && currentUser && <DashboardEnhancements userProfile={userProfile} />}

        <LoginModal
          show={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
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
          selectedPlan={selectedPaymentPlan}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={async () => {
            await refreshUserProfile();
          }}
        />

        <ContactModal show={showContactModal} onClose={() => setShowContactModal(false)} />
        <AIStudyAssistant
          show={showAIChatModal}
          onClose={() => setShowAIChatModal(false)}
          user={currentUser}
          userProfile={userProfile}
          learningStatsByCourse={learningStatsByCourse}
          learningReviews={learningReviews}
        />

        <button
          type="button"
          onClick={() => setShowAIChatModal(true)}
          className="md-ai-fab touch-target fixed z-40 rounded-full flex items-center justify-center"
          aria-label="Open AI study assistant"
          title="AI Study Assistant"
        >
          <svg
            className="md-ai-icon"
            width="30"
            height="30"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M24 8V5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="24" cy="4" r="2.5" fill="currentColor" />
            <rect x="8" y="11" width="32" height="28" rx="9" stroke="currentColor" strokeWidth="3" />
            <circle cx="18" cy="24" r="3" fill="currentColor" />
            <circle cx="30" cy="24" r="3" fill="currentColor" />
            <path
              d="M16 31C18.2 33.2 20.8 34 24 34C27.2 34 29.8 33.2 32 31"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M8 22H5M43 22H40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M13 39L10 42M35 39L38 42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="md-ai-spark" aria-hidden="true">✦</span>
        </button>

        {canShowInstall && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-96 bg-white dark:bg-dark-card rounded-xl shadow-2xl p-4 z-[60] border border-gray-200 dark:border-dark-border"
            role="dialog"
            aria-label="Install MediDocs"
          >
            <div className="flex items-start gap-3">
              <img src="/medidocs-icon.svg" alt="MediDocs app icon" className="w-12 h-12 rounded-xl flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-dark-text">Install MediDocs</p>
                <p className="text-xs text-gray-600 dark:text-dark-muted mt-1">
                  Install MediDocs as an app for a cleaner, standalone experience.
                </p>
              </div>
            </div>

            {pwaInstallPrompt ? (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={installPWA}
                  className="touch-target flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                >
                  Install App
                </button>
                <button
                  onClick={() => setPwaInstallPrompt(null)}
                  className="touch-target px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                <p className="text-xs font-semibold text-gray-800 dark:text-dark-text">Add MediDocs from your browser</p>
                <p className="text-xs text-gray-600 dark:text-dark-muted mt-1">
                  Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </p>
                <button
                  onClick={() => {
                    setShowInstallHelp(false);
                    setInstallPromptSeen(true);
                    try {
                      localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true');
                    } catch {
                      // Ignore storage errors.
                    }
                  }}
                  className="touch-target mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {!isStandalone && !installPromptSeen && !pwaInstallPrompt && !showInstallHelp && (
          <button
            onClick={() => {
              setShowInstallHelp(true);
              setInstallPromptSeen(true);
              try {
                localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true');
              } catch {
                // Ignore storage errors.
              }
            }}
            className="touch-target fixed top-4 left-1/2 -translate-x-1/2 z-40 px-3 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg text-xs font-semibold text-gray-700 dark:text-dark-text"
            aria-label="Show instructions to install MediDocs"
          >
            Install MediDocs
          </button>
        )}
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
