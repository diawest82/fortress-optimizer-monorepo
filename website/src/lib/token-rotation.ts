/**
 * Token Rotation Service
 * Implements secure token rotation on refresh to prevent token reuse
 */

import { sign, verify } from 'jsonwebtoken';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
  jti?: string; // JWT ID for token tracking
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

// In-memory store for token blacklist (use Redis in production)
const tokenBlacklist = new Set<string>();

/**
 * Generate a unique JWT ID (jti) for token tracking
 */
function generateJti(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate new access and refresh tokens
 */
export function generateTokenPair(userId: string, email: string): TokenPair {
  const jti = generateJti();
  const now = Math.floor(Date.now() / 1000);

  const accessTokenPayload: TokenPayload = {
    userId,
    email,
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY,
    jti,
  };

  const refreshTokenPayload: TokenPayload = {
    userId,
    email,
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRY,
    jti: `refresh-${jti}`,
  };

  return {
    accessToken: sign(accessTokenPayload, JWT_SECRET),
    refreshToken: sign(refreshTokenPayload, JWT_SECRET),
    accessTokenExpiry: now + ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: now + REFRESH_TOKEN_EXPIRY,
  };
}

/**
 * Verify and rotate tokens on refresh
 * Old refresh token is blacklisted to prevent reuse
 */
export function rotateTokens(oldRefreshToken: string): TokenPair | null {
  try {
    // Check if token is already blacklisted
    if (tokenBlacklist.has(oldRefreshToken)) {
      console.warn('Attempted to reuse a blacklisted token - potential security issue');
      return null;
    }

    // Verify the refresh token
    const payload = verify(oldRefreshToken, JWT_SECRET) as TokenPayload;

    // Check if it's actually a refresh token
    if (!payload.jti?.startsWith('refresh-')) {
      console.warn('Invalid token type for refresh');
      return null;
    }

    // Blacklist the old refresh token
    tokenBlacklist.add(oldRefreshToken);

    // Generate new token pair
    return generateTokenPair(payload.userId, payload.email);
  } catch (error) {
    console.error('Token rotation failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    if (tokenBlacklist.has(token)) {
      return null;
    }

    return verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Revoke a token (add to blacklist)
 */
export function revokeToken(token: string): void {
  tokenBlacklist.add(token);
}

/**
 * Clear expired tokens from blacklist (should run periodically)
 * In production, use Redis with TTL instead of in-memory Set
 */
export function cleanupExpiredTokens(): void {
  // In production, Redis will automatically expire keys
  // For in-memory implementation, we'd need additional timestamp tracking
  console.log('Token cleanup completed (production: use Redis TTL)');
}

/**
 * Get token statistics
 */
export function getTokenStats(): {
  blacklistedTokenCount: number;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
} {
  return {
    blacklistedTokenCount: tokenBlacklist.size,
    accessTokenExpiry: ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: REFRESH_TOKEN_EXPIRY,
  };
}
