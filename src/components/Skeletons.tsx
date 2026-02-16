import React from 'react';

/**
 * Skeleton Loaders voor betere perceived performance
 */

export const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-6 animate-pulse">
    {/* Header */}
    <div className="mb-6 space-y-4">
      <div className="h-10 w-64 bg-gray-300 dark:bg-dark-border rounded"></div>
      <div className="h-6 w-96 bg-gray-200 dark:bg-dark-surface rounded"></div>
    </div>

    {/* Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow">
          <div className="h-6 w-3/4 bg-gray-200 dark:bg-dark-border rounded mb-4"></div>
          <div className="h-4 w-full bg-gray-200 dark:bg-dark-border rounded mb-2"></div>
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-dark-border rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden animate-pulse">
    {/* Header */}
    <div className="border-b border-gray-200 dark:border-dark-border p-4">
      <div className="flex space-x-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-4 flex-1 bg-gray-300 dark:bg-dark-border rounded"></div>
        ))}
      </div>
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="border-b border-gray-100 dark:border-dark-border p-4">
        <div className="flex space-x-4">
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="h-4 flex-1 bg-gray-200 dark:bg-dark-surface rounded"></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow animate-pulse">
    {/* Title */}
    <div className="h-6 w-48 bg-gray-300 dark:bg-dark-border rounded mb-6"></div>

    {/* Chart area */}
    <div className="relative h-80 bg-gray-100 dark:bg-dark-bg rounded">
      {/* Animated bars */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around p-8 space-x-2">
        {[60, 80, 45, 90, 70, 55, 85].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-gradient-to-t from-blue-400 to-blue-600 opacity-30 rounded-t"
            style={{ height: `${height}%` }}
          ></div>
        ))}
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-around p-8">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-px bg-gray-300 dark:bg-dark-border opacity-30"></div>
        ))}
      </div>
    </div>

    {/* Legend */}
    <div className="mt-6 flex justify-center space-x-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-300 dark:bg-dark-border rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-dark-surface rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="space-y-2 flex-1">
        <div className="h-5 w-3/4 bg-gray-300 dark:bg-dark-border rounded"></div>
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-dark-surface rounded"></div>
      </div>
      <div className="w-12 h-12 bg-gray-300 dark:bg-dark-border rounded-full"></div>
    </div>
    <div className="space-y-2">
      <div className="h-4 w-full bg-gray-200 dark:bg-dark-surface rounded"></div>
      <div className="h-4 w-5/6 bg-gray-200 dark:bg-dark-surface rounded"></div>
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-300 dark:bg-dark-border rounded-full flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-gray-300 dark:bg-dark-border rounded"></div>
          <div className="h-3 w-1/2 bg-gray-200 dark:bg-dark-surface rounded"></div>
        </div>
        <div className="w-20 h-8 bg-gray-200 dark:bg-dark-surface rounded"></div>
      </div>
    ))}
  </div>
);

export const FormSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow space-y-6 animate-pulse">
    {/* Title */}
    <div className="h-8 w-48 bg-gray-300 dark:bg-dark-border rounded"></div>

    {/* Form fields */}
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="space-y-2">
        <div className="h-4 w-32 bg-gray-300 dark:bg-dark-border rounded"></div>
        <div className="h-10 w-full bg-gray-200 dark:bg-dark-surface rounded"></div>
      </div>
    ))}

    {/* Buttons */}
    <div className="flex space-x-4 pt-4">
      <div className="h-10 w-32 bg-blue-300 dark:bg-blue-800 rounded"></div>
      <div className="h-10 w-24 bg-gray-300 dark:bg-dark-border rounded"></div>
    </div>
  </div>
);

export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-20 bg-gray-300 dark:bg-dark-border rounded"></div>
          <div className="w-10 h-10 bg-gray-300 dark:bg-dark-border rounded-full"></div>
        </div>
        <div className="h-10 w-24 bg-gray-300 dark:bg-dark-border rounded mb-2"></div>
        <div className="h-3 w-32 bg-gray-200 dark:bg-dark-surface rounded"></div>
      </div>
    ))}
  </div>
);
