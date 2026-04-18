# fortress-optimizer

Cut your LLM API costs by 10-20%. Drop-in prompt optimization for OpenAI, Anthropic, Gemini, and more.

```bash
npm install fortress-optimizer
```

## 3-Line Quick Start

```javascript
const { FortressClient } = require('fortress-optimizer');

const client = new FortressClient(process.env.FORTRESS_API_KEY);
const result = await client.optimize('Can you please help me write a detailed and comprehensive analysis of this data and provide insights');

console.log(result.optimization.optimized_prompt);
// → "Write a detailed analysis of this data and provide insights"

console.log(`${result.tokens.savings_percentage}% fewer tokens`);
// → "18% fewer tokens"
```

**50,000 tokens/month free. No credit card required.** Get a key at [fortress-optimizer.com](https://fortress-optimizer.com)

## Why?

Every token you send to GPT-4, Claude, or Gemini costs money. Most prompts contain filler words, redundant phrases, and unnecessary politeness that inflate token counts without improving results.

Fortress compresses your prompts server-side before they reach the model — same meaning, fewer tokens, lower cost.

## Real Savings

| Level | Savings | Best For |
|-------|---------|----------|
| `conservative` | ~5% | Production prompts where every word matters |
| `balanced` | ~15% | General use (default) |
| `aggressive` | ~20% | Cost-sensitive batch processing |

## Full API

```javascript
const client = new FortressClient('fk_your_key', {
  baseUrl: 'https://api.fortress-optimizer.com',  // default
  timeout: 10000,                                  // default
});

// Optimize a prompt
const result = await client.optimize(prompt, 'balanced', 'openai');
// result.optimization.optimized_prompt — the optimized text
// result.tokens.original — original token count
// result.tokens.optimized — optimized token count
// result.tokens.savings — tokens saved
// result.tokens.savings_percentage — percentage saved

// Check your usage
const usage = await client.getUsage();
// usage.tokens_remaining, usage.tier, usage.reset_date

// List supported providers
const providers = await client.getProviders();

// Health check
const isUp = await client.healthCheck();
```

## Batch Optimization

```javascript
const prompts = [
  'Please analyze this data and provide your insights',
  'Can you help me understand what this code does in detail',
  'I would like you to summarize the key points of this document',
];

const results = await Promise.all(
  prompts.map(p => client.optimize(p, 'balanced', 'openai'))
);

const totalSaved = results.reduce((sum, r) => sum + r.tokens.savings, 0);
console.log(`Saved ${totalSaved} tokens across ${results.length} prompts`);
```

## Error Handling

```javascript
try {
  const result = await client.optimize(prompt, 'balanced', 'openai');
} catch (error) {
  if (error.response?.status === 429) {
    console.log('Rate limited — wait before retrying');
  } else if (error.response?.status === 401) {
    console.log('Invalid API key');
  }
}
```

## Providers

OpenAI, Anthropic, Azure, Google Gemini, Groq, Ollama — pass the provider name and the optimizer tailors compression to each tokenizer.

## Pricing

| Plan | Price | Tokens |
|------|-------|--------|
| Free | $0 | 50,000/month |
| Pro | $15/month | Unlimited |
| Teams | From $60/month | Unlimited + team management |
| Enterprise | Custom | Dedicated support + SLAs |

## Links

- [Website](https://fortress-optimizer.com)
- [API Docs](https://docs.fortress-optimizer.com)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=fortress-optimizer.fortress-token-optimizer)
- [Python Package](https://pypi.org/project/fortress-optimizer/)

## License

MIT
