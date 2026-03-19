import unittest
from unittest.mock import patch, MagicMock, AsyncMock, PropertyMock
import sys
import json
import asyncio

from wrapper import FortressAnthropicClient, FortressAsyncAnthropicClient


class TestFortressAnthropicClient(unittest.TestCase):
    """Tests for Fortress Anthropic SDK Wrapper"""

    def setUp(self):
        """Setup test fixtures with mocked Anthropic client"""
        with patch("wrapper.Anthropic"):
            self.client = FortressAnthropicClient(
                api_key="sk-ant-test-key-12345",
                fortress_api_key="fort-test-key-67890",
                fortress_url="https://api.fortress-optimizer.com",
            )
        # Mock the HTTP client for fortress API calls
        self.client.http_client = MagicMock()

    def tearDown(self):
        """Cleanup after each test"""
        pass

    # ========== INITIALIZATION (15 tests) ==========

    def test_001_initialization_with_required_params(self):
        """Test basic initialization with required parameters"""
        with patch("wrapper.Anthropic") as mock_anthropic:
            client = FortressAnthropicClient(
                api_key="sk-ant-test",
                fortress_api_key="fort-test",
            )
            self.assertIsNotNone(client)
            mock_anthropic.assert_called_once_with(api_key="sk-ant-test")

    def test_002_initialization_stores_fortress_api_key(self):
        """Test that fortress API key is stored"""
        self.assertEqual(self.client.fortress_api_key, "fort-test-key-67890")

    def test_003_initialization_stores_fortress_url(self):
        """Test that fortress URL is stored"""
        self.assertEqual(self.client.fortress_url, "https://api.fortress-optimizer.com")

    def test_004_initialization_default_fortress_url(self):
        """Test default fortress URL"""
        with patch("wrapper.Anthropic"):
            client = FortressAnthropicClient(
                api_key="sk-ant-test",
                fortress_api_key="fort-test",
            )
            self.assertEqual(client.fortress_url, "https://api.fortress-optimizer.com")

    def test_005_initialization_custom_fortress_url(self):
        """Test initialization with custom fortress URL"""
        with patch("wrapper.Anthropic"):
            client = FortressAnthropicClient(
                api_key="sk-ant-test",
                fortress_api_key="fort-test",
                fortress_url="https://custom.fortress.io",
            )
            self.assertEqual(client.fortress_url, "https://custom.fortress.io")

    def test_006_initialization_creates_anthropic_client(self):
        """Test that Anthropic client is created"""
        self.assertIsNotNone(self.client.anthropic_client)

    def test_007_initialization_creates_http_client(self):
        """Test that HTTP client is created for fortress API"""
        self.assertIsNotNone(self.client.http_client)

    def test_008_anthropic_client_receives_api_key(self):
        """Test that Anthropic client receives the API key"""
        with patch("wrapper.Anthropic") as mock_anthropic:
            FortressAnthropicClient(
                api_key="sk-ant-key-abc",
                fortress_api_key="fort-key",
            )
            mock_anthropic.assert_called_once_with(api_key="sk-ant-key-abc")

    def test_009_has_messages_create_method(self):
        """Test that messages_create method exists"""
        self.assertTrue(hasattr(self.client, "messages_create"))
        self.assertTrue(callable(self.client.messages_create))

    def test_010_has_optimize_prompt_method(self):
        """Test that _optimize_prompt method exists"""
        self.assertTrue(hasattr(self.client, "_optimize_prompt"))
        self.assertTrue(callable(self.client._optimize_prompt))

    def test_011_has_close_method(self):
        """Test that close method exists"""
        self.assertTrue(hasattr(self.client, "close"))
        self.assertTrue(callable(self.client.close))

    def test_012_context_manager_enter(self):
        """Test context manager __enter__"""
        result = self.client.__enter__()
        self.assertIs(result, self.client)

    def test_013_context_manager_exit(self):
        """Test context manager __exit__ calls close"""
        self.client.http_client = MagicMock()
        self.client.__exit__(None, None, None)
        self.client.http_client.close.assert_called_once()

    def test_014_context_manager_usage(self):
        """Test using client as context manager"""
        with patch("wrapper.Anthropic"):
            with FortressAnthropicClient(
                api_key="sk-ant-test",
                fortress_api_key="fort-test",
            ) as client:
                self.assertIsNotNone(client)

    def test_015_getattr_proxies_to_anthropic(self):
        """Test that __getattr__ proxies to anthropic client"""
        mock_attr = MagicMock()
        self.client.anthropic_client = MagicMock()
        self.client.anthropic_client.some_method = mock_attr
        result = self.client.some_method
        self.assertIs(result, mock_attr)

    # ========== PROMPT OPTIMIZATION (15 tests) ==========

    def test_016_optimize_prompt_sends_request(self):
        """Test that _optimize_prompt sends HTTP request"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized text"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        result = self.client._optimize_prompt("test prompt")
        self.client.http_client.post.assert_called_once()

    def test_017_optimize_prompt_returns_optimized_text(self):
        """Test that _optimize_prompt returns optimized text on success"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "shorter prompt"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        result = self.client._optimize_prompt("a longer test prompt")
        self.assertEqual(result, "shorter prompt")

    def test_018_optimize_prompt_sends_correct_payload(self):
        """Test that _optimize_prompt sends correct JSON payload"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        self.client._optimize_prompt("test", "aggressive")
        call_args = self.client.http_client.post.call_args
        self.assertEqual(call_args[0][0], "/api/optimize")
        payload = call_args[1]["json"]
        self.assertEqual(payload["prompt"], "test")
        self.assertEqual(payload["level"], "aggressive")
        self.assertEqual(payload["provider"], "anthropic")

    def test_019_optimize_prompt_default_level_balanced(self):
        """Test that default optimization level is balanced"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        self.client._optimize_prompt("test")
        payload = self.client.http_client.post.call_args[1]["json"]
        self.assertEqual(payload["level"], "balanced")

    def test_020_optimize_prompt_conservative_level(self):
        """Test optimization with conservative level"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        self.client._optimize_prompt("test", "conservative")
        payload = self.client.http_client.post.call_args[1]["json"]
        self.assertEqual(payload["level"], "conservative")

    def test_021_optimize_prompt_aggressive_level(self):
        """Test optimization with aggressive level"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        self.client._optimize_prompt("test", "aggressive")
        payload = self.client.http_client.post.call_args[1]["json"]
        self.assertEqual(payload["level"], "aggressive")

    def test_022_optimize_prompt_returns_original_on_failure(self):
        """Test that _optimize_prompt returns original prompt on failure"""
        self.client.http_client.post.side_effect = Exception("Connection error")

        result = self.client._optimize_prompt("original prompt")
        self.assertEqual(result, "original prompt")

    def test_023_optimize_prompt_returns_original_on_non_success(self):
        """Test fallback when API returns non-success status"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"status": "error", "message": "failed"}
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        result = self.client._optimize_prompt("original prompt")
        self.assertEqual(result, "original prompt")

    def test_024_optimize_prompt_handles_http_error(self):
        """Test that HTTP errors are handled gracefully"""
        import httpx

        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception("HTTP 500")
        self.client.http_client.post.return_value = mock_response

        result = self.client._optimize_prompt("test prompt")
        self.assertEqual(result, "test prompt")

    def test_025_optimize_prompt_timeout(self):
        """Test that timeout is set on the request"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        self.client._optimize_prompt("test")
        call_args = self.client.http_client.post.call_args
        self.assertEqual(call_args[1]["timeout"], 10.0)

    def test_026_optimize_prompt_with_special_characters(self):
        """Test optimization with special characters in prompt"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized special"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        result = self.client._optimize_prompt("Test with emojis and special chars")
        self.assertEqual(result, "optimized special")

    def test_027_optimize_prompt_with_multiline(self):
        """Test optimization with multiline prompt"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized multiline"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        result = self.client._optimize_prompt("Line 1\nLine 2\nLine 3")
        self.assertEqual(result, "optimized multiline")

    def test_028_optimize_prompt_with_empty_string(self):
        """Test optimization with empty string"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": ""},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        result = self.client._optimize_prompt("")
        self.assertEqual(result, "")

    def test_029_optimize_prompt_with_long_text(self):
        """Test optimization with very long text"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "shorter"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_response

        long_text = "A" * 10000
        result = self.client._optimize_prompt(long_text)
        self.assertEqual(result, "shorter")

    def test_030_optimize_prompt_json_decode_error(self):
        """Test handling of JSON decode errors"""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.side_effect = json.JSONDecodeError("err", "", 0)
        self.client.http_client.post.return_value = mock_response

        result = self.client._optimize_prompt("test prompt")
        self.assertEqual(result, "test prompt")

    # ========== MESSAGES CREATE (20 tests) ==========

    def test_031_messages_create_without_optimization(self):
        """Test messages_create without optimization"""
        mock_response = MagicMock()
        self.client.anthropic_client.messages.create.return_value = mock_response

        result = self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Hello"}],
        )
        self.client.anthropic_client.messages.create.assert_called_once()
        self.assertIs(result, mock_response)

    def test_032_messages_create_passes_model(self):
        """Test that model is passed to Anthropic"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-sonnet-20240229",
            max_tokens=512,
            messages=[{"role": "user", "content": "Test"}],
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["model"], "claude-3-sonnet-20240229")

    def test_033_messages_create_passes_max_tokens(self):
        """Test that max_tokens is passed to Anthropic"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=2048,
            messages=[{"role": "user", "content": "Test"}],
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["max_tokens"], 2048)

    def test_034_messages_create_passes_messages(self):
        """Test that messages are passed to Anthropic"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()
        msgs = [{"role": "user", "content": "Hello"}]

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["messages"], msgs)

    def test_035_messages_create_passes_extra_kwargs(self):
        """Test that extra kwargs are forwarded to Anthropic"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Test"}],
            temperature=0.7,
            top_p=0.9,
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["temperature"], 0.7)
        self.assertEqual(call_kwargs["top_p"], 0.9)

    def test_036_messages_create_with_optimization_enabled(self):
        """Test messages_create with optimize=True"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized hello"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Hello world"}],
            optimize=True,
        )
        self.client.http_client.post.assert_called()

    def test_037_messages_create_optimization_modifies_content(self):
        """Test that optimization modifies message content"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized content"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        msgs = [{"role": "user", "content": "original content"}]
        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
            optimize=True,
        )
        # The message content should be modified in place
        self.assertEqual(msgs[0]["content"], "optimized content")

    def test_038_messages_create_optimization_only_user_messages(self):
        """Test that only user messages are optimized"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        msgs = [
            {"role": "user", "content": "user message"},
            {"role": "assistant", "content": "assistant message"},
        ]
        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
            optimize=True,
        )
        # Assistant message should not be modified
        self.assertEqual(msgs[1]["content"], "assistant message")

    def test_039_messages_create_no_optimization_by_default(self):
        """Test that optimization is disabled by default"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Hello"}],
        )
        # Fortress HTTP client should not be called
        self.client.http_client.post.assert_not_called()

    def test_040_messages_create_with_list_content(self):
        """Test optimization with list-format content blocks"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized text block"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        msgs = [
            {
                "role": "user",
                "content": [{"type": "text", "text": "original text block"}],
            }
        ]
        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
            optimize=True,
        )
        self.assertEqual(msgs[0]["content"][0]["text"], "optimized text block")

    def test_041_messages_create_with_mixed_content_blocks(self):
        """Test optimization skips non-text content blocks"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        msgs = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "some text"},
                    {"type": "image", "source": {"type": "base64", "data": "..."}},
                ],
            }
        ]
        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
            optimize=True,
        )
        # Image block should be untouched
        self.assertEqual(msgs[0]["content"][1]["type"], "image")

    def test_042_messages_create_empty_messages_list(self):
        """Test messages_create with empty messages list"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[],
            optimize=True,
        )
        # Should not crash, fortress API should not be called
        self.client.http_client.post.assert_not_called()

    def test_043_messages_create_optimization_level_balanced(self):
        """Test optimization with balanced level (default)"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "test"}],
            optimize=True,
        )
        payload = self.client.http_client.post.call_args[1]["json"]
        self.assertEqual(payload["level"], "balanced")

    def test_044_messages_create_optimization_level_aggressive(self):
        """Test optimization with aggressive level"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "test"}],
            optimize=True,
            optimization_level="aggressive",
        )
        payload = self.client.http_client.post.call_args[1]["json"]
        self.assertEqual(payload["level"], "aggressive")

    def test_045_messages_create_optimization_level_conservative(self):
        """Test optimization with conservative level"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "test"}],
            optimize=True,
            optimization_level="conservative",
        )
        payload = self.client.http_client.post.call_args[1]["json"]
        self.assertEqual(payload["level"], "conservative")

    def test_046_messages_create_multiple_user_messages(self):
        """Test that all user messages are optimized"""
        call_count = 0
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        msgs = [
            {"role": "user", "content": "first message"},
            {"role": "assistant", "content": "reply"},
            {"role": "user", "content": "second message"},
        ]
        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
            optimize=True,
        )
        # Should be called for each user message
        self.assertEqual(self.client.http_client.post.call_count, 2)

    def test_047_messages_create_returns_anthropic_response(self):
        """Test that messages_create returns the Anthropic response object"""
        expected = MagicMock()
        expected.content = [MagicMock(text="Hello!")]
        self.client.anthropic_client.messages.create.return_value = expected

        result = self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Hi"}],
        )
        self.assertIs(result, expected)

    def test_048_messages_create_with_system_kwarg(self):
        """Test passing system parameter through kwargs"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "Hi"}],
            system="You are a helpful assistant",
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["system"], "You are a helpful assistant")

    def test_049_messages_create_optimization_failure_still_calls_api(self):
        """Test that API is still called even if optimization fails"""
        self.client.http_client.post.side_effect = Exception("Fortress down")
        expected = MagicMock()
        self.client.anthropic_client.messages.create.return_value = expected

        result = self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "test"}],
            optimize=True,
        )
        self.client.anthropic_client.messages.create.assert_called_once()
        self.assertIs(result, expected)

    def test_050_messages_create_preserves_message_without_content(self):
        """Test messages without content key are left alone"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        msgs = [{"role": "user"}]
        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
            optimize=True,
        )
        # Should not crash
        self.client.http_client.post.assert_not_called()

    # ========== CLOSE & CLEANUP (5 tests) ==========

    def test_051_close_closes_http_client(self):
        """Test that close() closes the HTTP client"""
        mock_http = MagicMock()
        self.client.http_client = mock_http

        self.client.close()
        mock_http.close.assert_called_once()

    def test_052_context_manager_closes_on_exit(self):
        """Test that context manager closes on exit"""
        mock_http = MagicMock()
        self.client.http_client = mock_http

        with self.client:
            pass
        mock_http.close.assert_called_once()

    def test_053_close_idempotent(self):
        """Test that calling close multiple times does not error"""
        mock_http = MagicMock()
        self.client.http_client = mock_http

        self.client.close()
        self.client.close()
        self.assertEqual(mock_http.close.call_count, 2)

    def test_054_getattr_missing_attribute(self):
        """Test __getattr__ for missing attribute raises AttributeError"""
        self.client.anthropic_client = MagicMock(spec=[])
        with self.assertRaises(AttributeError):
            _ = self.client.nonexistent_attribute

    def test_055_class_docstring_present(self):
        """Test that class has documentation"""
        self.assertIsNotNone(FortressAnthropicClient.__doc__)
        self.assertIn("wrapper", FortressAnthropicClient.__doc__.lower())


class TestFortressAsyncAnthropicClient(unittest.TestCase):
    """Tests for async Fortress Anthropic SDK Wrapper"""

    def setUp(self):
        """Setup test fixtures with mocked AsyncAnthropic client"""
        with patch("wrapper.AsyncAnthropic"):
            self.client = FortressAsyncAnthropicClient(
                api_key="sk-ant-test-key-12345",
                fortress_api_key="fort-test-key-67890",
                fortress_url="https://api.fortress-optimizer.com",
            )
        self.client.http_client = MagicMock()

    # ========== ASYNC INITIALIZATION (10 tests) ==========

    def test_056_async_initialization(self):
        """Test async client initialization"""
        with patch("wrapper.AsyncAnthropic") as mock_async:
            client = FortressAsyncAnthropicClient(
                api_key="sk-ant-test",
                fortress_api_key="fort-test",
            )
            self.assertIsNotNone(client)
            mock_async.assert_called_once_with(api_key="sk-ant-test")

    def test_057_async_stores_fortress_api_key(self):
        """Test that async client stores fortress API key"""
        self.assertEqual(self.client.fortress_api_key, "fort-test-key-67890")

    def test_058_async_stores_fortress_url(self):
        """Test that async client stores fortress URL"""
        self.assertEqual(
            self.client.fortress_url, "https://api.fortress-optimizer.com"
        )

    def test_059_async_default_fortress_url(self):
        """Test default fortress URL for async client"""
        with patch("wrapper.AsyncAnthropic"):
            client = FortressAsyncAnthropicClient(
                api_key="sk-ant-test",
                fortress_api_key="fort-test",
            )
            self.assertEqual(
                client.fortress_url, "https://api.fortress-optimizer.com"
            )

    def test_060_async_has_messages_create(self):
        """Test that async client has messages_create method"""
        self.assertTrue(hasattr(self.client, "messages_create"))

    def test_061_async_has_optimize_prompt(self):
        """Test that async client has _optimize_prompt method"""
        self.assertTrue(hasattr(self.client, "_optimize_prompt"))

    def test_062_async_has_close(self):
        """Test that async client has close method"""
        self.assertTrue(hasattr(self.client, "close"))

    def test_063_async_docstring_present(self):
        """Test that async class has documentation"""
        self.assertIsNotNone(FortressAsyncAnthropicClient.__doc__)

    def test_064_async_creates_anthropic_client(self):
        """Test that async Anthropic client is created"""
        self.assertIsNotNone(self.client.anthropic_client)

    def test_065_async_creates_http_client(self):
        """Test that async HTTP client is created"""
        self.assertIsNotNone(self.client.http_client)

    # ========== ASYNC PROMPT OPTIMIZATION (10 tests) ==========

    def test_066_async_optimize_prompt(self):
        """Test async _optimize_prompt"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "async optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        result = asyncio.run(self.client._optimize_prompt("test"))
        self.assertEqual(result, "async optimized")

    def test_067_async_optimize_prompt_failure_fallback(self):
        """Test async fallback on failure"""
        self.client.http_client.post = AsyncMock(
            side_effect=Exception("Connection error")
        )

        result = asyncio.run(self.client._optimize_prompt("original"))
        self.assertEqual(result, "original")

    def test_068_async_optimize_prompt_sends_payload(self):
        """Test async sends correct payload"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        asyncio.run(self.client._optimize_prompt("test", "aggressive"))
        call_kwargs = self.client.http_client.post.call_args[1]
        self.assertEqual(call_kwargs["json"]["level"], "aggressive")
        self.assertEqual(call_kwargs["json"]["provider"], "anthropic")

    def test_069_async_optimize_prompt_non_success_status(self):
        """Test async returns original on non-success status"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"status": "error"}
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        result = asyncio.run(self.client._optimize_prompt("original"))
        self.assertEqual(result, "original")

    def test_070_async_optimize_prompt_default_balanced(self):
        """Test async default optimization level is balanced"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        asyncio.run(self.client._optimize_prompt("test"))
        call_kwargs = self.client.http_client.post.call_args[1]
        self.assertEqual(call_kwargs["json"]["level"], "balanced")

    def test_071_async_optimize_prompt_timeout_set(self):
        """Test async request has timeout"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        asyncio.run(self.client._optimize_prompt("test"))
        call_kwargs = self.client.http_client.post.call_args[1]
        self.assertEqual(call_kwargs["timeout"], 10.0)

    def test_072_async_optimize_prompt_conservative(self):
        """Test async with conservative level"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        asyncio.run(self.client._optimize_prompt("test", "conservative"))
        call_kwargs = self.client.http_client.post.call_args[1]
        self.assertEqual(call_kwargs["json"]["level"], "conservative")

    def test_073_async_optimize_json_error(self):
        """Test async handles JSON decode error"""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.side_effect = json.JSONDecodeError("err", "", 0)
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        result = asyncio.run(self.client._optimize_prompt("original"))
        self.assertEqual(result, "original")

    def test_074_async_optimize_http_error(self):
        """Test async handles HTTP errors"""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception("HTTP 500")
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        result = asyncio.run(self.client._optimize_prompt("original"))
        self.assertEqual(result, "original")

    def test_075_async_optimize_long_text(self):
        """Test async optimization with long text"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "shorter"},
        }
        mock_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_response)

        result = asyncio.run(self.client._optimize_prompt("A" * 10000))
        self.assertEqual(result, "shorter")

    # ========== ASYNC MESSAGES CREATE (15 tests) ==========

    def test_076_async_messages_create_no_optimization(self):
        """Test async messages_create without optimization"""
        expected = MagicMock()
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=expected
        )

        result = asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=[{"role": "user", "content": "Hello"}],
            )
        )
        self.assertIs(result, expected)

    def test_077_async_messages_create_with_optimization(self):
        """Test async messages_create with optimization"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_opt_response)
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=MagicMock()
        )

        msgs = [{"role": "user", "content": "original"}]
        asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=msgs,
                optimize=True,
            )
        )
        self.assertEqual(msgs[0]["content"], "optimized")

    def test_078_async_messages_create_optimization_default_off(self):
        """Test async optimization is off by default"""
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=MagicMock()
        )

        asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=[{"role": "user", "content": "test"}],
            )
        )
        self.client.http_client.post.assert_not_called()

    def test_079_async_messages_create_passes_kwargs(self):
        """Test async passes extra kwargs"""
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=MagicMock()
        )

        asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=[{"role": "user", "content": "test"}],
                temperature=0.5,
            )
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["temperature"], 0.5)

    def test_080_async_messages_create_list_content(self):
        """Test async optimization with list content format"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized block"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_opt_response)
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=MagicMock()
        )

        msgs = [
            {
                "role": "user",
                "content": [{"type": "text", "text": "original block"}],
            }
        ]
        asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=msgs,
                optimize=True,
            )
        )
        self.assertEqual(msgs[0]["content"][0]["text"], "optimized block")

    def test_081_async_messages_create_empty_messages(self):
        """Test async with empty messages list"""
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=MagicMock()
        )

        asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=[],
                optimize=True,
            )
        )
        # Should not crash

    def test_082_async_messages_create_optimization_failure_fallback(self):
        """Test async still calls API when optimization fails"""
        self.client.http_client.post = AsyncMock(
            side_effect=Exception("Fortress down")
        )
        expected = MagicMock()
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=expected
        )

        result = asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=[{"role": "user", "content": "test"}],
                optimize=True,
            )
        )
        self.assertIs(result, expected)

    def test_083_async_messages_create_only_optimizes_user(self):
        """Test async only optimizes user role messages"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_opt_response)
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=MagicMock()
        )

        msgs = [
            {"role": "user", "content": "user msg"},
            {"role": "assistant", "content": "assistant msg"},
        ]
        asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=msgs,
                optimize=True,
            )
        )
        self.assertEqual(msgs[1]["content"], "assistant msg")

    def test_084_async_messages_create_aggressive_level(self):
        """Test async with aggressive optimization level"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post = AsyncMock(return_value=mock_opt_response)
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=MagicMock()
        )

        asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=[{"role": "user", "content": "test"}],
                optimize=True,
                optimization_level="aggressive",
            )
        )
        call_kwargs = self.client.http_client.post.call_args[1]
        self.assertEqual(call_kwargs["json"]["level"], "aggressive")

    def test_085_async_messages_create_returns_response(self):
        """Test async returns the Anthropic response"""
        expected = MagicMock()
        self.client.anthropic_client.messages.create = AsyncMock(
            return_value=expected
        )

        result = asyncio.run(
            self.client.messages_create(
                model="claude-3-opus-20240229",
                max_tokens=1024,
                messages=[{"role": "user", "content": "test"}],
            )
        )
        self.assertIs(result, expected)

    # ========== ASYNC CLOSE & CONTEXT MANAGER (5 tests) ==========

    def test_086_async_close(self):
        """Test async close calls aclose on HTTP client"""
        self.client.http_client = MagicMock()
        self.client.http_client.aclose = AsyncMock()

        asyncio.run(self.client.close())
        self.client.http_client.aclose.assert_called_once()

    def test_087_async_context_manager_enter(self):
        """Test async context manager __aenter__"""
        result = asyncio.run(self.client.__aenter__())
        self.assertIs(result, self.client)

    def test_088_async_context_manager_exit(self):
        """Test async context manager __aexit__"""
        self.client.http_client = MagicMock()
        self.client.http_client.aclose = AsyncMock()

        asyncio.run(self.client.__aexit__(None, None, None))
        self.client.http_client.aclose.assert_called_once()

    def test_089_async_has_aenter(self):
        """Test async client has __aenter__"""
        self.assertTrue(hasattr(self.client, "__aenter__"))

    def test_090_async_has_aexit(self):
        """Test async client has __aexit__"""
        self.assertTrue(hasattr(self.client, "__aexit__"))

    # ========== EDGE CASES & INTEGRATION (10 tests) ==========

    def test_091_sync_client_different_models(self):
        """Test sync client with different Claude models"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        for model in [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
        ]:
            self.client.messages_create(
                model=model,
                max_tokens=1024,
                messages=[{"role": "user", "content": "test"}],
            )

    def test_092_sync_optimization_with_code_blocks(self):
        """Test optimization preserves code blocks"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized code request"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": "```python\nprint('hello')\n```",
                }
            ],
            optimize=True,
        )
        self.client.http_client.post.assert_called_once()

    def test_093_sync_client_with_temperature_zero(self):
        """Test sync client with temperature 0"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "test"}],
            temperature=0.0,
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["temperature"], 0.0)

    def test_094_sync_client_with_max_tokens_small(self):
        """Test sync client with small max_tokens"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1,
            messages=[{"role": "user", "content": "test"}],
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertEqual(call_kwargs["max_tokens"], 1)

    def test_095_sync_message_without_role(self):
        """Test handling of message dict without role key"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        msgs = [{"content": "no role here"}]
        # Should not crash even with malformed message
        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
            optimize=True,
        )

    def test_096_sync_multiple_text_blocks_in_content(self):
        """Test optimization of multiple text blocks in content list"""
        mock_opt_response = MagicMock()
        mock_opt_response.json.return_value = {
            "status": "success",
            "optimization": {"optimized_prompt": "optimized"},
        }
        mock_opt_response.raise_for_status = MagicMock()
        self.client.http_client.post.return_value = mock_opt_response
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        msgs = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "block 1"},
                    {"type": "text", "text": "block 2"},
                ],
            }
        ]
        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=msgs,
            optimize=True,
        )
        # Both text blocks should be optimized
        self.assertEqual(self.client.http_client.post.call_count, 2)

    def test_097_sync_optimization_does_not_strip_optimize_kwarg(self):
        """Test that optimize kwarg is not passed to Anthropic API"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "test"}],
            optimize=False,
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertNotIn("optimize", call_kwargs)
        self.assertNotIn("optimization_level", call_kwargs)

    def test_098_sync_client_with_stream_kwarg(self):
        """Test passing stream parameter"""
        self.client.anthropic_client.messages.create.return_value = MagicMock()

        self.client.messages_create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[{"role": "user", "content": "test"}],
            stream=True,
        )
        call_kwargs = self.client.anthropic_client.messages.create.call_args[1]
        self.assertTrue(call_kwargs["stream"])

    def test_099_both_clients_share_same_interface(self):
        """Test that sync and async clients have the same core methods"""
        sync_methods = {"messages_create", "_optimize_prompt", "close"}
        for method in sync_methods:
            self.assertTrue(
                hasattr(FortressAnthropicClient, method),
                f"Sync client missing {method}",
            )
            self.assertTrue(
                hasattr(FortressAsyncAnthropicClient, method),
                f"Async client missing {method}",
            )

    def test_100_wrapper_module_exports_both_clients(self):
        """Test that wrapper module exports both client classes"""
        import wrapper

        self.assertTrue(hasattr(wrapper, "FortressAnthropicClient"))
        self.assertTrue(hasattr(wrapper, "FortressAsyncAnthropicClient"))


if __name__ == "__main__":
    unittest.main()
