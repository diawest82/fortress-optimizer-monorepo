---
name: fortress-optimizer
version: 0.1.0
description: Automatic prompt optimization via Fortress Token Optimizer API — save 15-30% on tokens
author: Diawest82
entry: dist/index.js
configuration:
  FORTRESS_API_KEY:
    required: true
    description: Your Fortress API key (starts with fk_). Get one at https://fortress-optimizer.com
  FORTRESS_BASE_URL:
    required: false
    default: https://api.fortress-optimizer.com
    description: Base URL for the Fortress Optimizer API
  FORTRESS_LEVEL:
    required: false
    default: balanced
    enum: [conservative, balanced, aggressive]
    description: Optimization aggressiveness level
  FORTRESS_PROVIDER:
    required: false
    default: openai
    description: LLM provider hint for backend optimization strategies
---

# Fortress Token Optimizer

Automatically optimizes prompts before they reach the LLM, reducing token usage by 15-30% without changing meaning.

All optimization happens server-side via the Fortress API — your prompts are compressed, deduplicated, and streamlined before being sent to the model.

## Usage

Install via ClawHub:

```
clawhub install fortress-optimizer
```

## Configuration

Set your API key as an environment variable:

```bash
export FORTRESS_API_KEY=fk_your_key_here
```

Or configure in skill settings.

### Options

| Setting | Default | Description |
|---------|---------|-------------|
| `FORTRESS_API_KEY` | (required) | Your API key from fortress-optimizer.com |
| `FORTRESS_BASE_URL` | `https://api.fortress-optimizer.com` | API endpoint |
| `FORTRESS_LEVEL` | `balanced` | `conservative`, `balanced`, or `aggressive` |
| `FORTRESS_PROVIDER` | `openai` | LLM provider hint |

## How It Works

1. Your prompt is intercepted before it reaches the LLM
2. The Fortress API optimizes it (semantic dedup, compression, redundancy removal)
3. The optimized prompt is sent to the model — fewer tokens, same meaning
4. You see the savings in real-time via the stats callback
