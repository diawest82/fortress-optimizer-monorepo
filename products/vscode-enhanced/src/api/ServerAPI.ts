/**
 * Fortress ServerAPI Client
 * 
 * Handles all communication with Fortress backend.
 * All optimization logic runs on server (never exposed to client).
 * VSCode extension only sends prompts and displays results.
 */

import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';

// ============================================================================
// Types
// ============================================================================

export interface OptimizeRequest {
  prompt: string;
  level: 'conservative' | 'balanced' | 'aggressive';
  provider: string;
}

export interface OptimizeResponse {
  request_id: string;
  status: 'success' | 'error';
  optimization?: {
    optimized_prompt: string;
    technique: string;
  };
  tokens?: {
    original: number;
    optimized: number;
    savings: number;
    savings_percentage: number;
  };
  cost?: {
    original: number;
    optimized: number;
    savings: number;
    currency: string;
  };
  timestamp: string;
  error?: string;
}

export interface ProviderInfo {
  providers: string[];
  count: number;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Production API endpoint
  API_BASE_URL: process.env.FORTRESS_API_URL || 'https://api.fortress-optimizer.com',
  
  // Local development endpoint (useful for testing)
  LOCAL_API_URL: process.env.FORTRESS_LOCAL_API || 'http://localhost:8000',
  
  // Request timeout (5 seconds)
  REQUEST_TIMEOUT: 5000,
  
  // Max retries
  MAX_RETRIES: 2,
  
  // Retry delay (ms)
  RETRY_DELAY: 1000,
};

// ============================================================================
// ServerAPI Client
// ============================================================================

export class FortressServerAPI {
  private apiKey: string;
  private baseUrl: string;
  private outputChannel: vscode.OutputChannel;

  constructor(apiKey: string, outputChannel: vscode.OutputChannel) {
    this.apiKey = apiKey;
    this.baseUrl = CONFIG.API_BASE_URL;
    this.outputChannel = outputChannel;
  }

  /**
   * Switch to local API (for development/testing)
   */
  useLocalAPI(): void {
    this.baseUrl = CONFIG.LOCAL_API_URL;
    this.outputChannel.appendLine('ℹ️  Using local API: ' + CONFIG.LOCAL_API_URL);
  }

  /**
   * Check server health
   */
  async checkHealth(): Promise<boolean> {
    try {
      this.outputChannel.appendLine('📡 Checking server health...');
      const response = await this.makeRequest<HealthResponse>(
        '/health',
        'GET',
        null,
        false, // Don't require API key for health check
      );
      
      const isHealthy = response.status === 'healthy';
      if (isHealthy) {
        this.outputChannel.appendLine(`✅ Server healthy (v${response.version})`);
      } else {
        this.outputChannel.appendLine('❌ Server unhealthy');
      }
      return isHealthy;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Get supported providers from server
   */
  async getProviders(): Promise<string[]> {
    try {
      this.outputChannel.appendLine('📡 Fetching supported providers...');
      const response = await this.makeRequest<ProviderInfo>(
        '/api/providers',
        'GET',
        null,
      );
      
      this.outputChannel.appendLine(`✅ Found ${response.count} providers`);
      return response.providers;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to get providers: ${error}`);
      throw error;
    }
  }

  /**
   * Optimize a prompt on the server
   * 
   * This sends the prompt to the backend server which runs the proprietary
   * optimization algorithm. The algorithm NEVER runs on the client.
   * 
   * Server-side benefits:
   * - Algorithm stays proprietary (can't be copied)
   * - Rules can be updated instantly for all users
   * - No offline capability (security by design)
   * - Deterministic results
   */
  async optimizePrompt(request: OptimizeRequest): Promise<OptimizeResponse> {
    try {
      this.outputChannel.appendLine(
        `📡 Optimizing prompt (${request.level} level, ${request.provider})...`
      );
      
      // Show prompt length
      const promptLength = request.prompt.length;
      this.outputChannel.appendLine(`   Prompt: ${promptLength} characters`);
      
      const response = await this.makeRequest<OptimizeResponse>(
        '/api/optimize',
        'POST',
        request,
      );

      if (response.status === 'success' && response.optimization && response.tokens) {
        const savings = response.tokens.savings;
        const savingsPercent = response.tokens.savings_percentage.toFixed(1);
        
        this.outputChannel.appendLine(
          `✅ Optimization complete: ${savings} tokens saved (${savingsPercent}%)`
        );
        this.outputChannel.appendLine(
          `   Technique: ${response.optimization.technique}`
        );
        
        if (response.cost) {
          this.outputChannel.appendLine(
            `   Cost saved: $${response.cost.savings.toFixed(4)} ${response.cost.currency}`
          );
        }
      } else {
        this.outputChannel.appendLine(`❌ Optimization failed: ${response.error}`);
      }

      return response;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Optimization request failed: ${error}`);
      throw error;
    }
  }

  /**
   * Make HTTP request to server
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body: any = null,
    requireAuth: boolean = true,
    retryCount: number = 0,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key to request
      if (requireAuth) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const options = {
        method,
        headers,
        timeout: CONFIG.REQUEST_TIMEOUT,
      };

      // Choose HTTP or HTTPS based on URL
      const client = this.baseUrl.startsWith('https') ? https : http;

      const req = client.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as T;

            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              // HTTP error status
              reject(
                new Error(
                  `HTTP ${res.statusCode}: ${(parsed as any).detail || 'Unknown error'}`
                )
              );
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        
        // Retry on timeout
        if (retryCount < CONFIG.MAX_RETRIES) {
          this.outputChannel.appendLine(
            `⏱️  Request timeout, retrying (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`
          );
          
          setTimeout(() => {
            this.makeRequest<T>(endpoint, method, body, requireAuth, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, CONFIG.RETRY_DELAY);
        } else {
          reject(new Error('Request timeout'));
        }
      });

      req.on('error', (error) => {
        // Retry on connection error
        if (retryCount < CONFIG.MAX_RETRIES) {
          this.outputChannel.appendLine(
            `⚠️  Connection error, retrying (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`
          );
          
          setTimeout(() => {
            this.makeRequest<T>(endpoint, method, body, requireAuth, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, CONFIG.RETRY_DELAY);
        } else {
          reject(error);
        }
      });

      // Send request body if present
      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }
}

// ============================================================================
// API Utility Functions
// ============================================================================

/**
 * Initialize API client with credentials
 */
export function initializeAPI(
  apiKey: string,
  outputChannel: vscode.OutputChannel,
): FortressServerAPI {
  return new FortressServerAPI(apiKey, outputChannel);
}

/**
 * Validate API key format
 */
export function isValidAPIKey(apiKey: string): boolean {
  // API keys should be at least 10 characters
  // Typically format: "fortress_xxx..."
  return /^fortress_.{20,}$/i.test(apiKey);
}
