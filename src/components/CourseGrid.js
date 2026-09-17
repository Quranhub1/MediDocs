import React from 'react';

const getCourseAccent = (courseId) => {
  if (courseId === 'clt1') return 'from-emerald-400 to-teal-500';
  if (courseId === 'clt2') return 'from-teal-400 to-cyan-500';
  if (courseId === 'dip1') return 'from-cyan-400 to-blue-500';
  return 'from-blue-400 to-indigo-500';
};

const getIconBackground = (courseId) => {
  if (courseId === 'clt1') return 'from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/30';
  if (courseId === 'clt2') return 'from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/30';
  if (courseId === 'dip1') return 'from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/30';
  return 'from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/30';
};

const getIconColor = (courseId) => {
  if (courseId === 'clt1') return 'text-emerald-600 dark:text-emerald-400';
  if (courseId === 'clt2') return 'text-teal-600 dark:text-teal-400';
  if (courseId === 'dip1') return 'text-cyan-600 dark:text-cyan-400';
  return 'text-blue-600 dark:text-blue-400';
};

const getButtonClass = (courseId) => {
  if (courseId === 'clt1') return 'bg-emerald-500 hover:bg-emerald-600 text-white';
  if (courseId === 'clt2') return 'bg-teal-500 hover:bg-teal-600 text-white';
  if (courseId === 'dip1') return 'bg-cyan-500 hover:bg-cyan-600 text-white';
  return 'bg-blue-500 hover:bg-blue-600 text-white';
};

const CourseGrid = ({ courses, onBrowseClick }) => {
  const courseList = Array.isArray(courses) ? courses : [];

  return (
    <section className="md-section md-courses-section py-12 px-4 sm:px-6" aria-labelledby="courses-title">
      <div className="max-w-7xl mx-auto">
        <div className="md-section-heading text-center mb-8 sm:mb-10">
          <span className="md-eyebrow">Learn with MediDocs</span>
          <h2 id="courses-title" className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-dark-text mt-2 mb-3">
            Our Courses
          </h2>
          <p className="text-gray-600 dark:text-dark-muted max-w-2xl mx-auto leading-relaxed">
            Choose from medical education programs and study materials designed for Ugandan students.
          </p>
        </div>

        {courseList.length > 0 ? (
          <div className="md-course-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {courseList.map((course, index) => {
              const accent = getCourseAccent(course.id);
              const iconBackground = getIconBackground(course.id);
              const iconColor = getIconColor(course.id);
              const buttonClass = getButtonClass(course.id);

              return (
                <article
                  key={course.id}
                  className="md-course-card bg-white dark:bg-dark-card rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-dark-border overflow-hidden group flex flex-col h-full"
                  style={{ '--md-delay': Math.min(index, 7) * 60 + 'ms' }}
                >
                  <div className={'h-1.5 bg-gradient-to-r ' + accent} />

                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <div
                      className={'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ' + iconBackground + ' flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300'}
                      aria-hidden="true"
                    >
                      <svg className={'w-7 h-7 ' + iconColor} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v17H6.5A2.5 2.5 0 014 16.5v-12A2.5 2.5 0 016.5 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 6h8M8 10h8M8 14h5" />
                      </svg>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-dark-text mb-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {course.name}
                    </h3>

                    <p className="text-gray-600 dark:text-dark-muted text-sm mb-4 leading-relaxed">
                      Comprehensive study materials for {String(course.name || '').toLowerCase().includes('certificate') ? 'certificate' : 'diploma'} programs.
                    </p>

                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-muted mb-5" aria-label={course.stats || ''}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{course.stats}</span>
                    </div>

                    <button
                      type="button"
                      className={'mt-auto w-full min-h-12 py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md active:scale-[.98] ' + buttonClass}
                      onClick={() => {
                        if (typeof onBrowseClick === 'function') {
                          onBrowseClick(course);
                        }
                      }}
                    >
                      Browse materials
                      <span aria-hidden="true" className="ml-1">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="md-empty-state bg-white dark:bg-dark-card border border-dashed border-gray-200 dark:border-dark-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-2xl" aria-hidden="true">📚</div>
            <h3 className="font-bold text-gray-800 dark:text-dark-text mt-4">Courses are being prepared</h3>
            <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">New learning materials will appear here when they are available.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CourseGrid;
