/**
 * Logger Service
 * Centralized logging with environment-aware behavior
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private enableConsole = this.isDevelopment || import.meta.env.VITE_ENABLE_LOGGING === 'true';

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    this.log('error', message, errorContext);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const _logData = {
      timestamp,
      level,
      message,
      ...context
    };

    // Console output (development or explicit enable)
    if (this.enableConsole) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      if (context && Object.keys(context).length > 0) {
        // eslint-disable-next-line no-console
        console[consoleMethod](prefix, message, context);
      } else {
        // eslint-disable-next-line no-console
        console[consoleMethod](prefix, message);
      }
    }

    // TODO: In production, send to Firebase Analytics or external service
    // if (!this.isDevelopment && level === 'error') {
    //   // Send to error tracking service (Sentry, Firebase Crashlytics, etc.)
    //   this.sendToErrorTracking(_logData);
    // }
  }

  /**
   * Log async operation timing
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    this.debug(`⏱️ Starting: ${label}`);
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.debug(`✅ Completed: ${label}`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`❌ Failed: ${label}`, error, { duration: `${duration.toFixed(2)}ms` });
      throw error;
    }
  }
}

// Export singleton instance
export const logger = new Logger();
