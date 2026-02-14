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

        return response.json()

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

        return response.json()

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
