# @fortress-optimizer/vercel-ai

Vercel AI SDK middleware for automatic prompt optimization via the [Fortress Token Optimizer](https://fortress-optimizer.com) backend API.

Intercepts prompts before they reach the LLM, optimizes them to reduce token usage, and passes the optimized version to the model -- saving costs with zero code changes to your AI logic.

## Installation

```bash
npm install @fortress-optimizer/vercel-ai ai
```

## Quick Start

```ts
import { fortressMiddleware } from '@fortress-optimizer/vercel-ai';
import { wrapLanguageModel, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const model = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: fortressMiddleware({
    apiKey: 'fk_your_api_key',
  }),
});

const { text } = await generateText({
  model,
  prompt: 'Explain quantum computing in great detail with examples',
});

console.log(text);
```

## Configuration

```ts
fortressMiddleware({
  // API key (or set FORTRESS_API_KEY env var)
  apiKey: 'fk_...',

  // Fortress API base URL (default: https://api.fortress-optimizer.com)
  baseUrl: 'https://api.fortress-optimizer.com',

  // Optimization level: 'conservative' | 'balanced' | 'aggressive'
  level: 'balanced',

  // LLM provider hint for backend-specific optimizations
  provider: 'openai',

  // Request timeout in ms (default: 10000)
  timeout: 10000,

  // Silently fall back to original prompt on errors (default: true)
  gracefulDegradation: true,

  // Callback for optimization telemetry
  onOptimization: (metadata) => {
    console.log(`Saved ${metadata.savingsPercentage}% tokens`);
  },
});
```

### Environment Variable

Instead of passing `apiKey` directly, set the `FORTRESS_API_KEY` environment variable:

```bash
export FORTRESS_API_KEY=fk_your_api_key
```

```ts
// API key will be read from FORTRESS_API_KEY
const model = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: fortressMiddleware(),
});
```

## Usage with `streamText`

```ts
import { fortressMiddleware } from '@fortress-optimizer/vercel-ai';
import { wrapLanguageModel, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const model = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: fortressMiddleware({ apiKey: 'fk_...' }),
});

const result = streamText({
  model,
  prompt: 'Write a comprehensive guide to React hooks',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

## Usage with `generateText` and System Messages

```ts
import { fortressMiddleware } from '@fortress-optimizer/vercel-ai';
import { wrapLanguageModel, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const model = wrapLanguageModel({
  model: anthropic('claude-sonnet-4-20250514'),
  middleware: fortressMiddleware({
    apiKey: 'fk_...',
    provider: 'anthropic',
    level: 'aggressive',
  }),
});

const { text } = await generateText({
  model,
  system: 'You are a helpful coding assistant.',
  prompt: 'Explain the differences between REST and GraphQL APIs in detail',
});
```

## Tracking Savings

Use the `onOptimization` callback to track how many tokens you are saving:

```ts
let totalSaved = 0;

const model = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: fortressMiddleware({
    apiKey: 'fk_...',
    onOptimization: (meta) => {
      totalSaved += meta.savings;
      console.log(
        `Optimization: ${meta.originalTokens} -> ${meta.optimizedTokens} tokens ` +
        `(${meta.savingsPercentage}% saved, technique: ${meta.technique})`
      );
    },
  }),
});
```

## Checking Usage

```ts
import { createFortressClient } from '@fortress-optimizer/vercel-ai';

const client = createFortressClient({ apiKey: 'fk_...' });
const usage = await client.getUsage();

console.log(`Tokens used: ${usage.tokens_used_this_month}/${usage.tokens_limit}`);
console.log(`Resets: ${usage.reset_date}`);
```

## Optimization Levels

| Level          | Description                                    | Use Case                        |
| -------------- | ---------------------------------------------- | ------------------------------- |
| `conservative` | Minimal changes, preserves original meaning    | Legal, medical, compliance      |
| `balanced`     | Good savings with low risk of meaning change   | General purpose (default)       |
| `aggressive`   | Maximum token reduction, may rephrase          | High-volume, cost-sensitive     |

## Error Handling

By default, if the Fortress API is unavailable or returns an error, the middleware silently passes through the original prompt (graceful degradation). To disable this behavior:

```ts
fortressMiddleware({
  apiKey: 'fk_...',
  gracefulDegradation: false, // Throws FortressError on API failure
});
```

```ts
import { FortressError } from '@fortress-optimizer/vercel-ai';

try {
  await generateText({ model, prompt: '...' });
} catch (err) {
  if (err instanceof FortressError) {
    console.error(`Fortress API error (${err.statusCode}): ${err.message}`);
    console.log(`Retryable: ${err.isRetryable}`);
  }
}
```

## API Reference

### `fortressMiddleware(config?)`

Creates a Vercel AI SDK middleware that optimizes prompts before LLM calls.

**Returns:** `LanguageModelV1Middleware`

### `createFortressClient(config?)`

Creates a Fortress API client for direct usage (e.g., checking usage stats).

**Returns:** `FortressClient`

### `FortressConfig`

| Property              | Type                            | Default                                  |
| --------------------- | ------------------------------- | ---------------------------------------- |
| `apiKey`              | `string`                        | `process.env.FORTRESS_API_KEY`           |
| `baseUrl`             | `string`                        | `https://api.fortress-optimizer.com`     |
| `level`               | `OptimizationLevel`             | `'balanced'`                             |
| `provider`            | `string`                        | `'openai'`                               |
| `timeout`             | `number`                        | `10000`                                  |
| `gracefulDegradation` | `boolean`                       | `true`                                   |
| `onOptimization`      | `(meta: OptimizationMetadata) => void` | `undefined`                       |

## License

MIT
