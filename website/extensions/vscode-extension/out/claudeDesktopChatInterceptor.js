"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeDesktopChatInterceptor = void 0;
const vscode = require("vscode");
const logger_1 = require("./utils/logger");
const claudeDesktopProvider_1 = require("./providers/claudeDesktopProvider");
/**
 * Claude Desktop Chat Interceptor
 *
 * Intercepts and optimizes messages sent via Claude Desktop extension
 * Foundation for chat message optimization when Claude Desktop API becomes available
 *
 * Status: Foundation ready
 * Awaits: Official Claude Desktop VS Code extension API (currently in beta)
 */
class ClaudeDesktopChatInterceptor {
    constructor(serviceClient, analytics) {
        this.enabled = true;
        this.interceptor = null;
        this.logger = (0, logger_1.getLogger)();
        this.serviceClient = serviceClient;
        this.analytics = analytics;
    }
    /**
     * Initialize Claude Desktop Chat Interceptor
     * Checks if Claude Desktop is available and sets up interception
     * Non-fatal if Claude Desktop unavailable
     */
    async initialize() {
        try {
            const isClaudeDesktopAvailable = await ClaudeDesktopChatInterceptor.isClaudeDesktopAvailable();
            if (!isClaudeDesktopAvailable) {
                this.logger.info('Claude Desktop extension not available');
                return;
            }
            // Get configuration
            const config = vscode.workspace.getConfiguration('stealthOptimizer');
            this.enabled = config.get('claudeDesktopInterception') ?? true;
            if (this.enabled) {
                this.logger.info('Claude Desktop Chat Interceptor initialized');
                this.analytics.track('claude_desktop_interceptor_init');
                // Future: Set up actual chat particle when API available
                // await this.createChatParticipant();
            }
            else {
                this.logger.info('Claude Desktop Chat Interception disabled in settings');
            }
        }
        catch (error) {
            this.logger.warn(`Claude Desktop initialization: ${error}`);
            // Non-fatal - extension continues without Claude Desktop interception
            this.analytics.track('claude_desktop_interceptor_error');
        }
    }
    /**
     * Enable/disable chat interception at runtime
     *
     * @param enabled - true to enable, false to disable
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.logger.info(`Claude Desktop Chat Interception ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Intercept and optimize a message for Claude Desktop
     * Foundation method - will be enhanced when API available
     *
     * @param message - Original message to optimize
     * @returns Optimized message (or original if optimization disabled)
     */
    async interceptMessage(message) {
        if (!this.enabled) {
            return message;
        }
        try {
            const config = vscode.workspace.getConfiguration('stealthOptimizer');
            const optimizationLevel = config.get('optimizationLevel') || 'balanced';
            // Use service client to process the message
            const optimized = await this.serviceClient.optimize(message, 'anthropic', // Claude Desktop uses Anthropic backend
            optimizationLevel);
            // Count tokens via provider
            const provider = new claudeDesktopProvider_1.ClaudeDesktopProvider();
            const tokensBefore = optimized.metrics.tokensBefore;
            const tokensAfter = optimized.metrics.tokensAfter;
            const savedPercent = Math.round(optimized.metrics.percentSaved);
            // Track optimization
            this.analytics.track('claude_desktop_chat_optimized');
            this.logger.debug(`Claude Desktop message optimized: ${tokensBefore} → ${tokensAfter} tokens (${savedPercent}% saved)`);
            return optimized.optimizedPrompt;
        }
        catch (error) {
            this.logger.warn(`Claude Desktop message interception error: ${error}`);
            return message; // Return original if optimization fails
        }
    }
    /**
     * Future: Create Claude Desktop chat participant
     * Will be implemented when Claude Desktop extension API becomes stable
     *
     * This would allow:
     * - @claude-optimizer chat participant
     * - Direct integration with Claude Desktop chat UI
     * - Real-time message optimization
     */
    async createChatParticipant() {
        // Placeholder for future implementation
        // When API available, this will:
        // 1. Create a chat participant via vscode.chat.createChatParticipant
        // 2. Register handler for incoming messages
        // 3. Optimize messages before sending to Claude
        // 4. Display optimization results in chat UI
        this.logger.debug('Claude Desktop chat participant creation: awaiting official API (coming soon)');
    }
    /**
     * Static method: Check if Claude Desktop extension is available
     * Detects: Anthropic.claude-desktop or community extensions
     *
     * @returns true if Claude Desktop is detected
     */
    static async isClaudeDesktopAvailable() {
        return claudeDesktopProvider_1.ClaudeDesktopProvider.isClaudeDesktopAvailable();
    }
}
exports.ClaudeDesktopChatInterceptor = ClaudeDesktopChatInterceptor;
//# sourceMappingURL=claudeDesktopChatInterceptor.js.map