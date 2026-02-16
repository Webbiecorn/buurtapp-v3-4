/**
 * Performance Monitoring Service
 * 
 * Biedt Firebase Performance Monitoring integratie voor:
 * - Custom traces voor belangrijke operaties
 * - Slow query detection voor Firestore
 * - Network request monitoring
 * - Component render performance tracking
 */

import { getPerformance, trace as createTrace, type Performance, PerformanceTrace } from 'firebase/performance';
import { app } from '../firebase';
import { logger } from './logger';

let perf: Performance | null = null;

// Initialize performance monitoring (only in production)
try {
  if (import.meta.env.PROD) {
    perf = getPerformance(app);
  } else {
    console.log('Performance monitoring disabled in development');
  }
} catch (error) {
  console.warn('Failed to initialize Firebase Performance', error);
}

/**
 * Create a performance trace for monitoring operation duration
 */
export function startTrace(name: string): PerformanceTrace | null {
  if (!perf) return null;

  try {
    const trace = createTrace(perf, name);
    trace.start();
    return trace;
  } catch (error) {
    logger.error('Failed to start performance trace', { name, error });
    return null;
  }
}

/**
 * Stop a performance trace and log timing info
 */
export function stopTrace(trace: PerformanceTrace | null, metadata?: Record<string, string>): void {
  if (!trace) return;

  try {
    // Add custom metadata if provided
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        trace.putAttribute(key, String(value));
      });
    }

    trace.stop();
  } catch (error) {
    logger.error('Failed to stop performance trace', { error });
  }
}

/**
 * Track Firestore query performance
 * Logs warning if query takes longer than threshold
 */
export async function trackFirestoreQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  slowThreshold = 1000
): Promise<T> {
  const trace = startTrace(`firestore_${queryName}`);
  const startTime = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    // Warn about slow queries
    if (duration > slowThreshold) {
      logger.warn('Slow Firestore query detected', {
        query: queryName,
        duration: Math.round(duration),
        threshold: slowThreshold
      });
    }

    stopTrace(trace, {
      query: queryName,
      duration: String(Math.round(duration)),
      status: 'success'
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    stopTrace(trace, {
      query: queryName,
      duration: String(Math.round(duration)),
      status: 'error'
    });

    throw error;
  }
}

/**
 * Track component render performance
 */
export function trackComponentRender(componentName: string): () => void {
  const trace = startTrace(`component_${componentName}`);
  
  return () => {
    stopTrace(trace, { component: componentName });
  };
}

/**
 * Track API call performance
 */
export async function trackApiCall<T>(
  endpoint: string,
  apiFn: () => Promise<T>
): Promise<T> {
  const trace = startTrace(`api_${endpoint}`);
  const startTime = performance.now();

  try {
    const result = await apiFn();
    const duration = performance.now() - startTime;

    stopTrace(trace, {
      endpoint,
      duration: String(Math.round(duration)),
      status: 'success'
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    stopTrace(trace, {
      endpoint,
      duration: String(Math.round(duration)),
      status: 'error'
    });

    throw error;
  }
}

/**
 * Track bundle size metrics (development only)
 */
export function logBundleMetrics(): void {
  if (import.meta.env.PROD) return;

  // Get all loaded scripts
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const totalSize = scripts.reduce((total, script) => {
    const src = script.getAttribute('src');
    if (src && !src.startsWith('http')) {
      // Estimate size from known patterns
      return total + 100; // Placeholder
    }
    return total;
  }, 0);

  console.log('📦 Bundle metrics:', {
    scripts: scripts.length,
    estimatedSize: `${totalSize}KB`
  });
}

/**
 * Performance monitoring utilities for development
 */
export const performanceUtils = {
  /**
   * Measure function execution time
   */
  measureFn: async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  },

  /**
   * Log memory usage (development only)
   */
  logMemory: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('💾 Memory:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      });
    }
  },

  /**
   * Get navigation timing metrics
   */
  getNavigationMetrics: () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!nav) return null;

    return {
      dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcp: Math.round(nav.connectEnd - nav.connectStart),
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      download: Math.round(nav.responseEnd - nav.responseStart),
      domInteractive: Math.round(nav.domInteractive - nav.fetchStart),
      domComplete: Math.round(nav.domComplete - nav.fetchStart),
      loadComplete: Math.round(nav.loadEventEnd - nav.fetchStart)
    };
  }
};
