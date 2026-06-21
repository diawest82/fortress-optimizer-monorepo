# @fortress-optimizer/mcp-server

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Fortress Token Optimizer](https://www.fortress-optimizer.com). It lets an MCP host (Claude Desktop, Cursor, and other agent runtimes) call Fortress inline to **cut LLM token costs by ~10–20%** — the agent optimizes its own prompts before sending them to a model.

## Get a key

This server **requires a Fortress API key** — there is no anonymous key minting.

- **Free key:** sign in with Google or GitHub at [fortress-optimizer.com](https://www.fortress-optimizer.com) and claim your free key (one per account).
- **Paid key:** need more? [Upgrade](https://www.fortress-optimizer.com/pricing.json) for a higher monthly quota.

Set the key as `FORTRESS_API_KEY` (below). Every result reports original vs optimized token counts, so the agent can verify its own savings.

## Install / configure

Add it to your MCP client config, with your `fk_` key in `FORTRESS_API_KEY`:

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

`FORTRESS_API_KEY` is **required**. If it's unset, the `optimize_prompt` and `get_usage` tools return an error telling you to sign in and set the key.

Environment variables:

| Var | Default | Purpose |
|---|---|---|
| `FORTRESS_API_KEY` | (required) | Your `fk_` API key — get one by signing in (free, one per account) or upgrading (paid) |
| `FORTRESS_API_URL` | `https://api.fortress-optimizer.com` | API base URL |

## Tools

| Tool | Description |
|---|---|
| `optimize_prompt(prompt, level?, provider?, model?)` | Optimize a prompt; returns the shorter prompt + token savings. `level` ∈ `conservative` \| `balanced` \| `aggressive`. |
| `get_usage()` | Current key usage, tier, and remaining monthly quota. |

## Develop

```bash
npm install
npm run build
FORTRESS_API_KEY=fk_... node dist/index.js   # speaks MCP over stdio
```

## Free tier

10,000 tokens/month, one free key per Google/GitHub account, no credit card. Full pricing: https://www.fortress-optimizer.com/pricing.json

## Links

- For Agents: https://www.fortress-optimizer.com/for-agents
- Docs: https://www.fortress-optimizer.com/docs/installation/mcp
- API reference: https://www.fortress-optimizer.com/docs/api-reference
