"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const axios_1 = require("axios");
const logger_1 = require("../utils/logger");
/**
 * Ollama Provider
 * Local LLM inference using Ollama
 * Privacy-first, zero-cost, works offline
 * Major community differentiator for this optimizer
 *
 * Supported models: llama2, mistral, neural-chat, orca, and more
 */
class OllamaProvider {
    constructor(baseUrl) {
        this.logger = (0, logger_1.getLogger)();
        this.client = null;
        this.baseUrl = 'http://localhost:11434';
        this.modelId = 'llama2';
        this.isRunning = false;
        this.detectedModels = [];
        if (baseUrl) {
            this.baseUrl = baseUrl;
        }
    }
    /**
     * Detect if Ollama is running locally
     */
    async detect() {
        try {
            this.initializeClient();
            await this.checkServerHealth();
            await this.listAvailableModels();
            this.isRunning = true;
            this.logger.info(`Ollama detected at ${this.baseUrl}`);
            return true;
        }
        catch (error) {
            this.logger.debug(`Ollama not running or not found: ${error}`);
            this.isRunning = false;
            return false;
        }
    }
    /**
     * Initialize axios client
     */
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'content-type': 'application/json'
            },
            timeout: 5000
        });
    }
    /**
     * Check if Ollama server is healthy
     */
    async checkServerHealth() {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        try {
            const response = await this.client.get('/api/tags');
            if (response.status !== 200) {
                throw new Error('Ollama server not responding correctly');
            }
        }
        catch (error) {
            throw new Error('Ollama server not running or not accessible');
        }
    }
    /**
     * List all available models in Ollama
     */
    async listAvailableModels() {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        try {
            const response = await this.client.get('/api/tags');
            if (response.data?.models && Array.isArray(response.data.models)) {
                this.detectedModels = response.data.models.map((m) => m.name);
                this.logger.debug(`Ollama models detected: ${this.detectedModels.join(', ')}`);
                // Set to first available model if current one not available
                if (this.detectedModels.length > 0 && !this.detectedModels.includes(this.modelId)) {
                    this.modelId = this.detectedModels[0];
                    this.logger.debug(`Ollama model set to available: ${this.modelId}`);
                }
            }
        }
        catch (error) {
            this.logger.warn(`Failed to list Ollama models: ${error}`);
            this.detectedModels = [];
        }
    }
    /**
     * Count tokens in text
     * Ollama uses similar tokenization to base models
     * Approximation: 3.5-4 characters per token (varies by model)
     */
    async countTokens(text) {
        if (!text)
            return 1;
        // Use model-specific tokenization if available
        // For now, use conservative estimate (3.5 chars per token)
        const baseTokens = Math.ceil(text.length / 3.5);
        // Adjust for special characters
        const specialChars = (text.match(/[^\w\s]/g) || []).length;
        const adjustment = Math.ceil(specialChars * 0.1);
        return Math.max(1, baseTokens + adjustment);
    }
    /**
     * Send optimized prompt to local Ollama model
     * No API costs, runs locally, full privacy
     */
    async sendOptimized(optimizedPrompt, options) {
        if (!this.client || !this.isRunning) {
            throw new Error('Ollama not running');
        }
        try {
            const model = options?.model || this.modelId;
            const startTime = Date.now();
            const response = await this.client.post('/api/generate', {
                model,
                prompt: optimizedPrompt,
                stream: false,
                temperature: options?.temperature ?? 0.7,
                top_p: options?.topP,
                top_k: options?.topK,
                num_predict: options?.numPredict || 512
            });
            const elapsed = Date.now() - startTime;
            this.logger.debug(`Ollama inference: ${elapsed}ms on ${model}`);
            if (response.data?.response) {
                return response.data.response;
            }
            throw new Error('Unexpected response format from Ollama');
        }
        catch (error) {
            this.logger.error(`Ollama error: ${error}`);
            throw error;
        }
    }
    /**
     * Get provider metadata
     */
    getMetadata() {
        return {
            name: 'Ollama (Local Models)',
            id: 'ollama-local',
            extensionId: 'ollama-provider',
            available: this.isRunning,
            supportsTokenCounting: true,
            supportsChatInterception: false,
            requiresLocalSetup: true,
            requiresApiKey: false,
            models: this.detectedModels.length > 0
                ? this.detectedModels
                : [
                    'llama2',
                    'mistral',
                    'neural-chat',
                    'orca',
                    'dolphin-mixtral'
                ],
            pricingTier: 'free-local',
            freeTierLimitTokens: undefined, // Unlimited locally
            marketPositioning: 'privacy-first',
            keyBenefits: [
                'Zero API costs',
                'Works offline',
                'Complete privacy',
                'No rate limiting',
                'Fast inference on modern GPUs'
            ],
            notes: 'Requires Ollama to be running. Download from ollama.ai'
        };
    }
    /**
     * Check if provider is available and configured
     */
    isAvailable() {
        return this.isRunning;
    }
    /**
     * Get available models
     */
    async listModels() {
        if (!this.isRunning) {
            return [];
        }
        // Refresh model list
        try {
            await this.listAvailableModels();
        }
        catch (error) {
            this.logger.warn(`Failed to refresh models: ${error}`);
        }
        return this.detectedModels;
    }
    /**
     * Set which local model to use
     */
    setModel(modelId) {
        if (this.detectedModels.includes(modelId)) {
            this.modelId = modelId;
            this.logger.debug(`Ollama model set to: ${modelId}`);
        }
        else if (this.isRunning) {
            throw new Error(`Model "${modelId}" not found in Ollama. Available: ${this.detectedModels.join(', ')}`);
        }
    }
    /**
     * Get current model
     */
    getCurrentModel() {
        return this.modelId;
    }
    /**
     * Get Ollama server base URL
     */
    getBaseUrl() {
        return this.baseUrl;
    }
    /**
     * Set custom Ollama server URL
     */
    setBaseUrl(url) {
        this.baseUrl = url;
        this.client = null; // Reset client to use new URL
        this.logger.debug(`Ollama base URL set to: ${url}`);
    }
    /**
     * Pull a new model from Ollama registry
     */
    async pullModel(modelName) {
        if (!this.client) {
            throw new Error('Ollama not initialized');
        }
        try {
            this.logger.info(`Pulling Ollama model: ${modelName}`);
            const response = await this.client.post('/api/pull', {
                name: modelName,
                stream: false
            });
            if (response.status === 200) {
                this.logger.info(`Model pulled successfully: ${modelName}`);
                await this.listAvailableModels();
            }
        }
        catch (error) {
            this.logger.error(`Failed to pull model: ${error}`);
            throw error;
        }
    }
    /**
     * Get system/hardware info for local inference
     */
    async getSystemInfo() {
        if (!this.client) {
            throw new Error('Ollama not initialized');
        }
        try {
            // This would call Ollama's system endpoint if available
            // For now, return basic info
            return {
                baseUrl: this.baseUrl,
                modelsAvailable: this.detectedModels.length,
                currentModel: this.modelId,
                isRunning: this.isRunning
            };
        }
        catch (error) {
            this.logger.error(`Failed to get system info: ${error}`);
            throw error;
        }
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=ollamaProvider.js.map