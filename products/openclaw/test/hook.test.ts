/**
 * Phase 5: before-tool-call Hook Tests
 * Validates prompt interception in tool calls
 */

import { createBeforeToolCallHook } from '../src/hook';
import { FortressClient } from '../src/client';
import { ResolvedFortressConfig, ToolCall } from '../src/types';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------
const originalFetch = global.fetch;

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  global.fetch = handler as typeof fetch;
}

afterEach(() => {
  global.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeConfig(overrides: Partial<ResolvedFortressConfig> = {}): ResolvedFortressConfig {
  return {
    apiKey: 'fk_test_hook_key_123456789',
    baseUrl: 'https://api.fortress-optimizer.com',
    level: 'balanced',
    provider: 'openai',
    timeout: 10_000,
    gracefulDegradation: true,
    minPromptLength: 50,
    ...overrides,
  };
}

function makeOptimizeResponse(optimizedPrompt: string, original = 100, optimized = 70) {
  return {
    request_id: 'opt_hook_test',
    status: 'success',
    optimization: { optimized_prompt: optimizedPrompt, technique: 'compression' },
    tokens: {
      original,
      optimized,
      savings: original - optimized,
      savings_percentage: Math.round(((original - optimized) / original) * 100),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('before-tool-call hook', () => {
  it('should intercept and optimize prompt arguments', async () => {
    mockFetch(async () => {
      return new Response(JSON.stringify(makeOptimizeResponse('shorter version of the prompt')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const config = makeConfig();
    const client = new FortressClient(config);
    const hook = createBeforeToolCallHook(client, config);

    const toolCall: ToolCall = {
      name: 'send-message',
      args: { prompt: 'This is a very long prompt that definitely exceeds the minimum length threshold for optimization' },
    };

    const result = await hook(toolCall);
    expect(result.args.prompt).toBe('shorter version of the prompt');
  });

  it('should pass through non-prompt tool calls unchanged', async () => {
    mockFetch(async () => {
      throw new Error('fetch should not be called');
    });

    const config = makeConfig();
    const client = new FortressClient(config);
    const hook = createBeforeToolCallHook(client, config);

    const toolCall: ToolCall = {
      name: 'list-files',
      args: { directory: '/home/user', recursive: true },
    };

    const result = await hook(toolCall);
    expect(result).toEqual(toolCall);
  });

  it('should respect gracefulDegradation on API error', async () => {
    mockFetch(async () => {
      return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
    });

    const config = makeConfig({ gracefulDegradation: true });
    const client = new FortressClient(config);
    const hook = createBeforeToolCallHook(client, config);

    const originalPrompt = 'This is the original prompt text that is long enough to pass the minimum length check easily';
    const toolCall: ToolCall = {
      name: 'send-message',
      args: { prompt: originalPrompt },
    };

    const result = await hook(toolCall);
    expect(result.args.prompt).toBe(originalPrompt);
  });

  it('should skip optimization for short prompts below threshold', async () => {
    mockFetch(async () => {
      throw new Error('fetch should not be called for short prompts');
    });

    const config = makeConfig({ minPromptLength: 50 });
    const client = new FortressClient(config);
    const hook = createBeforeToolCallHook(client, config);

    const toolCall: ToolCall = {
      name: 'send-message',
      args: { prompt: 'Hi' },
    };

    const result = await hook(toolCall);
    expect(result.args.prompt).toBe('Hi');
  });

  it('should add X-Optimized-By metadata to tool call', async () => {
    mockFetch(async () => {
      return new Response(JSON.stringify(makeOptimizeResponse('optimized text here that is good')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const config = makeConfig();
    const client = new FortressClient(config);
    const hook = createBeforeToolCallHook(client, config);

    const toolCall: ToolCall = {
      name: 'send-message',
      args: { prompt: 'This prompt is long enough to be optimized by the fortress optimizer skill easily' },
    };

    const result = await hook(toolCall);
    expect(result.metadata?.['X-Optimized-By']).toBe('fortress-optimizer');
    expect(result.metadata?.['X-Tokens-Saved']).toBeDefined();
  });

  it('should detect multiple prompt key names', async () => {
    mockFetch(async () => {
      return new Response(JSON.stringify(makeOptimizeResponse('optimized content value')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const config = makeConfig();
    const client = new FortressClient(config);
    const hook = createBeforeToolCallHook(client, config);

    // Test with 'content' key instead of 'prompt'
    const toolCall: ToolCall = {
      name: 'write-file',
      args: { content: 'This is a long content string that exceeds the minimum prompt length threshold for optimization', path: '/tmp/out.txt' },
    };

    const result = await hook(toolCall);
    expect(result.args.content).toBe('optimized content value');
    expect(result.args.path).toBe('/tmp/out.txt'); // Non-prompt args unchanged
  });
});
