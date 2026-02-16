/**
 * Error Boundary Component
 * 
 * React Error Boundary voor graceful error handling.
 * Vangt errors in child components op en voorkomt white screen.
 * 
 * Features:
 * - Automatische error logging naar logger + analytics
 * - Fallback UI met recovery opties
 * - Development mode toont error details
 * - Production mode toont gebruiksvriendelijke boodschap
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';
import { trackError } from '../services/analytics';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state zodat de fallback UI wordt getoond
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Track in Analytics
    trackError('react_error_boundary', error.message, {
      component_stack: errorInfo.componentStack?.substring(0, 200),
    });

    // Update state met error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-8 border border-gray-200 dark:border-dark-border">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-red-600 dark:text-red-400"
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

              {/* Error Title */}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary text-center mb-4">
                Er is iets misgegaan
              </h1>

              {/* Error Message */}
              <p className="text-gray-600 dark:text-dark-text-secondary text-center mb-6">
                We hebben een onverwachte fout gedetecteerd. Het team is automatisch op de hoogte gebracht.
              </p>

              {/* Development Mode Error Details */}
              {isDev && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="font-semibold text-red-900 dark:text-red-400 mb-2">
                    Development Mode - Error Details:
                  </h3>
                  <pre className="text-sm text-red-800 dark:text-red-300 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-red-900 dark:text-red-400">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs text-red-800 dark:text-red-300 overflow-auto max-h-60 whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  Probeer opnieuw
                </button>
                <button
                  onClick={() => (window.location.href = '/#/')}
                  className="px-6 py-3 bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-dark-text-primary font-medium rounded-lg transition-colors"
                >
                  Terug naar home
                </button>
              </div>

              {/* Support Info */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border text-center">
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                  Blijft het probleem zich voordoen?{' '}
                  <button
                    onClick={() => window.location.reload()}
                    className="text-brand-primary hover:underline"
                  >
                    Herlaad de pagina
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
