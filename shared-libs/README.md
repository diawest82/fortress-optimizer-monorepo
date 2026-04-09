# Fortress Optimizer

Reduce your AI API costs by 10-20% with real-time prompt optimization.

## Install

```bash
pip install fortress-optimizer
```

## Quick Start

```python
from fortress_optimizer import FortressClient

client = FortressClient(api_key="fk_your_key_here")

# Optimize a prompt
result = client.optimize("Can you please help me write a detailed analysis of this data")

print(result["optimization"]["optimized_prompt"])
# → "Write a detailed analysis of this data"

print(f"Saved {result['tokens']['savings_percentage']}% tokens")
# → "Saved 40.0% tokens"
```

## Features

- **10-20% token savings** on casual and business prompts
- **3 optimization levels**: conservative, balanced, aggressive
- **All major LLM providers**: OpenAI, Anthropic, Google, and more
- **Automatic retries** with exponential backoff
- **Usage tracking** per API key

## API

```python
# Optimize a prompt
result = client.optimize(prompt, level="balanced", provider="openai")

# Check usage
usage = client.get_usage()

# List providers
providers = client.get_providers()

# Health check
is_healthy = client.health_check()
```

## Get an API Key

Sign up free at [fortress-optimizer.com](https://fortress-optimizer.com) — 50,000 tokens/month, no credit card required.
