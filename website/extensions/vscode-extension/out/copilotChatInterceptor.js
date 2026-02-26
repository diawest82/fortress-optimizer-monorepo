"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotChatInterceptor = void 0;
const vscode = require("vscode");
const logger_1 = require("./utils/logger");
/**
 * Intercepts Copilot chat messages and optimizes them before sending
 */
class CopilotChatInterceptor {
    constructor(serviceClient, analytics) {
        this.isEnabled = true;
        this.serviceClient = serviceClient;
        this.analytics = analytics;
    }
    /**
     * Initialize the chat interceptor
     * Creates a custom chat participant for optimized prompts
     */
    async initialize(context) {
        const logger = (0, logger_1.getLogger)();
        try {
            // Check if Copilot Chat is available
            const isCopilotAvailable = await CopilotChatInterceptor.isCopilotAvailable();
            if (!isCopilotAvailable) {
                logger.debug('Copilot Chat extension not found');
                return;
            }
            // Note: Full chat interception via custom participant requires Copilot Chat 1.50+
            // For now, we initialize the interceptor and provide configuration UI
            logger.info('Copilot chat interceptor ready');
            // Listen for settings changes
            context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('stealthOptimizer.copilotInterception')) {
                    this.updateSettings();
                }
            }));
            this.updateSettings();
        }
        catch (error) {
            logger.debug('Copilot chat interceptor initialization note:', error?.message);
            // This is not fatal - extension continues without chat interception
        }
    }
    /**
     * Enable/disable the interceptor
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    /**
     * Update settings from configuration
     */
    updateSettings() {
        const config = vscode.workspace.getConfiguration('stealthOptimizer');
        this.isEnabled = config.get('copilotInterception', true);
    }
    /**
     * Check if Copilot chat is available
     */
    static async isCopilotAvailable() {
        try {
            const copilotChatExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
            const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
            return !!(copilotChatExtension?.isActive || copilotExtension?.isActive);
        }
        catch {
            return false;
        }
    }
    /**
     * Get usage info for Copilot integration
     */
    static getUsageInfo() {
        return `
Copilot Integration Features:
1. Set Copilot as optimization provider
2. Optimize prompts before sending to Copilot Chat
3. Track savings from Copilot-optimized messages
4. Use @ stealthOptimizer in Copilot Chat (when available)

To use:
- Configure provider: Cmd+Shift+P → Configure Copilot Integration
- Run simulations with Copilot provider selected
- Watch your token usage decrease!
    `;
    }
}
exports.CopilotChatInterceptor = CopilotChatInterceptor;
//# sourceMappingURL=copilotChatInterceptor.js.map