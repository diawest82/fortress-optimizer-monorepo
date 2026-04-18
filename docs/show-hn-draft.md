## Show HN Draft

**Title:** Show HN: Fortress – API that cuts LLM token costs 10-20% by compressing prompts

**URL:** https://fortress-optimizer.com

**Text:**

Hi HN, I built Fortress Token Optimizer — an API that compresses prompts before they reach your LLM, reducing token usage by 10-20% without changing the meaning.

The idea is simple: most prompts contain filler ("Could you please help me"), redundant phrases ("analyze this data and provide analysis of the data"), and unnecessary whitespace that inflates token counts. Fortress strips these out server-side.

How it works:

    pip install fortress-optimizer
    # or
    npm install fortress-optimizer

    from fortress_optimizer import FortressClient
    client = FortressClient(api_key="fk_...")
    result = client.optimize("Could you please help me write a detailed analysis of this data")
    # → "Write a detailed analysis of this data"  (18% fewer tokens)

Three optimization levels: conservative (~5%), balanced (~15%), aggressive (~20%). Works with OpenAI, Anthropic, Gemini, Groq, Azure, Ollama.

Free tier: 50,000 tokens/month, no credit card. Pro is $15/month for unlimited.

Available as:
- Python (PyPI) and Node.js (npm) packages
- VS Code extension (runs in background, auto-optimizes)
- Zapier and Make.com integrations
- OpenClaw skill

The optimization runs server-side — phrase compression, semantic deduplication, meta-removal, and sentence optimization. It's not a simple regex; it understands prompt structure.

I'd love feedback on the approach and where this is most valuable. The API is live at api.fortress-optimizer.com.
