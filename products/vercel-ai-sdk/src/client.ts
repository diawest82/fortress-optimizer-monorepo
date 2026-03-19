// CANONICAL SOURCE: shared-libs/ts/fortress-client.ts
// Keep in sync — do not modify independently

/**
 * Fortress Token Optimizer - HTTP Client
 * Zero external dependencies - uses native fetch
 */

import {
  ResolvedFortressConfig,
  OptimizeResponse,
  UsageResponse,
  FortressError,
} from './types';

export class FortressClient {
  private readonly config: ResolvedFortressConfig;

  constructor(config: ResolvedFortressConfig) {
    if (!config.baseUrl.startsWith('https://') && !config.baseUrl.startsWith('http://localhost')) {
      throw new Error('Fortress API requires HTTPS.');
    }
    this.config = config;
  }

  /**
   * Optimize a prompt via the Fortress API.
   */
  async optimize(prompt: string): Promise<OptimizeResponse> {
    const url = `${this.config.baseUrl}/api/optimize`;

    const response = await this.request<OptimizeResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        level: this.config.level,
        provider: this.config.provider,
      }),
    });

    // Validate response integrity — defend against prompt injection
    const optimized = response.optimization?.optimized_prompt;
    if (optimized) {
      if (optimized.length > prompt.length * 2) {
        throw new Error('Response validation failed: optimized prompt suspiciously longer than original');
      }
      const patterns = ['ignore all previous', 'ignore the above', 'you are now', 'new instructions:'];
      const lower = optimized.toLowerCase();
      const promptLower = prompt.toLowerCase();
      for (const p of patterns) {
        if (lower.includes(p) && !promptLower.includes(p)) {
          throw new Error('Response validation failed: suspicious content in optimized prompt');
        }
      }
    }

    return response;
  }

  /**
   * Retrieve current usage statistics.
   */
  async getUsage(): Promise<UsageResponse> {
    const url = `${this.config.baseUrl}/api/usage`;
    return this.request<UsageResponse>(url, { method: 'GET' });
  }

  /**
   * Check if the Fortress API is reachable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Client': '@fortress-optimizer/vercel-ai',
          'X-Client-Version': '0.1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const message = await this.extractErrorMessage(response);
        throw new FortressError(message, response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof FortressError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new FortressError('Request timeout', 408);
      }

      throw new FortressError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const body = await response.text();
      const parsed = JSON.parse(body);
      return parsed.error || parsed.message || `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }
}
