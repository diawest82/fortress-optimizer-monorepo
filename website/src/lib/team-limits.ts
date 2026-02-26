/**
 * Team Seat & Usage Limits
 * Enforces per-tier limitations on team members and token usage
 */

const TIER_LIMITS = {
  free: {
    maxTeamSeats: 1,
    maxTokensPerMonth: 50_000,
    description: 'Individual use only',
  },
  individual: {
    maxTeamSeats: 1,
    maxTokensPerMonth: 500_000,
    description: 'Single developer',
  },
  teams: {
    maxTeamSeats: 999, // Configurable per 5 seats
    maxTokensPerMonth: Infinity,
    description: 'Up to 999 team members',
  },
  enterprise: {
    maxTeamSeats: Infinity,
    maxTokensPerMonth: Infinity,
    description: 'Unlimited seats and tokens',
  },
};

export async function checkTeamSeatLimit(
  tier: string,
  currentMemberCount: number
): Promise<{ allowed: boolean; message: string; limit: number }> {
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

  if (currentMemberCount >= limits.maxTeamSeats && limits.maxTeamSeats !== Infinity) {
    return {
      allowed: false,
      message: `Your ${tier} plan supports up to ${limits.maxTeamSeats} team member(s). Please upgrade to add more.`,
      limit: limits.maxTeamSeats,
    };
  }

  return {
    allowed: true,
    message: `You have ${limits.maxTeamSeats === Infinity ? 'unlimited' : limits.maxTeamSeats - currentMemberCount} seats remaining`,
    limit: limits.maxTeamSeats,
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
      'Community support'
    ],
    individual: [
      '500K tokens/month',
      '1 team member',
      'Real-time optimization',
      'Advanced analytics',
      'Email support (24-48h)',
      'API access'
    ],
    teams: [
      'Unlimited tokens',
      'Up to 10 team members',
      'Advanced analytics',
      'Priority support (4-8h)',
      'Slack integration',
      'Custom branding'
    ],
    enterprise: [
      'Unlimited tokens',
      'Unlimited team members',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 priority support',
      'On-premise deployment'
    ],
  };
  return features[tier] || features.free;
}
