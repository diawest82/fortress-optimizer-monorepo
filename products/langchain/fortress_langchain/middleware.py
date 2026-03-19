"""LangChain LLM wrapper that transparently optimizes prompts via Fortress."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Mapping, Optional

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseLLM
from langchain_core.outputs import Generation, LLMResult

from fortress_langchain.client import FortressClient, OptimizationLevel

logger = logging.getLogger(__name__)


class FortressOptimizedLLM(BaseLLM):
    """A LangChain ``BaseLLM`` wrapper that optimizes every prompt through
    the Fortress Token Optimizer before forwarding it to the underlying LLM.

    This gives you a drop-in replacement: anywhere you use an LLM instance
    you can swap in a ``FortressOptimizedLLM`` and get automatic prompt
    compression with zero changes to the rest of your chain.

    Args:
        llm: The underlying LangChain LLM to delegate to.
        api_key: Fortress API key (``fk_...``).
        base_url: Override default API URL.
        level: Optimization aggressiveness.
        provider: Target LLM provider hint.
        enabled: Toggle optimisation on/off at runtime.

    Example::

        from langchain_openai import OpenAI
        from fortress_langchain import FortressOptimizedLLM

        base = OpenAI(model="gpt-3.5-turbo-instruct")
        llm = FortressOptimizedLLM(llm=base, api_key="fk_live_...")
        print(llm.invoke("Explain quantum computing in detail"))
    """

    # Pydantic v1-style field declarations (langchain_core still uses v1)
    llm: BaseLLM
    fortress_api_key: Optional[str] = None
    fortress_base_url: Optional[str] = None
    fortress_level: str = OptimizationLevel.BALANCED.value
    fortress_provider: str = "openai"
    fortress_enabled: bool = True

    class Config:
        arbitrary_types_allowed = True

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @property
    def _fortress_client(self) -> FortressClient:
        """Lazily build (and cache) a FortressClient instance."""
        attr = "_cached_fortress_client"
        if not hasattr(self, attr) or getattr(self, attr) is None:
            client = FortressClient(
                api_key=self.fortress_api_key,
                base_url=self.fortress_base_url,
                level=OptimizationLevel(self.fortress_level),
                provider=self.fortress_provider,
            )
            object.__setattr__(self, attr, client)
        return getattr(self, attr)

    def _optimize_prompt(self, text: str) -> str:
        if not self.fortress_enabled or not text.strip():
            return text
        result = self._fortress_client.optimize(text)
        if result.success:
            logger.info(
                "Fortress: saved %d tokens (%.1f%%)",
                result.tokens.savings,
                result.tokens.savings_percentage,
            )
            return result.optimized_prompt
        return text

    # ------------------------------------------------------------------
    # BaseLLM interface
    # ------------------------------------------------------------------

    @property
    def _llm_type(self) -> str:
        return f"fortress-optimized-{self.llm._llm_type}"

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        return {
            "inner_llm": self.llm._identifying_params,
            "fortress_level": self.fortress_level,
            "fortress_provider": self.fortress_provider,
            "fortress_enabled": self.fortress_enabled,
        }

    def _generate(
        self,
        prompts: List[str],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> LLMResult:
        """Optimize each prompt then delegate to the wrapped LLM."""
        optimized = [self._optimize_prompt(p) for p in prompts]
        return self.llm._generate(
            optimized, stop=stop, run_manager=run_manager, **kwargs
        )

    async def _agenerate(
        self,
        prompts: List[str],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> LLMResult:
        """Async version: optimize then delegate."""
        optimized: List[str] = []
        for p in prompts:
            if self.fortress_enabled and p.strip():
                result = await self._fortress_client.aoptimize(p)
                optimized.append(
                    result.optimized_prompt if result.success else p
                )
            else:
                optimized.append(p)
        return await self.llm._agenerate(
            optimized, stop=stop, run_manager=run_manager, **kwargs
        )

    # ------------------------------------------------------------------
    # Convenience pass-throughs
    # ------------------------------------------------------------------

    def get_usage(self) -> Dict[str, Any]:
        """Proxy to ``FortressClient.get_usage``."""
        return self._fortress_client.get_usage()

    def close(self) -> None:
        self._fortress_client.close()
