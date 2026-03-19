"""Test suite for fortress-langchain integration."""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, patch
from uuid import uuid4

import httpx
import pytest

from fortress_langchain.callback import FortressCallbackHandler
from fortress_langchain.client import (
    FortressClient,
    OptimizationLevel,
    OptimizationResult,
    TokenStats,
)
from fortress_langchain.middleware import FortressOptimizedLLM

# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

MOCK_API_KEY = "fk_test_abc123"

OPTIMIZE_RESPONSE = {
    "optimization": {
        "optimized_prompt": "Explain quantum computing concisely.",
        "technique": "compression",
    },
    "tokens": {
        "original": 120,
        "optimized": 45,
        "savings": 75,
        "savings_percentage": 62.5,
    },
}

USAGE_RESPONSE = {
    "total_requests": 500,
    "total_tokens_saved": 25000,
    "period": "2026-03",
}

PROVIDERS_RESPONSE = ["openai", "anthropic", "google", "cohere"]


def _make_transport(
    optimize_resp: dict = OPTIMIZE_RESPONSE,
    usage_resp: dict = USAGE_RESPONSE,
    providers_resp: list = PROVIDERS_RESPONSE,
    status_code: int = 200,
) -> httpx.MockTransport:
    """Return an httpx MockTransport that mimics the Fortress API."""

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/api/optimize" and request.method == "POST":
            return httpx.Response(status_code, json=optimize_resp)
        if path == "/api/usage":
            return httpx.Response(200, json=usage_resp)
        if path == "/api/providers":
            return httpx.Response(200, json=providers_resp)
        return httpx.Response(404, json={"error": "not found"})

    return httpx.MockTransport(handler)


@pytest.fixture()
def client() -> FortressClient:
    """Create a FortressClient backed by a mock transport."""
    transport = _make_transport()
    c = FortressClient(api_key=MOCK_API_KEY)
    c._client = httpx.Client(
        base_url=c.base_url, headers=c._build_headers(), transport=transport
    )
    return c


@pytest.fixture()
def failing_client() -> FortressClient:
    """Client that always gets 500s from the API."""
    transport = _make_transport(status_code=500)
    c = FortressClient(api_key=MOCK_API_KEY)
    c._client = httpx.Client(
        base_url=c.base_url, headers=c._build_headers(), transport=transport
    )
    return c


# ---------------------------------------------------------------------------
# FortressClient tests
# ---------------------------------------------------------------------------


class TestFortressClient:
    def test_requires_api_key(self):
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("FORTRESS_API_KEY", None)
            with pytest.raises(ValueError, match="API key is required"):
                FortressClient(api_key="")

    def test_api_key_from_env(self):
        with patch.dict(os.environ, {"FORTRESS_API_KEY": MOCK_API_KEY}):
            c = FortressClient()
            assert c.api_key == MOCK_API_KEY

    def test_optimize_success(self, client: FortressClient):
        result = client.optimize("Explain quantum computing in extreme detail.")
        assert isinstance(result, OptimizationResult)
        assert result.success is True
        assert result.optimized_prompt == "Explain quantum computing concisely."
        assert result.technique == "compression"
        assert result.tokens.original == 120
        assert result.tokens.savings == 75
        assert result.tokens.savings_percentage == 62.5

    def test_optimize_graceful_failure(self, failing_client: FortressClient):
        original = "This should pass through."
        result = failing_client.optimize(original)
        assert result.success is False
        assert result.optimized_prompt == original
        assert result.technique == "passthrough"

    def test_get_usage(self, client: FortressClient):
        usage = client.get_usage()
        assert usage["total_requests"] == 500

    def test_get_providers(self, client: FortressClient):
        providers = client.get_providers()
        assert "openai" in providers
        assert "anthropic" in providers

    def test_optimization_level_enum(self):
        assert OptimizationLevel.CONSERVATIVE.value == "conservative"
        assert OptimizationLevel.BALANCED.value == "balanced"
        assert OptimizationLevel.AGGRESSIVE.value == "aggressive"

    def test_custom_base_url(self):
        c = FortressClient(
            api_key=MOCK_API_KEY,
            base_url="https://custom.example.com/",
        )
        assert c.base_url == "https://custom.example.com"

    def test_headers_include_auth(self, client: FortressClient):
        headers = client._build_headers()
        assert headers["Authorization"] == f"Bearer {MOCK_API_KEY}"
        assert headers["X-API-Key"] == MOCK_API_KEY

    def test_context_manager(self):
        transport = _make_transport()
        c = FortressClient(api_key=MOCK_API_KEY)
        c._client = httpx.Client(
            base_url=c.base_url, headers=c._build_headers(), transport=transport
        )
        with c as ctx:
            assert ctx is c
        # Should not raise after close.


# ---------------------------------------------------------------------------
# FortressCallbackHandler tests
# ---------------------------------------------------------------------------


class TestCallbackHandler:
    def _make_handler(
        self, transport: Optional[httpx.MockTransport] = None
    ) -> FortressCallbackHandler:
        handler = FortressCallbackHandler(api_key=MOCK_API_KEY)
        if transport is None:
            transport = _make_transport()
        handler._client._client = httpx.Client(
            base_url=handler._client.base_url,
            headers=handler._client._build_headers(),
            transport=transport,
        )
        return handler

    def test_on_llm_start_optimizes_prompts(self):
        handler = self._make_handler()
        prompts = ["Explain quantum computing in extreme detail."]
        handler.on_llm_start(
            serialized={}, prompts=prompts, run_id=uuid4()
        )
        assert prompts[0] == "Explain quantum computing concisely."
        assert handler.optimizations_count == 1
        assert handler.total_savings == 75

    def test_on_llm_start_multiple_prompts(self):
        handler = self._make_handler()
        prompts = ["Prompt A", "Prompt B", "Prompt C"]
        handler.on_llm_start(serialized={}, prompts=prompts, run_id=uuid4())
        # All three should be replaced
        assert all(p == "Explain quantum computing concisely." for p in prompts)
        assert handler.optimizations_count == 3
        assert handler.total_savings == 75 * 3

    def test_disabled_handler_is_noop(self):
        handler = self._make_handler()
        handler.enabled = False
        prompts = ["Original prompt."]
        handler.on_llm_start(serialized={}, prompts=prompts, run_id=uuid4())
        assert prompts[0] == "Original prompt."
        assert handler.optimizations_count == 0

    def test_api_failure_passes_through(self):
        handler = self._make_handler(transport=_make_transport(status_code=500))
        prompts = ["Keep me unchanged."]
        handler.on_llm_start(serialized={}, prompts=prompts, run_id=uuid4())
        assert prompts[0] == "Keep me unchanged."
        assert handler.optimizations_count == 0

    def test_on_chat_model_start_optimizes_human_messages(self):
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

        handler = self._make_handler()
        messages = [
            [
                SystemMessage(content="You are helpful."),
                HumanMessage(content="Tell me about quantum computing."),
                AIMessage(content="Sure!"),  # should be left alone
            ]
        ]
        handler.on_chat_model_start(
            serialized={}, messages=messages, run_id=uuid4()
        )
        # System and Human should be optimized, AI left alone.
        assert messages[0][0].content == "Explain quantum computing concisely."
        assert messages[0][1].content == "Explain quantum computing concisely."
        assert messages[0][2].content == "Sure!"
        assert handler.optimizations_count == 2

    def test_stats_property(self):
        handler = self._make_handler()
        handler.total_savings = 200
        handler.optimizations_count = 5
        assert handler.stats == {
            "optimizations_count": 5,
            "total_tokens_saved": 200,
        }


# ---------------------------------------------------------------------------
# FortressOptimizedLLM tests
# ---------------------------------------------------------------------------


class TestFortressOptimizedLLM:
    def _make_mock_llm(self) -> MagicMock:
        """Return a MagicMock that behaves enough like a BaseLLM."""
        from langchain_core.outputs import Generation, LLMResult

        mock = MagicMock(spec=["_generate", "_agenerate", "_llm_type", "_identifying_params"])
        mock._llm_type = "fake"
        mock._identifying_params = {"model": "test"}
        mock._generate.return_value = LLMResult(
            generations=[[Generation(text="mock response")]]
        )
        return mock

    def test_llm_type(self):
        mock_llm = self._make_mock_llm()
        wrapper = FortressOptimizedLLM(
            llm=mock_llm,
            fortress_api_key=MOCK_API_KEY,
        )
        assert "fortress-optimized" in wrapper._llm_type

    def test_generate_optimizes_prompts(self):
        mock_llm = self._make_mock_llm()
        wrapper = FortressOptimizedLLM(
            llm=mock_llm,
            fortress_api_key=MOCK_API_KEY,
        )
        # Inject mock transport into the client
        transport = _make_transport()
        fc = wrapper._fortress_client
        fc._client = httpx.Client(
            base_url=fc.base_url, headers=fc._build_headers(), transport=transport
        )

        wrapper._generate(["Tell me about quantum computing in detail."])

        # The mock LLM should have received the optimized prompt
        call_args = mock_llm._generate.call_args
        optimized_prompts = call_args[0][0]
        assert optimized_prompts == ["Explain quantum computing concisely."]

    def test_disabled_passes_through(self):
        mock_llm = self._make_mock_llm()
        wrapper = FortressOptimizedLLM(
            llm=mock_llm,
            fortress_api_key=MOCK_API_KEY,
            fortress_enabled=False,
        )
        original = "Do not optimize me."
        wrapper._generate([original])
        call_args = mock_llm._generate.call_args
        assert call_args[0][0] == [original]

    def test_identifying_params(self):
        mock_llm = self._make_mock_llm()
        wrapper = FortressOptimizedLLM(
            llm=mock_llm,
            fortress_api_key=MOCK_API_KEY,
            fortress_level="aggressive",
        )
        params = wrapper._identifying_params
        assert params["fortress_level"] == "aggressive"
        assert params["fortress_enabled"] is True


# ---------------------------------------------------------------------------
# Async tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestAsyncClient:
    async def test_aoptimize_success(self):
        transport = _make_transport()
        c = FortressClient(api_key=MOCK_API_KEY)
        c._async_client = httpx.AsyncClient(
            base_url=c.base_url,
            headers=c._build_headers(),
            transport=httpx.MockTransport(
                lambda req: httpx.Response(200, json=OPTIMIZE_RESPONSE)
            ),
        )
        result = await c.aoptimize("Long prompt here")
        assert result.success is True
        assert result.optimized_prompt == "Explain quantum computing concisely."
        await c.aclose()

    async def test_aoptimize_failure_graceful(self):
        c = FortressClient(api_key=MOCK_API_KEY)
        c._async_client = httpx.AsyncClient(
            base_url=c.base_url,
            headers=c._build_headers(),
            transport=httpx.MockTransport(
                lambda req: httpx.Response(500, text="error")
            ),
        )
        result = await c.aoptimize("Keep this")
        assert result.success is False
        assert result.optimized_prompt == "Keep this"
        await c.aclose()


# ---------------------------------------------------------------------------
# Integration-style smoke tests (still mocked, but exercises full flow)
# ---------------------------------------------------------------------------


class TestEndToEnd:
    def test_callback_then_stats(self):
        """Simulate attaching handler, running two LLM calls, checking stats."""
        handler = FortressCallbackHandler(api_key=MOCK_API_KEY)
        transport = _make_transport()
        handler._client._client = httpx.Client(
            base_url=handler._client.base_url,
            headers=handler._client._build_headers(),
            transport=transport,
        )

        # Simulate two LLM calls
        prompts_1 = ["First prompt to optimize"]
        prompts_2 = ["Second prompt to optimize"]
        handler.on_llm_start(serialized={}, prompts=prompts_1, run_id=uuid4())
        handler.on_llm_start(serialized={}, prompts=prompts_2, run_id=uuid4())

        assert handler.stats["optimizations_count"] == 2
        assert handler.stats["total_tokens_saved"] == 150

    def test_parse_response_edge_cases(self):
        """Ensure _parse_response handles missing keys."""
        result = FortressClient._parse_response({})
        assert result.optimized_prompt == ""
        assert result.technique == "unknown"
        assert result.tokens.original == 0
