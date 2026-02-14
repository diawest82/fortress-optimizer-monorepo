# Fortress Token Optimizer - npm Package

Official npm package for integrating Fortress Token Optimizer into your Node.js applications.

## Installation

```bash
npm install @fortress-optimizer/core
```

## Quick Start

```javascript
const { FortressClient } = require('@fortress-optimizer/core');

const client = new FortressClient(process.env.FORTRESS_API_KEY);

// Optimize a prompt
const result = await client.optimize(
  'Your prompt here that could be optimized',
  'balanced',  // 'conservative', 'balanced', or 'aggressive'
  'openai'     // LLM provider
);

console.log(`Saved ${result.tokens.savings} tokens!`);
console.log(`Optimized: ${result.optimization.optimized_prompt}`);
```

## Features

- ✅ Real-time token optimization
- ✅ Support for all major LLM providers (OpenAI, Anthropic, Azure, Gemini, Groq, Ollama)
- ✅ Three optimization levels (conservative, balanced, aggressive)
- ✅ Token usage tracking
- ✅ Rate limiting and authentication
- ✅ TypeScript support

## API Reference

### `FortressClient`

#### Constructor
```javascript
new FortressClient(apiKey, options?)
```

**Parameters:**
- `apiKey` (string): Your Fortress API key
- `options` (object, optional):
  - `baseUrl` (string): API endpoint (default: `https://api.fortress-optimizer.com`)
  - `timeout` (number): Request timeout in ms (default: 10000)

#### `optimize(prompt, level, provider)`

Optimize a prompt for token efficiency.

**Parameters:**
- `prompt` (string): The prompt to optimize (max 50,000 characters)
- `level` (string): 'conservative', 'balanced', or 'aggressive'
- `provider` (string): LLM provider name

**Returns:** Promise<OptimizationResult>

```javascript
{
  request_id: "opt_1707892834.123",
  status: "success",
  optimization: {
    optimized_prompt: "Your optimized prompt...",
    technique: "deduplication+compression"
  },
  tokens: {
    original: 150,
    optimized: 120,
    savings: 30,
    savings_percentage: 20.0
  },
  timestamp: "2026-02-13T14:30:45.123Z"
}
```

#### `getUsage()`

Get token usage for your API key.

**Returns:** Promise<UsageStats>

```javascript
{
  tokens_used_this_month: 25000,
  tokens_limit: 50000,
  tokens_remaining: 25000,
  percentage_used: 50,
  reset_date: "2026-03-13T00:00:00Z"
}
```

#### `getProviders()`

Get list of supported LLM providers.

**Returns:** Promise<string[]>

#### `healthCheck()`

Check API availability.

**Returns:** Promise<boolean>

## Pricing

- **FREE**: 50,000 tokens/month
- **PRO**: $9.99/month (unlimited)
- **TEAM**: $99/month (collaboration features)
- **ENTERPRISE**: Custom pricing

See [fortress-optimizer.com/pricing](https://fortress-optimizer.com/pricing) for details.

## Examples

### Basic Usage
```javascript
const client = new FortressClient(process.env.FORTRESS_API_KEY);

const result = await client.optimize(
  'Can you explain quantum computing in detail with examples?',
  'balanced',
  'openai'
);

console.log(result);
```

### Batch Optimization
```javascript
const prompts = [
  'First prompt...',
  'Second prompt...',
  'Third prompt...'
];

const results = await Promise.all(
  prompts.map(p => client.optimize(p, 'balanced', 'openai'))
);

results.forEach((r, i) => {
  console.log(`Prompt ${i}: ${r.tokens.savings_percentage}% saved`);
});
```

### Error Handling
```javascript
try {
  const result = await client.optimize(prompt, 'balanced', 'openai');
} catch (error) {
  if (error.response?.status === 429) {
    console.log('Rate limited - wait before retrying');
  } else if (error.response?.status === 401) {
    console.log('Invalid API key');
  } else {
    console.log('Optimization failed:', error.message);
  }
}
```

## Getting an API Key

1. Sign up at [fortress-optimizer.com](https://fortress-optimizer.com)
2. Navigate to API Keys
3. Create a new key
4. Use in your application

```bash
export FORTRESS_API_KEY="your-api-key-here"
```

## Support

- 📖 Documentation: [docs.fortress-optimizer.com](https://docs.fortress-optimizer.com)
- 💬 Community: [Discord](https://discord.gg/fortress)
- 📧 Email: support@fortress-optimizer.com

## License

MIT
