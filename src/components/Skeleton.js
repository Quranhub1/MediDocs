import React from 'react';

const Skeleton = ({ className = '', variant = 'rectangular', ...props }) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variants = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4'
  };

  return (
    <div
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-dark-card rounded-xl shadow-md p-6 border border-gray-100 dark:border-dark-border">
    <Skeleton className="w-full h-48 mb-4" />
    <Skeleton className="w-3/4 h-6 mb-2" />
    <Skeleton className="w-1/2 h-4" />
  </div>
);

export const TableRowSkeleton = ({ columns = 6 }) => (
  <tr className="border-b border-gray-200 dark:border-dark-border">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton className="w-full h-4" />
      </td>
    ))}
  </tr>
);

export const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6">
    <Skeleton className="w-12 h-12 rounded-xl mb-4" />
    <Skeleton className="w-20 h-8 mb-2" />
    <Skeleton className="w-32 h-4" />
  </div>
);

export default Skeleton;
