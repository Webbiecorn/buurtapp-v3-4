import React from 'react';
import { TrendingUpIcon, TrendingDownIcon } from './Icons';
import ReactECharts from 'echarts-for-react';

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
  color = 'from-blue-500 to-blue-600'
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

  // Mini sparkline chart
  const chartOption = {
    grid: { top: 0, right: 0, bottom: 0, left: 0 },
    xAxis: { type: 'category', show: false, data: ['Vorige', 'Huidige'] },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line',
      data: [previousValue, currentValue],
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color: isPositive ? '#22c55e' : '#ef4444'
      },
      itemStyle: {
        color: isPositive ? '#22c55e' : '#ef4444'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)' },
            { offset: 1, color: isPositive ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)' }
          ]
        }
      }
    }],
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-dark-surface rounded-xl shadow-md hover:shadow-xl transition-all duration-300 group">
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary uppercase tracking-wide">{title}</h3>
          {icon && (
            <div className={`bg-gradient-to-br ${color} p-2.5 rounded-lg shadow-lg`}>
              {icon}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline space-x-3">
            <span className="text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
              {format(currentValue)}
            </span>
            <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full ${
              isSignificant
                ? isPositive
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 text-red-700 dark:text-red-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            } shadow-sm`}>
              {isPositive ? (
                <TrendingUpIcon className="h-3.5 w-3.5" />
              ) : (
                <TrendingDownIcon className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-bold">
                {isPositive ? '+' : ''}{formatNumber(percentageChange)}%
              </span>
            </div>
          </div>

          {/* Mini Sparkline */}
          <div className="h-12 -mx-2">
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
              Vorige periode: <span className="font-semibold">{format(previousValue)}</span>
            </span>
            {isSignificant && (
              <span className={`text-xs font-medium ${
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {isPositive ? '↑' : '↓'} {formatNumber(Math.abs(difference))}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
