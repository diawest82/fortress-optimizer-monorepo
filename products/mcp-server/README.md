# @fortress-optimizer/mcp-server

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Fortress Token Optimizer](https://www.fortress-optimizer.com). It lets an MCP host (Claude Desktop, Cursor, and other agent runtimes) call Fortress inline to **cut LLM token costs by ~10–20%** — the agent optimizes its own prompts before sending them to a model.

## Why

Fortress is built to be used by agents: the server can **self-register a free API key** with no human and no signup form, so an agent can start optimizing immediately and verify its own savings (every result reports original vs optimized token counts).

## Install / configure

Add it to your MCP client config:

```json
{
  "mcpServers": {
    "fortress": {
      "command": "npx",
      "args": ["-y", "@fortress-optimizer/mcp-server"],
      "env": { "FORTRESS_API_KEY": "fk_..." }
    }
  }
}
```

`FORTRESS_API_KEY` is optional. If it's unset, the server **auto-registers a free key** on first run and logs it to stderr — set that value as `FORTRESS_API_KEY` to reuse the same key (otherwise a new free key is created each start).

Environment variables:

| Var | Default | Purpose |
|---|---|---|
| `FORTRESS_API_KEY` | (auto-registers free) | Your `fk_` API key |
| `FORTRESS_API_URL` | `https://api.fortress-optimizer.com` | API base URL |

## Tools

| Tool | Description |
|---|---|
| `optimize_prompt(prompt, level?, provider?, model?)` | Optimize a prompt; returns the shorter prompt + token savings. `level` ∈ `conservative` \| `balanced` \| `aggressive`. |
| `get_usage()` | Current key usage, tier, and remaining monthly quota. |
| `register_key(name?)` | Create a new free key (50,000 tokens/month). |

## Develop

```bash
npm install
npm run build
FORTRESS_API_KEY=fk_... node dist/index.js   # speaks MCP over stdio
```

## Free tier

50,000 tokens/month, no credit card. Full pricing: https://www.fortress-optimizer.com/pricing.json

## Links

- For Agents: https://www.fortress-optimizer.com/for-agents
- Docs: https://www.fortress-optimizer.com/docs/installation/mcp
- API reference: https://www.fortress-optimizer.com/docs/api-reference
