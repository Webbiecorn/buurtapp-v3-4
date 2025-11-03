import React from 'react';

export type InsightType = 'trend' | 'warning' | 'success' | 'info';

interface InsightCardProps {
  type: InsightType;
  title: string;
  description: string;
  confidence?: number; // 0-100
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const typeStyles = {
  trend: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  },
  info: {
    bg: 'bg-gray-50 dark:bg-gray-800/20',
    border: 'border-gray-200 dark:border-gray-700',
    icon: 'text-gray-600 dark:text-gray-400',
    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  },
};

const defaultIcons = {
  trend: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  success: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  description,
  confidence,
  icon,
  action,
}) => {
  const styles = typeStyles[type];
  const displayIcon = icon || defaultIcons[type];

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 80) return 'Hoge betrouwbaarheid';
    if (conf >= 60) return 'Gemiddelde betrouwbaarheid';
    return 'Lage betrouwbaarheid';
  };

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 hover:shadow-md transition-all`}>
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`${styles.icon} flex-shrink-0 mt-0.5`}>
          {displayIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              {title}
            </h3>
            {confidence !== undefined && (
              <span className={`${styles.badge} text-xs font-medium px-2 py-1 rounded-full ml-2 whitespace-nowrap`}>
                {confidence}% {getConfidenceLabel(confidence)}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 dark:text-dark-text-secondary mb-3">
            {description}
          </p>

          {action && (
            <button
              onClick={action.onClick}
              className={`text-sm font-medium ${styles.icon} hover:underline focus:outline-none`}
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
