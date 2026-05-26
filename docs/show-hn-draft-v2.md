## Show HN — May 26, 2026 (Tuesday)

**URL field:** `https://fortress-optimizer.com`

**Title (80 chars max, no emoji):**
```
Show HN: Fortress – API that cuts LLM token costs 10-20% by compressing prompts
```

**Text (paste into the text field):**

```
I was burning through OpenAI credits and realized most of my prompts had 10-20% wasted tokens — filler ("Could you please help me"), redundant phrases ("analyze the data and provide analysis"), and politeness the model doesn't need.

Fortress is an API that strips this server-side before the prompt hits the model. Same response quality, fewer tokens.

  pip install fortress-optimizer

  from fortress_optimizer import FortressClient
  client = FortressClient(api_key="fk_...")
  result = client.optimize(
      "Could you please help me write a detailed analysis of this data"
  )
  # → "Write a detailed analysis of this data"  (22% fewer tokens)

Four optimization passes: phrase compression, semantic deduplication, meta-removal, sentence optimization. It understands structure — won't strip code blocks or remove meaningful qualifiers.

Real benchmarks I tested across 5 prompt styles:
  - Casual/chatty: 15-23% savings
  - Business: 8-12%
  - Technical/dense: 4-8%
  - Average: ~11%

Three levels: conservative (~5%), balanced (~15% default), aggressive (~20%). Works with OpenAI, Anthropic, Gemini, Groq, Azure, Ollama.

At 500 prompts/day on GPT-4, that's ~$48/year saved per developer. Modest individually, meaningful for teams running batch processing or RAG pipelines.

Free tier: 50K tokens/month, no card. Pro $15/month unlimited.

Also available as: npm package, VS Code extension, Zapier, Make.com, OpenClaw skill.

Honest status & lessons learned (in case this helps others):

This is a solo project I've been hardening for months, and last week I ran a full live walkthrough that exposed how brittle "deployed" actually is. Top three findings:

1. The Vercel `env` block in vercel.json was overriding my dashboard env vars with literal description strings. Every Stripe call had been failing with "Invalid API Key: Stripese***********sing" because the runtime literally had "Stripe secret key for payment processing" as the secret. Lost a full month of would-be conversions.

2. `echo "value" | vercel env add` captures the trailing newline. Six env vars had `\n` baked in. Stripe rejects keys with trailing whitespace as connection errors, not auth errors, so the symptom looked like a network issue.

3. Vercel deploys had been silently failing for 12 days because a Prisma schema change for OAuth Account/Session models was uncommitted locally. The build only fails in CI where it doesn't have those local changes.

Total: ~30 days of nominal "production" where the API was actually down or returning placeholders. The thing I'm proudest of is the live walkthrough that caught it — direct curl tests, env-var introspection, and security probes against the real production endpoints.

Would love feedback on:
- Where the savings math actually matters for your workload
- The optimization aggressiveness vs quality tradeoff
- Anything you'd want to see in a v2

Deep-dive with benchmarks: https://dev.to/diallo_west_9848dddc9ba5a/how-i-built-an-api-that-cuts-llm-token-costs-by-11-22-1l10
```

## Why this version

- **First line is a real pain point**, not a feature pitch
- **Concrete code example in the first 10 lines** (HN scrolls fast)
- **Real benchmark numbers** not "10-20%" vague
- **Honest about the journey** — HN rewards founders who admit hard truths
- **The "lessons learned" section is the hook** — it makes this post about something more than another "I built a thing", which is the difference between 5 upvotes and 200
- **Asks for specific feedback** at the end (engagement bait but honest)

## Pre-post checklist

Before submitting tomorrow morning:
- [ ] Verify https://fortress-optimizer.com loads
- [ ] Verify signup works (run a fresh signup test ~1 hour before posting)
- [ ] Verify checkout actually creates a `cs_live_*` session
- [ ] Have your phone ready for 2FA on Stripe dashboard in case you need to refund a curiosity-payment
- [ ] Be at keyboard 8am-12pm ET — comment replies in first hour matter MOST
- [ ] Don't argue with criticism. Acknowledge → engage. "Yeah, that's fair" → pivot to a useful answer.
