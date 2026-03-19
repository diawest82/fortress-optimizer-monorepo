"""
Fortress Token Optimizer - Slack Bot
Slack integration for token optimization
"""

import os
import logging
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import httpx

# Initialize Slack app
app = App(token=os.environ.get("SLACK_BOT_TOKEN"))

# Fortress client
FORTRESS_API_KEY = os.environ.get("FORTRESS_API_KEY")
FORTRESS_URL = os.environ.get("FORTRESS_URL", "https://api.fortress-optimizer.com")

fortress_client = httpx.Client(
    base_url=FORTRESS_URL,
    headers={
        "Authorization": f"Bearer {FORTRESS_API_KEY}",
        "X-Client-Version": "1.0.0",
    },
)

logger = logging.getLogger(__name__)


def optimize_text(text: str, level: str = "balanced") -> dict:
    """Call Fortress API to optimize text"""
    try:
        response = fortress_client.post(
            "/api/optimize",
            json={
                "prompt": text,
                "level": level,
                "provider": "general",
            },
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        return {"status": "error", "error": str(e)}


@app.message("optimize")
def handle_optimize_command(message, say):
    """Handle @fortress optimize <text> command"""
    try:
        # Extract text after "optimize" command
        text = message.get("text", "").replace("optimize", "", 1).strip()

        if not text:
            say("Please provide text to optimize. Usage: `@fortress optimize <your text>`")
            return

        # Optimize
        result = optimize_text(text)

        if result.get("status") == "success":
            optimized = result["optimization"]["optimized_prompt"]
            tokens = result["tokens"]
            technique = result.get("technique", "unknown")

            message_text = f"""
:robot_face: *Token Optimization Result*

*Original ({tokens['original']} tokens):*
```
{text}
```

*Optimized ({tokens['optimized']} tokens):*
```
{optimized}
```

:zap: *Savings:* {tokens['savings']} tokens ({tokens['savings_percentage']:.1f}%)
:wrench: *Technique:* {technique}
            """
            say(message_text)
        else:
            say(f"Optimization failed: {result.get('error', 'Unknown error')}")

    except Exception as e:
        logger.error(f"Command handler error: {e}")
        say(f"Error: {str(e)}")


@app.message("usage")
def handle_usage_command(message, say):
    """Get token usage statistics"""
    try:
        response = fortress_client.get("/api/usage", timeout=5.0)
        response.raise_for_status()
        usage = response.json()

        tier = usage.get("tier", "free")
        tokens_optimized = usage.get("tokens_optimized", 0)
        tokens_saved = usage.get("tokens_saved", 0)
        requests = usage.get("requests", 0)
        tokens_limit = usage.get("tokens_limit", 0)
        tokens_remaining = usage.get("tokens_remaining", 0)
        rate_limit = usage.get("rate_limit", "N/A")
        reset_date = usage.get("reset_date", "N/A")

        message_text = f"""
:chart_with_upwards_trend: *Token Usage*

*Tier:* {tier.upper()}
*Tokens Optimized:* {tokens_optimized:,}
*Tokens Saved:* {tokens_saved:,}
*Requests:* {requests:,}
*Limit:* {tokens_limit:,} tokens
*Remaining:* {tokens_remaining:,} tokens
*Rate Limit:* {rate_limit}
*Reset Date:* {reset_date}
        """
        say(message_text)
    except Exception as e:
        say(f"Could not fetch usage: {str(e)}")


@app.message("help")
def handle_help_command(message, say):
    """Show help message"""
    help_text = """
:rocket: *Fortress Token Optimizer - Slack Commands*

*Commands:*
\u2022 `@fortress optimize <text>` - Optimize text for token efficiency
\u2022 `@fortress usage` - Show token usage statistics
\u2022 `@fortress help` - Show this help message
\u2022 `@fortress pricing` - Show pricing information

*Optimization Levels:* (add to command)
\u2022 `balanced` - Default, good balance (15% savings)
\u2022 `conservative` - Light optimization (5% savings)
\u2022 `aggressive` - Maximum optimization (30% savings)

Example:
```
@fortress optimize conservative Your prompt here that could be optimized
```

:globe_with_meridians: Learn more: https://fortress-optimizer.com
    """
    say(help_text)


@app.message("pricing")
def handle_pricing_command(message, say):
    """Show pricing information"""
    pricing_text = """
:moneybag: *Fortress Token Optimizer Pricing*

*FREE* - 50,000 tokens/month
\u2022 Great for experimenting
\u2022 All optimization levels
\u2022 Email support

*PRO* - $9.99/month
\u2022 Unlimited tokens
\u2022 Priority support
\u2022 API access

*TEAM* - $99/month
\u2022 Unlimited tokens
\u2022 Team collaboration
\u2022 Advanced analytics
\u2022 Dedicated support

*ENTERPRISE* - Custom pricing
\u2022 Custom token limits
\u2022 SLA guarantees
\u2022 Custom integrations
\u2022 24/7 support

:arrow_right: Get started: https://fortress-optimizer.com/pricing
    """
    say(pricing_text)


@app.event("app_mention")
def handle_mention(body, say):
    """Handle @fortress mentions with no command"""
    say("Hi! I'm the Fortress Token Optimizer bot. Try:\n`@fortress help`")


@app.event("message")
def handle_message(message, logger):
    """Log all messages (for debugging)"""
    logger.debug(f"Message received: {message}")


# Error handler
@app.error
def custom_error_handler(error, body, logger):
    logger.exception(f"Error: {error}")
    logger.debug(f"Request body: {body}")


if __name__ == "__main__":
    # Start bot with Socket Mode
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
