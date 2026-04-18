# Fortress Token Optimizer for VS Code

Cut your AI token costs by 10-20% without changing your workflow.

Fortress Token Optimizer runs in the background, automatically optimizing prompts before they reach GPT-4, Claude, Gemini, or any LLM — saving you money on every request.

## How It Works

1. You write prompts normally in VS Code
2. Fortress intercepts and compresses them (removes filler, deduplicates, tightens phrasing)
3. The optimized prompt goes to your LLM — same meaning, fewer tokens
4. You see the savings in real-time on the dashboard

## Quick Start

1. Install from VS Code Marketplace
2. Press `Cmd+Shift+P` → "Fortress: Configure API Keys"
3. Enter your API key (get one free at [fortress-optimizer.com](https://fortress-optimizer.com))
4. Done — optimization starts automatically

## Features

**Optimization**
- Semantic duplicate detection — removes redundant sentences
- Code-aware — handles code blocks differently than natural language
- Provider-specific rules for OpenAI, Anthropic, and others
- Three levels: Conservative (~5%), Balanced (~15%), Aggressive (~20%)

**Dashboard**
- Real-time savings tracker (tokens saved, cost reduction)
- 7-day and 30-day trend analysis
- Provider comparison across OpenAI and Anthropic

**Security**
- API keys stored securely using VS Code's secrets API
- No prompts stored or sent to unknown servers
- Telemetry is opt-in and can be disabled

## Commands

| Command | Description |
|---------|-------------|
| `Fortress: Toggle Optimization` | Turn optimizer on/off |
| `Fortress: Open Savings Dashboard` | View real-time savings metrics |
| `Fortress: Open Settings` | Configure optimization preferences |
| `Fortress: Configure API Keys` | Set up provider integration |
| `Fortress: View Analytics` | Detailed usage statistics |

## Settings

| Setting | Options | Default |
|---------|---------|---------|
| Optimization Level | Conservative / Balanced / Aggressive | Balanced |
| Provider | OpenAI / Anthropic / Custom | OpenAI |
| Code Detection | On / Off | On |
| Semantic Threshold | 0.5 - 1.0 | 0.90 |

## Example

**Before (22 tokens):**
```
Review this code for performance. Check the code for optimization issues.
Look for performance problems. Identify performance concerns.
```

**After (13 tokens):**
```
Review this code for performance issues and optimization opportunities.
```

**Saved: 41%**

## Pricing

- **Free**: 50,000 tokens/month — no credit card required
- **Pro**: $15/month — unlimited tokens
- **Teams**: From $60/month — team management + priority support
- **Enterprise**: Custom pricing

Get started at [fortress-optimizer.com](https://fortress-optimizer.com)

## Also Available

- [npm package](https://www.npmjs.com/package/fortress-optimizer) — Node.js integration
- [Python package](https://pypi.org/project/fortress-optimizer/) — pip install
- [Zapier](https://zapier.com/apps/fortress-token-optimizer) — workflow automation
- [Make.com](https://www.make.com) — scenario automation

## Support

- Website: [fortress-optimizer.com](https://fortress-optimizer.com)
- Email: support@fortress-optimizer.com
- API Docs: [docs.fortress-optimizer.com](https://docs.fortress-optimizer.com)

## License

MIT

**Made by Fortress Optimizer** — Reduce token usage. Lower costs. Same results.
