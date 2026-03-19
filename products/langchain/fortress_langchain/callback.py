"""LangChain callback handler that optimizes prompts via Fortress."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence, Union
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from fortress_langchain.client import FortressClient, OptimizationLevel

logger = logging.getLogger(__name__)


class FortressCallbackHandler(BaseCallbackHandler):
    """A LangChain callback handler that intercepts prompts on ``on_llm_start``
    and replaces them with Fortress-optimized versions.

    The handler mutates the *prompts* list (for plain LLMs) or the
    *messages* list (for chat models) in place so the downstream LLM
    receives the optimized text.  If the Fortress API is unreachable the
    original prompt is left untouched.

    Args:
        api_key: Fortress API key (``fk_...``).  Falls back to
            ``FORTRESS_API_KEY`` env var.
        base_url: Override the default API base URL.
        level: Optimization level.
        provider: Target LLM provider hint.
        enabled: Toggle optimization on/off at runtime.
    """

    raise_error: bool = False  # never block the chain on our errors

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        level: OptimizationLevel = OptimizationLevel.BALANCED,
        provider: str = "openai",
        enabled: bool = True,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.enabled = enabled
        self.total_savings: int = 0
        self.optimizations_count: int = 0
        self._client = FortressClient(
            api_key=api_key,
            base_url=base_url,
            level=level,
            provider=provider,
        )

    # ------------------------------------------------------------------
    # Plain LLM path
    # ------------------------------------------------------------------

    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        """Intercept prompts destined for a plain (non-chat) LLM and
        replace each one with its optimized counterpart."""
        if not self.enabled:
            return
        for idx, prompt in enumerate(prompts):
            result = self._client.optimize(prompt)
            if result.success:
                prompts[idx] = result.optimized_prompt
                self.total_savings += result.tokens.savings
                self.optimizations_count += 1
                logger.info(
                    "Fortress optimized prompt %d: saved %d tokens (%.1f%%)",
                    idx,
                    result.tokens.savings,
                    result.tokens.savings_percentage,
                )

    # ------------------------------------------------------------------
    # Chat model path
    # ------------------------------------------------------------------

    def on_chat_model_start(
        self,
        serialized: Dict[str, Any],
        messages: List[List[BaseMessage]],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        """Intercept messages destined for a chat model and optimise the
        human/system message content."""
        if not self.enabled:
            return
        for conversation in messages:
            for idx, message in enumerate(conversation):
                if not isinstance(message, (HumanMessage, SystemMessage)):
                    continue
                content = message.content
                if not isinstance(content, str) or not content.strip():
                    continue
                result = self._client.optimize(content)
                if result.success:
                    message.content = result.optimized_prompt
                    self.total_savings += result.tokens.savings
                    self.optimizations_count += 1

    # ------------------------------------------------------------------
    # Required no-op stubs
    # ------------------------------------------------------------------

    def on_llm_end(self, *args: Any, **kwargs: Any) -> None:
        pass

    def on_llm_error(self, *args: Any, **kwargs: Any) -> None:
        pass

    def on_chain_start(self, *args: Any, **kwargs: Any) -> None:
        pass

    def on_chain_end(self, *args: Any, **kwargs: Any) -> None:
        pass

    def on_chain_error(self, *args: Any, **kwargs: Any) -> None:
        pass

    def on_tool_start(self, *args: Any, **kwargs: Any) -> None:
        pass

    def on_tool_end(self, *args: Any, **kwargs: Any) -> None:
        pass

    def on_tool_error(self, *args: Any, **kwargs: Any) -> None:
        pass

    def on_text(self, *args: Any, **kwargs: Any) -> None:
        pass

    # ------------------------------------------------------------------
    # Convenience
    # ------------------------------------------------------------------

    @property
    def stats(self) -> Dict[str, Any]:
        """Return a summary of optimizations performed so far."""
        return {
            "optimizations_count": self.optimizations_count,
            "total_tokens_saved": self.total_savings,
        }

    def close(self) -> None:
        self._client.close()
