"""Phase 0 — unit tests for backend/meter_pricing.py (no HTTP client).

Pricing math: a price of $X per 1M tokens == X micro-dollars per token,
so cost_microdollars = round(tokens * price_per_1m).
"""

import re

from meter_pricing import estimate_cost_microdollars, PRICING_VERSION


def test_known_model_exact_cost():
    est = estimate_cost_microdollars("openai", "gpt-4o", 1_000_000, 0)
    assert est is not None
    assert est["total_microdollars"] == 2_500_000  # $2.50
    assert est["input_microdollars"] == 2_500_000
    assert est["output_microdollars"] == 0
    assert est["priced_with"] == "model"


def test_input_and_output_summed():
    est = estimate_cost_microdollars("anthropic", "claude-sonnet-4-6", 1_000_000, 1_000_000)
    assert est["input_microdollars"] == 3_000_000
    assert est["output_microdollars"] == 15_000_000
    assert est["total_microdollars"] == 18_000_000


def test_case_insensitive_lookup():
    upper = estimate_cost_microdollars("OpenAI", "GPT-4o", 1_000_000, 0)
    lower = estimate_cost_microdollars("openai", "gpt-4o", 1_000_000, 0)
    assert upper == lower
    assert upper["priced_with"] == "model"


def test_unknown_model_falls_back_to_provider_default():
    est = estimate_cost_microdollars("openai", "some-future-model", 1_000_000, 0)
    assert est is not None
    assert est["total_microdollars"] == 2_500_000
    assert est["priced_with"] == "provider_default"


def test_model_none_falls_back_to_provider_default():
    est = estimate_cost_microdollars("anthropic", None, 1_000_000, 0)
    assert est is not None
    assert est["total_microdollars"] == 3_000_000
    assert est["priced_with"] == "provider_default"


def test_unknown_provider_returns_none():
    assert estimate_cost_microdollars("ollama", "llama3", 1000, 1000) is None
    assert estimate_cost_microdollars("nonexistent", None, 1, 1) is None


def test_zero_tokens_zero_cost():
    est = estimate_cost_microdollars("openai", "gpt-4o", 0, 0)
    assert est is not None
    assert est["total_microdollars"] == 0


def test_rounding_small_counts():
    mini = estimate_cost_microdollars("openai", "gpt-4o-mini", 1, 0)
    assert mini["input_microdollars"] == 0  # round(1 * 0.15) == 0
    big = estimate_cost_microdollars("openai", "gpt-4o", 1, 0)
    assert big["input_microdollars"] == 2  # round(1 * 2.50) == 2


def test_pricing_version_constant_format():
    assert re.match(r"^\d{4}-\d{2}\.\d+$", PRICING_VERSION)
    est = estimate_cost_microdollars("openai", "gpt-4o", 100, 100)
    assert est["pricing_version"] == PRICING_VERSION
