/**
 * Team Seat & Usage Limits
 * Enforces per-tier limitations on team members and token usage
 *
 * Team pricing uses a sliding scale:
 *   1-5 seats:    $49 flat ($9.80/seat)
 *   6-25 seats:   $49 + $8/seat over 5
 *   26-100 seats: $209 + $6/seat over 25
 *   101-500 seats: $659 + $4/seat over 100
 *   500+: Enterprise (custom)
 */

const TIER_LIMITS = {
  free: {
    maxTeamSeats: 1,
    maxTokensPerMonth: 50_000,
    description: 'Individual use only',
  },
  individual: {
    maxTeamSeats: 1,
    maxTokensPerMonth: Infinity,
    description: 'Single developer — unlimited tokens',
  },
  teams: {
    maxTeamSeats: 500,
    maxTokensPerMonth: Infinity,
    description: 'Up to 500 team members — sliding scale pricing',
  },
  enterprise: {
    maxTeamSeats: Infinity,
    maxTokensPerMonth: Infinity,
    description: '500+ team members — custom pricing',
  },
};

/**
 * Calculate team price based on sliding scale
 */
export function calculateTeamPrice(seats: number): {
  total: number;
  perSeat: number;
  tier: string;
  discount: number;
} {
  if (seats <= 5) {
    return { total: 49, perSeat: 49 / seats, tier: 'Team Starter', discount: 0 };
  } else if (seats <= 25) {
    const total = 49 + (seats - 5) * 8;
    return { total, perSeat: total / seats, tier: 'Team', discount: 18 };
  } else if (seats <= 100) {
    const total = 209 + (seats - 25) * 6;
    return { total, perSeat: total / seats, tier: 'Team Business', discount: 39 };
  } else if (seats <= 500) {
    const total = 659 + (seats - 100) * 4;
    return { total, perSeat: total / seats, tier: 'Team Scale', discount: 59 };
  }
  return { total: 0, perSeat: 0, tier: 'Enterprise', discount: 0 };
}

export async function checkTeamSeatLimit(
  tier: string,
  currentMemberCount: number,
  purchasedSeats?: number,
): Promise<{ allowed: boolean; message: string; limit: number }> {
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

  // For teams tier, use purchasedSeats if provided (from their subscription)
  const effectiveLimit = tier === 'teams' && purchasedSeats
    ? purchasedSeats
    : limits.maxTeamSeats;

  if (currentMemberCount >= effectiveLimit && effectiveLimit !== Infinity) {
    return {
      allowed: false,
      message: `Your plan supports up to ${effectiveLimit} team member(s). ${
        tier === 'teams' ? 'Add more seats to your subscription or upgrade to Enterprise.' : 'Please upgrade to add more.'
      }`,
      limit: effectiveLimit,
    };
  }

  return {
    allowed: true,
    message: `You have ${effectiveLimit === Infinity ? 'unlimited' : effectiveLimit - currentMemberCount} seats remaining`,
    limit: effectiveLimit,
  };
}

export async function checkTokenLimit(
  tier: string,
  tokensUsedThisMonth: number
): Promise<{ allowed: boolean; message: string; limit: number }> {
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

  if (tokensUsedThisMonth >= limits.maxTokensPerMonth && limits.maxTokensPerMonth !== Infinity) {
    return {
      allowed: false,
      message: `You've reached your monthly limit of ${limits.maxTokensPerMonth.toLocaleString()} tokens. Please upgrade or wait until next month.`,
      limit: limits.maxTokensPerMonth,
    };
  }

  const remaining = limits.maxTokensPerMonth === Infinity
    ? Infinity
    : limits.maxTokensPerMonth - tokensUsedThisMonth;

  return {
    allowed: true,
    message: `You have ${remaining === Infinity ? 'unlimited' : remaining.toLocaleString()} tokens remaining`,
    limit: limits.maxTokensPerMonth,
  };
}

export function getTierFeatures(tier: string) {
  const features: Record<string, string[]> = {
    free: [
      '50K tokens/month',
      '1 team member max',
      'Basic metrics dashboard',
      'Community support',
    ],
    individual: [
      'Unlimited tokens',
      '1 team member',
      'All 12 integration platforms',
      'Real-time optimization',
      'Advanced analytics',
      'Email support (24-48h)',
      'API access',
    ],
    teams: [
      'Unlimited tokens for every seat',
      'Up to 500 team members',
      'Sliding scale pricing (up to 59% off)',
      'Team management & RBAC',
      'Advanced analytics & team usage tracking',
      'Priority support (4-8h)',
      'Slack integration',
      'Admin dashboard',
      'Higher rate limits',
    ],
    enterprise: [
      'Everything in Teams',
      '500+ team seats',
      'Dedicated account manager',
      'Custom SLA',
      'Custom integrations',
      'On-premise deployment option',
    ],
  };
  return features[tier] || features.free;
}
