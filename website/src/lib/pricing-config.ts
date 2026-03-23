/**
 * SINGLE SOURCE OF TRUTH for all pricing.
 * Every component that displays or uses pricing MUST import from here.
 * No hardcoded prices anywhere else in the codebase.
 */

export const PRICING = {
  free: {
    name: 'Free',
    monthly: 0,
    annual: 0,
    tokens: 50_000,
    tokensDisplay: '50K',
    unlimited: false,
    channels: 5,
    channelsDisplay: '5 core integration channels',
    features: [
      `50K tokens/month`,
      '5 core integration channels',
      'Basic metrics dashboard',
      'Community support',
    ],
  },
  pro: {
    name: 'Pro',
    monthly: 15,
    annual: 12, // 20% discount
    tokens: -1,
    tokensDisplay: 'Unlimited',
    unlimited: true,
    channels: 12,
    channelsDisplay: 'All 12 integration platforms',
    features: [
      'Unlimited tokens',
      'All 12 integration platforms',
      'Advanced analytics',
      'API access',
      'Email support',
    ],
  },
  teams: {
    name: 'Teams',
    baseMonthly: 60, // 5 seats at $12/seat
    baseSeats: 5,
    unlimited: true,
    tokens: -1,
    tokensDisplay: 'Unlimited',
    channels: 12,
    channelsDisplay: 'All 12 integration platforms',
    // Graduated per-seat pricing (additional seats beyond base 5)
    seatTiers: [
      { range: '1-5', rate: 12, label: '$12.00/seat', total: '$60 base' },
      { range: '6-25', rate: 10, label: '$10.00/seat', total: '+$10 each' },
      { range: '26-100', rate: 8, label: '$8.00/seat', total: '+$8 each' },
      { range: '101-249', rate: 7, label: '$7.00/seat', total: '+$7 each' },
      { range: '250-500', rate: 6, label: '$6.00/seat', total: '+$6 each' },
    ],
    features: [
      'Unlimited tokens',
      'All 12 integration platforms',
      'Team management',
      'RBAC (role-based access)',
      'Priority support (4-8 hour response)',
      'Slack integration',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    monthly: 'custom' as const,
    unlimited: true,
    tokens: -1,
    tokensDisplay: 'Unlimited',
    channels: 12,
    channelsDisplay: 'All 12+ integration platforms',
    status: 'coming_soon' as const,
    contactEmail: 'sales@fortress-optimizer.com',
    features: [
      'Everything in Teams, plus:',
      '500+ team seats',
      'Dedicated account manager',
      '24/7 premium support (1-hour response)',
      'Custom integrations',
      'On-premise deployment option',
      'SLA guarantee',
    ],
  },
} as const;

// Aliases for backward compatibility
export const PRICING_ALIASES: Record<string, keyof typeof PRICING> = {
  individual: 'pro',
  starter: 'pro',
  team: 'teams',
};

/**
 * Calculate team price for a given seat count.
 * Uses the graduated pricing tiers from PRICING.teams.seatTiers.
 */
export function calculateTeamPrice(seats: number): {
  total: number;
  perSeat: number;
  tier: string;
  discount: number;
} {
  if (seats <= 5) {
    return { total: 60, perSeat: 60 / seats, tier: 'Team Starter', discount: 0 };
  } else if (seats <= 25) {
    const total = 60 + (seats - 5) * 10;
    return { total, perSeat: total / seats, tier: 'Team', discount: Math.round((1 - (total / seats) / 12.00) * 100) };
  } else if (seats <= 100) {
    const total = 60 + 20 * 10 + (seats - 25) * 8;
    return { total, perSeat: total / seats, tier: 'Team Business', discount: Math.round((1 - (total / seats) / 12.00) * 100) };
  } else if (seats <= 249) {
    const total = 60 + 20 * 10 + 75 * 8 + (seats - 100) * 7;
    return { total, perSeat: total / seats, tier: 'Team Scale', discount: Math.round((1 - (total / seats) / 12.00) * 100) };
  } else if (seats <= 500) {
    const total = 60 + 20 * 10 + 75 * 8 + 149 * 7 + (seats - 249) * 6;
    return { total, perSeat: total / seats, tier: 'Team Scale+', discount: Math.round((1 - (total / seats) / 12.00) * 100) };
  }
  return { total: 0, perSeat: 0, tier: 'Enterprise', discount: 0 };
}

/**
 * Annual discount rate (20%)
 */
export const ANNUAL_DISCOUNT = 0.20;

/**
 * Savings claim percentage (used across marketing)
 */
export const SAVINGS_PERCENTAGE = 20;

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM / INTEGRATION CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const PLATFORMS = {
  core: ['npm Package', 'VS Code Extension', 'GitHub Copilot', 'Slack Bot', 'Claude Desktop'],
  additional: ['Neovim', 'Sublime Text', 'JetBrains', 'Cursor', 'Make/Zapier', 'Bing Copilot', 'GPT Store'],
  sdks: ['Anthropic SDK', 'LangChain', 'Vercel AI SDK', 'OpenClaw'],
  get coreCount() { return this.core.length; },       // 5
  get totalCount() { return this.core.length + this.additional.length; }, // 12
  get allCount() { return this.core.length + this.additional.length + this.sdks.length; }, // 16
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT SLA CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const SUPPORT_SLAS = {
  free:       { level: 'Community', responseTime: '48-72 hours', channel: 'Discord' },
  pro:        { level: 'Email',     responseTime: '24-48 hours', channel: 'Email' },
  teams:      { level: 'Priority',  responseTime: '4-8 hours',   channel: 'Email + Slack' },
  enterprise: { level: 'Premium',   responseTime: '1 hour',      channel: '24/7 Dedicated' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT & COMPANY CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const COMPANY = {
  name: 'Fortress Token Optimizer',
  shortName: 'Fortress',
  domain: 'fortress-optimizer.com',
  supportEmail: 'support@fortress-optimizer.com',
  salesEmail: 'sales@fortress-optimizer.com',
  copyrightYear: 2026,
  tagline: 'Cut your AI API costs by 20% without changing your code',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MARKETING CLAIMS (must match reality — tested by spec 49)
// ═══════════════════════════════════════════════════════════════════════════

export const MARKETING = {
  savingsPercentage: 20,
  optimizationLatencyMs: 68,
  savingsMultiplier: 0.80, // 1 - savingsPercentage/100
  platformCount: '12+',
  freeTokens: '50K',
  noCardRequired: true,
} as const;
