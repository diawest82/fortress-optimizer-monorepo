# Fortress Token Optimizer - Anthropic SDK Wrapper

Drop-in wrapper for Anthropic SDK that adds automatic token optimization.

## Installation

```bash
pip install fortress-anthropic
```

## Quick Start

```python
from fortress_anthropic import FortressAnthropicClient
import os

client = FortressAnthropicClient(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    fortress_api_key=os.getenv("FORTRESS_API_KEY")
)

response = client.messages_create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain quantum computing"}],
    optimize=True,  # NEW: enable optimization
    optimization_level="balanced"
)
```

## Features

- ✅ Drop-in replacement for `Anthropic()` client
- ✅ Automatic prompt optimization
- ✅ Async support (`FortressAsyncAnthropicClient`)
- ✅ Transparent integration (works with all Claude models)
- ✅ Three optimization levels: conservative, balanced, aggressive
- ✅ No breaking changes to existing code

## API Reference

### `FortressAnthropicClient`

Synchronous wrapper around Anthropic client.

#### Constructor
```python
FortressAnthropicClient(
    api_key: str,
    fortress_api_key: str,
    fortress_url: str = "https://api.fortress-optimizer.com"
)
```

#### `messages_create(..., optimize=False, optimization_level="balanced")`

Create message with optional optimization.

**New Parameters:**
- `optimize` (bool): Enable Fortress optimization
- `optimization_level` (str): 'conservative', 'balanced', or 'aggressive'

**All other parameters:** Same as `anthropic.Anthropic.messages.create()`

### `FortressAsyncAnthropicClient`

Async version of the wrapper.

```python
async with FortressAsyncAnthropicClient(api_key, fortress_api_key) as client:
    response = await client.messages_create(
        model="claude-3-opus-20240229",
        max_tokens=1024,
        messages=[...],
        optimize=True
    )
```

## Examples

### Basic Usage
```python
client = FortressAnthropicClient(api_key, fortress_api_key)

response = client.messages_create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Your prompt here"}]
)

print(response.content[0].text)
```

### With Optimization
```python
response = client.messages_create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Detailed prompt with redundancy"}],
    optimize=True,
    optimization_level="balanced"
)
```

### Async Example
```python
import asyncio

async def main():
    async with FortressAsyncAnthropicClient(api_key, fortress_api_key) as client:
        response = await client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[...],
            optimize=True,
            optimization_level="aggressive"
        )
        print(response.content[0].text)

asyncio.run(main())
```

### Multi-turn Conversation
```python
client = FortressAnthropicClient(api_key, fortress_api_key)

# Initial request with optimization
response1 = client.messages_create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain neural networks with examples"}
    ],
    optimize=True
)

# Follow-up (can optimize independently)
response2 = client.messages_create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain neural networks with examples"},
        {"role": "assistant", "content": response1.content[0].text},
        {"role": "user", "content": "How do transformers improve on this?"}
    ],
    optimize=True  # Optimize the new user message
)
```

## Environment Variables

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export FORTRESS_API_KEY="fort-..."
```

## Pricing

Usage with Fortress optimization counts toward your token quota:
- **FREE**: 50,000 optimized tokens/month
- **PRO**: $9.99/month (unlimited)
- **TEAM**: $99/month
- **ENTERPRISE**: Custom

See [fortress-optimizer.com/pricing](https://fortress-optimizer.com/pricing)

## Support

- 📖 Documentation: [docs.fortress-optimizer.com](https://docs.fortress-optimizer.com)
- 💬 Discord: [discord.gg/fortress](https://discord.gg/fortress)
- 📧 Email: support@fortress-optimizer.com

## License

MIT
