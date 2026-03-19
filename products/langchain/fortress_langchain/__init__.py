"""Fortress Token Optimizer - LangChain Integration.

Automatically optimize prompts before sending them to LLMs,
reducing token usage and costs while preserving output quality.

Usage:
    from fortress_langchain import FortressCallbackHandler, FortressOptimizedLLM

    # As a callback handler:
    handler = FortressCallbackHandler(api_key="fk_...")
    llm = ChatOpenAI(callbacks=[handler])

    # As an LLM wrapper:
    base_llm = ChatOpenAI()
    optimized_llm = FortressOptimizedLLM(llm=base_llm, api_key="fk_...")
"""

__version__ = "0.1.0"

from fortress_langchain.callback import FortressCallbackHandler
from fortress_langchain.client import FortressClient, OptimizationLevel
from fortress_langchain.middleware import FortressOptimizedLLM

__all__ = [
    "FortressCallbackHandler",
    "FortressClient",
    "FortressOptimizedLLM",
    "OptimizationLevel",
]
