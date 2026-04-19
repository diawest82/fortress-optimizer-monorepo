# Fortress Token Optimizer

**Cut your LLM API costs by 10-20%.** Drop-in prompt optimization for OpenAI, Anthropic, Gemini, and more.

Fortress compresses your prompts server-side — removing filler words, deduplicating redundant phrases, and tightening phrasing — so you send fewer tokens without changing meaning.

## Quick Start

```bash
pip install fortress-optimizer
# or
npm install fortress-optimizer
```

```python
from fortress_optimizer import FortressClient

client = FortressClient(api_key="fk_your_key")
result = client.optimize("Could you please help me analyze this sales data and provide detailed insights")

print(result["optimization"]["optimized_prompt"])
# → "Analyze this sales data and provide detailed insights"

print(f"{result['tokens']['savings_percentage']}% fewer tokens")
# → "22% fewer tokens"
```

**50,000 tokens/month free.** No credit card required. [Get a key](https://fortress-optimizer.com)

## How It Works

1. Your prompt goes to the Fortress API
2. Four optimization passes: phrase compression, deduplication, meta-removal, sentence optimization
3. Optimized prompt comes back — same meaning, fewer tokens
4. You send the optimized prompt to your LLM and save money

## Real Benchmarks

| Prompt Type | Before | After | Savings |
|-------------|--------|-------|---------|
| Casual/chatty | 75 tokens | 58 tokens | **23%** |
| Technical debugging | 100 tokens | 92 tokens | **8%** |
| Business analysis | 77 tokens | 74 tokens | **4%** |
| Project planning | 69 tokens | 61 tokens | **12%** |
| **Average** | | | **~11%** |

Chatty prompts with filler save the most. Technical prompts that are already dense save less.

## Available On

| Platform | Install |
|----------|---------|
| **Python** | `pip install fortress-optimizer` |
| **Node.js** | `npm install fortress-optimizer` |
| **VS Code** | [Marketplace](https://marketplace.visualstudio.com/items?itemName=fortress-optimizer.fortress-token-optimizer) |
| **OpenClaw** | `npm install @diawest82/openclaw-skill` |
| **Zapier** | [Fortress Token Optimizer](https://zapier.com/apps/fortress-token-optimizer) |
| **Make.com** | Search "Fortress Token Optimizer" |
| **GPT Store** | Coming soon |

## Optimization Levels

| Level | Savings | Use Case |
|-------|---------|----------|
| `conservative` | ~5% | Production prompts, minimal changes |
| `balanced` | ~11-15% | General use (default) |
| `aggressive` | ~15-22% | Batch processing, cost-sensitive |

## Providers

OpenAI, Anthropic, Azure, Google Gemini, Groq, Ollama — pass the provider name and the optimizer tailors compression to each tokenizer.

## Pricing

| Plan | Price | Tokens |
|------|-------|--------|
| Free | $0 | 50,000/month |
| Pro | $15/month | Unlimited |
| Teams | From $60/month | Unlimited + team management |
| Enterprise | Custom | Dedicated support + SLAs |

## Repository Structure

```
fortress-optimizer-monorepo/
├── website/              # Next.js web application (Vercel)
├── backend/              # Python FastAPI backend (AWS ECS)
├── shared-libs/          # Python SDK (PyPI package)
├── products/
│   ├── npm/              # Node.js SDK (npm package)
│   ├── openclaw/         # OpenClaw skill
│   ├── vercel-ai-sdk/    # Vercel AI SDK middleware
│   ├── gpt-store/        # GPT Store config
│   ├── make-zapier/      # Make.com + Zapier integration
│   └── ...               # More integrations
├── tests/                # Backend test suite (583 tests)
└── docs/                 # Documentation
```

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Python FastAPI, PostgreSQL, Redis
- **Infrastructure**: Vercel (frontend), AWS ECS Fargate (backend), RDS PostgreSQL
- **Payments**: Stripe (live)
- **Auth**: NextAuth.js with GitHub/Google OAuth + credentials

## Links

- **Website**: [fortress-optimizer.com](https://fortress-optimizer.com)
- **API**: [api.fortress-optimizer.com](https://api.fortress-optimizer.com)
- **npm**: [npmjs.com/package/fortress-optimizer](https://www.npmjs.com/package/fortress-optimizer)
- **PyPI**: [pypi.org/project/fortress-optimizer](https://pypi.org/project/fortress-optimizer/)
- **VS Code**: [Marketplace](https://marketplace.visualstudio.com/items?itemName=fortress-optimizer.fortress-token-optimizer)
- **Docs**: [docs.fortress-optimizer.com](https://docs.fortress-optimizer.com)

## License

Proprietary software. All rights reserved.
