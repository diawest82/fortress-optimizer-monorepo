import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { getLogger } from '../utils/logger';
import { CredentialManager } from './credentialManager';

/**
 * Groq API Provider
 * Ultra-fast LLM inference (70+ tokens/sec)
 * Developer favorite for speed and cost efficiency
 * Specialized for real-time, low-latency applications
 */
export class GroqProvider {
  private logger = getLogger();
  private client: AxiosInstance | null = null;
  private apiKey: string | null = null;
  private modelId: string = 'mixtral-8x7b-32768';
  private credentialManager: CredentialManager;

  constructor(credentialManager: CredentialManager) {
    this.credentialManager = credentialManager;
  }

  /**
   * Detect if Groq API is configured
   */
  async detect(): Promise<boolean> {
    try {
      this.apiKey = (await this.credentialManager.getCredential('groq')) || null;
      
      if (!this.apiKey) {
        this.logger.debug('Groq API key not configured');
        return false;
      }

      // Verify API key works
      this.initializeClient();
      await this.verifyApiKey();
      
      this.logger.info('Groq provider detected and verified');
      return true;
    } catch (error) {
      this.logger.warn(`Groq detection failed: ${error}`);
      return false;
    }
  }

  /**
   * Initialize axios client with Groq settings
   */
  private initializeClient(): void {
    if (!this.apiKey) {
      throw new Error('Groq API key not set');
    }

    this.client = axios.create({
      baseURL: 'https://api.groq.com',
      headers: {
        'authorization': `Bearer ${this.apiKey}`,
        'content-type': 'application/json'
      },
      timeout: 30000 // Groq is fast, but give it time
    });
  }

  /**
   * Verify API key is valid
   */
  private async verifyApiKey(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Test with minimal message
      await this.client.post('/openai/v1/chat/completions', {
        model: this.modelId,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Groq API key');
      }
      throw error;
    }
  }

  /**
   * Count tokens in text
   * Groq uses OpenAI-compatible tokenization (~4 chars per token)
   */
  async countTokens(text: string): Promise<number> {
    if (!text) return 1;

    // Groq tokenization: approximately 4 characters per token
    const baseTokens = Math.ceil(text.length / 4);
    
    // Adjust for special characters
    const specialChars = (text.match(/[^\w\s]/g) || []).length;
    const adjustment = Math.ceil(specialChars * 0.05);
    
    return Math.max(1, baseTokens + adjustment);
  }

  /**
   * Send optimized prompt to Groq API
   * Groq specializes in speed - great for real-time applications
   */
  async sendOptimized(
    optimizedPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Groq API not configured');
    }

    try {
      const startTime = Date.now();
      
      const response = await this.client.post('/openai/v1/chat/completions', {
        model: options?.model || this.modelId,
        messages: [
          {
            role: 'user',
            content: optimizedPrompt
          }
        ],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens || 1024
      });

      const elapsed = Date.now() - startTime;
      this.logger.debug(`Groq response: ${response.status} (${elapsed}ms)`);

      if (response.data?.choices?.[0]?.message?.content) {
        return response.data.choices[0].message.content;
      }

      throw new Error('Unexpected response format from Groq API');
    } catch (error) {
      this.logger.error(`Groq API error: ${error}`);
      throw error;
    }
  }

  /**
   * Get provider metadata
   */
  getMetadata() {
    return {
      name: 'Groq API',
      id: 'groq-api',
      extensionId: 'groq-api-provider',
      available: !!this.apiKey,
      supportsTokenCounting: true,
      supportsChatInterception: false,
      requiresApiKey: true,
      models: [
        'mixtral-8x7b-32768', // Fastest, most tokens context
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'llama2-70b-4096'
      ],
      pricingTier: 'speed-optimized',
      freeTierLimitTokens: 500000,
      marketPositioning: 'speed-specialist',
      speedAdvantage: '70+ tokens/sec (vs 4-5 for traditional APIs)',
      notes: 'Best for real-time, low-latency applications'
    };
  }

  /**
   * Check if provider is available and configured
   */
  isAvailable(): boolean {
    return !!this.apiKey && !!this.client;
  }

  /**
   * Get available models
   */
  async listModels(): Promise<string[]> {
    return this.getMetadata().models;
  }

  /**
   * Set which model to use
   */
  setModel(modelId: string): void {
    if (this.getMetadata().models.includes(modelId)) {
      this.modelId = modelId;
      this.logger.debug(`Groq model set to: ${modelId}`);
    } else {
      throw new Error(`Unknown Groq model: ${modelId}`);
    }
  }

  /**
   * Get current model
   */
  getCurrentModel(): string {
    return this.modelId;
  }

  /**
   * Get speed metrics
   * Groq's main selling point
   */
  getSpeedMetrics() {
    return {
      tokensPerSecond: 70,
      latencyMs: 50, // Average
      advantage: '14-20x faster than traditional APIs'
    };
  }
}
