---
sidebar_position: 3
---

# Quick Start (5 minutes)

Get Fortress running in your project in 5 minutes.

## Prerequisites

- Node.js 14+ (for npm package)
- API key from [www.fortress-optimizer.com](https://www.fortress-optimizer.com)

## Step 1: Sign Up

1. Go to [www.fortress-optimizer.com](https://www.fortress-optimizer.com)
2. Click "Get Started"
3. Create account or sign in
4. Copy your API key

## Step 2: Install

Choose your platform and follow the installation guide:

- [npm Package](./installation/npm)
- [GitHub Copilot](./installation/copilot)
- [VS Code](./installation/vscode)
- [Slack Bot](./installation/slack)
- [Claude Desktop](./installation/claude-desktop)

## Step 3: Configure

Set your API key as an environment variable:

```bash
export FORTRESS_API_KEY="your_api_key_here"
```

## Step 4: Use It

### For npm Package:

```javascript
import { FortressOptimizer } from '@fortress-optimizer/core';

const optimizer = new FortressOptimizer({
  apiKey: process.env.FORTRESS_API_KEY
});

const result = await optimizer.optimize({
  text: 'Can you write a function that takes an array and returns only even numbers?',
  model: 'gpt-4'
});

console.log(result.optimized);  // "Filter array to even numbers"
console.log(result.savings);    // { tokens: 45, percent: 79, cost: "$0.00135" }
```

### For GitHub Copilot:

1. Open any file
2. Highlight your prompt
3. Press `Cmd+Shift+O` (or `Ctrl+Shift+O` on Windows)
4. See optimization in the side panel

### For VS Code:

1. Highlight your prompt
2. Press `Cmd+K, Cmd+I` (or `Ctrl+K, Ctrl+I` on Windows)
3. Click "Optimize with Fortress"
4. See results in a popup

## Step 5: Track Savings

1. Go to [Dashboard](https://www.fortress-optimizer.com/dashboard)
2. See your total savings
3. View optimization history

## Common Issues

### "API Key Invalid"
- Check your `.env` file
- Verify key in dashboard
- Regenerate if needed

### "No optimization results"
- Ensure prompt is in English
- Try a longer prompt (3+ words)
- Check API key permissions

See [Troubleshooting](./guides/troubleshooting) for more help.

## Next Steps

1. ✅ [Learn how Fortress works](./guides/how-it-works)
2. ✅ [Read best practices](./guides/best-practices)
3. ✅ [Check API reference](./api-reference)
4. ✅ [Explore advanced usage](./guides/advanced-usage)

## Need Help?

- 📚 Full [API Reference](./api-reference)
- 🆘 [Troubleshooting Guide](./guides/troubleshooting)
- 💬 [Support](https://www.fortress-optimizer.com/support)

Happy optimizing! 🚀
