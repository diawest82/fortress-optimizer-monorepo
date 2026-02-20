---
sidebar_position: 1
title: npm Package
---

# npm Package Installation

Install Fortress for Node.js and TypeScript projects using npm.

## Overview

The Fortress npm package provides a simple API to optimize prompts before sending them to LLM APIs.

- **Package**: `@fortress-optimizer/core`
- **Latest Version**: 1.0.0
- **Node.js**: 14+
- **TypeScript**: 4.0+

## Installation

### Step 1: Install Package

```bash
npm install @fortress-optimizer/core
```

### Step 2: Set API Key

```bash
export FORTRESS_API_KEY="your_api_key_here"
```

Or add to `.env`:

```
FORTRESS_API_KEY=your_api_key_here
```

### Step 3: Initialize

```javascript
import { FortressOptimizer } from '@fortress-optimizer/core';

const optimizer = new FortressOptimizer({
  apiKey: process.env.FORTRESS_API_KEY
});
```

## Usage

### Basic Optimization

```javascript
const result = await optimizer.optimize({
  text: 'Your prompt here',
  model: 'gpt-4'
});

console.log(result.optimized);  // Optimized text
console.log(result.savings);    // Token savings info
```

### With Options

```javascript
const result = await optimizer.optimize({
  text: 'Your prompt here',
  model: 'gpt-4',
  language: 'en',
  preserveFormatting: true,
  timeout: 5000  // ms
});
```

### Error Handling

```javascript
try {
  const result = await optimizer.optimize({
    text: 'Your prompt',
    model: 'gpt-4'
  });
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    console.error('Rate limited, wait before retrying');
  } else if (error.code === 'INVALID_KEY') {
    console.error('Invalid API key');
  }
}
```

## Complete Example

```javascript
import { FortressOptimizer } from '@fortress-optimizer/core';

async function main() {
  const optimizer = new FortressOptimizer({
    apiKey: process.env.FORTRESS_API_KEY
  });

  const prompt = `
    I need to write a function that takes an array of numbers 
    and returns a new array containing only the even numbers. 
    Can you help me with that? I need it in JavaScript.
  `;

  const result = await optimizer.optimize({
    text: prompt,
    model: 'gpt-4'
  });

  console.log('Original tokens:', result.originalTokens);
  console.log('Optimized tokens:', result.optimizedTokens);
  console.log('Savings:', `${result.savings.percent}%`);
  console.log('\nOptimized prompt:');
  console.log(result.optimized);
}

main().catch(console.error);
```

## API Reference

### `FortressOptimizer`

#### Constructor

```javascript
new FortressOptimizer(options)
```

**Options**:
- `apiKey` (string, required) - Your Fortress API key
- `baseUrl` (string, optional) - API endpoint (default: https://api.fortress-optimizer.com)

#### Methods

##### `optimize(options)`

Optimize a single prompt.

**Parameters**:
- `text` (string, required) - The prompt to optimize
- `model` (string, required) - Target model: 'gpt-4', 'gpt-3.5', 'claude', etc.
- `language` (string, optional) - Language code (default: 'en')
- `timeout` (number, optional) - Timeout in ms (default: 10000)

**Returns**: Promise<OptimizationResult>

**OptimizationResult**:
```javascript
{
  optimized: string,          // Optimized prompt
  originalTokens: number,     // Original token count
  optimizedTokens: number,    // Optimized token count
  savings: {
    tokens: number,           // Token reduction
    percent: number,          // Percentage saved
    cost: string              // Cost savings estimate
  }
}
```

## Troubleshooting

### "API Key not found"

Make sure `FORTRESS_API_KEY` environment variable is set:

```bash
echo $FORTRESS_API_KEY  # Check if it's set
export FORTRESS_API_KEY="your_key"  # Set it
```

### "Invalid API key"

1. Go to [Dashboard](https://www.fortress-optimizer.com/dashboard)
2. Copy your API key again
3. Update your environment variable
4. Regenerate if needed

### "Rate limit exceeded"

Fortress has rate limits based on your plan:
- Free: 10K tokens/month
- Pro: Unlimited

Check your [Dashboard](https://www.fortress-optimizer.com/dashboard) for usage.

## Best Practices

1. **Cache Results** - Don't optimize the same prompt repeatedly
2. **Batch Operations** - Optimize multiple prompts at once
3. **Error Handling** - Always handle potential errors
4. **Monitor Usage** - Track your token usage in the dashboard
5. **Use Environment Variables** - Never hardcode API keys

## Next Steps

- [API Reference](../api-reference)
- [Best Practices](../guides/best-practices)
- [Troubleshooting](../guides/troubleshooting)
- [View all platforms](./slack)
