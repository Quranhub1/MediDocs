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

        <div className="flex flex-wrap items-stretch justify-center gap-4">
          {courses.map((course) => (
            <button
              key={course.id}
              className={`flex-1 min-w-[200px] max-w-xs py-3 px-6 rounded-xl font-medium transition-all duration-300 text-white shadow-md hover:shadow-lg transform hover:scale-105 whitespace-nowrap ${
                course.id === 'clt1' ? 'bg-emerald-500 hover:bg-emerald-600' :
                course.id === 'clt2' ? 'bg-teal-500 hover:bg-teal-600' :
                course.id === 'dip1' ? 'bg-cyan-500 hover:bg-cyan-600' :
                'bg-blue-500 hover:bg-blue-600'
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onBrowseClick) onBrowseClick(course);
              }}
            >
              {course.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CourseGrid;
