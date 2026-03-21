/**
 * JWT Authentication Utility
 * Shared token verification for all API routes.
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE-THIS-IN-PRODUCTION';

if (JWT_SECRET === 'CHANGE-THIS-IN-PRODUCTION' && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET is not set. Refusing to start with insecure default. Set JWT_SECRET or NEXTAUTH_SECRET environment variable.');
}

export interface JWTPayload {
  id: string;
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token from Authorization header or cookie.
 * Returns the decoded payload or null if invalid/expired.
 */
export function verifyAuthToken(req: NextRequest): JWTPayload | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  // Check cookie
  const cookieToken = req.cookies.get('fortress_auth_token')?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}

/**
 * Verify a JWT token string and return the payload.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    // Token is invalid, expired, or tampered
    return null;
  }
}

/**
 * Extract user ID from request (convenience wrapper).
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  const payload = verifyAuthToken(req);
  return payload?.id || null;
}

/**
 * Validate CSRF token (double-submit cookie pattern).
 * Compares X-CSRF-Token header against fortress_csrf_token cookie.
 */
export function validateCsrf(req: NextRequest): boolean {
  const cookieToken = req.cookies.get('fortress_csrf_token')?.value;
  const headerToken = req.headers.get('x-csrf-token');

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify auth + CSRF for state-changing requests (POST/PUT/DELETE).
 * Returns the authenticated user payload or null.
 * If CSRF validation fails, returns null (treat as unauthorized).
 */
export function verifyMutatingRequest(req: NextRequest): JWTPayload | null {
  const payload = verifyAuthToken(req);
  if (!payload) return null;

  // CSRF check for browser-originated mutating requests
  // Skip for API key auth (non-browser clients don't have CSRF cookies)
  const hasCsrfCookie = !!req.cookies.get('fortress_csrf_token')?.value;
  if (hasCsrfCookie && !validateCsrf(req)) {
    console.log(JSON.stringify({
      event: 'csrf_validation_failed',
      userId: payload.id,
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    }));
    return null;
  }

  return payload;
}
