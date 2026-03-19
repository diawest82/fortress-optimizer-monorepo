"""
Fortress Token Optimizer - Anthropic SDK Integration
Example usage
"""

import os
from fortress_anthropic import FortressAnthropicClient

# Initialize client
client = FortressAnthropicClient(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    fortress_api_key=os.getenv("FORTRESS_API_KEY"),
)

# Example 1: Basic usage without optimization
response = client.messages_create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain quantum computing"}
    ]
)
print(f"Response: {response.content[0].text}")

# Example 2: With Fortress optimization
response_optimized = client.messages_create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Explain quantum computing with detailed examples and use cases"
        }
    ],
    optimize=True,  # Enable optimization
    optimization_level="balanced"
)
print(f"Optimized Response: {response_optimized.content[0].text}")

# Example 3: Async usage
import asyncio
from fortress_anthropic import FortressAsyncAnthropicClient

async def example_async():
    client = FortressAsyncAnthropicClient(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        fortress_api_key=os.getenv("FORTRESS_API_KEY"),
    )

    response = await client.messages_create(
        model="claude-3-opus-20240229",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "Explain machine learning"}
        ],
        optimize=True,
        optimization_level="aggressive"
    )

    print(f"Async Response: {response.content[0].text}")
    await client.close()

asyncio.run(example_async())
