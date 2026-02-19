/**
 * Token Rate Limiting Service
 * Enforces monthly token limits per subscription tier
 */

import prisma from '@/lib/prisma';

export interface TokenLimit {
  tier: string;
  monthlyLimit: number;
  resetDay: number; // Day of month when limit resets
}

export const TIER_TOKEN_LIMITS: Record<string, TokenLimit> = {
  free: { tier: 'free', monthlyLimit: 50000, resetDay: 1 },
  starter: { tier: 'starter', monthlyLimit: 500000, resetDay: 1 },
  signup: { tier: 'signup', monthlyLimit: 500000, resetDay: 1 },
  teams: { tier: 'teams', monthlyLimit: -1, resetDay: 1 }, // -1 = unlimited
  enterprise: { tier: 'enterprise', monthlyLimit: -1, resetDay: 1 }, // -1 = unlimited
};

/**
 * Get the current billing period for a user
 */
export function getBillingPeriod(
  resetDay: number = 1
): { start: Date; end: Date } {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  let start: Date;
  let end: Date;

  if (currentDay >= resetDay) {
    // We're in the current billing period
    start = new Date(currentYear, currentMonth, resetDay, 0, 0, 0, 0);
    // End is first day of next month at billing day
    const nextMonth = new Date(currentYear, currentMonth + 1, resetDay, 0, 0, 0, 0);
    end = nextMonth;
  } else {
    // We're in the previous month's billing period
    const prevMonth = new Date(currentYear, currentMonth - 1, resetDay, 0, 0, 0, 0);
    start = prevMonth;
    end = new Date(currentYear, currentMonth, resetDay, 0, 0, 0, 0);
  }

  return { start, end };
}

/**
 * Check if user has exceeded their token limit
 */
export async function checkTokenLimit(
  userId: string,
  requestedTokens: number = 1000
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  message?: string;
}> {
  try {
    // Get user and subscription info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeCustomerId: true,
        billingCycleDay: true,
      },
    });

    if (!user) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        message: 'User not found',
      };
    }

    // Determine tier (default to free)
    let tier = 'free';
    if (user.stripeCustomerId) {
      // In production, would fetch from Stripe
      // For now, default to starter
      tier = 'starter';
    }

    const tierLimit = TIER_TOKEN_LIMITS[tier];
    if (!tierLimit) {
      tier = 'free';
    }

    const monthlyLimit = TIER_TOKEN_LIMITS[tier].monthlyLimit;

    // If unlimited (-1), always allow
    if (monthlyLimit === -1) {
      return {
        allowed: true,
        used: 0,
        limit: -1,
        remaining: -1,
      };
    }

    // Get current billing period
    const resetDay = user.billingCycleDay || 1;
    const { start, end } = getBillingPeriod(resetDay);

    // Count tokens used this period (placeholder - would need tracking)
    // For now, assume 0 tokens used
    const tokensUsed = 0;

    const allowed = tokensUsed + requestedTokens <= monthlyLimit;

    return {
      allowed,
      used: tokensUsed,
      limit: monthlyLimit,
      remaining: Math.max(0, monthlyLimit - tokensUsed),
      message: allowed
        ? undefined
        : `Token limit exceeded. Used: ${tokensUsed}/${monthlyLimit}`,
    };
  } catch (error) {
    console.error('Token rate limit check failed:', error);
    // Fail open - allow request if check fails
    return {
      allowed: true,
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }
}

/**
 * Track token usage
 */
export async function trackTokenUsage(
  userId: string,
  tokensUsed: number,
  operation: string
): Promise<void> {
  try {
    // TODO: Create analytics record when analytics table is available
    console.log(
      `Token usage tracked: user=${userId}, tokens=${tokensUsed}, operation=${operation}`
    );
  } catch (error) {
    console.error('Failed to track token usage:', error);
    // Don't throw - logging is non-critical
  }
}
