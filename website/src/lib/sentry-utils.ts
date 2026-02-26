/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Sentry from '@sentry/nextjs';

/**
 * Sentry Integration Utilities
 * Helper functions for error tracking, breadcrumbs, and performance monitoring
 */

/**
 * Capture exception and report to Sentry
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Capture message and report to Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category?: string,
  level?: Sentry.SeverityLevel
) {
  Sentry.captureMessage(message, {
    level,
    tags: {
      category: category || 'default',
    },
    contexts: {
      breadcrumb: data,
    },
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Set custom tags for filtering errors in Sentry dashboard
 */
export function setErrorTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Set custom context data
 */
export function setErrorContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  return Sentry.captureMessage(name, {
    level: 'info',
    tags: { operation: op },
  });
}

/**
 * Wrap async function with error handling
 */
export function withSentry<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error as Error, {
        functionName: fn.name,
        arguments: args,
      });
      throw error;
    }
  }) as T;
}

/**
 * Wrap sync function with error handling
 */
export function withSentrySync<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (error) {
      captureException(error as Error, {
        functionName: fn.name,
        arguments: args,
      });
      throw error;
    }
  }) as T;
}

/**
 * HTTP request error handler
 */
export function handleHttpError(
  statusCode: number,
  message: string,
  context?: Record<string, any>
) {
  const level: Sentry.SeverityLevel =
    statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'info';

  captureMessage(`HTTP ${statusCode}: ${message}`, level);

  if (context) {
    setErrorContext('http_error', {
      statusCode,
      message,
      ...context,
    });
  }
}

/**
 * Database error handler
 */
export function handleDatabaseError(error: Error, query?: string) {
  captureException(error, {
    type: 'database_error',
    query: query ? query.substring(0, 500) : undefined, // Limit query length
  });
}

/**
 * Authentication error handler
 */
export function handleAuthError(error: Error, userId?: string) {
  captureException(error, {
    type: 'auth_error',
    userId,
  });
}

export default Sentry;
