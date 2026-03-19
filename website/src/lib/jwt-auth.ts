/**
 * JWT Authentication Utility
 * Shared token verification for all API routes.
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE-THIS-IN-PRODUCTION';

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

  // Check x-user-context header (for internal API calls)
  const userContext = req.headers.get('x-user-context');
  if (userContext) {
    try {
      return JSON.parse(Buffer.from(userContext, 'base64').toString()) as JWTPayload;
    } catch {
      return null;
    }
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
