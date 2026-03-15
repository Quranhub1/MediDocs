import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Header = ({ 
  user, 
  onLoginClick, 
  onRegisterClick, 
  onLogoutClick, 
  onMenuClick, 
  onAISearch,
  currentView,
  onViewChange 
}) => {
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAiSearch = (e) => {
    e.preventDefault();
    if (aiSearchQuery.trim()) {
      onAISearch(aiSearchQuery);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Home', section: 'hero' },
    { id: 'courses', label: 'Courses', section: 'courses' },
    { id: 'about', label: 'About', section: 'about' },
    { id: 'contact', label: 'Contact', section: 'contact' },
  ];

  const handleNavClick = (item) => {
    onViewChange(item.id);
    // Scroll to top when changing views
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!user) {
    return (
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-lg' : 'bg-white'
        }`}
      >
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-1 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
            <span className="flex items-center gap-1">📞 +256 772 345 678</span>
            <span className="flex items-center gap-1">📧 support@medidocs.ug</span>
          </div>
        </div>
        
        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left - Menu Button + Logo */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button 
                id="menu-button"
                className="lg:hidden p-2 rounded-lg hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 transition-all duration-200"
                onClick={onMenuClick}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                </svg>
              </button>
              
              {/* Logo */}
              <button 
                id="home-button"
                onClick={() => handleNavClick({ id: 'home' })}
                className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110 4 2 2 0 010-4zM3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"></path>
                  </svg>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent hidden sm:block">
                  MediDocs
                </span>
              </button>
            </div>

            {/* Desktop Navigation - Center */}
            <nav className="hidden lg:flex items-center space-x-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    currentView === item.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Right - Search + Auth */}
            <div className="flex items-center space-x-3">
              {/* AI Search */}
              <div className="hidden md:block relative">
                <form onSubmit={handleAiSearch} className="relative">
                  <input
                    type="text"
                    id="ai-search-input"
                    placeholder="Ask AI..."
                    value={aiSearchQuery}
                    onChange={(e) => setAiSearchQuery(e.target.value)}
                    className="w-40 lg:w-48 px-4 py-2 pl-10 text-sm border-2 border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                </form>
              </div>

              {/* Auth Buttons */}
              <button 
                id="login-button"
                onClick={onLoginClick}
                className="px-4 py-2 text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg transition-all duration-200"
              >
                Login
              </button>
              <button 
                id="register-button"
                onClick={onRegisterClick}
                className="hidden sm:inline-flex px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleAiSearch} className="relative">
            <input
              type="text"
              placeholder="Ask AI about your studies..."
              value={aiSearchQuery}
              onChange={(e) => setAiSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </form>
        </div>
      </header>
    );
  }

  // Logged in state
  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-lg' : 'bg-white'}`}>
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-1 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
          <span className="flex items-center gap-1">📞 +256 772 345 678</span>
          <span className="flex items-center gap-1">📧 support@medidocs.ug</span>
        </div>
      </div>
      
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left - Menu Button + Logo */}
          <div className="flex items-center space-x-4">
            <button 
              id="menu-button"
              className="lg:hidden p-2 rounded-lg hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 transition-all duration-200"
              onClick={onMenuClick}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
              </svg>
            </button>
            
            <button 
              id="home-button"
              onClick={() => handleNavClick({ id: 'home' })}
              className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110 4 2 2 0 010-4zM3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"></path>
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent hidden sm:block">
                MediDocs
              </span>
            </button>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden lg:flex items-center space-x-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentView === item.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right - User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full">
              <img 
                src="https://i.imgur.com/kkopgnq.png" 
                alt="User" 
                className="w-8 h-8 rounded-full border-2 border-emerald-200"
              />
              <span className="text-sm font-medium text-gray-700">{user.email?.split('@')[0]}</span>
            </div>
            <button 
              id="logout-button"
              onClick={onLogoutClick}
              className="px-4 py-2 text-red-600 font-medium hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;