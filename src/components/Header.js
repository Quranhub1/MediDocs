import React, { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';

const NavIcon = ({ name, active = false }) => {
  const paths = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-6h6v6',
    courses: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5m0-16V21.5m0-16A2.5 2.5 0 0 1 6.5 3H20',
    contact: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 1 8 6 8-6',
    admin: 'M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3Zm0 5v8m-4-4h8'
  };
  return <svg className={`w-4 h-4 transition-transform duration-200 ${active ? 'scale-110' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
};

const Header = ({ user, userProfile, onLoginClick, onRegisterClick, onLogoutClick, onMenuClick, onAISearch, currentView, onViewChange }) => {
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const ADMIN_PHONE = '256749846848';
  const ADMIN_EMAIL = 'kaigwaakram123@gmail.com';
  const isAdmin = user?.phone === ADMIN_PHONE || (user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  const profilePhoto = userProfile?.photoURL || user?.photoURL || '';
  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

  useEffect(() => { const handleScroll = () => setScrolled(window.scrollY > 20); window.addEventListener('scroll', handleScroll); return () => window.removeEventListener('scroll', handleScroll); }, []);
  const handleAiSearch = (e) => { e.preventDefault(); if (aiSearchQuery.trim()) onAISearch(aiSearchQuery); };
  const menuItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'courses', label: 'Courses', icon: 'courses' },
    { id: 'contact', label: 'Contact', icon: 'contact' }
  ];
  const allMenuItems = isAdmin ? [...menuItems, { id: 'admin', label: 'Admin', icon: 'admin' }] : menuItems;
  const handleNavClick = (item) => { onViewChange(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const Navigation = () => (
    <nav className="hidden lg:flex items-center gap-1.5" aria-label="Primary navigation">
      {allMenuItems.map((item) => {
        const active = currentView === item.id;
        return <button key={item.id} onClick={() => handleNavClick(item)} aria-current={active ? 'page' : undefined} className={`group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${active ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/35 dark:to-teal-900/25 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-gray-600 dark:text-dark-muted hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-gray-50 dark:hover:bg-gray-700/70'}`}><span className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 ${active ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30'}`}><NavIcon name={item.icon} active={active} /></span>{item.label}{active && <span className="absolute left-1/2 -bottom-1 w-8 h-0.5 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />}</button>;
      })}
    </nav>
  );

  if (!user) return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl shadow-lg' : 'bg-white dark:bg-dark-card'}`}>
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-1 px-4"><div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-x-4 gap-y-1 items-center text-xs"><span>📞 +256 749 846 848</span><span>📧 kaigwaakram123@gmail.com</span></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16"><div className="flex items-center space-x-4">
        <button id="menu-button" className="lg:hidden p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 text-gray-600 dark:text-dark-muted hover:text-emerald-600 transition-all duration-200" onClick={onMenuClick} aria-label="Open menu"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
        <button id="home-button" onClick={() => handleNavClick({ id: 'home' })} className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-6h6v6" /></svg></div><span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent hidden sm:block">MediDocs</span></button>
      </div><Navigation /><div className="flex items-center space-x-3"><ThemeToggle /><div className="hidden md:block relative"><form onSubmit={handleAiSearch} className="relative"><input type="text" id="ai-search-input" placeholder="Ask AI..." value={aiSearchQuery} onChange={(e) => setAiSearchQuery(e.target.value)} className="w-40 lg:w-48 px-4 py-2 pl-10 text-sm border-2 border-gray-200 dark:border-dark-border rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text" /><div className="absolute left-3 top-1/2 -translate-y-1/2"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg></div></form></div><button id="login-button" onClick={onLoginClick} className="px-4 py-2 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-lg">Login</button><button id="register-button" onClick={onRegisterClick} className="hidden sm:inline-flex px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all">Get Started</button></div></div></div>
      <div className="md:hidden px-4 pb-3"><form onSubmit={handleAiSearch} className="relative"><input type="text" placeholder="Ask AI about your studies..." value={aiSearchQuery} onChange={(e) => setAiSearchQuery(e.target.value)} className="w-full px-4 py-2 pl-10 text-sm border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text" /></form></div>
    </header>
  );

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl shadow-lg' : 'bg-white dark:bg-dark-card'}`}>
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-1 px-4"><div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-x-4 gap-y-1 items-center text-xs"><span>📞 +256 749 846 848</span><span>📧 kaigwaakram123@gmail.com</span></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16"><div className="flex items-center space-x-4">
        <button id="menu-button" className="lg:hidden p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 text-gray-600 dark:text-dark-muted hover:text-emerald-600 transition-all duration-200" onClick={onMenuClick} aria-label="Open menu"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
        <button id="home-button" onClick={() => handleNavClick({ id: 'home' })} className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-6h6v6" /></svg></div><span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent hidden sm:block">MediDocs</span></button>
      </div><Navigation /><div className="flex items-center space-x-3"><ThemeToggle /><button onClick={() => handleNavClick({ id: 'profile' })} className={`hidden sm:flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all duration-300 ${currentView === 'profile' ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/35 dark:to-teal-900/25 shadow-sm' : 'bg-emerald-50 dark:bg-gray-700 hover:bg-emerald-100 dark:hover:bg-gray-600'}`} aria-label="Open my profile"><span className={`w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ${currentView === 'profile' ? 'ring-2 ring-emerald-400/60 ring-offset-1 dark:ring-offset-gray-900' : ''}`}>{profilePhoto ? <img src={profilePhoto} alt={`${displayName} profile`} className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}</span><span className="text-sm font-medium text-gray-700 dark:text-dark-text max-w-[120px] truncate">{displayName}</span></button><button id="logout-button" onClick={onLogoutClick} className="px-4 py-2 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">Logout</button></div></div></div>
    </header>
  );
};

export default Header;
