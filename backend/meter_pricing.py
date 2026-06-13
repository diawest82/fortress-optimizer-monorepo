"""Static LLM pricing table for cost estimation. USD per 1M tokens.

A price of $X per 1M tokens equals exactly X micro-dollars per token,
so: cost_microdollars = round(tokens * price_per_1m).

Prices verified against provider price sheets on 2026-06-13 (Anthropic via the
claude-api reference; OpenAI/Google/Groq via published rate cards). Re-verify
before relying on these for billing and bump PRICING_VERSION on any change —
the version is stamped on every event row so historical rows stay attributable.
"""

from typing import Optional

PRICING_VERSION = "2026-06.2"

# (provider, model) -> {"input_per_1m": float, "output_per_1m": float}
MODEL_PRICING = {
    ("openai", "gpt-4o"):               {"input_per_1m": 2.50,  "output_per_1m": 10.00},
    ("openai", "gpt-4o-mini"):          {"input_per_1m": 0.15,  "output_per_1m": 0.60},
    ("openai", "gpt-4.1"):              {"input_per_1m": 2.00,  "output_per_1m": 8.00},
    ("openai", "o3"):                   {"input_per_1m": 2.00,  "output_per_1m": 8.00},
    ("anthropic", "claude-opus-4-8"):   {"input_per_1m": 5.00,  "output_per_1m": 25.00},
    ("anthropic", "claude-opus-4-7"):   {"input_per_1m": 5.00,  "output_per_1m": 25.00},
    ("anthropic", "claude-sonnet-4-6"): {"input_per_1m": 3.00,  "output_per_1m": 15.00},
    ("anthropic", "claude-haiku-4-5"):  {"input_per_1m": 1.00,  "output_per_1m": 5.00},
    ("anthropic", "claude-fable-5"):    {"input_per_1m": 10.00, "output_per_1m": 50.00},
    ("gemini", "gemini-2.5-pro"):       {"input_per_1m": 1.25,  "output_per_1m": 10.00},
    ("gemini", "gemini-2.5-flash"):     {"input_per_1m": 0.30,  "output_per_1m": 2.50},
}

# Fallback when the model is unknown but the provider is known.
PROVIDER_DEFAULT_PRICING = {
    "openai":    {"input_per_1m": 2.50, "output_per_1m": 10.00},
    "anthropic": {"input_per_1m": 3.00, "output_per_1m": 15.00},
    "gemini":    {"input_per_1m": 1.25, "output_per_1m": 10.00},
    "azure":     {"input_per_1m": 2.50, "output_per_1m": 10.00},
    "groq":      {"input_per_1m": 0.59, "output_per_1m": 0.79},
    # NOTE: "ollama" deliberately absent — local models have no API cost; estimate must return None.
}


def estimate_cost_microdollars(
    provider: str,
    model: Optional[str],
    input_tokens: int,
    output_tokens: int,
) -> Optional[dict]:
    """Estimate cost. Returns None when the provider is unpriceable.

    Returns: {"input_microdollars": int, "output_microdollars": int,
              "total_microdollars": int, "pricing_version": str,
              "priced_with": "model" | "provider_default"}
    Lookup: exact (provider.lower(), model.lower()) match first,
    then PROVIDER_DEFAULT_PRICING[provider.lower()], else None.
    """
    provider_l = provider.lower()
    priced_with = None
    rates = None

    if model is not None:
        rates = MODEL_PRICING.get((provider_l, model.lower()))
        if rates is not None:
            priced_with = "model"

    if rates is None:
        rates = PROVIDER_DEFAULT_PRICING.get(provider_l)
        if rates is not None:
            priced_with = "provider_default"

    if rates is None:
        return None

    input_microdollars = round(input_tokens * rates["input_per_1m"])
    output_microdollars = round(output_tokens * rates["output_per_1m"])
    return {
        "input_microdollars": input_microdollars,
        "output_microdollars": output_microdollars,
        "total_microdollars": input_microdollars + output_microdollars,
        "pricing_version": PRICING_VERSION,
        "priced_with": priced_with,
    }
