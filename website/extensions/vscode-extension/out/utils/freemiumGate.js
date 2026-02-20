"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_LIMITS = exports.FreemiumGate = void 0;
exports.getPricingComparison = getPricingComparison;
const logger_1 = require("./logger");
/**
 * Freemium Gate
 * Controls feature access based on subscription tier and usage
 * Manages upgrade prompts and feature availability
 */
class FreemiumGate {
    constructor(usageTracker) {
        this.logger = (0, logger_1.getLogger)();
        this.currentTier = 'free';
        this.lastUpgradePromptTime = 0;
        this.UPGRADE_PROMPT_INTERVAL = 60 * 60 * 1000; // 1 hour in ms
        this.usageTracker = usageTracker;
    }
    /**
     * Check if feature is available for current tier
     */
    async checkFeatureAvailability(feature) {
        try {
            const quotaStatus = await this.usageTracker.getQuotaStatus();
            const tierLimits = exports.TIER_LIMITS[this.currentTier];
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
        }
        catch (error) {
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
    async checkLimit() {
        return this.usageTracker.getQuotaStatus();
    }
    /**
     * Set pricing tier (when user upgrades/subscribes)
     */
    setTier(tier) {
        this.currentTier = tier;
        this.logger.info(`Tier changed to: ${tier}`);
        // Update free tier limits based on subscription
        const limit = exports.TIER_LIMITS[tier].monthlyTokens;
        this.usageTracker.setFreeTierLimit(limit);
    }
    /**
     * Get current tier
     */
    getTier() {
        return this.currentTier;
    }
    /**
     * Get all available features for current tier
     */
    getAvailableFeatures() {
        const tierConfig = exports.TIER_LIMITS[this.currentTier];
        return Object.entries(tierConfig.features)
            .filter(([, available]) => available)
            .map(([feature]) => feature);
    }
    /**
     * Get tier pricing info
     */
    getTierPricing() {
        const tierConfig = exports.TIER_LIMITS[this.currentTier];
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
    shouldShowUpgradePrompt() {
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
    getFeatureMessage(feature, available) {
        if (available) {
            return `Feature "${feature}" is available on your ${this.currentTier} plan`;
        }
        const upgradeSuggestion = {
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
exports.FreemiumGate = FreemiumGate;
// ================== Tier Configuration ==================
exports.TIER_LIMITS = {
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
function getPricingComparison() {
    return {
        free: {
            tier: 'free',
            monthlyTokens: exports.TIER_LIMITS.free.monthlyTokens,
            monthlyPrice: exports.TIER_LIMITS.free.monthlyPrice,
            yearlyPrice: exports.TIER_LIMITS.free.yearlyPrice,
            features: exports.TIER_LIMITS.free.features
        },
        pro: {
            tier: 'pro',
            monthlyTokens: exports.TIER_LIMITS.pro.monthlyTokens,
            monthlyPrice: exports.TIER_LIMITS.pro.monthlyPrice,
            yearlyPrice: exports.TIER_LIMITS.pro.yearlyPrice,
            features: exports.TIER_LIMITS.pro.features
        },
        team: {
            tier: 'team',
            monthlyTokens: exports.TIER_LIMITS.team.monthlyTokens,
            monthlyPrice: exports.TIER_LIMITS.team.monthlyPrice,
            yearlyPrice: exports.TIER_LIMITS.team.yearlyPrice,
            features: exports.TIER_LIMITS.team.features
        }
    };
}
//# sourceMappingURL=freemiumGate.js.map