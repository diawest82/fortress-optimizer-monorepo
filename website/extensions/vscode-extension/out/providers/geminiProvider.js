"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const axios_1 = require("axios");
const logger_1 = require("../utils/logger");
/**
 * Google Gemini API Provider
 * Integration with Google's Gemini models via Vertex AI API
 * Rising star in LLM market with strong enterprise adoption
 */
class GeminiProvider {
    constructor(credentialManager) {
        this.logger = (0, logger_1.getLogger)();
        this.client = null;
        this.apiKey = null;
        this.projectId = '';
        this.modelId = 'gemini-1.5-pro';
        this.location = 'us-central1';
        this.credentialManager = credentialManager;
    }
    /**
     * Detect if Google Gemini API is configured
     */
    async detect() {
        try {
            this.apiKey = (await this.credentialManager.getCredential('gemini')) || null;
            this.projectId = (await this.credentialManager.getCredentialOption('gemini', 'project_id')) || '';
            if (!this.apiKey) {
                this.logger.debug('Google Gemini API key not configured');
                return false;
            }
            // Verify API key works
            this.initializeClient();
            await this.verifyApiKey();
            this.logger.info('Google Gemini provider detected and verified');
            return true;
        }
        catch (error) {
            this.logger.warn(`Gemini API detection failed: ${error}`);
            return false;
        }
    }
    /**
     * Initialize axios client with Gemini settings
     */
    initializeClient() {
        if (!this.apiKey) {
            throw new Error('Gemini API key not set');
        }
        this.client = axios_1.default.create({
            baseURL: 'https://generativelanguage.googleapis.com',
            headers: {
                'content-type': 'application/json'
            }
        });
    }
    /**
     * Verify API key is valid
     */
    async verifyApiKey() {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        try {
            // Test with minimal request
            await this.client.post(`/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
                contents: [
                    {
                        parts: [{ text: 'test' }]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 10
                }
            });
        }
        catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Invalid Google Gemini API key');
            }
            throw error;
        }
    }
    /**
     * Count tokens in text using Gemini's tokenization
     * Gemini uses similar tokenization to Claude (~3.5-4 chars per token)
     */
    async countTokens(text) {
        if (!text)
            return 1;
        // Gemini tokenization: approximately 3.8 characters per token
        const baseTokens = Math.ceil(text.length / 3.8);
        // Adjust for special characters
        const specialChars = (text.match(/[^\w\s]/g) || []).length;
        const adjustment = Math.ceil(specialChars * 0.08);
        return Math.max(1, baseTokens + adjustment);
    }
    /**
     * Send optimized prompt to Gemini API
     */
    async sendOptimized(optimizedPrompt, options) {
        if (!this.client || !this.apiKey) {
            throw new Error('Gemini API not configured');
        }
        try {
            const model = options?.model || this.modelId;
            const response = await this.client.post(`/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
                contents: [
                    {
                        parts: [
                            {
                                text: optimizedPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: options?.temperature ?? 0.7,
                    maxOutputTokens: options?.maxTokens || 1024
                }
            });
            this.logger.debug(`Gemini API response: ${response.status}`);
            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return response.data.candidates[0].content.parts[0].text;
            }
            throw new Error('Unexpected response format from Gemini API');
        }
        catch (error) {
            this.logger.error(`Gemini API error: ${error}`);
            throw error;
        }
    }
    /**
     * Get provider metadata
     */
    getMetadata() {
        return {
            name: 'Google Gemini API',
            id: 'gemini-api',
            extensionId: 'gemini-api-provider',
            available: !!this.apiKey,
            supportsTokenCounting: true,
            supportsChatInterception: false,
            requiresApiKey: true,
            models: [
                'gemini-1.5-pro',
                'gemini-1.5-flash',
                'gemini-1.0-pro'
            ],
            pricingTier: 'direct-api',
            freeTierLimitTokens: 500000,
            marketPositioning: 'rising-adoption',
            notes: 'Fast emerging model with strong enterprise interest'
        };
    }
    /**
     * Check if provider is available and configured
     */
    isAvailable() {
        return !!this.apiKey && !!this.client;
    }
    /**
     * Get available models
     */
    async listModels() {
        return this.getMetadata().models;
    }
    /**
     * Set which model to use
     */
    setModel(modelId) {
        if (this.getMetadata().models.includes(modelId)) {
            this.modelId = modelId;
            this.logger.debug(`Gemini model set to: ${modelId}`);
        }
        else {
            throw new Error(`Unknown Gemini model: ${modelId}`);
        }
    }
    /**
     * Get current model
     */
    getCurrentModel() {
        return this.modelId;
    }
    /**
     * Set Google Cloud project ID for billing
     */
    setProjectId(projectId) {
        this.projectId = projectId;
        this.logger.debug(`Google project ID set to: ${projectId}`);
    }
    /**
     * Get project ID
     */
    getProjectId() {
        return this.projectId;
    }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=geminiProvider.js.map