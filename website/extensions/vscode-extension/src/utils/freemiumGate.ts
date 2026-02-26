import { UsageTracker, QuotaStatus } from './usageTracker';
import { getLogger } from './logger';

/**
 * Freemium Gate
 * Controls feature access based on subscription tier and usage
 * Manages upgrade prompts and feature availability
 */
export class FreemiumGate {
  private logger = getLogger();
  private usageTracker: UsageTracker;
  private currentTier: PricingTier = 'free';
  private lastUpgradePromptTime: number = 0;
  private readonly UPGRADE_PROMPT_INTERVAL = 60 * 60 * 1000; // 1 hour in ms

  constructor(usageTracker: UsageTracker) {
    this.usageTracker = usageTracker;
  }

  /**
   * Check if feature is available for current tier
   */
  async checkFeatureAvailability(feature: keyof FeatureSet): Promise<FeatureAccess> {
    try {
      const quotaStatus = await this.usageTracker.getQuotaStatus();
      const tierLimits = TIER_LIMITS[this.currentTier];
      const features = tierLimits.features;

      const isAvailable = features[feature] || false;
      const shouldPrompt = this.shouldShowUpgradePrompt();

      return {
        allowed: isAvailable,
        shouldPromptUpgrade: shouldPrompt && !isAvailable,
        quotaStatus,
        tier: this.currentTier,
        message: this.getFeatureMessage(feature, isAvailable)
      };
    } catch (error) {
      this.logger.error(`Failed to check feature availability: ${error}`);
      return {
        allowed: true, // Fail open for availability
        shouldPromptUpgrade: false,
        quotaStatus: {
          used: 0,
          limit: 500000,
          remaining: 500000,
          percentageUsed: 0,
          isOverLimit: false,
          daysRemainingInMonth: 30
        },
        tier: this.currentTier,
        message: ''
      };
    }
  }

  /**
   * Check usage limit
   */
  async checkLimit(): Promise<QuotaStatus> {
    return this.usageTracker.getQuotaStatus();
  }

  /**
   * Set pricing tier (when user upgrades/subscribes)
   */
  setTier(tier: PricingTier): void {
    this.currentTier = tier;
    this.logger.info(`Tier changed to: ${tier}`);

    // Update free tier limits based on subscription
    const limit = TIER_LIMITS[tier].monthlyTokens;
    this.usageTracker.setFreeTierLimit(limit);
  }

  /**
   * Get current tier
   */
  getTier(): PricingTier {
    return this.currentTier;
  }

  /**
   * Get all available features for current tier
   */
  getAvailableFeatures(): string[] {
    const tierConfig = TIER_LIMITS[this.currentTier];
    return Object.entries(tierConfig.features)
      .filter(([, available]) => available)
      .map(([feature]) => feature);
  }

  /**
   * Get tier pricing info
   */
  getTierPricing(): TierInfo {
    const tierConfig = TIER_LIMITS[this.currentTier];
    return {
      tier: this.currentTier,
      monthlyTokens: tierConfig.monthlyTokens,
      monthlyPrice: tierConfig.monthlyPrice,
      yearlyPrice: tierConfig.yearlyPrice,
      features: tierConfig.features
    };
  }

  /**
   * Show upgrade prompt (with throttling)
   */
  private shouldShowUpgradePrompt(): boolean {
    const now = Date.now();
    if (now - this.lastUpgradePromptTime > this.UPGRADE_PROMPT_INTERVAL) {
      this.lastUpgradePromptTime = now;
      return true;
    }
    return false;
  }

  /**
   * Get feature-specific message
   */
  private getFeatureMessage(feature: keyof FeatureSet, available: boolean): string {
    if (available) {
      return `Feature "${feature}" is available on your ${this.currentTier} plan`;
    }

    const upgradeSuggestion: Record<string, PricingTier> = {
      allProviders: 'pro',
      advancedDashboard: 'pro',
      apiAccess: 'pro',
      teamCollaboration: 'team',
      priority: 'pro'
    };

    const recommendedTier = upgradeSuggestion[feature] || 'pro';
    return `Feature "${feature}" requires ${recommendedTier} plan or higher. Upgrade to unlock advanced optimization capabilities.`;
  }
}

// ================== Types & Configuration ==================

export type PricingTier = 'free' | 'pro' | 'team';

export interface FeatureSet {
  optimization: boolean;
  allProviders: boolean;
  analytics: boolean;
  advancedDashboard: boolean;
  apiAccess: boolean;
  priority: boolean;
  teamCollaboration: boolean;
}

export interface TierLimits {
  monthlyTokens: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features: FeatureSet;
}

export interface TierInfo {
  tier: PricingTier;
  monthlyTokens: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features: FeatureSet;
}

export interface FeatureAccess {
  allowed: boolean;
  shouldPromptUpgrade: boolean;
  quotaStatus: QuotaStatus;
  tier: PricingTier;
  message: string;
}

// ================== Tier Configuration ==================

export const TIER_LIMITS: Record<PricingTier, TierLimits> = {
  free: {
    monthlyTokens: 500000,
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      optimization: true,
      allProviders: false, // Limited to OpenAI only
      analytics: false,
      advancedDashboard: false,
      apiAccess: false,
      priority: false,
      teamCollaboration: false
    }
  },
  pro: {
    monthlyTokens: 5000000,
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: {
      optimization: true,
      allProviders: true, // All 5 providers
      analytics: true,
      advancedDashboard: true,
      apiAccess: true,
      priority: true,
      teamCollaboration: false
    }
  },
  team: {
    monthlyTokens: 50000000,
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: {
      optimization: true,
      allProviders: true,
      analytics: true,
      advancedDashboard: true,
      apiAccess: true,
      priority: true,
      teamCollaboration: true
    }
  }
};

/**
 * Get pricing comparison for marketing/docs
 */
export function getPricingComparison(): Record<PricingTier, TierInfo> {
  return {
    free: {
      tier: 'free',
      monthlyTokens: TIER_LIMITS.free.monthlyTokens,
      monthlyPrice: TIER_LIMITS.free.monthlyPrice,
      yearlyPrice: TIER_LIMITS.free.yearlyPrice,
      features: TIER_LIMITS.free.features
    },
    pro: {
      tier: 'pro',
      monthlyTokens: TIER_LIMITS.pro.monthlyTokens,
      monthlyPrice: TIER_LIMITS.pro.monthlyPrice,
      yearlyPrice: TIER_LIMITS.pro.yearlyPrice,
      features: TIER_LIMITS.pro.features
    },
    team: {
      tier: 'team',
      monthlyTokens: TIER_LIMITS.team.monthlyTokens,
      monthlyPrice: TIER_LIMITS.team.monthlyPrice,
      yearlyPrice: TIER_LIMITS.team.yearlyPrice,
      features: TIER_LIMITS.team.features
    }
  };
}
