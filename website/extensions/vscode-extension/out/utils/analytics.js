"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Analytics = void 0;
const vscode = require("vscode");
class Analytics {
    constructor(context) {
        this.events = [];
        this.maxEventQueue = 100;
        this.analyticsEndpoint = 'https://analytics.fortress-ai.dev/api/events';
        this.context = context;
        this.loadEvents();
    }
    /**
     * Track an analytics event
     */
    track(event, properties) {
        const analyticsEvent = {
            event,
            timestamp: new Date().toISOString(),
            userId: this.getUserId(),
            properties
        };
        this.events.push(analyticsEvent);
        // Keep queue size bounded
        if (this.events.length > this.maxEventQueue) {
            this.events.shift();
        }
        this.saveEvents();
        // Send to backend if analytics enabled
        this.sendEventIfEnabled(analyticsEvent);
    }
    /**
     * Track optimization event
     */
    trackOptimization(options) {
        this.track('optimization_completed', {
            ...options,
            costSaved: ((options.tokensBefore - options.tokensAfter) / 1000) * 0.01
        });
    }
    /**
     * Track feature usage
     */
    trackFeature(feature, data) {
        this.track(`feature_used_${feature}`, data);
    }
    /**
     * Check if user has opted in to analytics
     */
    isAnalyticsEnabled() {
        const config = vscode.workspace.getConfiguration('stealthOptimizer');
        return config.get('enableTelemetry', false);
    }
    /**
     * Get or create unique user ID
     */
    getUserId() {
        let userId = this.context.globalState.get('analytics.userId');
        if (!userId) {
            userId = this.generateUserId();
            this.context.globalState.update('analytics.userId', userId);
        }
        return userId;
    }
    /**
     * Generate a unique user ID
     */
    generateUserId() {
        return `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    }
    /**
     * Send event to analytics backend if enabled
     */
    sendEventIfEnabled(event) {
        if (!this.isAnalyticsEnabled()) {
            return;
        }
        // Send asynchronously without blocking
        this.sendEvent(event).catch(error => {
            // Silent fail - don't bother user if analytics fails
            console.debug('Analytics send failed:', error.message);
        });
    }
    /**
     * Send event to backend
     */
    async sendEvent(event) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(this.analyticsEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Extension-Version': '1.0.0'
                },
                body: JSON.stringify(event),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                console.debug(`Analytics API returned ${response.status}`);
            }
        }
        catch (error) {
            // Silently fail - analytics should never break functionality
            console.debug('Failed to send analytics:', error.message);
        }
    }
    /**
     * Load persisted events from storage
     */
    loadEvents() {
        const stored = this.context.globalState.get('analytics.events', []);
        this.events = stored;
    }
    /**
     * Save events to persistent storage
     */
    saveEvents() {
        this.context.globalState.update('analytics.events', this.events);
    }
    /**
     * Get all tracked events
     */
    getEvents() {
        return [...this.events];
    }
    /**
     * Get event statistics
     */
    getStatistics() {
        const stats = {
            totalEvents: this.events.length,
            eventsByType: {}
        };
        for (const event of this.events) {
            if (!stats.eventsByType[event.event]) {
                stats.eventsByType[event.event] = 0;
            }
            stats.eventsByType[event.event]++;
        }
        // Calculate optimization stats
        const optimizationEvents = this.events.filter(e => e.event === 'optimization_completed');
        if (optimizationEvents.length > 0) {
            const savings = optimizationEvents.map(e => e.properties?.percentSaved || 0);
            const avgSavings = savings.reduce((a, b) => a + b, 0) / savings.length;
            const totalTokensSaved = optimizationEvents.reduce((sum, e) => {
                const tokensChanged = (e.properties?.tokensBefore || 0) - (e.properties?.tokensAfter || 0);
                return sum + tokensChanged;
            }, 0);
            stats.optimization = {
                count: optimizationEvents.length,
                averageSavingsPercent: parseFloat(avgSavings.toFixed(2)),
                totalTokensSaved,
                totalCostSavedUSD: parseFloat(((totalTokensSaved / 1000) * 0.01).toFixed(4))
            };
        }
        return stats;
    }
    /**
     * Clear all events
     */
    clear() {
        this.events = [];
        this.saveEvents();
    }
}
exports.Analytics = Analytics;
//# sourceMappingURL=analytics.js.map