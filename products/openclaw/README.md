# @fortress-optimizer/openclaw-skill

OpenClaw skill for automatic prompt optimization via the [Fortress Token Optimizer](https://fortress-optimizer.com) API. Reduces token usage by 15-30% without changing meaning.

Zero runtime dependencies. Uses native `fetch` (Node 22+).

## Installation

```bash
# Via ClawHub
clawhub install fortress-optimizer

# Via npm
npm install @fortress-optimizer/openclaw-skill
```

## Quick Start

```typescript
import { registerSkill } from '@fortress-optimizer/openclaw-skill';

const skill = registerSkill({
  apiKey: process.env.FORTRESS_API_KEY,
});

// Use as OpenClaw context engine
const { contextEngine, hooks } = skill;
```

## Standalone Client

```typescript
import { FortressClient } from '@fortress-optimizer/openclaw-skill';

const client = new FortressClient({
  apiKey: 'fk_your_key_here',
  baseUrl: 'https://api.fortress-optimizer.com',
  level: 'balanced',
  provider: 'openai',
  timeout: 10_000,
  gracefulDegradation: true,
  minPromptLength: 50,
});

const result = await client.optimize('Your prompt text here...');
console.log(result.tokens.savings_percentage); // e.g. 23
console.log(result.optimization.optimized_prompt);
```

## Configuration

Set via constructor options or environment variables:

| Option | Env Variable | Default | Description |
|--------|-------------|---------|-------------|
| `apiKey` | `FORTRESS_API_KEY` | (required) | Your API key from fortress-optimizer.com |
| `baseUrl` | `FORTRESS_BASE_URL` | `https://api.fortress-optimizer.com` | API endpoint |
| `level` | `FORTRESS_LEVEL` | `balanced` | `conservative`, `balanced`, or `aggressive` |
| `provider` | `FORTRESS_PROVIDER` | `openai` | LLM provider hint |
| `timeout` | - | `10000` | Request timeout in ms |
| `gracefulDegradation` | - | `true` | Return original prompt on API failure |
| `minPromptLength` | - | `50` | Skip optimization for short prompts |

## Optimization Levels

- **conservative** - Light optimization, ~5% savings. Safe for all prompts.
- **balanced** - Deduplication + compression, ~15% savings. Good default.
- **aggressive** - Maximum optimization, ~30% savings. May rephrase.

## Architecture

```
Your App
  |
  v
OpenClaw Skill (this package)
  |-- contextEngine  --> ingest/assemble flow
  |-- hooks          --> before-tool-call interception
  |-- client         --> HTTP calls to Fortress API
  |
  v
Fortress API (api.fortress-optimizer.com)
  |-- phrase compression
  |-- semantic deduplication
  |-- meta-removal
  |-- sentence optimization
```

## Security

- HTTPS enforced (rejects non-HTTPS URLs except localhost)
- Response validation against prompt injection attacks
- Bearer token authentication
- No data stored client-side

## API

### `registerSkill(config?)`

Factory that returns `{ contextEngine, hooks }` for OpenClaw integration.

### `FortressClient`

- `optimize(prompt)` - Optimize a prompt, returns `OptimizeResponse`
- `getUsage()` - Get token usage stats, returns `UsageResponse`
- `healthCheck()` - Check API availability, returns `boolean`

### `FortressContextEngine`

Implements the OpenClaw `ContextEngine` interface:

- `bootstrap()` - Health check (non-fatal on failure)
- `ingest(content)` - Queue content for optimization
- `assemble()` - Optimize and return result
- `afterTurn(stats?)` - Accumulate usage statistics
- `getStats()` - Get cumulative optimization stats

### `createBeforeToolCallHook(client, config)`

Returns a hook that intercepts tool calls with prompt-like arguments and optimizes them before execution.

## License

MIT
