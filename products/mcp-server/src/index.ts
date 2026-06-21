#!/usr/bin/env node
/**
 * Fortress Token Optimizer — MCP server.
 *
 * Exposes Fortress as Model Context Protocol tools so an agent host (Claude
 * Desktop, Cursor, etc.) can optimize prompts inline to cut LLM token costs.
 *
 * Auth: set FORTRESS_API_KEY (an fk_ key). There is no anonymous key minting.
 * Get a free key (one per Google/GitHub account) by signing in at
 * https://www.fortress-optimizer.com, or use your paid key, then set
 * FORTRESS_API_KEY to it.
 *
 * NOTE: stdout is the MCP transport — all logging MUST go to stderr.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.FORTRESS_API_URL || 'https://api.fortress-optimizer.com';
const apiKey: string | undefined = process.env.FORTRESS_API_KEY;

const log = (...args: unknown[]) => console.error('[fortress-mcp]', ...args);

const MISSING_KEY_MESSAGE =
  'FORTRESS_API_KEY is not set. Sign in with Google or GitHub at ' +
  'https://www.fortress-optimizer.com to claim your free key (one per account), ' +
  'or use your paid key, then set FORTRESS_API_KEY to that value and restart this server.';

/** A tool result that tells the user how to obtain and set an API key. */
function missingKeyResult() {
  return {
    content: [{ type: 'text' as const, text: MISSING_KEY_MESSAGE }],
    isError: true as const,
  };
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
  });
}

const server = new McpServer({ name: 'fortress-optimizer', version: '1.0.0' });

server.registerTool(
  'optimize_prompt',
  {
    title: 'Optimize prompt (Fortress)',
    description:
      'Reduce a prompt’s token count (typically 10–20%) while preserving meaning, before sending it to an LLM. Returns the optimized prompt and the measured token savings.',
    inputSchema: {
      prompt: z.string().min(1).describe('The prompt text to optimize.'),
      level: z
        .enum(['conservative', 'balanced', 'aggressive'])
        .optional()
        .describe('Optimization aggressiveness. Default: balanced.'),
      provider: z
        .string()
        .optional()
        .describe('Target LLM provider (openai, anthropic, azure, gemini, groq, ollama). Default: openai.'),
      model: z
        .string()
        .optional()
        .describe('Target model id (e.g. gpt-4o). When set, a cost estimate is included.'),
    },
  },
  async ({ prompt, level, provider, model }) => {
    if (!apiKey) return missingKeyResult();
    try {
      const res = await authedFetch('/api/optimize', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          level: level || 'balanced',
          provider: provider || 'openai',
          ...(model ? { model } : {}),
        }),
      });
      if (!res.ok) {
        return {
          content: [{ type: 'text', text: `Optimize failed: ${res.status} ${await res.text()}` }],
          isError: true,
        };
      }
      const data = (await res.json()) as {
        optimization?: { optimized_prompt?: string; technique?: string };
        tokens?: { original?: number; optimized?: number; savings?: number; savings_percentage?: number };
        cost?: { savings_usd?: number | null } | null;
      };
      const t = data.tokens || {};
      const optimized = data.optimization?.optimized_prompt ?? '';
      const summary =
        `Saved ${t.savings ?? 0} tokens (${t.savings_percentage ?? 0}%): ` +
        `${t.original ?? 0} → ${t.optimized ?? 0}` +
        (data.cost?.savings_usd != null ? ` (~$${data.cost.savings_usd} saved)` : '');
      return {
        content: [
          { type: 'text', text: summary },
          { type: 'text', text: optimized },
        ],
        structuredContent: data as Record<string, unknown>,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Optimize error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  },
);

server.registerTool(
  'get_usage',
  {
    title: 'Get Fortress usage',
    description: 'Return the current API key’s usage, tier, and remaining monthly quota.',
    inputSchema: {},
  },
  async () => {
    if (!apiKey) return missingKeyResult();
    try {
      const res = await authedFetch('/api/usage');
      if (!res.ok) {
        return {
          content: [{ type: 'text', text: `Usage failed: ${res.status} ${await res.text()}` }],
          isError: true,
        };
      }
      const data = (await res.json()) as Record<string, unknown>;
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Usage error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (!apiKey) {
    log(
      'ready, but FORTRESS_API_KEY is not set — tools will fail until you set it. ' +
        'Get a free key (one per Google/GitHub account) at https://www.fortress-optimizer.com.',
    );
  } else {
    log(`ready (api: ${API_BASE}, key: provided)`);
  }
}

main().catch((err) => {
  log('fatal:', err);
  process.exit(1);
});
