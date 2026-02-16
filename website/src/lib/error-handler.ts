/**
 * Centralized Error Handler
 * Provides consistent error responses across the application
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: string;
}

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error response builder
 */
export function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>
): NextResponse<ApiError> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return NextResponse.json(
    {
      code,
      message,
      statusCode,
      details: isDevelopment ? details : undefined,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Predefined error responses
 */
export const ErrorResponses = {
  // 400 - Bad Request
  INVALID_EMAIL: () =>
    createErrorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address'),
  
  INVALID_PASSWORD: (feedback?: string[]) =>
    createErrorResponse(400, 'INVALID_PASSWORD', 'Password does not meet requirements', {
      feedback: feedback || [],
    }),

  INVALID_API_KEY_FORMAT: () =>
    createErrorResponse(400, 'INVALID_API_KEY_FORMAT', 'API key format is invalid'),

  MISSING_REQUIRED_FIELDS: (fields: string[]) =>
    createErrorResponse(400, 'MISSING_REQUIRED_FIELDS', 'Missing required fields', {
      fields,
    }),

  VALIDATION_FAILED: (details: Record<string, any>) =>
    createErrorResponse(400, 'VALIDATION_FAILED', 'Validation failed', details),

  // 401 - Unauthorized
  UNAUTHORIZED: () =>
    createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required'),

  INVALID_CREDENTIALS: () =>
    createErrorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),

  INVALID_TOKEN: () =>
    createErrorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token'),

  TOKEN_EXPIRED: () =>
    createErrorResponse(401, 'TOKEN_EXPIRED', 'Token has expired'),

  // 403 - Forbidden
  FORBIDDEN: () =>
    createErrorResponse(403, 'FORBIDDEN', 'You do not have permission to access this resource'),

  ACCOUNT_LOCKED: (unlockTime?: Date) =>
    createErrorResponse(403, 'ACCOUNT_LOCKED', 'Account is locked due to too many failed login attempts', {
      unlockTime: unlockTime?.toISOString(),
    }),

  // 404 - Not Found
  NOT_FOUND: (resource: string) =>
    createErrorResponse(404, 'NOT_FOUND', `${resource} not found`),

  USER_NOT_FOUND: () =>
    createErrorResponse(404, 'USER_NOT_FOUND', 'User not found'),

  API_KEY_NOT_FOUND: () =>
    createErrorResponse(404, 'API_KEY_NOT_FOUND', 'API key not found'),

  // 409 - Conflict
  RESOURCE_ALREADY_EXISTS: (resource: string) =>
    createErrorResponse(409, 'RESOURCE_ALREADY_EXISTS', `${resource} already exists`),

  EMAIL_ALREADY_EXISTS: () =>
    createErrorResponse(409, 'EMAIL_ALREADY_EXISTS', 'Email address is already registered'),

  // 429 - Too Many Requests
  RATE_LIMIT_EXCEEDED: (retryAfter?: number) =>
    createErrorResponse(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later', {
      retryAfter,
    }),

  // 500 - Internal Server Error
  INTERNAL_SERVER_ERROR: () =>
    createErrorResponse(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred'),

  DATABASE_ERROR: () =>
    createErrorResponse(500, 'DATABASE_ERROR', 'Database operation failed'),

  EMAIL_SERVICE_ERROR: () =>
    createErrorResponse(500, 'EMAIL_SERVICE_ERROR', 'Failed to send email'),
};

/**
 * Error handler middleware for API routes
 */
export async function handleApiError(
  error: unknown,
  context?: { endpoint?: string }
): Promise<NextResponse<ApiError>> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error with context
  if (isDevelopment) {
    console.error(
      `[${context?.endpoint || 'API'}] Error:`,
      error instanceof Error ? error.message : String(error)
    );
  }

  // Handle known errors
  if (error instanceof AppError) {
    return createErrorResponse(error.statusCode, error.code, error.message, error.details);
  }

  // Handle standard errors
  if (error instanceof SyntaxError) {
    return ErrorResponses.VALIDATION_FAILED({ error: 'Invalid JSON' });
  }

  // Default to internal server error
  return ErrorResponses.INTERNAL_SERVER_ERROR();
}

/**
 * Safe error wrapper for API route handlers
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  endpoint?: string
) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, { endpoint });
    }
  };
}
