"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureOpenaiProvider = void 0;
const axios_1 = require("axios");
const logger_1 = require("../utils/logger");
/**
 * Azure OpenAI Service Provider
 * Integration with Microsoft Azure's OpenAI API
 * Enterprise-grade LLM service with advanced features
 */
class AzureOpenaiProvider {
    constructor(credentialManager) {
        this.logger = (0, logger_1.getLogger)();
        this.client = null;
        this.apiKey = null;
        this.endpoint = '';
        this.deploymentId = 'gpt-35-turbo';
        this.apiVersion = '2024-02-15-preview';
        this.credentialManager = credentialManager;
    }
    /**
     * Detect if Azure OpenAI is configured
     */
    async detect() {
        try {
            this.apiKey = (await this.credentialManager.getCredential('azure')) || null;
            this.endpoint = (await this.credentialManager.getCredentialOption('azure', 'endpoint')) || '';
            if (!this.apiKey || !this.endpoint) {
                this.logger.debug('Azure OpenAI not configured');
                return false;
            }
            // Verify connection
            this.initializeClient();
            await this.verifyConnection();
            this.logger.info('Azure OpenAI provider detected and verified');
            return true;
        }
        catch (error) {
            this.logger.warn(`Azure OpenAI detection failed: ${error}`);
            return false;
        }
    }
    /**
     * Initialize axios client with Azure OpenAI settings
     */
    initializeClient() {
        if (!this.apiKey || !this.endpoint) {
            throw new Error('Azure OpenAI credentials not set');
        }
        // Azure endpoint format: https://{resource}.openai.azure.com/
        const baseURL = this.endpoint.endsWith('/')
            ? this.endpoint
            : this.endpoint + '/';
        this.client = axios_1.default.create({
            baseURL,
            headers: {
                'api-key': this.apiKey,
                'content-type': 'application/json'
            }
        });
    }
    /**
     * Verify Azure OpenAI connection is valid
     */
    async verifyConnection() {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        try {
            // Test with minimal deployment call
            await this.client.post(`/openai/deployments/${this.deploymentId}/chat/completions?api-version=${this.apiVersion}`, {
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 10
            });
        }
        catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Invalid Azure OpenAI API key');
            }
            if (error.response?.status === 404) {
                throw new Error(`Deployment "${this.deploymentId}" not found in Azure OpenAI resource`);
            }
            throw error;
        }
    }
    /**
     * Count tokens in text
     * Azure uses same tokenization as OpenAI (roughly 4 chars = 1 token)
     */
    async countTokens(text) {
        if (!text)
            return 1;
        // OpenAI/Azure tokenization: approximately 4 characters per token
        const baseTokens = Math.ceil(text.length / 4);
        // Adjust for special characters and code patterns
        const specialChars = (text.match(/[^\w\s]/g) || []).length;
        const adjustment = Math.ceil(specialChars * 0.05);
        return Math.max(1, baseTokens + adjustment);
    }
    /**
     * Send optimized prompt to Azure OpenAI
     */
    async sendOptimized(optimizedPrompt, options) {
        if (!this.client) {
            throw new Error('Azure OpenAI not configured');
        }
        try {
            const deployment = options?.deployment || this.deploymentId;
            const response = await this.client.post(`/openai/deployments/${deployment}/chat/completions?api-version=${this.apiVersion}`, {
                messages: [
                    {
                        role: 'user',
                        content: optimizedPrompt
                    }
                ],
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens || 1024
            });
            this.logger.debug(`Azure OpenAI response: ${response.status}`);
            if (response.data?.choices?.[0]?.message?.content) {
                return response.data.choices[0].message.content;
            }
            throw new Error('Unexpected response format from Azure OpenAI');
        }
        catch (error) {
            this.logger.error(`Azure OpenAI error: ${error}`);
            throw error;
        }
    }
    /**
     * Get provider metadata
     */
    getMetadata() {
        return {
            name: 'Azure OpenAI Service',
            id: 'azure-openai',
            extensionId: 'azure-openai-provider',
            available: !!this.apiKey && !!this.endpoint,
            supportsTokenCounting: true,
            supportsChatInterception: false,
            requiresApiKey: true,
            requiresEndpoint: true,
            deploymentRequired: true,
            pricingTier: 'enterprise-cloud',
            freeTierLimitTokens: 500000,
            // Note: Azure pricing varies by region and deployment
            notes: 'Requires Azure subscription and OpenAI resource'
        };
    }
    /**
     * Check if provider is available and configured
     */
    isAvailable() {
        return !!this.apiKey && !!this.endpoint && !!this.client;
    }
    /**
     * Set deployment ID (gpt-4, gpt-35-turbo, etc)
     */
    setDeployment(deploymentId) {
        this.deploymentId = deploymentId;
        this.logger.debug(`Azure OpenAI deployment set to: ${deploymentId}`);
    }
    /**
     * Get current deployment ID
     */
    getCurrentDeployment() {
        return this.deploymentId;
    }
    /**
     * Get Azure resource endpoint
     */
    getEndpoint() {
        return this.endpoint;
    }
    /**
     * Validate Azure endpoint format
     */
    static isValidEndpoint(endpoint) {
        try {
            const url = new URL(endpoint);
            return url.hostname.includes('openai.azure.com');
        }
        catch {
            return false;
        }
    }
}
exports.AzureOpenaiProvider = AzureOpenaiProvider;
//# sourceMappingURL=azureOpenaiProvider.js.map