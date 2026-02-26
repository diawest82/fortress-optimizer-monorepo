"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageTracker = void 0;
const logger_1 = require("./logger");
/**
 * Usage Tracker
 * Tracks token usage across all providers for freemium tier management
 * Uses VS Code global state (memento) for persistence
 */
class UsageTracker {
    constructor(state) {
        this.logger = (0, logger_1.getLogger)();
        this.freeTierLimitTokens = 500000; // 500K tokens/month
        this.USAGE_PREFIX = 'usage_tokens_';
        this.USAGE_DETAILS_PREFIX = 'usage_details_';
        this.state = state;
    }
    /**
     * Record optimization event and token usage
     */
    async recordOptimization(provider, tokensSaved, tokensInput = 0, tokensOutput = 0) {
        try {
            const monthKey = this.getMonthKey();
            const usageKey = `${this.USAGE_PREFIX}${monthKey}`;
            // Get current usage
            const current = this.state.get(usageKey, 0);
            const newTotal = current + tokensSaved;
            // Record usage
            await this.state.update(usageKey, newTotal);
            // Record detailed stats for analytics
            const detailsKey = `${this.USAGE_DETAILS_PREFIX}${monthKey}`;
            const details = this.state.get(detailsKey, []);
            details.push({
                timestamp: new Date().toISOString(),
                provider,
                tokensSaved,
                tokensInput,
                tokensOutput
            });
            // Keep only last 1000 entries per month
            if (details.length > 1000) {
                details.splice(0, details.length - 1000);
            }
            await this.state.update(detailsKey, details);
            this.logger.debug(`Usage recorded: ${provider} saved ${tokensSaved} tokens (total this month: ${newTotal})`);
        }
        catch (error) {
            this.logger.error(`Failed to record usage: ${error}`);
        }
    }
    /**
     * Get current month's token usage
     */
    async getMonthlyUsage() {
        try {
            const monthKey = this.getMonthKey();
            const usageKey = `${this.USAGE_PREFIX}${monthKey}`;
            return this.state.get(usageKey, 0);
        }
        catch (error) {
            this.logger.error(`Failed to get monthly usage: ${error}`);
            return 0;
        }
    }
    /**
     * Get usage by provider for this month
     */
    async getUsageByProvider() {
        try {
            const monthKey = this.getMonthKey();
            const detailsKey = `${this.USAGE_DETAILS_PREFIX}${monthKey}`;
            const details = this.state.get(detailsKey, []);
            const byProvider = {};
            for (const detail of details) {
                byProvider[detail.provider] = (byProvider[detail.provider] || 0) + detail.tokensSaved;
            }
            return byProvider;
        }
        catch (error) {
            this.logger.error(`Failed to get provider usage: ${error}`);
            return {};
        }
    }
    /**
     * Check if user is over free tier limit
     */
    async isOverFreeLimit() {
        const usage = await this.getMonthlyUsage();
        return usage > this.freeTierLimitTokens;
    }
    /**
     * Get free tier quota status
     */
    async getQuotaStatus() {
        const usage = await this.getMonthlyUsage();
        const remaining = Math.max(0, this.freeTierLimitTokens - usage);
        const percentage = (usage / this.freeTierLimitTokens) * 100;
        return {
            used: usage,
            limit: this.freeTierLimitTokens,
            remaining,
            percentageUsed: Math.min(100, percentage),
            isOverLimit: usage > this.freeTierLimitTokens,
            daysRemainingInMonth: this.getDaysRemainingInMonth()
        };
    }
    /**
     * Get usage projection
     */
    async getUsageProjection() {
        const usage = await this.getMonthlyUsage();
        const daysElapsed = this.getDaysElapsedInMonth();
        const daysRemaining = this.getDaysRemainingInMonth();
        const averageDailyUsage = daysElapsed > 0 ? usage / daysElapsed : 0;
        const projectedMonthly = averageDailyUsage * (daysElapsed + daysRemaining);
        const wouldExceedLimit = projectedMonthly > this.freeTierLimitTokens;
        return {
            currentUsage: usage,
            averageDailyUsage,
            projectedMonthlyUsage: Math.round(projectedMonthly),
            wouldExceedLimit,
            daysRemainingInMonth: daysRemaining
        };
    }
    /**
     * Reset monthly usage (admin function for testing)
     */
    async resetMonthlyUsage() {
        try {
            const monthKey = this.getMonthKey();
            const usageKey = `${this.USAGE_PREFIX}${monthKey}`;
            await this.state.update(usageKey, 0);
            this.logger.info('Monthly usage reset');
        }
        catch (error) {
            this.logger.error(`Failed to reset usage: ${error}`);
        }
    }
    /**
     * Get usage statistics for dashboard
     */
    async getUsageStats() {
        try {
            const monthlyUsage = await this.getMonthlyUsage();
            const quotaStatus = await this.getQuotaStatus();
            const projection = await this.getUsageProjection();
            const byProvider = await this.getUsageByProvider();
            return {
                monthlyUsage,
                quotaStatus,
                projection,
                byProvider,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error(`Failed to get usage stats: ${error}`);
            const daysRemainingInMonth = this.getDaysRemainingInMonth();
            return {
                monthlyUsage: 0,
                quotaStatus: {
                    used: 0,
                    limit: this.freeTierLimitTokens,
                    remaining: this.freeTierLimitTokens,
                    percentageUsed: 0,
                    isOverLimit: false,
                    daysRemainingInMonth
                },
                projection: {
                    currentUsage: 0,
                    averageDailyUsage: 0,
                    projectedMonthlyUsage: 0,
                    wouldExceedLimit: false,
                    daysRemainingInMonth
                },
                byProvider: {},
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Set custom free tier limit (for future tiering)
     */
    setFreeTierLimit(tokens) {
        this.freeTierLimitTokens = tokens;
        this.logger.debug(`Free tier limit set to ${tokens} tokens`);
    }
    /**
     * Get free tier limit
     */
    getFreeTierLimit() {
        return this.freeTierLimitTokens;
    }
    /**
     * Get month key (YYYY-MM)
     */
    getMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    /**
     * Get days elapsed in current month
     */
    getDaysElapsedInMonth() {
        const now = new Date();
        return now.getDate();
    }
    /**
     * Get days remaining in current month
     */
    getDaysRemainingInMonth() {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return lastDay - now.getDate();
    }
}
exports.UsageTracker = UsageTracker;
//# sourceMappingURL=usageTracker.js.map