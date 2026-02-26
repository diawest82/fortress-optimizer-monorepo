/**
 * CSRF Protection Service
 * Generates and validates CSRF tokens for protecting against Cross-Site Request Forgery attacks
 */

import crypto from 'crypto';

interface CsrfToken {
  token: string;
  secret: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory token storage (in production, use Redis or database)
const tokenStore = new Map<string, CsrfToken>();

// Token expiration: 1 hour
const TOKEN_EXPIRATION = 60 * 60 * 1000;

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): CsrfToken {
  const secret = crypto.randomBytes(32).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  const csrfToken: CsrfToken = {
    token,
    secret,
    createdAt: now,
    expiresAt: now + TOKEN_EXPIRATION,
  };

  // Store token
  tokenStore.set(token, csrfToken);

  // Clean up expired tokens every 10 minutes
  if (tokenStore.size > 1000) {
    cleanupExpiredTokens();
  }

  return csrfToken;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string, signature: string): boolean {
  const csrfToken = tokenStore.get(token);

  // Token not found or expired
  if (!csrfToken || csrfToken.expiresAt < Date.now()) {
    return false;
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', csrfToken.secret)
    .update(token)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (isValid) {
    // Remove token after use (one-time use)
    tokenStore.delete(token);
  }

  return isValid;
}

/**
 * Create signature for a token (client-side generation)
 */
export function createTokenSignature(token: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('hex');
}

/**
 * Clean up expired tokens from storage
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token);
    }
  }
}
