"""
Tests for Fortress Token Optimizer Slack Bot

Tests the actual function-based handlers in bot.py:
  - optimize_text() helper
  - handle_optimize_command() message handler
  - handle_usage_command() message handler
  - handle_help_command() message handler
  - handle_pricing_command() message handler
  - handle_mention() event handler
  - custom_error_handler() error handler
"""

import unittest
from unittest.mock import patch, MagicMock, PropertyMock
import httpx


# ---------------------------------------------------------------------------
# Patch environment and heavy imports before importing bot module
# ---------------------------------------------------------------------------
@patch.dict("os.environ", {
    "SLACK_BOT_TOKEN": "xoxb-test-token",
    "FORTRESS_API_KEY": "fort-test-key",
    "FORTRESS_URL": "https://api.fortress-optimizer.com",
})
def _import_bot():
    """Import bot module with mocked env vars and Slack App."""
    with patch("slack_bolt.App"):
        import bot as _bot
    return _bot


bot = _import_bot()


# ── Helpers ────────────────────────────────────────────────────────────────

def _make_say():
    """Return a mock `say` callable to capture Slack responses."""
    return MagicMock()


def _make_message(text="optimize hello world"):
    """Return a minimal Slack message dict."""
    return {"text": text, "user": "U123", "channel": "C456", "ts": "111.222"}


def _success_optimize_response():
    """Fortress API success response for /api/optimize."""
    return {
        "status": "success",
        "optimization": {
            "optimized_prompt": "hello world (optimized)",
        },
        "tokens": {
            "original": 10,
            "optimized": 7,
            "savings": 3,
            "savings_percentage": 30.0,
        },
        "technique": "semantic-compression",
    }


def _usage_response():
    """Fortress API response for /api/usage matching backend contract."""
    return {
        "tier": "pro",
        "tokens_optimized": 42000,
        "tokens_saved": 12500,
        "requests": 320,
        "tokens_limit": 100000,
        "tokens_remaining": 58000,
        "rate_limit": "1000/min",
        "reset_date": "2026-04-01",
    }


def _mock_httpx_response(json_data, status_code=200):
    """Build a mock httpx.Response."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json.return_value = json_data
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "error", request=MagicMock(), response=resp,
        )
    return resp


# ══════════════════════════════════════════════════════════════════════════
#  1. optimize_text() helper
# ══════════════════════════════════════════════════════════════════════════

class TestOptimizeText(unittest.TestCase):
    """Tests for the optimize_text() helper function."""

    @patch.object(bot.fortress_client, "post")
    def test_success_returns_json(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        result = bot.optimize_text("hello world")
        self.assertEqual(result["status"], "success")

    @patch.object(bot.fortress_client, "post")
    def test_sends_correct_payload(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        bot.optimize_text("test prompt", level="aggressive")
        call_kwargs = mock_post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        self.assertEqual(payload["prompt"], "test prompt")
        self.assertEqual(payload["level"], "aggressive")
        self.assertEqual(payload["provider"], "general")

    @patch.object(bot.fortress_client, "post")
    def test_default_level_is_balanced(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        bot.optimize_text("text")
        payload = mock_post.call_args.kwargs.get("json") or mock_post.call_args[1]["json"]
        self.assertEqual(payload["level"], "balanced")

    @patch.object(bot.fortress_client, "post")
    def test_posts_to_correct_endpoint(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        bot.optimize_text("text")
        self.assertEqual(mock_post.call_args[0][0], "/api/optimize")

    @patch.object(bot.fortress_client, "post")
    def test_sets_timeout(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        bot.optimize_text("text")
        self.assertEqual(mock_post.call_args.kwargs.get("timeout") or mock_post.call_args[1].get("timeout"), 10.0)

    @patch.object(bot.fortress_client, "post")
    def test_http_error_returns_error_dict(self, mock_post):
        mock_post.return_value = _mock_httpx_response({}, status_code=500)
        result = bot.optimize_text("fail")
        self.assertEqual(result["status"], "error")
        self.assertIn("error", result)

    @patch.object(bot.fortress_client, "post", side_effect=httpx.ConnectError("refused"))
    def test_connection_error_returns_error_dict(self, mock_post):
        result = bot.optimize_text("fail")
        self.assertEqual(result["status"], "error")

    @patch.object(bot.fortress_client, "post", side_effect=httpx.TimeoutException("timeout"))
    def test_timeout_returns_error_dict(self, mock_post):
        result = bot.optimize_text("fail")
        self.assertEqual(result["status"], "error")

    @patch.object(bot.fortress_client, "post", side_effect=Exception("unexpected"))
    def test_generic_exception_returns_error_dict(self, mock_post):
        result = bot.optimize_text("fail")
        self.assertEqual(result["status"], "error")
        self.assertIn("unexpected", result["error"])


# ══════════════════════════════════════════════════════════════════════════
#  2. handle_optimize_command()
# ══════════════════════════════════════════════════════════════════════════

class TestHandleOptimizeCommand(unittest.TestCase):
    """Tests for the @app.message('optimize') handler."""

    @patch.object(bot.fortress_client, "post")
    def test_success_says_optimized_text(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize hello world"), say)
        say.assert_called_once()
        output = say.call_args[0][0]
        self.assertIn("hello world (optimized)", output)

    @patch.object(bot.fortress_client, "post")
    def test_success_shows_token_counts(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize hello world"), say)
        output = say.call_args[0][0]
        self.assertIn("10", output)   # original
        self.assertIn("7", output)    # optimized
        self.assertIn("3", output)    # savings

    @patch.object(bot.fortress_client, "post")
    def test_success_shows_savings_percentage(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize hello world"), say)
        output = say.call_args[0][0]
        self.assertIn("30.0%", output)

    @patch.object(bot.fortress_client, "post")
    def test_success_shows_technique(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize hello world"), say)
        output = say.call_args[0][0]
        self.assertIn("semantic-compression", output)

    @patch.object(bot.fortress_client, "post")
    def test_missing_technique_shows_unknown(self, mock_post):
        data = _success_optimize_response()
        del data["technique"]
        mock_post.return_value = _mock_httpx_response(data)
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize hello"), say)
        output = say.call_args[0][0]
        self.assertIn("unknown", output)

    def test_empty_text_after_keyword_prompts_usage(self):
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize"), say)
        say.assert_called_once()
        output = say.call_args[0][0]
        self.assertIn("Usage", output)

    def test_whitespace_only_text_prompts_usage(self):
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize   "), say)
        output = say.call_args[0][0]
        self.assertIn("Usage", output)

    @patch.object(bot.fortress_client, "post")
    def test_api_error_status_says_failure(self, mock_post):
        mock_post.return_value = _mock_httpx_response(
            {"status": "error", "error": "quota exceeded"})
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize test"), say)
        output = say.call_args[0][0]
        self.assertIn("failed", output.lower())

    @patch.object(bot.fortress_client, "post")
    def test_api_error_includes_error_message(self, mock_post):
        mock_post.return_value = _mock_httpx_response(
            {"status": "error", "error": "quota exceeded"})
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize test"), say)
        output = say.call_args[0][0]
        self.assertIn("quota exceeded", output)

    @patch.object(bot.fortress_client, "post", side_effect=Exception("boom"))
    def test_exception_says_error(self, mock_post):
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize test"), say)
        output = say.call_args[0][0]
        self.assertIn("Error", output)

    @patch.object(bot.fortress_client, "post")
    def test_strips_optimize_keyword_from_text(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize my prompt text"), say)
        payload = mock_post.call_args.kwargs.get("json") or mock_post.call_args[1]["json"]
        self.assertEqual(payload["prompt"], "my prompt text")

    @patch.object(bot.fortress_client, "post")
    def test_only_first_optimize_keyword_stripped(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize optimize this twice"), say)
        payload = mock_post.call_args.kwargs.get("json") or mock_post.call_args[1]["json"]
        self.assertEqual(payload["prompt"], "optimize this twice")

    @patch.object(bot.fortress_client, "post")
    def test_unicode_text_handled(self, mock_post):
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize cafe\u0301 resum\u00e9"), say)
        say.assert_called_once()

    @patch.object(bot.fortress_client, "post")
    def test_long_text_sent_to_api(self, mock_post):
        long_text = "optimize " + "word " * 500
        mock_post.return_value = _mock_httpx_response(_success_optimize_response())
        say = _make_say()
        bot.handle_optimize_command(_make_message(long_text), say)
        mock_post.assert_called_once()

    @patch.object(bot.fortress_client, "post")
    def test_api_missing_status_field_treated_as_failure(self, mock_post):
        """If API returns JSON without a 'status' key, handler should not crash."""
        mock_post.return_value = _mock_httpx_response({"unexpected": True})
        say = _make_say()
        bot.handle_optimize_command(_make_message("optimize test"), say)
        output = say.call_args[0][0]
        self.assertIn("failed", output.lower())


# ══════════════════════════════════════════════════════════════════════════
#  3. handle_usage_command()
# ══════════════════════════════════════════════════════════════════════════

class TestHandleUsageCommand(unittest.TestCase):
    """Tests for the @app.message('usage') handler."""

    @patch.object(bot.fortress_client, "get")
    def test_success_shows_tier(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("PRO", output)

    @patch.object(bot.fortress_client, "get")
    def test_success_shows_tokens_optimized(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("42,000", output)

    @patch.object(bot.fortress_client, "get")
    def test_success_shows_tokens_saved(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("12,500", output)

    @patch.object(bot.fortress_client, "get")
    def test_success_shows_requests(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("320", output)

    @patch.object(bot.fortress_client, "get")
    def test_success_shows_tokens_limit(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("100,000", output)

    @patch.object(bot.fortress_client, "get")
    def test_success_shows_tokens_remaining(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("58,000", output)

    @patch.object(bot.fortress_client, "get")
    def test_success_shows_rate_limit(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("1000/min", output)

    @patch.object(bot.fortress_client, "get")
    def test_success_shows_reset_date(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("2026-04-01", output)

    @patch.object(bot.fortress_client, "get")
    def test_calls_correct_endpoint(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        self.assertEqual(mock_get.call_args[0][0], "/api/usage")

    @patch.object(bot.fortress_client, "get")
    def test_sets_timeout(self, mock_get):
        mock_get.return_value = _mock_httpx_response(_usage_response())
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        self.assertEqual(
            mock_get.call_args.kwargs.get("timeout") or mock_get.call_args[1].get("timeout"),
            5.0,
        )

    @patch.object(bot.fortress_client, "get")
    def test_http_error_says_could_not_fetch(self, mock_get):
        mock_get.return_value = _mock_httpx_response({}, status_code=500)
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("Could not fetch usage", output)

    @patch.object(bot.fortress_client, "get", side_effect=httpx.ConnectError("down"))
    def test_connection_error_says_could_not_fetch(self, mock_get):
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("Could not fetch usage", output)

    @patch.object(bot.fortress_client, "get")
    def test_missing_fields_use_defaults(self, mock_get):
        """Backend returns partial data -- handler should not crash."""
        mock_get.return_value = _mock_httpx_response({"tier": "free"})
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("FREE", output)
        self.assertIn("N/A", output)  # missing rate_limit defaults to N/A

    @patch.object(bot.fortress_client, "get")
    def test_free_tier_label(self, mock_get):
        data = _usage_response()
        data["tier"] = "free"
        mock_get.return_value = _mock_httpx_response(data)
        say = _make_say()
        bot.handle_usage_command(_make_message("usage"), say)
        output = say.call_args[0][0]
        self.assertIn("FREE", output)


# ══════════════════════════════════════════════════════════════════════════
#  4. handle_help_command()
# ══════════════════════════════════════════════════════════════════════════

class TestHandleHelpCommand(unittest.TestCase):
    """Tests for the @app.message('help') handler."""

    def test_says_help_text(self):
        say = _make_say()
        bot.handle_help_command(_make_message("help"), say)
        say.assert_called_once()

    def test_mentions_optimize_command(self):
        say = _make_say()
        bot.handle_help_command(_make_message("help"), say)
        self.assertIn("optimize", say.call_args[0][0].lower())

    def test_mentions_usage_command(self):
        say = _make_say()
        bot.handle_help_command(_make_message("help"), say)
        self.assertIn("usage", say.call_args[0][0].lower())

    def test_mentions_help_command(self):
        say = _make_say()
        bot.handle_help_command(_make_message("help"), say)
        self.assertIn("help", say.call_args[0][0].lower())

    def test_mentions_pricing_command(self):
        say = _make_say()
        bot.handle_help_command(_make_message("help"), say)
        self.assertIn("pricing", say.call_args[0][0].lower())

    def test_mentions_optimization_levels(self):
        say = _make_say()
        bot.handle_help_command(_make_message("help"), say)
        output = say.call_args[0][0].lower()
        self.assertIn("balanced", output)
        self.assertIn("conservative", output)
        self.assertIn("aggressive", output)

    def test_includes_website_link(self):
        say = _make_say()
        bot.handle_help_command(_make_message("help"), say)
        self.assertIn("fortress-optimizer.com", say.call_args[0][0])

    def test_includes_example(self):
        say = _make_say()
        bot.handle_help_command(_make_message("help"), say)
        self.assertIn("@fortress optimize", say.call_args[0][0])


# ══════════════════════════════════════════════════════════════════════════
#  5. handle_pricing_command()
# ══════════════════════════════════════════════════════════════════════════

class TestHandlePricingCommand(unittest.TestCase):
    """Tests for the @app.message('pricing') handler."""

    def test_says_pricing_text(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        say.assert_called_once()

    def test_mentions_free_tier(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        self.assertIn("FREE", say.call_args[0][0])

    def test_mentions_pro_tier(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        self.assertIn("PRO", say.call_args[0][0])

    def test_mentions_team_tier(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        self.assertIn("TEAM", say.call_args[0][0])

    def test_mentions_enterprise_tier(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        self.assertIn("ENTERPRISE", say.call_args[0][0])

    def test_free_tier_token_limit(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        self.assertIn("50,000", say.call_args[0][0])

    def test_pro_price(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        self.assertIn("$9.99", say.call_args[0][0])

    def test_team_price(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        self.assertIn("$99", say.call_args[0][0])

    def test_includes_pricing_link(self):
        say = _make_say()
        bot.handle_pricing_command(_make_message("pricing"), say)
        self.assertIn("fortress-optimizer.com/pricing", say.call_args[0][0])


# ══════════════════════════════════════════════════════════════════════════
#  6. handle_mention() and handle_message()
# ══════════════════════════════════════════════════════════════════════════

class TestHandleMention(unittest.TestCase):
    """Tests for the app_mention event handler."""

    def test_mention_replies_with_help_hint(self):
        say = _make_say()
        body = {"event": {"text": "<@BOT> hi", "user": "U123", "channel": "C456"}}
        bot.handle_mention(body, say)
        output = say.call_args[0][0]
        self.assertIn("help", output.lower())

    def test_mention_identifies_as_fortress(self):
        say = _make_say()
        bot.handle_mention({}, say)
        output = say.call_args[0][0]
        self.assertIn("Fortress", output)


# ══════════════════════════════════════════════════════════════════════════
#  7. custom_error_handler()
# ══════════════════════════════════════════════════════════════════════════

class TestCustomErrorHandler(unittest.TestCase):
    """Tests for the @app.error handler."""

    def test_logs_exception(self):
        mock_logger = MagicMock()
        bot.custom_error_handler(
            error=RuntimeError("test"),
            body={"text": "bad"},
            logger=mock_logger,
        )
        mock_logger.exception.assert_called_once()

    def test_logs_request_body(self):
        mock_logger = MagicMock()
        bot.custom_error_handler(
            error=RuntimeError("test"),
            body={"text": "bad"},
            logger=mock_logger,
        )
        mock_logger.debug.assert_called_once()


# ══════════════════════════════════════════════════════════════════════════
#  8. Module-level / configuration checks
# ══════════════════════════════════════════════════════════════════════════

class TestModuleConfig(unittest.TestCase):
    """Verify module-level wiring."""

    def test_fortress_client_is_httpx(self):
        self.assertIsInstance(bot.fortress_client, httpx.Client)

    def test_fortress_client_has_auth_header(self):
        headers = bot.fortress_client.headers
        # httpx normalises header keys to lowercase
        auth = headers.get("authorization") or headers.get("Authorization")
        self.assertIsNotNone(auth)
        self.assertTrue(auth.startswith("Bearer "))

    def test_fortress_client_has_version_header(self):
        headers = bot.fortress_client.headers
        ver = headers.get("x-client-version") or headers.get("X-Client-Version")
        self.assertEqual(ver, "1.0.0")

    def test_fortress_url_default(self):
        self.assertEqual(bot.FORTRESS_URL, "https://api.fortress-optimizer.com")

    def test_logger_exists(self):
        self.assertIsNotNone(bot.logger)


if __name__ == "__main__":
    unittest.main()
