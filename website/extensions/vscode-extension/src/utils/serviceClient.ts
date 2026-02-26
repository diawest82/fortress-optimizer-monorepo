import * as vscode from 'vscode';
import { getLogger } from './logger';

/**
 * Service Client
 * Communicates with local black box optimization service
 * Extension → HTTP → Python FastAPI Service
 */
export class OptimizationServiceClient {
  private logger = getLogger();
  private serviceUrl: string = 'http://127.0.0.1:8000';
  private isHealthy: boolean = false;

  constructor() {
    this.checkHealth();
  }

  /**
   * Check if service is running
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET'
      });
      this.isHealthy = response.ok;
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.logger.debug(`Service health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Optimize a prompt (calls Python service)
   */
  async optimize(
    prompt: string,
    provider: string = 'openai',
    optimizationLevel: string = 'balanced',
    context?: string
  ): Promise<OptimizationResult> {
    // Check service health first
    if (!this.isHealthy) {
      const healthy = await this.checkHealth();
      if (!healthy) {
        throw new Error(
          'Optimization service is not running. Please ensure the Python service is started on http://localhost:8000'
        );
      }
    }

    try {
      const response = await fetch(`${this.serviceUrl}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          provider,
          optimization_level: optimizationLevel,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Service returned ${response.status}`);
      }

      const data = await response.json() as any;
      
      this.logger.debug(
        `Optimization successful: ${data.metrics.percent_saved}% savings`
      );

      return {
        optimizedPrompt: data.optimized_prompt,
        metrics: {
          tokensBefore: data.metrics.tokens_before,
          tokensAfter: data.metrics.tokens_after,
          percentSaved: data.metrics.percent_saved,
          costUsdSaved: data.metrics.cost_usd_saved
        },
        provider: data.provider,
        timestamp: data.timestamp
      };
    } catch (error) {
      this.logger.error(`Optimization service error: ${error}`);
      throw error;
    }
  }

  /**
   * Get list of supported providers
   */
  async getProviders(): Promise<string[]> {
    try {
      const response = await fetch(`${this.serviceUrl}/providers`);
      const data = await response.json() as any;
      return data.providers || [];
    } catch (error) {
      this.logger.debug(`Failed to get providers: ${error}`);
      return ['openai', 'anthropic', 'azure-openai', 'google-gemini', 'groq', 'ollama'];
    }
  }

  /**
   * Get available optimization levels
   */
  async getOptimizationLevels(): Promise<OptimizationLevel[]> {
    try {
      const response = await fetch(`${this.serviceUrl}/optimization-levels`);
      const data = await response.json() as any;
      return data.levels || [];
    } catch (error) {
      this.logger.debug(`Failed to get optimization levels: ${error}`);
      return [
        { name: 'light', description: 'Minimal optimization' },
        { name: 'balanced', description: 'Medium optimization' },
        { name: 'aggressive', description: 'Maximum optimization' }
      ];
    }
  }

  /**
   * Check if service is accessible
   */
  getIsHealthy(): boolean {
    return this.isHealthy;
  }

  /**
   * Set custom service URL (for cloud deployment)
   */
  setServiceUrl(url: string): void {
    this.serviceUrl = url;
    this.logger.info(`Service URL updated to: ${url}`);
    this.checkHealth();
  }
}

export interface OptimizationResult {
  optimizedPrompt: string;
  metrics: {
    tokensBefore: number;
    tokensAfter: number;
    percentSaved: number;
    costUsdSaved: number;
  };
  provider: string;
  timestamp: string;
}

export interface OptimizationLevel {
  name: string;
  description: string;
}
