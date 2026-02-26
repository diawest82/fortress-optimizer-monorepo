/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Web Vitals and Performance Monitoring
 * Tracks Core Web Vitals and custom performance metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  threshold?: number;
}

// Core Web Vitals thresholds (in milliseconds or units specified)
const THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint
  FID: 100, // First Input Delay
  CLS: 0.1, // Cumulative Layout Shift
  TTFB: 600, // Time to First Byte
  FCP: 1800, // First Contentful Paint
};

/**
 * Collect and report Web Vitals
 */
export function reportWebVitals(metric: any) {
  const perfMetric: PerformanceMetric = {
    name: metric.name,
    value: metric.value,
    unit: metric.unit || 'ms',
    timestamp: metric.startTime || Date.now(),
    threshold: THRESHOLDS[metric.name as keyof typeof THRESHOLDS],
  };

  // Check if metric exceeds threshold
  if (perfMetric.threshold && perfMetric.value > perfMetric.threshold) {
    console.warn(`Performance warning: ${metric.name} (${perfMetric.value}ms) exceeds threshold (${perfMetric.threshold}ms)`);
    
    // Report to monitoring service
    trackPerformanceIssue(perfMetric);
  }

  // Send to analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      event_label: metric.id,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Web Vital: ${metric.name} = ${perfMetric.value}${perfMetric.unit}`);
  }
}

/**
 * Track performance issues
 */
function trackPerformanceIssue(metric: PerformanceMetric) {
  // Send to monitoring service (Sentry, DataDog, etc.)
  try {
    navigator.sendBeacon('/api/metrics/performance', JSON.stringify(metric));
  } catch (error) {
    console.error('Failed to report performance metric:', error);
  }
}

/**
 * Monitor API response times
 */
export function measureApiCall(endpoint: string, duration: number) {
  const metric: PerformanceMetric = {
    name: `API_${endpoint}`,
    value: duration,
    unit: 'ms',
    timestamp: Date.now(),
  };

  // Flag slow API calls (>500ms)
  if (duration > 500) {
    trackPerformanceIssue(metric);
  }

  // Send to monitoring
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'api_call', {
      endpoint,
      duration: Math.round(duration),
      event_category: 'Performance',
    });
  }
}

/**
 * Get navigation timing data
 */
export function getNavigationMetrics() {
  if (!window.performance || !window.performance.timing) {
    return null;
  }

  const timing = window.performance.timing;
  return {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    ttfb: timing.responseStart - timing.navigationStart,
    download: timing.responseEnd - timing.responseStart,
    domInteractive: timing.domInteractive - timing.navigationStart,
    domComplete: timing.domComplete - timing.navigationStart,
    loadComplete: timing.loadEventEnd - timing.navigationStart,
  };
}

/**
 * Get memory usage (if available)
 */
export function getMemoryMetrics() {
  if (typeof performance === 'undefined' || !(performance as any).memory) {
    return null;
  }

  const mem = (performance as any).memory;
  return {
    usedJSHeapSize: mem.usedJSHeapSize,
    totalJSHeapSize: mem.totalJSHeapSize,
    jsHeapSizeLimit: mem.jsHeapSizeLimit,
    percentage: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100,
  };
}

/**
 * Monitor long tasks
 */
export function setupLongTaskMonitoring() {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn('Long task detected:', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          });

          trackPerformanceIssue({
            name: 'LONG_TASK',
            value: entry.duration,
            unit: 'ms',
            timestamp: entry.startTime,
            threshold: 50, // More than 50ms is considered long
          });
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      console.debug('Long task monitoring not supported');
    }
  }
}

/**
 * Monitor resource loading
 */
export function setupResourceMonitoring() {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          
          // Warn about slow resources (>3s)
          if (resource.duration > 3000) {
            console.warn('Slow resource:', {
              name: resource.name,
              duration: resource.duration,
            });

            trackPerformanceIssue({
              name: `RESOURCE_${resource.initiatorType}`,
              value: resource.duration,
              unit: 'ms',
              timestamp: resource.startTime,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch {
      console.debug('Resource monitoring not supported');
    }
  }
}

const performanceMonitor = {
  reportWebVitals,
  measureApiCall,
  getNavigationMetrics,
  getMemoryMetrics,
  setupLongTaskMonitoring,
  setupResourceMonitoring,
};

export default performanceMonitor;
