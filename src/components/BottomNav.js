import React from 'react';
import { useAuth } from '../context/AuthContext';

const Icon = ({ name, active = false }) => {
  const paths = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-6h6v6',
    courses: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5m0-16V21.5m0-16A2.5 2.5 0 0 1 6.5 3H20',
    contact: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 1 8 6 8-6',
    profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
    admin: 'M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3Zm0 5v8m-4-4h8'
  };
  return (
    <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'scale-110' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} fill={active && name === 'home' ? 'currentColor' : 'none'} />
    </svg>
  );
};

const BottomNav = ({ currentView, onViewChange, user }) => {
  const { isAdmin } = useAuth();
  const adminVisible = isAdmin || user?.email?.toLowerCase() === 'kaigwaakram123@gmail.com';
  const navItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'courses', label: 'Courses', icon: 'courses' },
    { id: 'contact', label: 'Contact', icon: 'contact' }
  ];
  if (user) navItems.push({ id: 'profile', label: 'Profile', icon: 'profile' });
  if (adminVisible) navItems.push({ id: 'admin', label: 'Admin', icon: 'admin' });

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border-t border-gray-200/80 dark:border-dark-border shadow-[0_-8px_30px_rgba(0,0,0,0.08)] lg:hidden z-40 safe-area-bottom" aria-label="Mobile navigation">
      <div className="flex items-center justify-around min-h-16 px-2 py-1.5 gap-1">
        {navItems.map((item) => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onViewChange(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`touch-target relative flex flex-col items-center justify-center flex-1 min-h-14 rounded-2xl px-1 transition-all duration-300 ${active ? 'text-emerald-600 dark:text-emerald-300 bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-emerald-900/35 dark:to-teal-900/25 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-gray-50 dark:hover:bg-gray-800/70'}`}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <span className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${active ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25' : ''}`}>
                <Icon name={item.icon} active={active} />
              </span>
              <span className={`text-[10px] sm:text-[11px] font-semibold mt-0.5 tracking-wide ${active ? 'font-bold' : ''}`}>{item.label}</span>
              {active && <span className="absolute -bottom-0.5 w-7 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
