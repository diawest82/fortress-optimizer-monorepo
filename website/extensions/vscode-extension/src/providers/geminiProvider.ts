import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { getLogger } from '../utils/logger';
import { CredentialManager } from './credentialManager';

/**
 * Google Gemini API Provider
 * Integration with Google's Gemini models via Vertex AI API
 * Rising star in LLM market with strong enterprise adoption
 */
export class GeminiProvider {
  private logger = getLogger();
  private client: AxiosInstance | null = null;
  private apiKey: string | null = null;
  private projectId: string = '';
  private modelId: string = 'gemini-1.5-pro';
  private credentialManager: CredentialManager;
  private location: string = 'us-central1';

  constructor(credentialManager: CredentialManager) {
    this.credentialManager = credentialManager;
  }

  /**
   * Detect if Google Gemini API is configured
   */
  async detect(): Promise<boolean> {
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
    } catch (error) {
      this.logger.warn(`Gemini API detection failed: ${error}`);
      return false;
    }
  }

  /**
   * Initialize axios client with Gemini settings
   */
  private initializeClient(): void {
    if (!this.apiKey) {
      throw new Error('Gemini API key not set');
    }

    this.client = axios.create({
      baseURL: 'https://generativelanguage.googleapis.com',
      headers: {
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
      // Test with minimal request
      await this.client.post(
        `/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [{ text: 'test' }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 10
          }
        }
      );
    } catch (error: any) {
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
  async countTokens(text: string): Promise<number> {
    if (!text) return 1;

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
  async sendOptimized(
    optimizedPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    if (!this.client || !this.apiKey) {
      throw new Error('Gemini API not configured');
    }

    try {
      const model = options?.model || this.modelId;
      
      const response = await this.client.post(
        `/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
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
        }
      );

      this.logger.debug(`Gemini API response: ${response.status}`);

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      }

      throw new Error('Unexpected response format from Gemini API');
    } catch (error) {
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
      this.logger.debug(`Gemini model set to: ${modelId}`);
    } else {
      throw new Error(`Unknown Gemini model: ${modelId}`);
    }
  }

  /**
   * Get current model
   */
  getCurrentModel(): string {
    return this.modelId;
  }

  /**
   * Set Google Cloud project ID for billing
   */
  setProjectId(projectId: string): void {
    this.projectId = projectId;
    this.logger.debug(`Google project ID set to: ${projectId}`);
  }

  /**
   * Get project ID
   */
  getProjectId(): string {
    return this.projectId;
  }
}
