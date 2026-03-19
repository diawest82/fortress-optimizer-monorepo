"""HTTP client for the Fortress Token Optimizer API."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.fortress-optimizer.com"
DEFAULT_TIMEOUT = 10.0


class OptimizationLevel(str, Enum):
    """Prompt optimization aggressiveness level."""

    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"


@dataclass(frozen=True)
class TokenStats:
    """Token usage statistics from an optimization."""

    original: int
    optimized: int
    savings: int
    savings_percentage: float


@dataclass(frozen=True)
class OptimizationResult:
    """Result of a prompt optimization request."""

    optimized_prompt: str
    technique: str
    tokens: TokenStats
    success: bool = True


class FortressClient:
    """HTTP client for the Fortress Token Optimizer API.

    Args:
        api_key: API key starting with ``fk_``. Falls back to the
            ``FORTRESS_API_KEY`` environment variable.
        base_url: API base URL. Defaults to ``https://api.fortress-optimizer.com``.
        timeout: Request timeout in seconds.
        provider: Target LLM provider name (e.g. ``"openai"``, ``"anthropic"``).
        level: Optimization aggressiveness level.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        provider: str = "openai",
        level: OptimizationLevel = OptimizationLevel.BALANCED,
    ) -> None:
        self.api_key = api_key or os.environ.get("FORTRESS_API_KEY", "")
        if not self.api_key:
            raise ValueError(
                "Fortress API key is required. Pass api_key= or set the "
                "FORTRESS_API_KEY environment variable."
            )
        self.base_url = (base_url or os.environ.get("FORTRESS_BASE_URL", "")).rstrip(
            "/"
        ) or DEFAULT_BASE_URL
        if not self.base_url.startswith("https://") and not self.base_url.startswith("http://localhost"):
            raise ValueError("Fortress API requires HTTPS. Use https:// URLs only.")
        self.timeout = timeout
        self.provider = provider
        self.level = level
        self._client = httpx.Client(
            base_url=self.base_url,
            headers=self._build_headers(),
            timeout=self.timeout,
        )
        self._async_client: Optional[httpx.AsyncClient] = None

    def _build_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "fortress-langchain/0.1.0",
        }

    def _ensure_async_client(self) -> httpx.AsyncClient:
        if self._async_client is None or self._async_client.is_closed:
            self._async_client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self._build_headers(),
                timeout=self.timeout,
            )
        return self._async_client

    # ------------------------------------------------------------------
    # Synchronous helpers
    # ------------------------------------------------------------------

    def optimize(
        self,
        prompt: str,
        level: Optional[OptimizationLevel] = None,
        provider: Optional[str] = None,
    ) -> OptimizationResult:
        """Optimize a prompt synchronously.

        Returns the original prompt wrapped in an ``OptimizationResult`` with
        ``success=False`` if the API call fails, so callers can fall through
        gracefully.
        """
        body = {
            "prompt": prompt,
            "level": (level or self.level).value,
            "provider": provider or self.provider,
        }
        try:
            resp = self._client.post("/api/optimize", json=body)
            resp.raise_for_status()
            result = self._parse_response(resp.json())
            # Validate response integrity
            if result.optimized_prompt:
                if len(result.optimized_prompt) > len(prompt) * 2:
                    return self._fallback(prompt)
                injection_patterns = ["ignore all previous", "ignore the above", "you are now", "new instructions:"]
                lower = result.optimized_prompt.lower()
                for pat in injection_patterns:
                    if pat in lower and pat not in prompt.lower():
                        return self._fallback(prompt)
            return result
        except Exception:
            logger.warning(
                "Fortress optimization failed; falling back to original prompt.",
                exc_info=True,
            )
            return OptimizationResult(
                optimized_prompt=prompt,
                technique="passthrough",
                tokens=TokenStats(0, 0, 0, 0.0),
                success=False,
            )

    async def aoptimize(
        self,
        prompt: str,
        level: Optional[OptimizationLevel] = None,
        provider: Optional[str] = None,
    ) -> OptimizationResult:
        """Optimize a prompt asynchronously."""
        body = {
            "prompt": prompt,
            "level": (level or self.level).value,
            "provider": provider or self.provider,
        }
        try:
            client = self._ensure_async_client()
            resp = await client.post("/api/optimize", json=body)
            resp.raise_for_status()
            return self._parse_response(resp.json())
        except Exception:
            logger.warning(
                "Fortress optimization failed; falling back to original prompt.",
                exc_info=True,
            )
            return OptimizationResult(
                optimized_prompt=prompt,
                technique="passthrough",
                tokens=TokenStats(0, 0, 0, 0.0),
                success=False,
            )

    def get_usage(self) -> dict[str, Any]:
        """Retrieve current usage statistics."""
        resp = self._client.get("/api/usage")
        resp.raise_for_status()
        return resp.json()

    def get_providers(self) -> list[str]:
        """Retrieve the list of supported LLM providers."""
        resp = self._client.get("/api/providers")
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    @staticmethod
    def _fallback(prompt: str) -> OptimizationResult:
        """Return original prompt as a failed optimization (injection detected)."""
        return OptimizationResult(
            optimized_prompt=prompt,
            technique="none",
            tokens=TokenStats(original=0, optimized=0, savings=0, savings_percentage=0.0),
            success=False,
        )

    @staticmethod
    def _parse_response(data: dict[str, Any]) -> OptimizationResult:
        opt = data.get("optimization", {})
        tok = data.get("tokens", {})
        return OptimizationResult(
            optimized_prompt=opt.get("optimized_prompt", ""),
            technique=opt.get("technique", "unknown"),
            tokens=TokenStats(
                original=tok.get("original", 0),
                optimized=tok.get("optimized", 0),
                savings=tok.get("savings", 0),
                savings_percentage=tok.get("savings_percentage", 0.0),
            ),
        )

    def close(self) -> None:
        """Close underlying HTTP connections."""
        self._client.close()
        if self._async_client and not self._async_client.is_closed:
            # Async client should be closed in an async context; best-effort.
            try:
                import asyncio

                asyncio.get_event_loop().run_until_complete(
                    self._async_client.aclose()
                )
            except Exception:
                pass

    async def aclose(self) -> None:
        """Close underlying HTTP connections (async)."""
        self._client.close()
        if self._async_client and not self._async_client.is_closed:
            await self._async_client.aclose()

    def __enter__(self) -> "FortressClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    async def __aenter__(self) -> "FortressClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.aclose()
