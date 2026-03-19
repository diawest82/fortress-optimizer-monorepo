/**
 * Fortress API Client for Cursor Extension
 *
 * Lightweight HTTP client using Node.js built-in https module.
 * All optimization logic runs server-side -- this client only
 * sends prompts and receives optimized results.
 */

import * as https from 'https';
import * as http from 'http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimizeRequest {
  prompt: string;
  level: 'conservative' | 'balanced' | 'aggressive';
  provider: string;
}

export interface OptimizeResponse {
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
}

export interface UsageResponse {
  total_requests: number;
  tokens_saved: number;
  cost_saved: number;
  period: string;
  daily_breakdown?: Array<{
    date: string;
    requests: number;
    tokens_saved: number;
  }>;
}

export interface ProvidersResponse {
  providers: string[];
  count: number;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT = 10_000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 800;

export class FortressClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  /** Update the API key at runtime (e.g. after user re-configures). */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /** Update the base URL at runtime. */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  // -------------------------------------------------------------------------
  // Public API methods
  // -------------------------------------------------------------------------

  async optimize(request: OptimizeRequest): Promise<OptimizeResponse> {
    return this.post<OptimizeResponse>('/api/optimize', request);
  }

  async getUsage(): Promise<UsageResponse> {
    return this.get<UsageResponse>('/api/usage');
  }

  async getProviders(): Promise<ProvidersResponse> {
    return this.get<ProvidersResponse>('/api/providers');
  }

  // -------------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------------

  private get<T>(path: string): Promise<T> {
    return this.request<T>(path, 'GET');
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, 'POST', body);
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
    attempt = 0,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'fortress-cursor/1.0.0',
      };

      if (this.apiKey.startsWith('fk_')) {
        headers['X-API-Key'] = this.apiKey;
      } else {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
        timeout: REQUEST_TIMEOUT,
      };

      const req = transport.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => chunks.push(chunk));

        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(raw) as T);
            } catch {
              reject(new Error(`Invalid JSON in response: ${raw.slice(0, 200)}`));
            }
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            reject(new Error('Authentication failed. Check your Fortress API key.'));
          } else if (res.statusCode === 429) {
            reject(new Error('Rate limit exceeded. Please wait and try again.'));
          } else {
            let detail = `HTTP ${res.statusCode}`;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.detail) {
                detail += `: ${parsed.detail}`;
              }
            } catch {
              // use status code only
            }
            reject(new Error(detail));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        if (attempt < MAX_RETRIES) {
          setTimeout(() => {
            this.request<T>(path, method, body, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, RETRY_DELAY);
        } else {
          reject(new Error('Request timed out after retries'));
        }
      });

      req.on('error', (err) => {
        if (attempt < MAX_RETRIES) {
          setTimeout(() => {
            this.request<T>(path, method, body, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, RETRY_DELAY);
        } else {
          reject(new Error(`Connection failed: ${err.message}`));
        }
      });

      if (body !== undefined) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }
}
