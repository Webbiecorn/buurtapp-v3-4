import React from 'react';
import { TrendingUpIcon, TrendingDownIcon } from './Icons';

interface PeriodComparisonProps {
  title: string;
  currentValue: number;
  previousValue: number;
  format?: (value: number) => string;
  icon?: React.ReactNode;
  color?: string;
}

export const PeriodComparison: React.FC<PeriodComparisonProps> = ({
  title,
  currentValue,
  previousValue,
  format = (v) => v.toString(),
  icon,
  color = 'bg-blue-500'
}) => {
  const difference = currentValue - previousValue;
  const percentageChange = previousValue === 0 
    ? (currentValue > 0 ? 100 : 0) 
    : ((difference / previousValue) * 100);
  
  const isPositive = difference >= 0;
  const isSignificant = Math.abs(percentageChange) >= 5;
  
  // Format numbers with max 2 decimals
  const formatNumber = (num: number) => {
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  return (
    <div className="relative z-10 bg-white dark:bg-dark-surface rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">{title}</h3>
        {icon && (
          <div className={`${color} p-2 rounded-lg`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
            {format(currentValue)}
          </span>
          <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
            huidige periode
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
            isSignificant
              ? isPositive 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {isPositive ? (
              <TrendingUpIcon className="h-4 w-4" />
            ) : (
              <TrendingDownIcon className="h-4 w-4" />
            )}
            <span className="text-xs font-semibold">
              {isPositive ? '+' : ''}{formatNumber(percentageChange)}%
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
            vs vorige periode ({format(previousValue)})
          </span>
        </div>

        {isSignificant && (
          <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-2">
            {isPositive 
              ? `📈 Significante stijging van ${formatNumber(Math.abs(difference))} ${title.toLowerCase()}`
              : `📉 Significante daling van ${formatNumber(Math.abs(difference))} ${title.toLowerCase()}`
            }
          </p>
        )}
      </div>
    </div>
  );
};
