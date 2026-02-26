/**
 * Rate Limiting Service
 * Implements sliding window rate limiting for authentication endpoints
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

type RateLimitStore = Map<string, RateLimitEntry>;

// Separate stores for different endpoints
const loginAttempts: RateLimitStore = new Map();
const signupAttempts: RateLimitStore = new Map();
const passwordResetAttempts: RateLimitStore = new Map();
const apiKeyAttempts: RateLimitStore = new Map();

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

// Rate limit configurations (all in milliseconds)
export const rateLimitConfigs = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  apiKey: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * Check if a request is rate limited
 */
function isRateLimited(
  store: RateLimitStore,
  key: string,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    // First request
    store.set(key, { count: 1, resetTime: now + config.windowMs });
    return false;
  }

  if (now > entry.resetTime) {
    // Window has expired, reset
    store.set(key, { count: 1, resetTime: now + config.windowMs });
    return false;
  }

  if (entry.count >= config.maxAttempts) {
    // Rate limit exceeded
    return true;
  }

  // Increment count
  entry.count++;
  return false;
}

/**
 * Get remaining attempts
 */
function getRemainingAttempts(
  store: RateLimitStore,
  key: string,
  config: RateLimitConfig
): number {
  const entry = store.get(key);
  if (!entry) {
    return config.maxAttempts;
  }
  return Math.max(0, config.maxAttempts - entry.count);
}

/**
 * Get reset time in seconds
 */
function getResetTimeInSeconds(store: RateLimitStore, key: string): number {
  const entry = store.get(key);
  if (!entry) {
    return 0;
  }
  const resetTime = Math.ceil((entry.resetTime - Date.now()) / 1000);
  return Math.max(0, resetTime);
}

/**
 * Check login rate limit by IP address
 */
export function checkLoginRateLimit(ipAddress: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const key = `login:${ipAddress}`;
  const allowed = !isRateLimited(loginAttempts, key, rateLimitConfigs.login);

  return {
    allowed,
    remaining: getRemainingAttempts(loginAttempts, key, rateLimitConfigs.login),
    resetIn: getResetTimeInSeconds(loginAttempts, key),
  };
}

/**
 * Check signup rate limit by IP address
 */
export function checkSignupRateLimit(ipAddress: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const key = `signup:${ipAddress}`;
  const allowed = !isRateLimited(signupAttempts, key, rateLimitConfigs.signup);

  return {
    allowed,
    remaining: getRemainingAttempts(signupAttempts, key, rateLimitConfigs.signup),
    resetIn: getResetTimeInSeconds(signupAttempts, key),
  };
}

/**
 * Check password reset rate limit by email
 */
export function checkPasswordResetRateLimit(email: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const key = `reset:${email}`;
  const allowed = !isRateLimited(
    passwordResetAttempts,
    key,
    rateLimitConfigs.passwordReset
  );

  return {
    allowed,
    remaining: getRemainingAttempts(
      passwordResetAttempts,
      key,
      rateLimitConfigs.passwordReset
    ),
    resetIn: getResetTimeInSeconds(passwordResetAttempts, key),
  };
}

/**
 * Check API key generation rate limit by user ID
 */
export function checkApiKeyRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const key = `apikey:${userId}`;
  const allowed = !isRateLimited(apiKeyAttempts, key, rateLimitConfigs.apiKey);

  return {
    allowed,
    remaining: getRemainingAttempts(apiKeyAttempts, key, rateLimitConfigs.apiKey),
    resetIn: getResetTimeInSeconds(apiKeyAttempts, key),
  };
}

/**
 * Reset rate limit for a key (admin use)
 */
export function resetRateLimit(type: 'login' | 'signup' | 'reset' | 'apikey', key: string): void {
  const stores: Record<string, RateLimitStore> = {
    login: loginAttempts,
    signup: signupAttempts,
    reset: passwordResetAttempts,
    apikey: apiKeyAttempts,
  };

  const store = stores[type];
  if (store) {
    store.delete(key);
  }
}

/**
 * Clear all rate limit data (for testing)
 */
export function clearAllRateLimits(): void {
  loginAttempts.clear();
  signupAttempts.clear();
  passwordResetAttempts.clear();
  apiKeyAttempts.clear();
}
