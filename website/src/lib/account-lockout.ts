/**
 * Account Lockout Service
 * Manages account lockouts after failed login attempts
 */

interface AccountLockout {
  email: string;
  failedAttempts: number;
  lastFailedAttempt: Date;
  lockedUntil?: Date;
}

// In-memory account lockout store (in production, use database)
const accountLockouts = new Map<string, AccountLockout>();

// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if an account is currently locked
 */
export function isAccountLocked(email: string): boolean {
  const lockout = accountLockouts.get(email.toLowerCase());

  if (!lockout || !lockout.lockedUntil) {
    return false;
  }

  const now = new Date();
  if (now > lockout.lockedUntil) {
    // Lock has expired, remove it
    accountLockouts.delete(email.toLowerCase());
    return false;
  }

  return true;
}

/**
 * Get lockout information for an account
 */
export function getLockoutInfo(
  email: string
): { isLocked: boolean; lockedUntil?: Date; remainingSeconds?: number } {
  const lockout = accountLockouts.get(email.toLowerCase());

  if (!lockout || !lockout.lockedUntil) {
    return { isLocked: false };
  }

  const now = new Date();
  if (now > lockout.lockedUntil) {
    accountLockouts.delete(email.toLowerCase());
    return { isLocked: false };
  }

  const remainingSeconds = Math.ceil((lockout.lockedUntil.getTime() - now.getTime()) / 1000);

  return {
    isLocked: true,
    lockedUntil: lockout.lockedUntil,
    remainingSeconds,
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string): {
  failedAttempts: number;
  isNowLocked: boolean;
  remainingAttempts: number;
} {
  const emailLower = email.toLowerCase();
  const now = new Date();
  let lockout = accountLockouts.get(emailLower);

  if (!lockout) {
    // First failed attempt
    lockout = {
      email,
      failedAttempts: 1,
      lastFailedAttempt: now,
    };
  } else {
    // Check if we should reset the counter (outside the window)
    const timeSinceLastAttempt = now.getTime() - lockout.lastFailedAttempt.getTime();

    if (timeSinceLastAttempt > ATTEMPT_RESET_WINDOW_MS) {
      // Reset counter - too much time has passed
      lockout.failedAttempts = 1;
    } else {
      // Increment counter
      lockout.failedAttempts++;
    }

    lockout.lastFailedAttempt = now;
  }

  // Check if account should be locked
  const isNowLocked = lockout.failedAttempts >= MAX_FAILED_ATTEMPTS;

  if (isNowLocked) {
    lockout.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
  }

  accountLockouts.set(emailLower, lockout);

  return {
    failedAttempts: lockout.failedAttempts,
    isNowLocked,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - lockout.failedAttempts),
  };
}

/**
 * Clear failed attempts on successful login
 */
export function clearFailedAttempts(email: string): void {
  accountLockouts.delete(email.toLowerCase());
}

/**
 * Manually unlock an account (admin function)
 */
export function unlockAccount(email: string): boolean {
  const lockout = accountLockouts.get(email.toLowerCase());

  if (!lockout) {
    return false;
  }

  lockout.lockedUntil = undefined;
  lockout.failedAttempts = 0;

  return true;
}

/**
 * Get all locked accounts
 */
export function getLockedAccounts(): { email: string; lockedUntil: Date; remainingSeconds: number }[] {
  const now = new Date();
  const locked = [];

  for (const [, lockout] of accountLockouts.entries()) {
    if (lockout.lockedUntil && now < lockout.lockedUntil) {
      locked.push({
        email: lockout.email,
        lockedUntil: lockout.lockedUntil,
        remainingSeconds: Math.ceil((lockout.lockedUntil.getTime() - now.getTime()) / 1000),
      });
    }
  }

  return locked;
}

/**
 * Clear all lockouts (for testing)
 */
export function clearAllLockouts(): void {
  accountLockouts.clear();
}
