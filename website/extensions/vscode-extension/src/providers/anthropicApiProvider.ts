import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { getLogger } from '../utils/logger';
import { CredentialManager } from './credentialManager';

/**
 * Anthropic API Provider
 * Direct integration with Anthropic's Claude API
 * Supports: claude-3-opus, claude-3-sonnet, claude-3-haiku
 */
export class AnthropicApiProvider {
  private logger = getLogger();
  private client: AxiosInstance | null = null;
  private apiKey: string | null = null;
  private modelId: string = 'claude-3-5-sonnet-20241022';
  private credentialManager: CredentialManager;

  constructor(credentialManager: CredentialManager) {
    this.credentialManager = credentialManager;
  }

  /**
   * Detect if Anthropic API is configured
   */
  async detect(): Promise<boolean> {
    try {
      const apiKey = await vscode.commands.executeCommand('stealthOptimizer.getCredential', {
        service: 'anthropic',
        key: 'api_key'
      });
      
      this.apiKey = apiKey as string || null;
      
      if (!this.apiKey) {
        this.logger.debug('Anthropic API key not configured');
        return false;
      }

      // Verify API key works with a simple request
      this.initializeClient();
      await this.verifyApiKey();
      
      this.logger.info('Anthropic API provider detected and verified');
      return true;
    } catch (error) {
      this.logger.warn(`Anthropic API detection failed: ${error}`);
      return false;
    }
  }

  /**
   * Initialize axios client with Anthropic API settings
   */
  private initializeClient(): void {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    this.client = axios.create({
      baseURL: 'https://api.anthropic.com',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
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
      // Try a minimal message to verify key works
      await this.client.post('/v1/messages', {
        model: this.modelId,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Anthropic API key');
      }
      throw error;
    }
  }

  /**
   * Count tokens in text using Anthropic's token counting heuristic
   * Anthropic uses similar tokenization to Claude Desktop
   */
  async countTokens(text: string): Promise<number> {
    if (!text) return 1;

    // Anthropic's Claude 3 uses approximately 3.5 characters per token
    // This matches their public documentation
    const baseTokens = Math.ceil(text.length / 3.5);
    
    // Apply slight adjustment for special characters
    const specialChars = (text.match(/[^\w\s]/g) || []).length;
    const adjustment = Math.ceil(specialChars * 0.1);
    
    return Math.max(1, baseTokens + adjustment);
  }

  /**
   * Send an optimized prompt to Claude API
   */
  async sendOptimized(
    optimizedPrompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic API not configured');
    }

    try {
      const response = await this.client.post('/v1/messages', {
        model: options?.model || this.modelId,
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: optimizedPrompt
          }
        ]
      });

      this.logger.debug(`Anthropic API response: ${response.status}`);
      
      // Extract text from response
      if (response.data?.content?.[0]?.text) {
        return response.data.content[0].text;
      }

      throw new Error('Unexpected response format from Anthropic API');
    } catch (error) {
      this.logger.error(`Anthropic API error: ${error}`);
      throw error;
    }
  }

  /**
   * Get provider metadata
   */
  getMetadata() {
    return {
      name: 'Anthropic Claude API',
      id: 'anthropic-api',
      extensionId: 'anthropic-api-provider',
      available: !!this.apiKey,
      supportsTokenCounting: true,
      supportsChatInterception: false,
      requiresApiKey: true,
      models: [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-haiku-20240307'
      ],
      pricingTier: 'direct-api',
      freeTierLimitTokens: 500000
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
      this.logger.debug(`Anthropic model set to: ${modelId}`);
    } else {
      throw new Error(`Unknown Anthropic model: ${modelId}`);
    }
  }

  /**
   * Get current model
   */
  getCurrentModel(): string {
    return this.modelId;
  }
}
