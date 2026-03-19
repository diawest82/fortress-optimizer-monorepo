"""
Fortress Token Optimizer - Anthropic SDK Wrapper (Python)
Seamless integration with anthropic-sdk
"""

from typing import Optional, Literal, Union
import httpx
import json

try:
    from anthropic import Anthropic, AsyncAnthropic
except ImportError:
    raise ImportError("Please install: pip install anthropic")


class FortressAnthropicClient:
    """
    Drop-in wrapper around Anthropic client that adds token optimization.

    Usage:
        client = FortressAnthropicClient(
            api_key="sk-ant-...",
            fortress_api_key="fort-..."
        )

        response = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[...],
            optimize=True,  # NEW: enables token optimization
            optimization_level="balanced"
        )
    """

    def __init__(
        self,
        api_key: str,
        fortress_api_key: str,
        fortress_url: str = "https://api.fortress-optimizer.com",
    ):
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "shared-libs"))
        from http_client import FortressClient as _SharedClient

        self.anthropic_client = Anthropic(api_key=api_key)
        self.fortress_api_key = fortress_api_key
        self.fortress_url = fortress_url
        self._fortress = _SharedClient(api_key=fortress_api_key, base_url=fortress_url)

    def _optimize_prompt(
        self,
        prompt: str,
        level: Literal["conservative", "balanced", "aggressive"] = "balanced",
    ) -> str:
        """
        Send prompt to Fortress for optimization.
        Returns optimized prompt (algorithm stays backend).
        """
        try:
            data = self._fortress.optimize(prompt, level=level, provider="anthropic")
            if data["status"] == "success":
                optimized = data["optimization"]["optimized_prompt"]
                # Validate response — reject injection attempts
                if len(optimized) > len(prompt) * 2:
                    return prompt
                injection_patterns = ["ignore all previous", "ignore the above", "you are now", "new instructions:"]
                for pat in injection_patterns:
                    if pat in optimized.lower() and pat not in prompt.lower():
                        return prompt
                return optimized
            return prompt
        except Exception as e:
            print(f"Warning: Optimization failed ({str(e)}), using original prompt")
            return prompt

    def messages_create(
        self,
        *,
        model: str,
        max_tokens: int,
        messages: list,
        optimize: bool = False,
        optimization_level: Literal["conservative", "balanced", "aggressive"] = "balanced",
        **kwargs,
    ):
        """
        Create a message using Claude, with optional Fortress optimization.

        Additional parameters:
            optimize (bool): Enable token optimization
            optimization_level (str): 'conservative', 'balanced', or 'aggressive'
        """
        # If optimization enabled, optimize the first user message
        if optimize and messages:
            for msg in messages:
                if msg.get("role") == "user" and "content" in msg:
                    original_content = msg["content"]

                    if isinstance(original_content, str):
                        optimized = self._optimize_prompt(original_content, optimization_level)
                        msg["content"] = optimized
                    elif isinstance(original_content, list):
                        for item in original_content:
                            if isinstance(item, dict) and item.get("type") == "text":
                                item["text"] = self._optimize_prompt(
                                    item["text"], optimization_level
                                )

        # Call original Anthropic API
        response = self.anthropic_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,
            **kwargs,
        )

        return response

    def __getattr__(self, name):
        """Proxy to anthropic client for other methods"""
        return getattr(self.anthropic_client, name)

    def close(self):
        """Close HTTP client"""
        if hasattr(self, '_fortress'):
            self._fortress.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


class FortressAsyncAnthropicClient:
    """Async version for async applications"""

    def __init__(
        self,
        api_key: str,
        fortress_api_key: str,
        fortress_url: str = "https://api.fortress-optimizer.com",
    ):
        self.anthropic_client = AsyncAnthropic(api_key=api_key)
        self.fortress_api_key = fortress_api_key
        if not fortress_url.startswith('https://') and not fortress_url.startswith('http://localhost'):
            raise ValueError('Fortress API requires HTTPS.')
        self.fortress_url = fortress_url
        self.http_client = httpx.AsyncClient(
            base_url=fortress_url,
            headers={
                "Authorization": f"Bearer {fortress_api_key}",
                "X-Client-Version": "1.0.0",
            },
        )

    async def _optimize_prompt(
        self,
        prompt: str,
        level: Literal["conservative", "balanced", "aggressive"] = "balanced",
    ) -> str:
        """Async version of prompt optimization"""
        try:
            response = await self.http_client.post(
                "/api/optimize",
                json={
                    "prompt": prompt,
                    "level": level,
                    "provider": "anthropic",
                },
                timeout=10.0,
            )
            response.raise_for_status()

            data = response.json()
            if data["status"] == "success":
                optimized = data["optimization"]["optimized_prompt"]
                # Validate response — reject injection attempts
                if len(optimized) > len(prompt) * 2:
                    return prompt
                injection_patterns = ["ignore all previous", "ignore the above", "you are now", "new instructions:"]
                for pat in injection_patterns:
                    if pat in optimized.lower() and pat not in prompt.lower():
                        return prompt
                return optimized
            return prompt
        except Exception as e:
            print(f"Warning: Optimization failed ({str(e)}), using original prompt")
            return prompt

    async def messages_create(
        self,
        *,
        model: str,
        max_tokens: int,
        messages: list,
        optimize: bool = False,
        optimization_level: Literal["conservative", "balanced", "aggressive"] = "balanced",
        **kwargs,
    ):
        """Async version of messages.create"""
        if optimize and messages:
            for msg in messages:
                if msg.get("role") == "user" and "content" in msg:
                    original_content = msg["content"]

                    if isinstance(original_content, str):
                        optimized = await self._optimize_prompt(
                            original_content, optimization_level
                        )
                        msg["content"] = optimized
                    elif isinstance(original_content, list):
                        for item in original_content:
                            if isinstance(item, dict) and item.get("type") == "text":
                                item["text"] = await self._optimize_prompt(
                                    item["text"], optimization_level
                                )

        response = await self.anthropic_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,
            **kwargs,
        )

        return response

    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
