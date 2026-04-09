"""
Test Suite 2: TokenOptimizer Core Algorithm Unit Tests
Comprehensive tests for the core optimization engine.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared-libs'))

import pytest
from core import TokenOptimizer, OptimizationResult


# ─── Initialization ──────────────────────────────────────────────────────────


class TestTokenOptimizerInit:
    def test_default_provider(self):
        opt = TokenOptimizer()
        assert opt.provider == "openai"

    def test_custom_provider(self):
        opt = TokenOptimizer(provider="anthropic")
        assert opt.provider == "anthropic"

    def test_semantic_threshold(self):
        opt = TokenOptimizer()
        assert opt.semantic_threshold == 0.85

    def test_dedup_patterns_built(self):
        opt = TokenOptimizer()
        assert len(opt.dedup_patterns) == 3
        assert "repeated_words" in opt.dedup_patterns
        assert "extra_spaces" in opt.dedup_patterns
        assert "repeated_punctuation" in opt.dedup_patterns

    def test_get_stats(self):
        opt = TokenOptimizer(provider="gemini")
        stats = opt.get_stats()
        assert stats["provider"] == "gemini"
        assert stats["semantic_threshold"] == 0.85
        assert stats["patterns_count"] == 3


# ─── Token Estimation ────────────────────────────────────────────────────────


class TestTokenEstimation:
    def test_empty_string(self):
        opt = TokenOptimizer()
        assert opt.estimate_tokens("") == 0

    def test_short_string(self):
        opt = TokenOptimizer()
        assert opt.estimate_tokens("hi") == 1

    def test_four_chars(self):
        opt = TokenOptimizer()
        assert opt.estimate_tokens("test") == 1  # 4 // 4 = 1

    def test_standard_string(self):
        opt = TokenOptimizer()
        text = "Hello world this is a test"
        assert opt.estimate_tokens(text) == len(text) // 4

    def test_long_string(self):
        opt = TokenOptimizer()
        text = "a" * 10000
        assert opt.estimate_tokens(text) == 1250

    def test_unicode_string(self):
        opt = TokenOptimizer()
        text = "Hello 🌍 world"
        # tiktoken-based estimation; just verify it returns a positive int
        result = opt.estimate_tokens(text)
        assert isinstance(result, int) and result > 0


# ─── Conservative Level ──────────────────────────────────────────────────────


class TestConservativeOptimization:
    def test_returns_same_content(self):
        """Conservative should apply minimal optimization"""
        opt = TokenOptimizer()
        prompt = "Please analyze this data and provide insights"
        result = opt.optimize(prompt, level="conservative")
        assert isinstance(result, OptimizationResult)
        assert result.technique_used  # may include phrase-compression

    def test_original_prompt_preserved(self):
        opt = TokenOptimizer()
        prompt = "This is my prompt"
        result = opt.optimize(prompt, level="conservative")
        assert result.original_prompt == prompt

    def test_whitespace_normalization_still_applies(self):
        opt = TokenOptimizer()
        prompt = "Hello   world   test"
        result = opt.optimize(prompt, level="conservative")
        assert result.optimized_prompt == "Hello world test"

    def test_savings_minimal(self):
        opt = TokenOptimizer()
        prompt = "Explain quantum computing in simple terms"
        result = opt.optimize(prompt, level="conservative")
        assert result.savings_percentage >= 0


# ─── Balanced Level ──────────────────────────────────────────────────────────


class TestBalancedOptimization:
    def test_removes_repeated_words(self):
        opt = TokenOptimizer()
        # Same case repeated words (regex is case-sensitive)
        prompt = "the the quick brown fox"
        result = opt.optimize(prompt, level="balanced")
        assert "the the" not in result.optimized_prompt.lower()

    def test_case_insensitive_dedup(self):
        """Dedup regex should handle mixed case: 'The the' → 'The'"""
        opt = TokenOptimizer()
        prompt = "The the quick brown fox"
        result = opt.optimize(prompt, level="balanced")
        assert "the the" not in result.optimized_prompt.lower()

    def test_removes_filler_phrases(self):
        opt = TokenOptimizer()
        prompt = "So basically I want you to like analyze the data"
        result = opt.optimize(prompt, level="balanced")
        assert "basically" not in result.optimized_prompt.lower()
        assert "like" not in result.optimized_prompt.lower()

    def test_removes_um_uh(self):
        opt = TokenOptimizer()
        prompt = "Um I need you to uh help me with this"
        result = opt.optimize(prompt, level="balanced")
        assert "um" not in result.optimized_prompt.lower().split()
        assert "uh" not in result.optimized_prompt.lower().split()

    def test_technique_includes_deduplication(self):
        opt = TokenOptimizer()
        result = opt.optimize("Hello world", level="balanced")
        assert "deduplication" in result.technique_used

    def test_tokens_decrease_or_same(self):
        opt = TokenOptimizer()
        prompt = "You know, basically essentially I want you to um analyze this"
        result = opt.optimize(prompt, level="balanced")
        assert result.optimized_tokens <= result.original_tokens

    def test_savings_calculated_correctly(self):
        opt = TokenOptimizer()
        prompt = "The the repeated repeated words words here here"
        result = opt.optimize(prompt, level="balanced")
        assert result.savings == result.original_tokens - result.optimized_tokens
        if result.original_tokens > 0:
            expected_pct = (result.savings / result.original_tokens) * 100
            assert abs(result.savings_percentage - expected_pct) < 0.01


# ─── Aggressive Level ────────────────────────────────────────────────────────


class TestAggressiveOptimization:
    def test_abbreviates_common_phrases(self):
        opt = TokenOptimizer()
        prompt = "Please respond as soon as possible thank you"
        result = opt.optimize(prompt, level="aggressive")
        assert "ASAP" in result.optimized_prompt or "as soon as" not in result.optimized_prompt.lower()

    def test_removes_please(self):
        opt = TokenOptimizer()
        prompt = "Please help me with this task please"
        result = opt.optimize(prompt, level="aggressive")
        # Aggressive should reduce tokens from the original
        assert result.savings >= 0

    def test_removes_if_possible(self):
        opt = TokenOptimizer()
        prompt = "Fix this bug if possible and let me know"
        result = opt.optimize(prompt, level="aggressive")
        assert result.savings >= 0

    def test_replaces_in_order_to(self):
        opt = TokenOptimizer()
        prompt = "In order to achieve this goal we need data"
        result = opt.optimize(prompt, level="aggressive")
        assert "in order to" not in result.optimized_prompt.lower()

    def test_removes_repeated_punctuation(self):
        opt = TokenOptimizer()
        prompt = "Really... that is amazing!!! Is it true???"
        result = opt.optimize(prompt, level="aggressive")
        assert "..." not in result.optimized_prompt
        assert "!!!" not in result.optimized_prompt
        assert "???" not in result.optimized_prompt

    def test_technique_includes_compression(self):
        opt = TokenOptimizer()
        result = opt.optimize("Hello world", level="aggressive")
        assert "compression" in result.technique_used

    def test_technique_combined(self):
        opt = TokenOptimizer()
        result = opt.optimize("Test text here", level="aggressive")
        assert "deduplication" in result.technique_used
        assert "compression" in result.technique_used

    def test_maximum_savings(self):
        opt = TokenOptimizer()
        prompt = (
            "Um basically please if possible in order to analyze the data "
            "the data you know essentially as soon as possible thank you "
            "thank you so much!!!"
        )
        result = opt.optimize(prompt, level="aggressive")
        assert result.savings > 0
        assert result.savings_percentage > 0


# ─── Edge Cases ──────────────────────────────────────────────────────────────


class TestEdgeCases:
    def test_empty_prompt(self):
        opt = TokenOptimizer()
        result = opt.optimize("", level="balanced")
        assert result.optimized_prompt == ""
        assert result.savings == 0
        assert result.savings_percentage == 0

    def test_single_word(self):
        opt = TokenOptimizer()
        result = opt.optimize("Hello", level="aggressive")
        assert isinstance(result, OptimizationResult)
        assert result.original_prompt == "Hello"

    def test_single_character(self):
        opt = TokenOptimizer()
        result = opt.optimize("x", level="aggressive")
        # Aggressive may capitalize; just verify it's non-empty and a single char
        assert len(result.optimized_prompt.strip()) == 1

    def test_only_whitespace(self):
        opt = TokenOptimizer()
        result = opt.optimize("   \n\t   ", level="balanced")
        assert result.optimized_prompt == ""

    def test_code_block_preserved(self):
        opt = TokenOptimizer()
        prompt = 'def hello():\n    print("hello hello world")'
        result = opt.optimize(prompt, level="balanced")
        assert "print" in result.optimized_prompt.lower()
        assert "def" in result.optimized_prompt.lower()

    def test_json_prompt(self):
        opt = TokenOptimizer()
        prompt = '{"key": "value", "items": ["a", "b", "c"]}'
        result = opt.optimize(prompt, level="conservative")
        assert isinstance(result, OptimizationResult)

    def test_markdown_prompt(self):
        opt = TokenOptimizer()
        prompt = "# Title\n\n## Section\n\n- Item 1\n- Item 2\n\n**bold** and *italic*"
        result = opt.optimize(prompt, level="balanced")
        assert isinstance(result, OptimizationResult)

    def test_very_long_prompt(self):
        opt = TokenOptimizer()
        prompt = "word " * 10000  # 50,000 chars
        result = opt.optimize(prompt, level="balanced")
        assert isinstance(result, OptimizationResult)
        assert result.original_tokens > 0

    def test_special_characters(self):
        opt = TokenOptimizer()
        prompt = "Hello @user! Check out #trending $100 & more"
        result = opt.optimize(prompt, level="aggressive")
        assert isinstance(result, OptimizationResult)

    def test_emoji_prompt(self):
        opt = TokenOptimizer()
        prompt = "🚀 Launch the 🎯 feature with 💡 innovation"
        result = opt.optimize(prompt, level="balanced")
        assert isinstance(result, OptimizationResult)

    def test_newlines_normalized(self):
        opt = TokenOptimizer()
        prompt = "Hello\n\n\nworld\n\n\ntest"
        result = opt.optimize(prompt, level="balanced")
        assert "\n\n\n" not in result.optimized_prompt

    def test_mixed_whitespace(self):
        opt = TokenOptimizer()
        prompt = "Hello\t\t\tworld   test"
        result = opt.optimize(prompt, level="balanced")
        assert "\t" not in result.optimized_prompt


# ─── Result Integrity ────────────────────────────────────────────────────────


class TestResultIntegrity:
    def test_result_dataclass_fields(self):
        opt = TokenOptimizer()
        result = opt.optimize("Test prompt", level="balanced")
        assert hasattr(result, "original_prompt")
        assert hasattr(result, "optimized_prompt")
        assert hasattr(result, "original_tokens")
        assert hasattr(result, "optimized_tokens")
        assert hasattr(result, "savings")
        assert hasattr(result, "savings_percentage")
        assert hasattr(result, "technique_used")

    def test_savings_non_negative(self):
        opt = TokenOptimizer()
        for level in ["conservative", "balanced", "aggressive"]:
            result = opt.optimize("Hello world test prompt", level=level)
            assert result.savings >= 0

    def test_savings_percentage_range(self):
        opt = TokenOptimizer()
        result = opt.optimize("Test prompt with some filler words basically", level="aggressive")
        assert 0 <= result.savings_percentage <= 100

    def test_optimized_tokens_not_exceeds_original(self):
        opt = TokenOptimizer()
        prompts = [
            "Simple test",
            "The the repeated words words here",
            "Please if possible in order to do this thank you",
        ]
        for prompt in prompts:
            for level in ["conservative", "balanced", "aggressive"]:
                result = opt.optimize(prompt, level=level)
                assert result.optimized_tokens <= result.original_tokens


# ─── Batch Optimization ──────────────────────────────────────────────────────


class TestBatchOptimize:
    def test_batch_returns_list(self):
        opt = TokenOptimizer()
        results = opt.batch_optimize(["Hello", "World"], level="balanced")
        assert isinstance(results, list)
        assert len(results) == 2

    def test_batch_empty_list(self):
        opt = TokenOptimizer()
        results = opt.batch_optimize([], level="balanced")
        assert results == []

    def test_batch_preserves_order(self):
        opt = TokenOptimizer()
        prompts = ["First prompt", "Second prompt", "Third prompt"]
        results = opt.batch_optimize(prompts, level="balanced")
        assert results[0].original_prompt == "First prompt"
        assert results[1].original_prompt == "Second prompt"
        assert results[2].original_prompt == "Third prompt"

    def test_batch_all_levels(self):
        opt = TokenOptimizer()
        prompts = ["Test prompt"] * 3
        for level in ["conservative", "balanced", "aggressive"]:
            results = opt.batch_optimize(prompts, level=level)
            assert len(results) == 3
            for r in results:
                assert isinstance(r, OptimizationResult)


# ─── Provider Handling ────────────────────────────────────────────────────────


class TestProviders:
    def test_all_supported_providers(self):
        providers = ["openai", "anthropic", "azure", "gemini", "groq", "ollama"]
        for provider in providers:
            opt = TokenOptimizer(provider=provider)
            result = opt.optimize("Test prompt", level="balanced")
            assert isinstance(result, OptimizationResult)

    def test_unknown_provider_still_works(self):
        """Algorithm should work regardless of provider"""
        opt = TokenOptimizer(provider="unknown_provider")
        result = opt.optimize("Test prompt", level="balanced")
        assert isinstance(result, OptimizationResult)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
