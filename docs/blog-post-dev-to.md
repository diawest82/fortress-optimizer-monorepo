---
title: How I Built an API That Cuts LLM Token Costs by 11-22%
published: false
tags: ai, openai, python, javascript
---

I've been building AI-powered tools for the past year, and one thing kept bugging me: I was wasting money on tokens.

Not because my prompts were bad — but because they were *verbose*. Every prompt I wrote had filler words, redundant phrases, and unnecessary politeness that inflated my token counts without improving the output.

So I built [Fortress Token Optimizer](https://fortress-optimizer.com) — an API that compresses prompts before they reach the LLM. Same meaning, fewer tokens, lower cost.

## The Problem

Look at a typical prompt:

```
Could you please help me analyze this sales data and provide detailed
insights and recommendations for improvement?
```

**18 tokens.** But the LLM doesn't need "Could you please help me" — that's 5 tokens of politeness that doesn't change the output.

After optimization:

```
Analyze this sales data and provide detailed insights and
recommendations for improvement?
```

**14 tokens. 22% saved.** The model produces the same quality response.

## Real Benchmarks

I tested across 5 prompt styles (casual chatty, business, technical):

| Prompt Type | Before | After | Savings |
|-------------|--------|-------|---------|
| Casual chatty (cover letter request) | 75 tokens | 58 tokens | **23%** |
| Technical (debugging help) | 100 tokens | 92 tokens | **8%** |
| Learning request (ML resources) | 90 tokens | 81 tokens | **10%** |
| Business analysis | 77 tokens | 74 tokens | **4%** |
| Project planning | 69 tokens | 61 tokens | **12%** |
| **Average** | **82 tokens** | **73 tokens** | **11%** |

The pattern: **the chattier the prompt, the more savings.** Casual prompts with filler like "basically", "I was wondering if", "um", "please help me" see 15-23% savings. Technical prompts that are already dense save less.

## How It Works

Four optimization passes, server-side:

1. **Phrase compression** — removes filler ("Could you please help me" → removed)
2. **Deduplication** — "analyze the data and provide analysis" → "analyze the data"
3. **Meta-removal** — strips instructions-about-instructions
4. **Sentence optimization** — tightens phrasing without changing meaning

It's not a regex. The optimizer understands prompt structure — it won't strip a code block or remove meaningful qualifiers.

## Usage

Three lines in Python or JavaScript:

```python
pip install fortress-optimizer
```

```python
from fortress_optimizer import FortressClient

client = FortressClient(api_key="fk_your_key")
result = client.optimize("Could you please help me analyze this data")

print(result["optimization"]["optimized_prompt"])
# → "Analyze this data"
print(f"{result['tokens']['savings_percentage']}% saved")
# → "22% saved"
```

```javascript
npm install fortress-optimizer
```

```javascript
const { FortressClient } = require('fortress-optimizer');
const client = new FortressClient(process.env.FORTRESS_API_KEY);
const result = await client.optimize('Your prompt here');
```

Also available as a [VS Code extension](https://marketplace.visualstudio.com/items?itemName=fortress-optimizer.fortress-token-optimizer) that runs in the background.

## What Does This Save At Scale?

At 500 prompts/day with balanced optimization (~11% savings):

| Model | Monthly Savings | Annual Savings |
|-------|----------------|----------------|
| GPT-4 ($0.03/1K) | $4.05 | $48.60 |
| Claude Opus ($0.015/1K) | $2.03 | $24.30 |
| GPT-4o ($0.005/1K) | $0.68 | $8.10 |

For a team of 10 engineers at 500 prompts/day each, that's **$486/year on GPT-4** — and it compounds as models get more expensive or usage grows.

The savings are modest for individual developers, but they add up for teams running batch processing, RAG pipelines, or high-volume applications.

## Three Optimization Levels

| Level | Savings | Use Case |
|-------|---------|----------|
| Conservative | ~5% | Production prompts, minimal changes |
| Balanced | ~11-15% | General use (default) |
| Aggressive | ~15-22% | Batch processing, cost-sensitive |

## Free to Try

50,000 tokens/month free, no credit card. [Get a key](https://fortress-optimizer.com) and try it on your existing prompts.

I'd love feedback — especially if you're running high-volume LLM workloads where token costs are a real line item.

**Links:**
- [Website](https://fortress-optimizer.com)
- [npm package](https://www.npmjs.com/package/fortress-optimizer)
- [Python package](https://pypi.org/project/fortress-optimizer/)
- [VS Code extension](https://marketplace.visualstudio.com/items?itemName=fortress-optimizer.fortress-token-optimizer)
