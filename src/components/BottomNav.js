import React from 'react';

const BottomNav = ({ currentView, onViewChange }) => {
  const navItems = [
    { 
      id: 'home', 
      label: 'Home', 
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    { 
      id: 'courses', 
      label: 'Courses', 
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    { 
      id: 'contact', 
      label: 'Contact', 
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    },
  ];

  const handleClick = (id) => {
    onViewChange(id);
    // Scroll to top when changing views
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg lg:hidden z-40">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                isActive 
                  ? 'text-emerald-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d={item.icon}
                ></path>
              </svg>
              <span className={`text-xs font-medium ${isActive ? 'text-emerald-600' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;