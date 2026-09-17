import React from 'react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose, onHomeClick, onCoursesClick, onAboutClick, onContactClick, onPrivacyClick, onAdminClick }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const profilePhoto = userProfile?.photoURL || currentUser?.photoURL || '';
  const displayName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const initials = displayName.trim().charAt(0).toUpperCase() || 'U';

  const menuItems = [
    { id: 'home', label: 'Home', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10', action: onHomeClick },
    { id: 'courses', label: 'Courses', icon: 'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15zM8 6h8M8 10h8', action: onCoursesClick },
    { id: 'about', label: 'About Us', icon: 'M13 16h-1v-4h-1m1-4h.01M12 3a9 9 0 100 18 9 9 0 000-18z', action: onAboutClick },
    { id: 'contact', label: 'Contact', icon: 'M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', action: onContactClick },
    { id: 'privacy', label: 'Privacy Policy', icon: 'M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4zm-3 9l2 2 4-4', action: onPrivacyClick }
  ];

  const allMenuItems = isAdmin
    ? [...menuItems, {
        id: 'admin',
        label: 'Admin Control Center',
        icon: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.7 1.7 0 00.34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.03 1.56V20h-2v-.09a1.7 1.7 0 00-1.03-1.56 1.7 1.7 0 00-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 008.4 15a1.7 1.7 0 00-1.56-1.03H6v-2h.84A1.7 1.7 0 008.4 10a1.7 1.7 0 00-.34-1.88L8 8.06l1.41-1.41.06.06A1.7 1.7 0 0011.35 7a1.7 1.7 0 001.03-1.56V5h2v.44A1.7 1.7 0 0015.4 7a1.7 1.7 0 001.88-.34l.06-.06 1.41 1.41-.06.06A1.7 1.7 0 0018.4 10a1.7 1.7 0 001.56 1.03H20v2h-.04A1.7 1.7 0 0019.4 15z',
        action: onAdminClick
      }]
    : menuItems;

  return (
    <div className={`${isOpen ? 'fixed inset-0 z-50' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-gradient-to-b from-white to-emerald-50 shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex justify-between items-center border-b border-emerald-100 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110 4 2 2 0 010-4zM3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">MediDocs</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors" aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-2" aria-label="Main navigation">
          {allMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group ${item.id === 'admin' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-600'}`}
            >
              <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 ${item.id === 'admin' ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white group-hover:scale-105'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-emerald-200 mx-4"></div>
        <div className="p-4">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-emerald-200 shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold">
                  {profilePhoto ? <img src={profilePhoto} alt={`${displayName} profile`} className="w-full h-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{isAdmin ? 'Administrator' : displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Sign in to access all features</p>
                <button onClick={onHomeClick} className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium">Login / Register</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
