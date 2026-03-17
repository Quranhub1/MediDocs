import React from 'react';

const CourseGrid = ({ courses, onBrowseClick }) => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          Our Courses
        </h2>
        <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
          Choose from our range of medical education programs designed for Ugandan students
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group"
            >
              {/* Card Header with gradient */}
              <div className={`h-3 bg-gradient-to-r ${
                course.id === 'clt1' ? 'from-emerald-400 to-teal-500' :
                course.id === 'clt2' ? 'from-teal-400 to-cyan-500' :
                course.id === 'dip1' ? 'from-cyan-400 to-blue-500' :
                'from-blue-400 to-indigo-500'
              }`}></div>
              
              <div className="p-6">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                  course.id === 'clt1' ? 'from-emerald-100 to-teal-100' :
                  course.id === 'clt2' ? 'from-teal-100 to-cyan-100' :
                  course.id === 'dip1' ? 'from-cyan-100 to-blue-100' :
                  'from-blue-100 to-indigo-100'
                } flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <svg className={`w-8 h-8 ${
                    course.id === 'clt1' ? 'text-emerald-600' :
                    course.id === 'clt2' ? 'text-teal-600' :
                    course.id === 'dip1' ? 'text-cyan-600' :
                    'text-blue-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {course.icon === 'flask' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19h6m2-2h2M5 9a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V9z"></path>
                    )}
                    {course.icon === 'microscope' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    )}
                    {course.icon === 'heart-pulse' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78z"></path>
                    )}
                    {course.icon === 'stethoscope' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a2 2 0 110 4 2 2 0 010-4zM3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"></path>
                    )}
                  </svg>
                </div>
                
                {/* Course Name */}
                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-emerald-600 transition-colors">
                  {course.name}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 text-sm mb-4">
                  Comprehensive study materials for {course.name.toLowerCase().includes('certificate') ? 'certificate' : 'diploma'} programs
                </p>
                
                {/* Stats */}
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>{course.stats}</span>
                </div>
                
                {/* Button */}
                <button 
                  className={`w-full py-3 rounded-xl font-medium transition-all duration-300 ${
                    course.id === 'clt1' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' :
                    course.id === 'clt2' ? 'bg-teal-500 hover:bg-teal-600 text-white' :
                    course.id === 'dip1' ? 'bg-cyan-500 hover:bg-cyan-600 text-white' :
                    'bg-blue-500 hover:bg-blue-600 text-white'
                  } shadow-md hover:shadow-lg transform hover:scale-105`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onBrowseClick) onBrowseClick(course);
                  }}
                >
                  Browse Materials
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CourseGrid;