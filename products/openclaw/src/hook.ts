/**
 * OpenClaw before-tool-call hook
 * Intercepts tool calls and optimizes prompt-like arguments
 */

import { FortressClient } from './client';
import { ToolCall, ResolvedFortressConfig } from './types';

const PROMPT_KEYS = ['prompt', 'text', 'message', 'content', 'input', 'query'];

export function createBeforeToolCallHook(
  client: FortressClient,
  config: ResolvedFortressConfig,
) {
  return async (toolCall: ToolCall): Promise<ToolCall> => {
    const promptKey = PROMPT_KEYS.find(
      (k) => typeof toolCall.args[k] === 'string'
    );

    if (!promptKey) return toolCall;

    const prompt = toolCall.args[promptKey] as string;

    if (prompt.length < config.minPromptLength) return toolCall;

    try {
      const result = await client.optimize(prompt);
      const optimized = result.optimization.optimized_prompt;

      if (!optimized) return toolCall;

      return {
        ...toolCall,
        args: { ...toolCall.args, [promptKey]: optimized },
        metadata: {
          ...toolCall.metadata,
          'X-Optimized-By': 'fortress-optimizer',
          'X-Tokens-Saved': result.tokens.savings,
        },
      };
    } catch {
      if (config.gracefulDegradation) return toolCall;
      throw new Error('Fortress optimization failed for tool call');
    }
  };
}
