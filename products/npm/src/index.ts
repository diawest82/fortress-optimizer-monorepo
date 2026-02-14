/**
 * Fortress Token Optimizer - npm Package
 * Safe HTTP client wrapper around API
 * Algorithm is backend-only (never exposed in client code)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface OptimizationResult {
  request_id: string;
  status: 'success' | 'error' | 'rate_limited';
  optimization: {
    optimized_prompt: string;
    technique: string;
  };
  tokens: {
    original: number;
    optimized: number;
    savings: number;
    savings_percentage: number;
  };
  timestamp: string;
}

export interface UsageStats {
  tokens_used_this_month: number;
  tokens_limit: number;
  tokens_remaining: number;
  percentage_used: number;
  reset_date: string;
}

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class FortressClient {
  private api: AxiosInstance;

  constructor(apiKey: string, options: ClientOptions = {}) {
    const baseUrl = options.baseUrl || 'https://api.fortress-optimizer.com';
    const timeout = options.timeout || 10000;

    this.api = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Client-Version': '1.0.0',
        'Content-Type': 'application/json',
      },
    });
  }

  async optimize(
    prompt: string,
    level: 'conservative' | 'balanced' | 'aggressive' = 'balanced',
    provider: string = 'openai'
  ): Promise<OptimizationResult> {
    try {
      const response = await this.api.post<OptimizationResult>('/api/optimize', {
        prompt,
        level,
        provider,
      });

      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  async getUsage(): Promise<UsageStats> {
    try {
      const response = await this.api.get<UsageStats>('/api/usage');
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  async getProviders(): Promise<string[]> {
    try {
      const response = await this.api.get<{ providers: string[] }>('/api/providers');
      return response.data.providers;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health', { timeout: 2000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private handleError(error: AxiosError): void {
    if (error.response?.status === 401) {
      throw new Error('Invalid API key');
    }
    if (error.response?.status === 429) {
      throw new Error('Rate limited - please wait before retrying');
    }
    if (error.response?.status === 400) {
      throw new Error(`Invalid request: ${error.response.data}`);
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout');
    }
    throw new Error(`API error: ${error.message}`);
  }
}

export default FortressClient;
