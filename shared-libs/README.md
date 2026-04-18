# fortress-optimizer

Cut your LLM API costs by 10-20%. Drop-in prompt optimization for Python.

```bash
pip install fortress-optimizer
```

## 3-Line Quick Start

```python
from fortress_optimizer import FortressClient

client = FortressClient(api_key="fk_your_key_here")
result = client.optimize("Can you please help me write a detailed and comprehensive analysis of this data")

print(result["optimization"]["optimized_prompt"])
# → "Write a detailed analysis of this data"

print(f"Saved {result['tokens']['savings_percentage']}% tokens")
# → "Saved 18% tokens"
```

**50,000 tokens/month free. No credit card required.** Get a key at [fortress-optimizer.com](https://fortress-optimizer.com)

## Why?

Every token you send to GPT-4, Claude, or Gemini costs money. Most prompts contain filler words, redundant phrases, and unnecessary politeness that inflate token counts without improving results.

Fortress compresses your prompts server-side — same meaning, fewer tokens, lower cost.

## Before / After

```python
# Before: 22 tokens
prompt = "Could you please help me analyze this sales data and provide detailed insights and recommendations?"

result = client.optimize(prompt, level="aggressive")

# After: 12 tokens
print(result["optimization"]["optimized_prompt"])
# → "Analyze sales data, provide insights and recommendations"

print(f"{result['tokens']['savings']} tokens saved ({result['tokens']['savings_percentage']}%)")
# → "10 tokens saved (45%)"
```

## Optimization Levels

| Level | Savings | Best For |
|-------|---------|----------|
| `conservative` | ~5% | Production prompts where every word matters |
| `balanced` | ~15% | General use (default) |
| `aggressive` | ~20% | Cost-sensitive batch processing |

## Full API

```python
client = FortressClient(
    api_key="fk_your_key",
    base_url="https://api.fortress-optimizer.com",  # default
)

# Optimize a prompt
result = client.optimize(prompt, level="balanced", provider="openai")
# result["optimization"]["optimized_prompt"]
# result["tokens"]["original"], ["optimized"], ["savings"], ["savings_percentage"]

# Check usage
usage = client.get_usage()
# usage["tokens_remaining"], usage["tier"], usage["reset_date"]

# List providers
providers = client.get_providers()

# Health check
is_healthy = client.health_check()
```

## Batch Optimization

```python
prompts = [
    "Please analyze this data and provide your insights",
    "Can you help me understand what this code does in detail",
    "I would like you to summarize the key points of this document",
]

results = [client.optimize(p, level="balanced") for p in prompts]
total_saved = sum(r["tokens"]["savings"] for r in results)
print(f"Saved {total_saved} tokens across {len(results)} prompts")
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
- [npm Package](https://www.npmjs.com/package/fortress-optimizer)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=fortress-optimizer.fortress-token-optimizer)

## License

MIT
