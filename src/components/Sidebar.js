import React from 'react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose, onHomeClick, onCoursesClick, onAboutClick, onContactClick, onPrivacyClick, onAdminClick }) => {
  const { user } = useAuth();

  // Admin check
  const ADMIN_PHONE = '256749846848';
  const ADMIN_EMAIL = 'kaigwaakram123@gmail.com';
  const isAdmin = user?.phone === ADMIN_PHONE || 
    (user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  const menuItems = [
    { 
      id: 'home', 
      label: 'Home', 
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      action: onHomeClick
    },
    { 
      id: 'courses', 
      label: 'Courses', 
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      action: onCoursesClick
    },
    { 
      id: 'about', 
      label: 'About Us', 
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      action: onAboutClick
    },
    { 
      id: 'contact', 
      label: 'Contact', 
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      action: onContactClick
    },
    { 
      id: 'privacy', 
      label: 'Privacy Policy', 
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      action: onPrivacyClick
    },
  ];

  // Add admin item if user is admin
  const allMenuItems = isAdmin ? [...menuItems, { 
    id: 'admin', 
    label: 'Admin', 
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    action: onAdminClick
  }] : menuItems;

  return (
    <div 
      className={`${isOpen ? 'fixed inset-0 z-50' : 'hidden'}`}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Sidebar */}
      <div 
        className={`absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-gradient-to-b from-white to-emerald-50 shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-emerald-100 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110 4 2 2 0 010-4zM3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"></path>
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              MediDocs
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {allMenuItems.map((item) => (
            <button 
              key={item.id}
              onClick={item.action}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path>
              </svg>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Divider */}
        <div className="border-t border-emerald-200 mx-4"></div>
        
        {/* User Section */}
        <div className="p-4">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
            {user ? (
              <div className="flex items-center space-x-3">
                <img 
                  src="https://i.imgur.com/kkopgnq.png" 
                  alt="User" 
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-300"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{user.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Sign in to access all features</p>
                <button 
                  onClick={onHomeClick}
                  className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                >
                  Login / Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;