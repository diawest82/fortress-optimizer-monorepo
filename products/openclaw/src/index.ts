/**
 * Fortress Token Optimizer — OpenClaw Skill
 * Thin API client that optimizes prompts server-side
 */

export { FortressClient } from './client';
export { FortressContextEngine } from './context-engine';
export { createBeforeToolCallHook } from './hook';
export { FortressError, DEFAULTS } from './types';
export type {
  FortressConfig,
  ResolvedFortressConfig,
  OptimizeResponse,
  UsageResponse,
  OptimizationMetadata,
  OptimizationLevel,
  Provider,
  ContextEngine,
  ToolCall,
  SkillRegistration,
} from './types';

import { FortressClient } from './client';
import { FortressContextEngine } from './context-engine';
import { createBeforeToolCallHook } from './hook';
import {
  FortressConfig,
  ResolvedFortressConfig,
  SkillRegistration,
  DEFAULTS,
} from './types';

function resolveConfig(config: FortressConfig = {}): ResolvedFortressConfig {
  const apiKey = config.apiKey || process.env.FORTRESS_API_KEY || '';

  if (!apiKey) {
    throw new Error(
      'Fortress API key is required. Provide it via apiKey option or set FORTRESS_API_KEY environment variable.'
    );
  }

  const baseUrl = (config.baseUrl || process.env.FORTRESS_BASE_URL || DEFAULTS.baseUrl).replace(/\/+$/, '');

  return {
    apiKey,
    baseUrl,
    level: config.level || (process.env.FORTRESS_LEVEL as any) || DEFAULTS.level,
    provider: config.provider || (process.env.FORTRESS_PROVIDER as any) || DEFAULTS.provider,
    timeout: config.timeout ?? DEFAULTS.timeout,
    gracefulDegradation: config.gracefulDegradation ?? DEFAULTS.gracefulDegradation,
    onOptimization: config.onOptimization,
    minPromptLength: config.minPromptLength ?? DEFAULTS.minPromptLength,
  };
}

export function registerSkill(config?: FortressConfig): SkillRegistration {
  const resolved = resolveConfig(config);
  const client = new FortressClient(resolved);
  const contextEngine = new FortressContextEngine(client, resolved);
  const hook = createBeforeToolCallHook(client, resolved);

  return {
    contextEngine,
    hooks: {
      'before-tool-call': hook,
    },
  };
}
