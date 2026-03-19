/**
 * Fortress Token Optimizer - Vercel AI SDK Integration
 * Type definitions
 */

/** Optimization aggressiveness level */
export type OptimizationLevel = 'conservative' | 'balanced' | 'aggressive';

/** LLM provider hint for backend optimization strategies */
export type Provider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | string;

/** Configuration for the Fortress middleware */
export interface FortressConfig {
  /**
   * Fortress API key. Starts with `fk_`.
   * Falls back to FORTRESS_API_KEY environment variable if not provided.
   */
  apiKey?: string;

  /**
   * Base URL for the Fortress Optimizer API.
   * @default "https://api.fortress-optimizer.com"
   */
  baseUrl?: string;

  /**
   * Optimization level controlling how aggressively prompts are compressed.
   * - conservative: minimal changes, safest
   * - balanced: good savings with low risk
   * - aggressive: maximum savings, may alter meaning slightly
   * @default "balanced"
   */
  level?: OptimizationLevel;

  /**
   * LLM provider hint so the backend can apply provider-specific optimizations.
   * @default "openai"
   */
  provider?: Provider;

  /**
   * Request timeout in milliseconds.
   * @default 10000
   */
  timeout?: number;

  /**
   * If true, silently pass through the original prompt when optimization fails.
   * If false, throw errors from the optimization API.
   * @default true
   */
  gracefulDegradation?: boolean;

  /**
   * Optional callback invoked after each optimization with the result metadata.
   */
  onOptimization?: (metadata: OptimizationMetadata) => void;
}

/** The resolved config with all defaults applied */
export interface ResolvedFortressConfig {
  apiKey: string;
  baseUrl: string;
  level: OptimizationLevel;
  provider: Provider;
  timeout: number;
  gracefulDegradation: boolean;
  onOptimization?: (metadata: OptimizationMetadata) => void;
}

/** Response from POST /api/optimize */
export interface OptimizeResponse {
  request_id?: string;
  status?: 'success' | 'error' | 'rate_limited';
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
  timestamp?: string;
}

/** Response from GET /api/usage — matches backend API contract */
export interface UsageResponse {
  tier: string;
  tokens_optimized: number;
  tokens_saved: number;
  requests: number;
  tokens_limit: number | string;
  tokens_remaining: number | string;
  rate_limit: {
    requests_this_minute: number;
    requests_this_day: number;
    rpm_limit: number;
    rpd_limit: number;
  };
  reset_date: string;
}

/** Metadata passed to the onOptimization callback */
export interface OptimizationMetadata {
  originalTokens: number;
  optimizedTokens: number;
  savings: number;
  savingsPercentage: number;
  technique: string;
  level: OptimizationLevel;
  provider: Provider;
  durationMs: number;
}

/** Error thrown by the Fortress client */
export class FortressError extends Error {
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'FortressError';
    this.statusCode = statusCode;
    this.isRetryable = statusCode === 429 || statusCode === 503 || (statusCode !== undefined && statusCode >= 500);
  }
}
