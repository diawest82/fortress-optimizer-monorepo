# fortress-langchain

LangChain integration for the **Fortress Token Optimizer** -- automatically compress and optimize prompts before they reach your LLM, reducing token usage and costs while preserving output quality.

## Installation

```bash
pip install fortress-langchain
```

## Quick Start

### 1. Callback Handler (recommended for most use cases)

Attach `FortressCallbackHandler` to any LangChain LLM or chat model. It
intercepts prompts in `on_llm_start` / `on_chat_model_start` and replaces
them with optimized versions before the API call is made.

```python
from langchain_openai import ChatOpenAI
from fortress_langchain import FortressCallbackHandler

handler = FortressCallbackHandler(api_key="fk_live_abc123")

llm = ChatOpenAI(model="gpt-4", callbacks=[handler])
response = llm.invoke("Explain the theory of relativity in great detail")

print(f"Tokens saved so far: {handler.stats['total_tokens_saved']}")
```

### 2. LLM Wrapper (drop-in replacement)

Wrap any `BaseLLM` instance so every call is optimized transparently.

```python
from langchain_openai import OpenAI
from fortress_langchain import FortressOptimizedLLM

base_llm = OpenAI(model="gpt-3.5-turbo-instruct")
llm = FortressOptimizedLLM(llm=base_llm, api_key="fk_live_abc123")

# Use exactly like any other LLM
result = llm.invoke("Write a comprehensive guide to Python decorators")
```

### 3. Inside a Chain

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from fortress_langchain import FortressCallbackHandler

handler = FortressCallbackHandler(
    api_key="fk_live_abc123",
    level="balanced",        # conservative | balanced | aggressive
    provider="openai",
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful coding assistant."),
    ("human", "{question}"),
])
llm = ChatOpenAI(model="gpt-4")
chain = prompt | llm

response = chain.invoke(
    {"question": "How do Python generators work?"},
    config={"callbacks": [handler]},
)
```

## Configuration

### API Key

Pass explicitly or set the environment variable:

```bash
export FORTRESS_API_KEY=fk_live_abc123
```

```python
# Explicit
handler = FortressCallbackHandler(api_key="fk_live_abc123")

# From env
handler = FortressCallbackHandler()
```

### Optimization Levels

| Level          | Description                                       |
|----------------|---------------------------------------------------|
| `conservative` | Minimal changes -- safest for sensitive prompts   |
| `balanced`     | Good savings with high fidelity (default)         |
| `aggressive`   | Maximum compression, best for cost reduction      |

### Custom API URL

```python
handler = FortressCallbackHandler(
    api_key="fk_live_abc123",
    base_url="https://custom.fortress-api.example.com",
)
```

## Graceful Degradation

If the Fortress API is unreachable or returns an error, the original prompt
is passed through unchanged. Your LLM calls will never fail because of the
optimizer.

## API Reference

### `FortressCallbackHandler`

- `api_key` -- Fortress API key
- `base_url` -- API base URL (default: `https://api.fortress-optimizer.com`)
- `level` -- `"conservative"` | `"balanced"` | `"aggressive"`
- `provider` -- LLM provider hint (default: `"openai"`)
- `enabled` -- Toggle on/off at runtime
- `.stats` -- Dict with `optimizations_count` and `total_tokens_saved`

### `FortressOptimizedLLM`

- `llm` -- The underlying LangChain LLM to wrap
- `fortress_api_key` -- Fortress API key
- `fortress_base_url` -- API base URL
- `fortress_level` -- Optimization level
- `fortress_provider` -- LLM provider hint
- `fortress_enabled` -- Toggle on/off at runtime
- `.get_usage()` -- Fetch Fortress usage stats

### `FortressClient`

Low-level HTTP client -- use directly if you need custom control.

```python
from fortress_langchain import FortressClient, OptimizationLevel

with FortressClient(api_key="fk_live_abc123") as client:
    result = client.optimize(
        "Your long prompt here...",
        level=OptimizationLevel.AGGRESSIVE,
    )
    print(result.optimized_prompt)
    print(f"Saved {result.tokens.savings} tokens")
```

## License

MIT
