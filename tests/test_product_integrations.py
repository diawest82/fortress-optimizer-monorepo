"""
Test Suite 9: Product Integration Tests
Tests the 11 remaining platform products (anthropic-sdk, langchain, copilot,
cursor, jetbrains, sublime, neovim, slack, claude-desktop, bing-copilot,
make-zapier) for structural completeness and API contract compliance.

These are structural/contract tests — they verify each product:
1. Has required files for its platform
2. Uses correct API endpoint paths
3. Handles auth correctly (Bearer or X-API-Key)
4. Handles error/fallback gracefully
5. Reports optimization results in expected format

Run: pytest tests/test_product_integrations.py -v
"""

import os
import json
import re
import pytest

PRODUCTS_DIR = os.path.join(os.path.dirname(__file__), "..", "products")


def read_file(product: str, filename: str) -> str:
    """Read a file from a product directory"""
    path = os.path.join(PRODUCTS_DIR, product, filename)
    if not os.path.exists(path):
        return ""
    with open(path, "r") as f:
        return f.read()


def product_files(product: str) -> list:
    """List all files in a product directory (non-recursive, no node_modules)"""
    path = os.path.join(PRODUCTS_DIR, product)
    if not os.path.exists(path):
        return []
    return [
        f for f in os.listdir(path)
        if os.path.isfile(os.path.join(path, f)) and f != ".DS_Store"
    ]


# ─── Structural Tests: Every Product ─────────────────────────────────────────


ALL_PRODUCTS = [
    "anthropic-sdk", "bing-copilot", "claude-desktop", "copilot", "cursor",
    "gpt-store", "jetbrains", "langchain", "make-zapier", "neovim", "npm",
    "slack", "sublime", "vercel-ai-sdk", "vscode-enhanced",
]


class TestProductDirectoryExists:
    @pytest.mark.parametrize("product", ALL_PRODUCTS)
    def test_product_dir_exists(self, product):
        path = os.path.join(PRODUCTS_DIR, product)
        assert os.path.isdir(path), f"Product directory missing: {product}"


class TestProductHasFiles:
    @pytest.mark.parametrize("product", ALL_PRODUCTS)
    def test_has_at_least_one_source_file(self, product):
        files = product_files(product)
        assert len(files) > 0, f"Product {product} has no files"


# ─── API Contract Tests ──────────────────────────────────────────────────────


class TestAPIEndpointUsage:
    """All products should hit /api/optimize"""

    @pytest.mark.parametrize("product,file", [
        ("anthropic-sdk", "wrapper.py"),
        ("slack", "bot.py"),
        ("sublime", "fortress.py"),
        ("copilot", "fortress-provider.ts"),
    ])
    def test_uses_optimize_endpoint(self, product, file):
        content = read_file(product, file)
        assert "/api/optimize" in content or "/optimize" in content, \
            f"{product}/{file} does not reference /api/optimize"

    @pytest.mark.parametrize("product,file", [
        ("anthropic-sdk", "wrapper.py"),
        ("slack", "bot.py"),
        ("sublime", "fortress.py"),
        ("copilot", "fortress-provider.ts"),
    ])
    def test_sends_prompt_field(self, product, file):
        content = read_file(product, file)
        has_prompt = '"prompt"' in content or "'prompt'" in content or "prompt," in content or "prompt:" in content
        assert has_prompt, f"{product}/{file} does not send 'prompt' field"

    @pytest.mark.parametrize("product,file", [
        ("anthropic-sdk", "wrapper.py"),
        ("slack", "bot.py"),
        ("copilot", "fortress-provider.ts"),
    ])
    def test_sends_level_field(self, product, file):
        content = read_file(product, file)
        has_level = '"level"' in content or "'level'" in content or "level," in content or "level:" in content
        assert has_level, f"{product}/{file} does not send 'level' field"


class TestAuthHeaderUsage:
    """Products should use Bearer or X-API-Key"""

    @pytest.mark.parametrize("product,file", [
        ("anthropic-sdk", "wrapper.py"),
        ("slack", "bot.py"),
        ("copilot", "fortress-provider.ts"),
    ])
    def test_uses_auth_header(self, product, file):
        content = read_file(product, file)
        has_bearer = "Bearer" in content or "bearer" in content
        has_xapikey = "X-API-Key" in content or "x-api-key" in content
        has_authorization = "Authorization" in content or "authorization" in content
        assert has_bearer or has_xapikey or has_authorization, \
            f"{product}/{file} does not use auth headers"


class TestResponseParsing:
    """Products should parse the standard response format"""

    @pytest.mark.parametrize("product,file", [
        ("anthropic-sdk", "wrapper.py"),
        ("slack", "bot.py"),
        ("copilot", "fortress-provider.ts"),
    ])
    def test_reads_optimized_prompt(self, product, file):
        content = read_file(product, file)
        assert "optimized_prompt" in content, \
            f"{product}/{file} does not read 'optimized_prompt' from response"

    @pytest.mark.parametrize("product,file", [
        ("slack", "bot.py"),
        ("copilot", "fortress-provider.ts"),
    ])
    def test_reads_token_counts(self, product, file):
        content = read_file(product, file)
        has_tokens = "tokens" in content
        has_savings = "savings" in content
        assert has_tokens and has_savings, \
            f"{product}/{file} does not read token/savings from response"


class TestErrorHandling:
    """Products should handle API errors gracefully"""

    @pytest.mark.parametrize("product,file", [
        ("anthropic-sdk", "wrapper.py"),
        ("slack", "bot.py"),
        ("copilot", "fortress-provider.ts"),
    ])
    def test_has_error_handling(self, product, file):
        content = read_file(product, file)
        has_try = "try" in content
        has_except = "except" in content or "catch" in content
        assert has_try and has_except, \
            f"{product}/{file} lacks try/except error handling"


class TestGracefulDegradation:
    """SDK wrappers should fall back to original prompt on failure"""

    def test_anthropic_fallback(self):
        content = read_file("anthropic-sdk", "wrapper.py")
        assert "return prompt" in content, \
            "anthropic-sdk should return original prompt on failure"


# ─── Platform-Specific Tests ─────────────────────────────────────────────────


class TestAnthropicSDK:
    def test_wraps_anthropic_client(self):
        content = read_file("anthropic-sdk", "wrapper.py")
        assert "from anthropic import" in content
        assert "class FortressAnthropicClient" in content

    def test_has_async_variant(self):
        content = read_file("anthropic-sdk", "wrapper.py")
        assert "class FortressAsyncAnthropicClient" in content

    def test_has_optimize_flag(self):
        content = read_file("anthropic-sdk", "wrapper.py")
        assert "optimize:" in content or "optimize =" in content

    def test_has_context_manager(self):
        content = read_file("anthropic-sdk", "wrapper.py")
        assert "__enter__" in content
        assert "__exit__" in content

    def test_has_setup_py(self):
        content = read_file("anthropic-sdk", "setup.py")
        assert len(content) > 0, "Missing setup.py"


class TestSlack:
    def test_has_bot_commands(self):
        content = read_file("slack", "bot.py")
        assert "@app.message" in content

    def test_has_optimize_command(self):
        content = read_file("slack", "bot.py")
        assert "optimize" in content

    def test_has_usage_command(self):
        content = read_file("slack", "bot.py")
        assert "usage" in content

    def test_has_help_command(self):
        content = read_file("slack", "bot.py")
        assert "help" in content

    def test_has_pricing_command(self):
        content = read_file("slack", "bot.py")
        assert "pricing" in content


class TestGPTStore:
    def test_has_openapi_spec(self):
        content = read_file("gpt-store", "openapi-actions.json")
        assert len(content) > 0, "Missing openapi-actions.json"
        spec = json.loads(content)
        assert "openapi" in spec or "paths" in spec

    def test_has_gpt_config(self):
        content = read_file("gpt-store", "gpt-config.json")
        assert len(content) > 0, "Missing gpt-config.json"


class TestBingCopilot:
    def test_has_ai_plugin(self):
        content = read_file("bing-copilot", "ai-plugin.json")
        assert len(content) > 0, "Missing ai-plugin.json"


class TestMakeZapier:
    def test_has_zapier_app_config(self):
        content = read_file("make-zapier", "zapier-app.json")
        assert len(content) > 0, "Missing zapier-app.json"

    def test_has_make_module_config(self):
        content = read_file("make-zapier", "make-module.json")
        assert len(content) > 0, "Missing make-module.json"


class TestCopilot:
    def test_has_package_json(self):
        content = read_file("copilot", "package.json")
        assert len(content) > 0

    def test_has_extension_ts(self):
        content = read_file("copilot", "extension.ts")
        assert len(content) > 0

    def test_has_fortress_provider(self):
        content = read_file("copilot", "fortress-provider.ts")
        assert "class FortressCopilotProvider" in content


class TestSublime:
    def test_has_python_plugin(self):
        content = read_file("sublime", "fortress.py")
        assert len(content) > 0

    def test_is_sublime_plugin(self):
        content = read_file("sublime", "fortress.py")
        assert "sublime" in content.lower()


class TestLangchain:
    def test_has_setup_py(self):
        content = read_file("langchain", "setup.py")
        assert "fortress-langchain" in content

    def test_depends_on_langchain_core(self):
        content = read_file("langchain", "setup.py")
        assert "langchain-core" in content

    def test_depends_on_httpx(self):
        content = read_file("langchain", "setup.py")
        assert "httpx" in content


class TestVSCodeEnhanced:
    def test_has_package_json(self):
        content = read_file("vscode-enhanced", "package.json")
        assert len(content) > 0
        pkg = json.loads(content)
        assert "name" in pkg

    def test_has_test_file(self):
        content = read_file("vscode-enhanced", "test_extension.ts")
        assert len(content) > 0


class TestCursor:
    def test_has_package_json(self):
        content = read_file("cursor", "package.json")
        assert len(content) > 0


class TestClaudeDesktop:
    def test_has_package_json(self):
        content = read_file("claude-desktop", "package.json")
        assert len(content) > 0


# ─── API Base URL Consistency ─────────────────────────────────────────────────


class TestBaseURLConsistency:
    """All products should default to the same API base URL"""

    @pytest.mark.parametrize("product,file", [
        ("anthropic-sdk", "wrapper.py"),
        ("slack", "bot.py"),
        ("copilot", "fortress-provider.ts"),
    ])
    def test_default_url(self, product, file):
        content = read_file(product, file)
        # Should reference fortress-optimizer.com or allow override
        has_fortress_url = "fortress-optimizer.com" in content
        has_env_override = "FORTRESS_URL" in content or "fortress_url" in content or "apiUrl" in content
        assert has_fortress_url or has_env_override, \
            f"{product}/{file} doesn't reference fortress-optimizer.com or allow URL override"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
