/**
 * React hooks for performance monitoring
 */

import { useEffect, useRef } from 'react';
import { startTrace, stopTrace, trackComponentRender } from '../services/performance';
import type { PerformanceTrace } from 'firebase/performance';

/**
 * Hook to track component mount/render performance
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   usePerformanceTrace('MyComponent');
 *   // ... component code
 * }
 * ```
 */
export function usePerformanceTrace(componentName: string): void {
  const traceRef = useRef<PerformanceTrace | null>(null);

  useEffect(() => {
    // Start trace on mount
    traceRef.current = startTrace(`component_${componentName}_mount`);

    return () => {
      // Stop trace on unmount
      stopTrace(traceRef.current, { component: componentName });
    };
  }, [componentName]);
}

/**
 * Hook to track render performance (development only)
 * Logs to console when component renders
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderTracking('MyComponent', { propId: id });
 *   // ... component code
 * }
 * ```
 */
export function useRenderTracking(componentName: string, metadata?: Record<string, any>): void {
  const renderCount = useRef(0);
  const lastRender = useRef(Date.now());

  if (import.meta.env.DEV) {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRender.current;
    lastRender.current = now;

    console.log(`🔄 ${componentName} render #${renderCount.current}`, {
      timeSinceLastRender: `${timeSinceLastRender}ms`,
      metadata
    });
  }
}

/**
 * Hook to measure async operation performance
 * 
 * @example
 * ```tsx
 * const { measure } = useAsyncPerformance();
 * 
 * const loadData = async () => {
 *   await measure('loadData', async () => {
 *     const data = await fetchData();
 *     setData(data);
 *   });
 * };
 * ```
 */
export function useAsyncPerformance() {
  const measure = async <T,>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const trace = startTrace(operationName);
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      stopTrace(trace, {
        operation: operationName,
        duration: String(Math.round(duration)),
        status: 'success'
      });

      if (import.meta.env.DEV) {
        console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      stopTrace(trace, {
        operation: operationName,
        duration: String(Math.round(duration)),
        status: 'error'
      });

      throw error;
    }
  };

  return { measure };
}

/**
 * Hook to track slow renders (development only)
 * Warns when component renders take longer than threshold
 */
export function useSlowRenderDetection(componentName: string, threshold = 16): void {
  const renderStart = useRef(performance.now());

  useEffect(() => {
    if (import.meta.env.DEV) {
      const duration = performance.now() - renderStart.current;
      
      if (duration > threshold) {
        console.warn(`⚠️ Slow render detected in ${componentName}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      }
    }
    
    // Update for next render
    renderStart.current = performance.now();
  });
}
