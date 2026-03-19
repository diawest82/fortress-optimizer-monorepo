/**
 * @fortress-optimizer/vercel-ai
 *
 * Vercel AI SDK middleware for automatic prompt optimization
 * via the Fortress Token Optimizer backend API.
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

// Middleware (primary API)
export { fortressMiddleware, createFortressClient } from './middleware';

// HTTP client
export { FortressClient } from './client';

// Types
export type {
  FortressConfig,
  ResolvedFortressConfig,
  OptimizationLevel,
  Provider,
  OptimizeResponse,
  UsageResponse,
  OptimizationMetadata,
} from './types';

export { FortressError } from './types';
