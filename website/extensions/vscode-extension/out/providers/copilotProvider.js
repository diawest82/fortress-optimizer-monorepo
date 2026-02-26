"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotProvider = void 0;
const vscode = require("vscode");
class CopilotProvider {
    constructor() {
        this.checkAvailability();
    }
    /**
     * Check Copilot availability
     */
    checkAvailability() {
        try {
            const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
            if (copilotExtension?.isActive) {
                console.log('Copilot extension available');
            }
        }
        catch (error) {
            console.debug('Copilot not available');
        }
    }
    /**
     * Estimate tokens for Copilot
     * Uses heuristic based on GPT-4 tokenization (which Copilot is built on)
     */
    async countTokens(text) {
        try {
            // Copilot uses similar tokenization to GPT-4
            // Approximately 1 token per 3.8-4 characters
            const baseTokens = Math.ceil(text.length / 3.8);
            // Copilot tends to be slightly more efficient
            return Math.max(1, Math.ceil(baseTokens * 0.95));
        }
        catch (error) {
            console.error('Copilot token counting error:', error);
            return Math.ceil(text.length / 4);
        }
    }
    /**
     * Get available Copilot model
     */
    async listModels() {
        try {
            // Copilot's model is identified as 'copilot'
            return ['copilot'];
        }
        catch (error) {
            console.debug('Could not list Copilot models:', error);
            return ['copilot'];
        }
    }
    /**
     * Check if Copilot is available
     */
    async isAvailable() {
        try {
            // Check if Copilot extension is loaded
            const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
            const copilotChatExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
            return !!(copilotExtension?.isActive || copilotChatExtension?.isActive);
        }
        catch {
            return false;
        }
    }
    /**
     * Get cost estimate for Copilot
     * Copilot pricing: varies by subscription tier
     * Estimate based on standard per-token pricing
     */
    getCostEstimate(tokens) {
        // Copilot subscriptions are typically $10-20/month for unlimited usage
        // For per-token estimation: ~$0.01 per 1K tokens (conservative)
        return (tokens / 1000) * 0.01;
    }
    /**
     * Validate Copilot availability
     */
    async validateAvailability() {
        return this.isAvailable();
    }
    /**
     * Get info about Copilot integration
     */
    static getIntegrationInfo() {
        return `
Copilot Integration:
✓ Token estimation for Copilot Chat
✓ Optimization provider for prompts
✓ Automatic message optimization (when enabled)
✓ Cost tracking for Copilot usage
✓ Seamless integration with VS Code

Features:
- Set Copilot as default provider
- Optimize all Copilot prompts automatically  
- Track token savings from Copilot interactions
- View analytics for Copilot-optimized messages
    `;
    }
}
exports.CopilotProvider = CopilotProvider;
//# sourceMappingURL=copilotProvider.js.map