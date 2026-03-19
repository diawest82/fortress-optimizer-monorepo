"""
HTTP Client for Fortress Token Optimizer
SAFE FOR FRONTEND: Never exposes algorithm, only calls /api/optimize
"""

from typing import Optional, Literal, Dict, Any
import httpx
import json
from urllib.parse import urljoin
from datetime import datetime


class FortressClient:
    """
    Client for calling Fortress Token Optimizer API
    Never contains optimization logic (that's backend-only)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.fortress-optimizer.com",
        timeout: float = 10.0,
    ):
        if not base_url.startswith("https://") and not base_url.startswith("http://localhost"):
            raise ValueError("Fortress API requires HTTPS. Use https:// URLs only.")
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        self.client = httpx.Client(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Client-Version": "1.0.0",
            },
            timeout=timeout,
        )

    def optimize(
        self,
        prompt: str,
        level: Literal["conservative", "balanced", "aggressive"] = "balanced",
        provider: str = "openai",
    ) -> Dict[str, Any]:
        """
        Send prompt to backend for optimization

        Args:
            prompt: The prompt to optimize
            level: Optimization aggressiveness
            provider: LLM provider (openai, anthropic, etc.)

        Returns:
            Optimization response from backend
        """
        payload = {
            "prompt": prompt,
            "level": level,
            "provider": provider,
        }

        response = self.client.post("/api/optimize", json=payload)
        response.raise_for_status()

        data = response.json()

        # Validate response integrity — defend against prompt injection
        optimized = (data.get("optimization") or {}).get("optimized_prompt", "")
        if optimized:
            if len(optimized) > len(prompt) * 2:
                raise ValueError("Response validation failed: optimized prompt suspiciously longer than original")
            injection_patterns = [
                "ignore all previous", "ignore the above", "disregard prior",
                "system prompt", "you are now", "new instructions:",
            ]
            lower = optimized.lower()
            prompt_lower = prompt.lower()
            for pattern in injection_patterns:
                if pattern in lower and pattern not in prompt_lower:
                    raise ValueError("Response validation failed: suspicious content in optimized prompt")

        return data

    def get_usage(self) -> Dict[str, Any]:
        """Get current token usage for this API key"""
        response = self.client.get("/api/usage")
        response.raise_for_status()
        return response.json()

    def get_providers(self) -> list:
        """Get list of supported providers"""
        response = self.client.get("/api/providers")
        response.raise_for_status()
        return response.json()

    def health_check(self) -> bool:
        """Check if API is healthy"""
        try:
            response = self.client.get("/health", timeout=2.0)
            return response.status_code == 200
        except Exception:
            return False

    def close(self):
        """Close HTTP client"""
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


# Async client for high-performance applications
class FortressAsyncClient:
    """Async version of FortressClient"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.fortress-optimizer.com",
        timeout: float = 10.0,
    ):
        if not base_url.startswith("https://") and not base_url.startswith("http://localhost"):
            raise ValueError("Fortress API requires HTTPS. Use https:// URLs only.")
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Client-Version": "1.0.0",
            },
            timeout=timeout,
        )

    async def optimize(
        self,
        prompt: str,
        level: Literal["conservative", "balanced", "aggressive"] = "balanced",
        provider: str = "openai",
    ) -> Dict[str, Any]:
        """Send prompt to backend for optimization (async)"""
        payload = {
            "prompt": prompt,
            "level": level,
            "provider": provider,
        }

        response = await self.client.post("/api/optimize", json=payload)
        response.raise_for_status()

        data = response.json()

        # Validate response integrity (same as sync client)
        optimized = (data.get("optimization") or {}).get("optimized_prompt", "")
        if optimized:
            if len(optimized) > len(prompt) * 2:
                raise ValueError("Response validation failed: optimized prompt suspiciously longer than original")
            injection_patterns = [
                "ignore all previous", "ignore the above", "disregard prior",
                "system prompt", "you are now", "new instructions:",
            ]
            lower = optimized.lower()
            prompt_lower = prompt.lower()
            for pattern in injection_patterns:
                if pattern in lower and pattern not in prompt_lower:
                    raise ValueError("Response validation failed: suspicious content in optimized prompt")

        return data

    async def get_usage(self) -> Dict[str, Any]:
        """Get current token usage (async)"""
        response = await self.client.get("/api/usage")
        response.raise_for_status()
        return response.json()

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
