import React from 'react';
import DashboardEnhancements from './UIEnhancements';

const StatsSection = () => {
  return (
    <>
      <DashboardEnhancements />
      <section className="py-12 sm:py-16 px-4 bg-white dark:bg-dark-bg transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-dark-text mb-4">Why Choose MediDocs?</h2>
          <p className="text-center text-gray-600 dark:text-dark-muted mb-10 max-w-2xl mx-auto">We provide the best medical education resources for Ugandan students</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[['Expert Content','Carefully curated materials by experienced medical educators','📋'],['Affordable Access','One-time payment for unlimited access to all resources','💳'],['AI-Powered','Get instant answers with our intelligent AI assistant','🤖'],['24/7 Support','Dedicated support team ready to help anytime','🛟']].map(([title,text,icon], index) => <div key={title} className="md-dashboard-card text-center p-5 sm:p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-emerald-100 dark:border-dark-border hover:shadow-lg"><div className="w-14 h-14 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 shadow-md text-2xl" aria-hidden="true">{icon}</div><h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-2">{title}</h3><p className="text-gray-600 dark:text-dark-muted text-sm">{text}</p></div>)}
          </div>
        </div>
      </section>
    </>
  );
};

export default StatsSection;
