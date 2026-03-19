import unittest
import json
from unittest.mock import MagicMock, patch, PropertyMock

# Mock sublime and sublime_plugin modules before importing fortress
import sys

mock_sublime = MagicMock()
mock_sublime_plugin = MagicMock()
sys.modules['sublime'] = mock_sublime
sys.modules['sublime_plugin'] = mock_sublime_plugin

# Make TextCommand and EventListener base classes that don't require args
mock_sublime_plugin.TextCommand = type('TextCommand', (), {'__init__': lambda self, view=None: setattr(self, 'view', view)})
mock_sublime_plugin.EventListener = type('EventListener', (), {})

from fortress import FortressOptimizeCommand, FortressOptimizeLineCommand, FortressUsageCommand, FortressStatusBar


def make_mock_view(text="", selection_empty=False):
    """Create a mock Sublime Text view object."""
    view = MagicMock()
    region = MagicMock()
    region.empty.return_value = selection_empty
    view.sel.return_value = [region]
    view.substr.return_value = text
    view.line.return_value = region
    return view


def make_mock_settings(api_key="test-key-12345", level="balanced"):
    """Create a mock settings object."""
    store = {"api_key": api_key, "optimization_level": level}
    settings = MagicMock()
    settings.get.side_effect = lambda k, default=None: store.get(k, default)
    return settings


def make_success_response(original="Test prompt", optimized="Optimized prompt",
                          original_tokens=50, optimized_tokens=30, technique="compression"):
    """Build a successful API response dict."""
    return {
        "status": "success",
        "optimization": {
            "optimized_prompt": optimized,
            "technique": technique,
        },
        "tokens": {
            "original": original_tokens,
            "optimized": optimized_tokens,
            "savings": original_tokens - optimized_tokens,
            "savings_percentage": ((original_tokens - optimized_tokens) / original_tokens) * 100,
        },
    }


def make_usage_response(used=1500, limit=50000):
    """Build a usage API response dict."""
    return {
        "tokens_used_this_month": used,
        "tokens_limit": limit,
        "tokens_remaining": limit - used,
        "percentage_used": (used / limit) * 100,
        "reset_date": "2026-04-01",
    }


class TestFortressOptimizeCommand(unittest.TestCase):
    """Tests for FortressOptimizeCommand."""

    def setUp(self):
        self.view = make_mock_view(text="Test prompt to optimize")
        self.cmd = FortressOptimizeCommand(self.view)
        self.settings = make_mock_settings()

    # ========== INITIALIZATION (10 tests) ==========
    def test_001_command_instantiation(self):
        self.assertIsNotNone(self.cmd)

    def test_002_command_has_view(self):
        self.assertEqual(self.cmd.view, self.view)

    def test_003_run_method_exists(self):
        self.assertTrue(callable(getattr(self.cmd, 'run', None)))

    def test_004_optimize_text_method_exists(self):
        self.assertTrue(callable(getattr(self.cmd, 'optimize_text', None)))

    def test_005_show_result_method_exists(self):
        self.assertTrue(callable(getattr(self.cmd, 'show_result', None)))

    def test_006_is_text_command(self):
        self.assertIsInstance(self.cmd, mock_sublime_plugin.TextCommand)

    def test_007_optimize_line_command_instantiation(self):
        cmd = FortressOptimizeLineCommand(self.view)
        self.assertIsNotNone(cmd)

    def test_008_usage_command_instantiation(self):
        cmd = FortressUsageCommand(self.view)
        self.assertIsNotNone(cmd)

    def test_009_status_bar_instantiation(self):
        listener = FortressStatusBar()
        self.assertIsNotNone(listener)

    def test_010_status_bar_has_on_modified(self):
        listener = FortressStatusBar()
        self.assertTrue(callable(getattr(listener, 'on_modified', None)))

    # ========== OPTIMIZE COMMAND - run() (10 tests) ==========
    @patch('fortress.sublime')
    def test_011_run_loads_settings(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        mock_sub.load_settings.assert_called_with("Fortress.sublime-settings")

    @patch('fortress.sublime')
    def test_012_run_reads_api_key(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        self.settings.get.assert_any_call("api_key")

    @patch('fortress.sublime')
    def test_013_run_reads_optimization_level(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        self.settings.get.assert_any_call("optimization_level", "balanced")

    @patch('fortress.sublime')
    def test_014_run_empty_selection_shows_dialog(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        self.view = make_mock_view(text="", selection_empty=True)
        self.cmd = FortressOptimizeCommand(self.view)
        edit = MagicMock()
        self.cmd.run(edit)
        mock_sub.message_dialog.assert_called_with("No text selected")

    @patch('fortress.sublime')
    def test_015_run_calls_optimize_text(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        self.cmd.optimize_text.assert_called_once()

    @patch('fortress.sublime')
    def test_016_run_passes_selected_text(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        self.view.substr.return_value = "selected text"
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        args = self.cmd.optimize_text.call_args[0]
        self.assertEqual(args[0], "selected text")

    @patch('fortress.sublime')
    def test_017_run_passes_api_key(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        args = self.cmd.optimize_text.call_args[0]
        self.assertEqual(args[1], "test-key-12345")

    @patch('fortress.sublime')
    def test_018_run_passes_level(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        args = self.cmd.optimize_text.call_args[0]
        self.assertEqual(args[2], "balanced")

    @patch('fortress.sublime')
    def test_019_run_with_custom_level(self, mock_sub):
        settings = make_mock_settings(level="aggressive")
        mock_sub.load_settings.return_value = settings
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        args = self.cmd.optimize_text.call_args[0]
        self.assertEqual(args[2], "aggressive")

    @patch('fortress.sublime')
    def test_020_run_gets_first_selection_region(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        self.cmd.optimize_text = MagicMock()
        self.cmd.run(edit)
        self.view.sel.assert_called()

    # ========== OPTIMIZE COMMAND - optimize_text() (10 tests) ==========
    @patch('fortress.urlopen')
    def test_021_optimize_text_builds_request(self, mock_urlopen):
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_success_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text("Test", "key", "balanced")
        mock_urlopen.assert_called_once()

    @patch('fortress.urlopen')
    def test_022_optimize_text_sends_json_payload(self, mock_urlopen):
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_success_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text("Test", "key", "balanced")
        req = mock_urlopen.call_args[0][0]
        payload = json.loads(req.data.decode())
        self.assertEqual(payload["prompt"], "Test")

    @patch('fortress.urlopen')
    def test_023_optimize_text_sends_level(self, mock_urlopen):
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_success_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text("Test", "key", "aggressive")
        req = mock_urlopen.call_args[0][0]
        payload = json.loads(req.data.decode())
        self.assertEqual(payload["level"], "aggressive")

    @patch('fortress.urlopen')
    def test_024_optimize_text_sends_auth_header(self, mock_urlopen):
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_success_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text("Test", "my-api-key", "balanced")
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.get_header("Authorization"), "Bearer my-api-key")

    @patch('fortress.urlopen')
    def test_025_optimize_text_sends_content_type(self, mock_urlopen):
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_success_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text("Test", "key", "balanced")
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.get_header("Content-type"), "application/json")

    @patch('fortress.urlopen')
    def test_026_optimize_text_calls_show_result_on_success(self, mock_urlopen):
        data = make_success_response()
        resp = MagicMock()
        resp.read.return_value = json.dumps(data).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text("Test", "key", "balanced")
        self.cmd.show_result.assert_called_once_with(data)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_027_optimize_text_shows_error_on_failure(self, mock_urlopen, mock_sub):
        data = {"status": "error", "error": "Rate limit exceeded"}
        resp = MagicMock()
        resp.read.return_value = json.dumps(data).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.optimize_text("Test", "key", "balanced")
        mock_sub.error_message.assert_called()

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_028_optimize_text_handles_network_error(self, mock_urlopen, mock_sub):
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("Connection refused")
        self.cmd.optimize_text("Test", "key", "balanced")
        mock_sub.error_message.assert_called()

    @patch('fortress.urlopen')
    def test_029_optimize_text_uses_correct_url(self, mock_urlopen):
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_success_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text("Test", "key", "balanced")
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.full_url, "https://api.fortress-optimizer.com/api/optimize")

    @patch('fortress.urlopen')
    def test_030_optimize_text_sets_timeout(self, mock_urlopen):
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_success_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text("Test", "key", "balanced")
        self.assertEqual(mock_urlopen.call_args[1].get("timeout"), 10)

    # ========== OPTIMIZE COMMAND - show_result() (10 tests) ==========
    @patch('fortress.sublime')
    def test_031_show_result_displays_dialog(self, mock_sub):
        data = make_success_response()
        self.cmd.show_result(data)
        mock_sub.message_dialog.assert_called_once()

    @patch('fortress.sublime')
    def test_032_show_result_contains_optimized_text(self, mock_sub):
        data = make_success_response(optimized="Better prompt")
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("Better prompt", msg)

    @patch('fortress.sublime')
    def test_033_show_result_contains_original_tokens(self, mock_sub):
        data = make_success_response(original_tokens=100)
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("100", msg)

    @patch('fortress.sublime')
    def test_034_show_result_contains_optimized_tokens(self, mock_sub):
        data = make_success_response(optimized_tokens=60)
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("60", msg)

    @patch('fortress.sublime')
    def test_035_show_result_contains_savings(self, mock_sub):
        data = make_success_response(original_tokens=100, optimized_tokens=60)
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("40", msg)

    @patch('fortress.sublime')
    def test_036_show_result_contains_savings_percentage(self, mock_sub):
        data = make_success_response(original_tokens=100, optimized_tokens=60)
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("40.0%", msg)

    @patch('fortress.sublime')
    def test_037_show_result_contains_technique(self, mock_sub):
        data = make_success_response(technique="semantic_compression")
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("semantic_compression", msg)

    @patch('fortress.sublime')
    def test_038_show_result_contains_header(self, mock_sub):
        data = make_success_response()
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("Fortress Token Optimizer Result", msg)

    @patch('fortress.sublime')
    def test_039_show_result_contains_statistics_label(self, mock_sub):
        data = make_success_response()
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("Statistics", msg)

    @patch('fortress.sublime')
    def test_040_show_result_contains_optimized_label(self, mock_sub):
        data = make_success_response()
        self.cmd.show_result(data)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("Optimized Text", msg)


class TestFortressOptimizeLineCommand(unittest.TestCase):
    """Tests for FortressOptimizeLineCommand."""

    def setUp(self):
        self.view = make_mock_view(text="Current line text")
        self.cmd = FortressOptimizeLineCommand(self.view)
        self.settings = make_mock_settings()

    @patch('fortress.FortressOptimizeCommand')
    @patch('fortress.sublime')
    def test_041_run_loads_settings(self, mock_sub, mock_opt_cls):
        mock_sub.load_settings.return_value = self.settings
        mock_opt_cls.return_value = MagicMock()
        edit = MagicMock()
        self.cmd.run(edit)
        mock_sub.load_settings.assert_called_with("Fortress.sublime-settings")

    @patch('fortress.sublime')
    def test_042_run_gets_current_line(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        with patch.object(FortressOptimizeCommand, 'optimize_text'):
            self.cmd.run(edit)
        self.view.line.assert_called()

    @patch('fortress.sublime')
    def test_043_run_reads_line_text(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        with patch.object(FortressOptimizeCommand, 'optimize_text'):
            self.cmd.run(edit)
        self.view.substr.assert_called()

    def test_044_command_has_view(self):
        self.assertEqual(self.cmd.view, self.view)

    def test_045_run_method_exists(self):
        self.assertTrue(callable(getattr(self.cmd, 'run', None)))

    @patch('fortress.sublime')
    def test_046_run_reads_api_key(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        with patch.object(FortressOptimizeCommand, 'optimize_text'):
            self.cmd.run(edit)
        self.settings.get.assert_any_call("api_key")

    @patch('fortress.sublime')
    def test_047_run_reads_level(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        edit = MagicMock()
        with patch.object(FortressOptimizeCommand, 'optimize_text'):
            self.cmd.run(edit)
        self.settings.get.assert_any_call("optimization_level", "balanced")

    def test_048_is_text_command(self):
        self.assertIsInstance(self.cmd, mock_sublime_plugin.TextCommand)

    def test_049_line_command_separate_from_optimize(self):
        self.assertIsNot(type(self.cmd), FortressOptimizeCommand)

    def test_050_line_command_class_name(self):
        self.assertEqual(type(self.cmd).__name__, "FortressOptimizeLineCommand")


class TestFortressUsageCommand(unittest.TestCase):
    """Tests for FortressUsageCommand."""

    def setUp(self):
        self.view = make_mock_view()
        self.cmd = FortressUsageCommand(self.view)
        self.settings = make_mock_settings()

    @patch('fortress.sublime')
    def test_051_run_loads_settings(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        with patch('fortress.urlopen') as mock_urlopen:
            resp = MagicMock()
            resp.read.return_value = json.dumps(make_usage_response()).encode()
            resp.__enter__ = MagicMock(return_value=resp)
            resp.__exit__ = MagicMock(return_value=False)
            mock_urlopen.return_value = resp
            edit = MagicMock()
            self.cmd.run(edit)
        mock_sub.load_settings.assert_called_with("Fortress.sublime-settings")

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_052_run_calls_usage_endpoint(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_usage_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        edit = MagicMock()
        self.cmd.run(edit)
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.full_url, "https://api.fortress-optimizer.com/api/usage")

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_053_run_sends_auth_header(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_usage_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        edit = MagicMock()
        self.cmd.run(edit)
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.get_header("Authorization"), "Bearer test-key-12345")

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_054_run_displays_usage_dialog(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_usage_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        edit = MagicMock()
        self.cmd.run(edit)
        mock_sub.message_dialog.assert_called_once()

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_055_run_shows_tokens_used(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_usage_response(used=2500)).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        edit = MagicMock()
        self.cmd.run(edit)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("2,500", msg)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_056_run_shows_token_limit(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_usage_response(limit=100000)).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        edit = MagicMock()
        self.cmd.run(edit)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("100,000", msg)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_057_run_shows_remaining(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_usage_response(used=1000, limit=50000)).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        edit = MagicMock()
        self.cmd.run(edit)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("49,000", msg)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_058_run_shows_percentage(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_usage_response(used=5000, limit=50000)).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        edit = MagicMock()
        self.cmd.run(edit)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("10.0%", msg)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_059_run_shows_reset_date(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_usage_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        edit = MagicMock()
        self.cmd.run(edit)
        msg = mock_sub.message_dialog.call_args[0][0]
        self.assertIn("2026-04-01", msg)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_060_run_handles_network_error(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("Connection refused")
        edit = MagicMock()
        self.cmd.run(edit)
        mock_sub.error_message.assert_called()


class TestFortressStatusBar(unittest.TestCase):
    """Tests for FortressStatusBar EventListener."""

    def setUp(self):
        self.listener = FortressStatusBar()
        self.view = make_mock_view()
        self.settings = make_mock_settings()

    @patch('fortress.sublime')
    def test_061_on_modified_loads_settings(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        self.listener.on_modified(self.view)
        mock_sub.load_settings.assert_called_with("Fortress.sublime-settings")

    @patch('fortress.sublime')
    def test_062_on_modified_sets_status(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        self.listener.on_modified(self.view)
        self.view.set_status.assert_called()

    @patch('fortress.sublime')
    def test_063_on_modified_status_key_is_fortress(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        self.listener.on_modified(self.view)
        key = self.view.set_status.call_args[0][0]
        self.assertEqual(key, "fortress")

    @patch('fortress.sublime')
    def test_064_on_modified_status_contains_level(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        self.listener.on_modified(self.view)
        value = self.view.set_status.call_args[0][1]
        self.assertIn("balanced", value)

    @patch('fortress.sublime')
    def test_065_on_modified_status_prefix(self, mock_sub):
        mock_sub.load_settings.return_value = self.settings
        self.listener.on_modified(self.view)
        value = self.view.set_status.call_args[0][1]
        self.assertIn("Fortress:", value)

    @patch('fortress.sublime')
    def test_066_on_modified_aggressive_level(self, mock_sub):
        settings = make_mock_settings(level="aggressive")
        mock_sub.load_settings.return_value = settings
        self.listener.on_modified(self.view)
        value = self.view.set_status.call_args[0][1]
        self.assertIn("aggressive", value)

    @patch('fortress.sublime')
    def test_067_on_modified_conservative_level(self, mock_sub):
        settings = make_mock_settings(level="conservative")
        mock_sub.load_settings.return_value = settings
        self.listener.on_modified(self.view)
        value = self.view.set_status.call_args[0][1]
        self.assertIn("conservative", value)

    @patch('fortress.sublime')
    def test_068_on_modified_default_level(self, mock_sub):
        store = {"api_key": "key"}
        settings = MagicMock()
        settings.get.side_effect = lambda k, default=None: store.get(k, default)
        mock_sub.load_settings.return_value = settings
        self.listener.on_modified(self.view)
        value = self.view.set_status.call_args[0][1]
        self.assertIn("balanced", value)

    def test_069_is_event_listener(self):
        self.assertIsInstance(self.listener, mock_sublime_plugin.EventListener)

    def test_070_on_modified_callable(self):
        self.assertTrue(callable(self.listener.on_modified))


class TestOptimizeTextPayload(unittest.TestCase):
    """Tests for the API payload structure in optimize_text."""

    def setUp(self):
        self.view = make_mock_view()
        self.cmd = FortressOptimizeCommand(self.view)

    def _run_optimize(self, mock_urlopen, text="Test", key="key", level="balanced"):
        resp = MagicMock()
        resp.read.return_value = json.dumps(make_success_response()).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.cmd.show_result = MagicMock()
        self.cmd.optimize_text(text, key, level)
        return mock_urlopen.call_args[0][0]

    @patch('fortress.urlopen')
    def test_071_payload_has_prompt(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen, text="My prompt")
        payload = json.loads(req.data.decode())
        self.assertIn("prompt", payload)

    @patch('fortress.urlopen')
    def test_072_payload_has_level(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen)
        payload = json.loads(req.data.decode())
        self.assertIn("level", payload)

    @patch('fortress.urlopen')
    def test_073_payload_has_provider(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen)
        payload = json.loads(req.data.decode())
        self.assertIn("provider", payload)

    @patch('fortress.urlopen')
    def test_074_provider_is_general(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen)
        payload = json.loads(req.data.decode())
        self.assertEqual(payload["provider"], "general")

    @patch('fortress.urlopen')
    def test_075_payload_is_utf8(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen, text="Unicode test")
        self.assertIsInstance(req.data, bytes)

    @patch('fortress.urlopen')
    def test_076_payload_unicode_chars(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen, text="Caf\u00e9 r\u00e9sum\u00e9")
        payload = json.loads(req.data.decode())
        self.assertEqual(payload["prompt"], "Caf\u00e9 r\u00e9sum\u00e9")

    @patch('fortress.urlopen')
    def test_077_payload_multiline(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen, text="Line 1\nLine 2")
        payload = json.loads(req.data.decode())
        self.assertIn("\n", payload["prompt"])

    @patch('fortress.urlopen')
    def test_078_payload_empty_string_sent(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen, text="")
        payload = json.loads(req.data.decode())
        self.assertEqual(payload["prompt"], "")

    @patch('fortress.urlopen')
    def test_079_payload_long_text(self, mock_urlopen):
        long_text = "A" * 10000
        req = self._run_optimize(mock_urlopen, text=long_text)
        payload = json.loads(req.data.decode())
        self.assertEqual(len(payload["prompt"]), 10000)

    @patch('fortress.urlopen')
    def test_080_payload_special_json_chars(self, mock_urlopen):
        req = self._run_optimize(mock_urlopen, text='He said "hello" & \'bye\'')
        payload = json.loads(req.data.decode())
        self.assertIn('"hello"', payload["prompt"])


class TestErrorScenarios(unittest.TestCase):
    """Tests for error handling paths."""

    def setUp(self):
        self.view = make_mock_view()
        self.opt_cmd = FortressOptimizeCommand(self.view)
        self.usage_cmd = FortressUsageCommand(self.view)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_081_optimize_error_status(self, mock_urlopen, mock_sub):
        data = {"status": "error", "error": "Server error"}
        resp = MagicMock()
        resp.read.return_value = json.dumps(data).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.opt_cmd.optimize_text("Test", "key", "balanced")
        mock_sub.error_message.assert_called()

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_082_optimize_error_includes_message(self, mock_urlopen, mock_sub):
        data = {"status": "error", "error": "Rate limit exceeded"}
        resp = MagicMock()
        resp.read.return_value = json.dumps(data).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.opt_cmd.optimize_text("Test", "key", "balanced")
        msg = mock_sub.error_message.call_args[0][0]
        self.assertIn("Rate limit exceeded", msg)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_083_optimize_unknown_error(self, mock_urlopen, mock_sub):
        data = {"status": "error"}
        resp = MagicMock()
        resp.read.return_value = json.dumps(data).encode()
        resp.__enter__ = MagicMock(return_value=resp)
        resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = resp
        self.opt_cmd.optimize_text("Test", "key", "balanced")
        msg = mock_sub.error_message.call_args[0][0]
        self.assertIn("Unknown", msg)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_084_optimize_network_error_message(self, mock_urlopen, mock_sub):
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("Timeout")
        self.opt_cmd.optimize_text("Test", "key", "balanced")
        msg = mock_sub.error_message.call_args[0][0]
        self.assertIn("Network error", msg)

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_085_usage_network_error(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = make_mock_settings()
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("DNS failure")
        edit = MagicMock()
        self.usage_cmd.run(edit)
        mock_sub.error_message.assert_called()

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_086_usage_network_error_message(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = make_mock_settings()
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("DNS failure")
        edit = MagicMock()
        self.usage_cmd.run(edit)
        msg = mock_sub.error_message.call_args[0][0]
        self.assertIn("Network error", msg)

    @patch('fortress.sublime')
    def test_087_empty_selection_handled(self, mock_sub):
        view = make_mock_view(selection_empty=True)
        cmd = FortressOptimizeCommand(view)
        mock_sub.load_settings.return_value = make_mock_settings()
        edit = MagicMock()
        cmd.run(edit)
        mock_sub.message_dialog.assert_called_with("No text selected")

    @patch('fortress.sublime')
    def test_088_empty_selection_no_api_call(self, mock_sub):
        view = make_mock_view(selection_empty=True)
        cmd = FortressOptimizeCommand(view)
        mock_sub.load_settings.return_value = make_mock_settings()
        cmd.optimize_text = MagicMock()
        edit = MagicMock()
        cmd.run(edit)
        cmd.optimize_text.assert_not_called()

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_089_optimize_does_not_crash_on_error(self, mock_urlopen, mock_sub):
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("fail")
        try:
            self.opt_cmd.optimize_text("Test", "key", "balanced")
        except Exception:
            self.fail("optimize_text raised an exception instead of handling it")

    @patch('fortress.sublime')
    @patch('fortress.urlopen')
    def test_090_usage_does_not_crash_on_error(self, mock_urlopen, mock_sub):
        mock_sub.load_settings.return_value = make_mock_settings()
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("fail")
        edit = MagicMock()
        try:
            self.usage_cmd.run(edit)
        except Exception:
            self.fail("usage run() raised an exception instead of handling it")


class TestClassStructure(unittest.TestCase):
    """Tests verifying class structure and naming conventions."""

    def test_091_optimize_command_name(self):
        self.assertEqual(FortressOptimizeCommand.__name__, "FortressOptimizeCommand")

    def test_092_optimize_line_command_name(self):
        self.assertEqual(FortressOptimizeLineCommand.__name__, "FortressOptimizeLineCommand")

    def test_093_usage_command_name(self):
        self.assertEqual(FortressUsageCommand.__name__, "FortressUsageCommand")

    def test_094_status_bar_name(self):
        self.assertEqual(FortressStatusBar.__name__, "FortressStatusBar")

    def test_095_optimize_command_docstring(self):
        self.assertIsNotNone(FortressOptimizeCommand.__doc__)

    def test_096_optimize_line_command_docstring(self):
        self.assertIsNotNone(FortressOptimizeLineCommand.__doc__)

    def test_097_usage_command_docstring(self):
        self.assertIsNotNone(FortressUsageCommand.__doc__)

    def test_098_status_bar_docstring(self):
        self.assertIsNotNone(FortressStatusBar.__doc__)

    def test_099_module_imports(self):
        import fortress
        self.assertTrue(hasattr(fortress, 'FortressOptimizeCommand'))
        self.assertTrue(hasattr(fortress, 'FortressOptimizeLineCommand'))
        self.assertTrue(hasattr(fortress, 'FortressUsageCommand'))
        self.assertTrue(hasattr(fortress, 'FortressStatusBar'))

    def test_100_four_classes_exported(self):
        import fortress
        classes = [name for name in dir(fortress) if name.startswith('Fortress')]
        self.assertEqual(len(classes), 4)


if __name__ == '__main__':
    unittest.main()
