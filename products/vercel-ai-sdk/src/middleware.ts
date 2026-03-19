/**
 * Fortress Token Optimizer - Vercel AI SDK Middleware
 *
 * Intercepts prompts before they reach the LLM and optimizes them
 * via the Fortress backend API. Works with streamText, generateText,
 * and all Vercel AI SDK model-calling functions.
 */

import type {
  Experimental_LanguageModelV1Middleware as LanguageModelV1Middleware,
  LanguageModelV1CallOptions,
  LanguageModelV1Prompt,
} from 'ai';

import {
  FortressConfig,
  ResolvedFortressConfig,
  OptimizationMetadata,
  FortressError,
} from './types';
import { FortressClient } from './client';

/**
 * Resolve user config into a full config with defaults applied.
 */
function resolveConfig(config: FortressConfig = {}): ResolvedFortressConfig {
  const apiKey = config.apiKey || getEnvApiKey();

  if (!apiKey) {
    throw new FortressError(
      'Fortress API key is required. Provide it via the apiKey option or set the FORTRESS_API_KEY environment variable.'
    );
  }

  return {
    apiKey,
    baseUrl: (config.baseUrl || 'https://api.fortress-optimizer.com').replace(/\/+$/, ''),
    level: config.level || 'balanced',
    provider: config.provider || 'openai',
    timeout: config.timeout || 10000,
    gracefulDegradation: config.gracefulDegradation !== false,
    onOptimization: config.onOptimization,
  };
}

function getEnvApiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.FORTRESS_API_KEY;
  }
  return undefined;
}

/**
 * Extract the full prompt text from a Vercel AI SDK prompt array.
 * Concatenates all user text parts from the last user message.
 */
function extractPromptText(prompt: LanguageModelV1Prompt): string | null {
  // Walk messages in reverse to find the last user message
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i];
    if (message.role === 'user') {
      const textParts = message.content.filter(
        (part): part is { type: 'text'; text: string } => part.type === 'text'
      );
      if (textParts.length > 0) {
        return textParts.map((p) => p.text).join('\n');
      }
    }
  }
  return null;
}

/**
 * Replace the text in the last user message with the optimized version.
 * Returns a new prompt array (does not mutate the original).
 */
function replacePromptText(
  prompt: LanguageModelV1Prompt,
  optimizedText: string
): LanguageModelV1Prompt {
  const newPrompt = [...prompt];

  for (let i = newPrompt.length - 1; i >= 0; i--) {
    const message = newPrompt[i];
    if (message.role === 'user') {
      const newContent = message.content.map((part) => {
        if (part.type === 'text') {
          return { ...part, text: optimizedText };
        }
        return part;
      });
      newPrompt[i] = { ...message, content: newContent };
      break;
    }
  }

  return newPrompt;
}

/**
 * Create Fortress optimizer middleware for the Vercel AI SDK.
 *
 * This middleware intercepts prompts before they are sent to the language model,
 * optimizes them via the Fortress backend API, and passes the optimized prompt
 * to the model. If optimization fails and gracefulDegradation is enabled (default),
 * the original prompt is used instead.
 *
 * @example
 * ```ts
 * import { fortressMiddleware } from '@fortress-optimizer/vercel-ai';
 * import { wrapLanguageModel, generateText } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 *
 * const model = wrapLanguageModel({
 *   model: openai('gpt-4o'),
 *   middleware: fortressMiddleware({ apiKey: 'fk_...' }),
 * });
 *
 * const { text } = await generateText({ model, prompt: 'Explain quantum computing' });
 * ```
 */
export function fortressMiddleware(
  config?: FortressConfig
): LanguageModelV1Middleware {
  const resolved = resolveConfig(config);
  const client = new FortressClient(resolved);

  const middleware: LanguageModelV1Middleware = {
    transformParams: async ({ params }) => {
      const promptText = extractPromptText(params.prompt);

      // If there is no user text to optimize, pass through unchanged
      if (!promptText || promptText.trim().length === 0) {
        return params;
      }

      try {
        const start = Date.now();
        const result = await client.optimize(promptText);
        const durationMs = Date.now() - start;

        const optimizedPrompt = result.optimization.optimized_prompt;

        // If the API returned an empty or identical prompt, skip replacement
        if (!optimizedPrompt || optimizedPrompt === promptText) {
          return params;
        }

        // Notify callback if provided
        if (resolved.onOptimization) {
          const metadata: OptimizationMetadata = {
            originalTokens: result.tokens.original,
            optimizedTokens: result.tokens.optimized,
            savings: result.tokens.savings,
            savingsPercentage: result.tokens.savings_percentage,
            technique: result.optimization.technique,
            level: resolved.level,
            provider: resolved.provider,
            durationMs,
          };
          resolved.onOptimization(metadata);
        }

        return {
          ...params,
          prompt: replacePromptText(params.prompt, optimizedPrompt),
        };
      } catch (error) {
        if (resolved.gracefulDegradation) {
          return params;
        }
        throw error;
      }
    },
  };

  return middleware;
}

/**
 * Create a Fortress client instance for direct API access (e.g., usage stats).
 */
export function createFortressClient(config?: FortressConfig): FortressClient {
  const resolved = resolveConfig(config);
  return new FortressClient(resolved);
}

// Re-export for advanced usage
export { resolveConfig as _resolveConfig };
