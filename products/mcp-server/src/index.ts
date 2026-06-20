#!/usr/bin/env node
/**
 * Fortress Token Optimizer — MCP server.
 *
 * Exposes Fortress as Model Context Protocol tools so an agent host (Claude
 * Desktop, Cursor, etc.) can optimize prompts inline to cut LLM token costs.
 *
 * Auth: set FORTRESS_API_KEY (an fk_ key). If unset, the server auto-registers
 * a free key on first run and logs it to stderr so you can persist it.
 *
 * NOTE: stdout is the MCP transport — all logging MUST go to stderr.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.FORTRESS_API_URL || 'https://api.fortress-optimizer.com';
let apiKey: string | undefined = process.env.FORTRESS_API_KEY;

const log = (...args: unknown[]) => console.error('[fortress-mcp]', ...args);

interface RegisterResponse {
  api_key: string;
  tier: string;
}

async function registerFreeKey(name = 'fortress-mcp'): Promise<string> {
  const res = await fetch(`${API_BASE}/api/keys/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, tier: 'free' }),
  });
  if (!res.ok) {
    throw new Error(`register failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as RegisterResponse;
  return data.api_key;
}

/** Resolve a usable API key, auto-registering a free one if none was provided. */
async function ensureApiKey(): Promise<string> {
  if (apiKey) return apiKey;
  log('FORTRESS_API_KEY not set — registering a free key…');
  apiKey = await registerFreeKey();
  log(
    `Registered free key: ${apiKey}\n` +
      '  Set FORTRESS_API_KEY to this value to reuse it across runs ' +
      '(otherwise a new free key is created each start).',
  );
  return apiKey;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const key = await ensureApiKey();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
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

server.registerTool(
  'register_key',
  {
    title: 'Register a Fortress API key',
    description:
      'Create a new free Fortress API key (50,000 tokens/month, no signup). Returns the key; set it as FORTRESS_API_KEY to reuse.',
    inputSchema: {
      name: z.string().optional().describe('A label for the key. Default: fortress-mcp.'),
    },
  },
  async ({ name }) => {
    try {
      const key = await registerFreeKey(name || 'fortress-mcp');
      apiKey = apiKey || key; // adopt it for this session if we had none
      return { content: [{ type: 'text', text: key }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Register error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log(`ready (api: ${API_BASE}, key: ${apiKey ? 'provided' : 'will auto-register on first use'})`);
}

main().catch((err) => {
  log('fatal:', err);
  process.exit(1);
});
