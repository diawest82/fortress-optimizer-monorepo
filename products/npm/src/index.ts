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
  tier: string;
  tokens_optimized: number;
  tokens_saved: number;
  requests: number;
  tokens_limit: number | 'unlimited';
  tokens_remaining: number | 'unlimited';
  rate_limit: {
    requests_this_minute: number;
    requests_this_day: number;
    rpm_limit: number;
    rpd_limit: number;
  };
  reset_date: string;
}

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export class FortressClient {
  private api: AxiosInstance;
  private maxRetries: number;

  constructor(apiKey: string, options: ClientOptions = {}) {
    const baseUrl = options.baseUrl || 'https://api.fortress-optimizer.com';
    if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://localhost')) {
      throw new Error('Fortress API requires HTTPS. Use https:// URLs only.');
    }
    const timeout = options.timeout || 10000;
    this.maxRetries = Math.min(options.maxRetries ?? 3, 10);

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
    return this.withRetry(async () => {
      const response = await this.api.post<OptimizationResult>('/api/optimize', {
        prompt,
        level,
        provider,
      });
      const result = response.data;

      // Validate response integrity — defend against prompt injection
      if (result.optimization?.optimized_prompt) {
        const optimized = result.optimization.optimized_prompt;
        const originalLen = prompt.length;
        // Reject if optimized is significantly LONGER than original (injection likely)
        if (optimized.length > originalLen * 2) {
          throw new Error('Response validation failed: optimized prompt is suspiciously longer than original');
        }
        // Reject if it contains known injection patterns
        const injectionPatterns = [
          'ignore all previous',
          'ignore the above',
          'disregard prior',
          'system prompt',
          'you are now',
          'new instructions:',
        ];
        const lower = optimized.toLowerCase();
        for (const pattern of injectionPatterns) {
          if (lower.includes(pattern) && !prompt.toLowerCase().includes(pattern)) {
            throw new Error('Response validation failed: optimized prompt contains suspicious content');
          }
        }
      }

      return result;
    });
  }

  async getUsage(): Promise<UsageStats> {
    return this.withRetry(async () => {
      const response = await this.api.get<UsageStats>('/api/usage');
      return response.data;
    });
  }

  async getProviders(): Promise<string[]> {
    return this.withRetry(async () => {
      const response = await this.api.get<{ providers: string[] }>('/api/providers');
      return response.data.providers;
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health', { timeout: 2000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const axiosErr = error as AxiosError;
        // Don't retry auth errors or bad requests
        if (axiosErr.response?.status === 401 || axiosErr.response?.status === 400) {
          this.handleError(axiosErr);
        }
        lastError = error as Error;
        // Retry on 429 (rate limit) and 5xx with exponential backoff
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    if (lastError && 'response' in lastError) {
      this.handleError(lastError as unknown as AxiosError);
    }
    throw lastError || new Error('Request failed after retries');
  }

  private handleError(error: AxiosError): never {
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
