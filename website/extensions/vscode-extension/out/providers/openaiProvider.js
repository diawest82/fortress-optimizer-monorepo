"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const axios_1 = require("axios");
class OpenAIProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.client = axios_1.default.create({
            baseURL: 'https://api.openai.com/v1',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
    }
    /**
     * Count tokens using OpenAI's API
     * Uses the official token counting endpoint for accurate counts
     */
    async countTokens(text, model = 'gpt-4') {
        try {
            const response = await this.client.post('/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: text }],
                max_tokens: 1 // Don't actually run; just count
            }, {
                headers: {
                    'OpenAI-Organization': process.env.OPENAI_ORG_ID || ''
                }
            });
            // Extract token count from response metadata if available
            if (response.data.usage) {
                return response.data.usage.prompt_tokens;
            }
            // Fallback to estimation if API doesn't return token count
            return Math.ceil(text.length / 4);
        }
        catch (error) {
            console.error('OpenAI token counting error:', error.message);
            // Fallback to estimation on error
            return Math.ceil(text.length / 4);
        }
    }
    /**
     * Get available models from OpenAI
     */
    async listModels() {
        try {
            const response = await this.client.get('/models');
            return response.data.data
                .filter((m) => m.id.includes('gpt'))
                .map((m) => m.id)
                .sort();
        }
        catch (error) {
            console.error('Error listing OpenAI models:', error.message);
            return ['gpt-4', 'gpt-3.5-turbo'];
        }
    }
    /**
     * Validate API key by making a test request
     */
    async validateApiKey() {
        try {
            await this.client.get('/models', {
                params: { limit: 1 }
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get cost estimate for prompt and completion tokens
     */
    getCostEstimate(promptTokens, completionTokens, model = 'gpt-4') {
        // Pricing as of Feb 2026 (approximate)
        const pricingMap = {
            'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
            'gpt-4-turbo': { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
            'gpt-3.5-turbo': { prompt: 0.0005 / 1000, completion: 0.0015 / 1000 }
        };
        const pricing = pricingMap[model] || pricingMap['gpt-4'];
        return (promptTokens * pricing.prompt) + (completionTokens * pricing.completion);
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openaiProvider.js.map