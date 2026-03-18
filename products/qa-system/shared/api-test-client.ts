/**
 * Shared API test client for product QA.
 * Handles key registration, API calls, and cleanup.
 */

const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

export interface OptimizeResult {
  request_id: string;
  status: string;
  optimization: { optimized_prompt: string; technique: string };
  tokens: { original: number; optimized: number; savings: number; savings_percentage: number };
  timestamp: string;
}

export interface UsageResult {
  tier: string;
  tokens_optimized: number;
  tokens_saved: number;
  requests: number;
  tokens_limit: number | string;
  tokens_remaining: number | string;
  rate_limit: Record<string, number>;
}

export class ProductTestClient {
  private apiKey: string = '';
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API;
  }

  async registerKey(name: string = 'product-qa-test'): Promise<string> {
    const resp = await fetch(`${this.baseUrl}/api/keys/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tier: 'free' }),
    });
    if (!resp.ok) throw new Error(`Register failed: ${resp.status}`);
    const data = await resp.json();
    this.apiKey = data.api_key;
    return this.apiKey;
  }

  async optimize(prompt: string, level = 'balanced', provider = 'openai'): Promise<OptimizeResult> {
    const resp = await fetch(`${this.baseUrl}/api/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ prompt, level, provider }),
    });
    if (!resp.ok) throw new Error(`Optimize failed: ${resp.status}`);
    return resp.json();
  }

  async getUsage(): Promise<UsageResult> {
    const resp = await fetch(`${this.baseUrl}/api/usage`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!resp.ok) throw new Error(`Usage failed: ${resp.status}`);
    return resp.json();
  }

  async getProviders(): Promise<{ providers: string[]; count: number }> {
    const resp = await fetch(`${this.baseUrl}/api/providers`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!resp.ok) throw new Error(`Providers failed: ${resp.status}`);
    return resp.json();
  }

  async healthCheck(): Promise<Record<string, unknown>> {
    const resp = await fetch(`${this.baseUrl}/health`);
    if (!resp.ok) throw new Error(`Health failed: ${resp.status}`);
    return resp.json();
  }

  async rotateKey(): Promise<string> {
    const resp = await fetch(`${this.baseUrl}/api/keys/rotate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!resp.ok) throw new Error(`Rotate failed: ${resp.status}`);
    const data = await resp.json();
    this.apiKey = data.api_key;
    return this.apiKey;
  }

  async revokeKey(): Promise<void> {
    await fetch(`${this.baseUrl}/api/keys`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    this.apiKey = '';
  }

  getApiKey(): string {
    return this.apiKey;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
