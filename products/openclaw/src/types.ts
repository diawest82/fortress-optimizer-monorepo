/**
 * Fortress Token Optimizer - OpenClaw Skill
 * Type definitions
 */

/** Optimization aggressiveness level */
export type OptimizationLevel = 'conservative' | 'balanced' | 'aggressive';

/** LLM provider hint for backend optimization strategies */
export type Provider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | string;

/** Configuration for the Fortress OpenClaw skill */
export interface FortressConfig {
  apiKey?: string;
  baseUrl?: string;
  level?: OptimizationLevel;
  provider?: Provider;
  timeout?: number;
  gracefulDegradation?: boolean;
  onOptimization?: (metadata: OptimizationMetadata) => void;
  /** Minimum prompt length (chars) to optimize. Shorter prompts are skipped. */
  minPromptLength?: number;
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
  minPromptLength: number;
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

/** Response from GET /api/usage */
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

/** OpenClaw ContextEngine interface (subset we implement) */
export interface ContextEngine {
  bootstrap(): Promise<void>;
  ingest(content: string): void;
  assemble(): Promise<string>;
  compact(): Promise<void>;
  afterTurn(stats?: OptimizationMetadata): void;
  dispose(): void;
}

/** OpenClaw tool call shape */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Skill registration return type */
export interface SkillRegistration {
  contextEngine: ContextEngine;
  hooks: {
    'before-tool-call': (toolCall: ToolCall) => Promise<ToolCall>;
  };
}

/** Default configuration values */
export const DEFAULTS = {
  baseUrl: 'https://api.fortress-optimizer.com',
  level: 'balanced' as OptimizationLevel,
  provider: 'openai' as Provider,
  timeout: 10_000,
  gracefulDegradation: true,
  minPromptLength: 50,
} as const;
