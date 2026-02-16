/**
 * Error Fallback Component
 * 
 * Herbruikbare fallback UI voor Error Boundaries.
 * Kan gebruikt worden als custom fallback prop.
 */

import React from 'react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-8 border border-gray-200 dark:border-dark-border text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
            Oeps!
          </h2>

          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
            Er is iets misgegaan bij het laden van deze pagina.
          </p>

          {/* Development Mode Error Details */}
          {isDev && error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded text-left">
              <p className="text-xs text-red-800 dark:text-red-300 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {resetError && (
              <button
                onClick={resetError}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-medium rounded-lg transition-colors"
              >
                Probeer opnieuw
              </button>
            )}
            <button
              onClick={() => (window.location.href = '/#/')}
              className="px-4 py-2 bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-dark-text-primary font-medium rounded-lg transition-colors"
            >
              Terug naar home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
