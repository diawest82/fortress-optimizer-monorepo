/**
 * Fortress ContextEngine adapter for OpenClaw
 * Implements the ContextEngine interface as a thin API client
 */

import { FortressClient } from './client';
import {
  ContextEngine,
  OptimizationMetadata,
  ResolvedFortressConfig,
} from './types';

export class FortressContextEngine implements ContextEngine {
  private readonly client: FortressClient;
  private readonly config: ResolvedFortressConfig;
  private content: string = '';
  private cumulativeStats = { totalSaved: 0, totalOriginal: 0, turns: 0 };
  private lastOptimization?: OptimizationMetadata;

  constructor(client: FortressClient, config: ResolvedFortressConfig) {
    this.client = client;
    this.config = config;
  }

  async bootstrap(): Promise<void> {
    const healthy = await this.client.healthCheck();
    if (!healthy) {
      console.warn('[fortress-optimizer] API unreachable during bootstrap — will retry on first use');
    }
  }

  ingest(content: string): void {
    this.content = content;
  }

  async assemble(): Promise<string> {
    if (!this.content) return '';

    const start = Date.now();
    try {
      const result = await this.client.optimize(this.content);
      const optimized = result.optimization.optimized_prompt;

      if (!optimized) return this.content;

      const metadata: OptimizationMetadata = {
        originalTokens: result.tokens.original,
        optimizedTokens: result.tokens.optimized,
        savings: result.tokens.savings,
        savingsPercentage: result.tokens.savings_percentage,
        technique: result.optimization.technique,
        level: this.config.level,
        provider: this.config.provider,
        durationMs: Date.now() - start,
      };

      this.lastOptimization = metadata;
      this.config.onOptimization?.(metadata);

      return optimized;
    } catch (error) {
      if (this.config.gracefulDegradation) {
        return this.content;
      }
      throw error;
    }
  }

  async compact(): Promise<void> {
    // No-op: all optimization is server-side
  }

  afterTurn(): void {
    if (this.lastOptimization) {
      this.cumulativeStats.totalSaved += this.lastOptimization.savings;
      this.cumulativeStats.totalOriginal += this.lastOptimization.originalTokens;
      this.cumulativeStats.turns += 1;
      this.lastOptimization = undefined;
    }
  }

  dispose(): void {
    // Clean no-op
  }

  getStats() {
    return { ...this.cumulativeStats };
  }
}
