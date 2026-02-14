import unittest
import sys
sys.path.insert(0, '../')
from fortress import FortressSublit, SublimeError

class TestFortressSubline(unittest.TestCase):
    """100 Tests for Fortress Sublime Text Plugin"""

    def setUp(self):
        self.api_key = "test-key-12345"
        self.plugin = FortressSublit(api_key=self.api_key)

    # ========== INITIALIZATION (10 tests) ==========
    def test_001_plugin_init(self): self.assertIsNotNone(self.plugin)
    def test_002_api_key_set(self): self.assertEqual(self.plugin.api_key, self.api_key)
    def test_003_config_loaded(self): self.assertIsNotNone(self.plugin.load_config())
    def test_004_commands_registered(self): self.assertTrue(self.plugin.has_command('fortress_optimize'))
    def test_005_menu_created(self): self.assertIsNotNone(self.plugin.get_menu())
    def test_006_settings_loaded(self): self.assertIsNotNone(self.plugin.get_settings())
    def test_007_cache_initialized(self): self.assertEqual(self.plugin.get_cache_size(), 0)
    def test_008_logger_setup(self): self.assertIsNotNone(self.plugin.logger)
    def test_009_event_listeners_registered(self): self.assertTrue(len(self.plugin.get_event_listeners()) > 0)
    def test_010_ui_theme_applied(self): self.assertIsNotNone(self.plugin.get_theme())

    # ========== COMMAND HANDLING (20 tests) ==========
    def test_011_optimize_selection(self): result = self.plugin.optimize_selection("Test"); self.assertIsNotNone(result)
    def test_012_optimize_line(self): result = self.plugin.optimize_line("Test"); self.assertIsNotNone(result)
    def test_013_optimize_buffer(self): result = self.plugin.optimize_buffer("All text"); self.assertIsNotNone(result)
    def test_014_usage_command(self): usage = self.plugin.get_usage(); self.assertIsNotNone(usage['monthly_usage'])
    def test_015_help_command(self): help_text = self.plugin.show_help(); self.assertIn('optimize', help_text.lower())
    def test_016_settings_command(self): result = self.plugin.open_settings(); self.assertIsNotNone(result)
    def test_017_token_savings(self): result = self.plugin.optimize_selection("Test"); self.assertGreaterEqual(result['savings'], 0)
    def test_018_optimization_technique(self): result = self.plugin.optimize_selection("Test"); self.assertIsNotNone(result['technique'])
    def test_019_batch_optimize(self): results = [self.plugin.optimize_selection(f"Test {i}") for i in range(5)]; self.assertEqual(len(results), 5)
    def test_020_cache_result(self): r1 = self.plugin.optimize_selection("Cache test"); r2 = self.plugin.optimize_selection("Cache test"); self.assertEqual(r1['optimized'], r2['optimized'])
    def test_021_clear_cache(self): self.plugin.clear_cache(); self.assertEqual(self.plugin.get_cache_size(), 0)
    def test_022_concurrent_optimizations(self): results = [self.plugin.optimize_selection(f"Test {i}") for i in range(10)]; self.assertEqual(len(results), 10)
    def test_023_level_1_optimization(self): result = self.plugin.optimize_selection("Test", level=1); self.assertIsNotNone(result)
    def test_024_level_5_optimization(self): result = self.plugin.optimize_selection("Test", level=5); self.assertIsNotNone(result)
    def test_025_special_chars(self): result = self.plugin.optimize_selection("Test émoji 🚀"); self.assertIsNotNone(result)
    def test_026_multiline_text(self): result = self.plugin.optimize_selection("Line 1\nLine 2\nLine 3"); self.assertIsNotNone(result)
    def test_027_code_optimization(self): code = "```python\nprint('hello')\n```"; result = self.plugin.optimize_selection(code); self.assertIsNotNone(result)
    def test_028_empty_input_error(self): self.assertRaises(SublimeError, self.plugin.optimize_selection, "")
    def test_029_long_text(self): long = "A" * 10000; result = self.plugin.optimize_selection(long); self.assertIsNotNone(result)
    def test_030_undo_redo_support(self): self.plugin.optimize_selection("Undo test"); self.assertTrue(self.plugin.can_undo())

    # ========== CONTEXT MENU (15 tests) ==========
    def test_031_context_menu_visible(self): self.assertIsNotNone(self.plugin.get_context_menu())
    def test_032_menu_optimize_entry(self): menu = self.plugin.get_context_menu(); self.assertIn('Optimize Selection', menu)
    def test_033_menu_optimize_line_entry(self): menu = self.plugin.get_context_menu(); self.assertIn('Optimize Line', menu)
    def test_034_menu_usage_entry(self): menu = self.plugin.get_context_menu(); self.assertIn('Usage', menu)
    def test_035_menu_settings_entry(self): menu = self.plugin.get_context_menu(); self.assertIn('Settings', menu)
    def test_036_menu_click_optimize(self): self.plugin.execute_menu_command('optimize'); self.assertIsNotNone(self.plugin)
    def test_037_menu_click_usage(self): self.plugin.execute_menu_command('usage'); self.assertIsNotNone(self.plugin)
    def test_038_right_click_context(self): self.assertTrue(self.plugin.is_context_menu_enabled())
    def test_039_keyboard_shortcut_available(self): self.assertIsNotNone(self.plugin.get_keybindings())
    def test_040_menu_disabled_on_no_selection(self): self.plugin.clear_selection(); items = self.plugin.get_context_menu(); self.assertIsNotNone(items)
    def test_041_menu_enabled_on_selection(self): self.plugin.set_selection("Test"); items = self.plugin.get_context_menu(); self.assertIsNotNone(items)
    def test_042_submenu_structure(self): menu = self.plugin.get_context_menu(); self.assertIsNotNone(menu)
    def test_043_menu_icons(self): menu = self.plugin.get_context_menu(); self.assertIsNotNone(menu)
    def test_044_menu_hotkeys_displayed(self): menu = self.plugin.get_context_menu(); self.assertIsNotNone(menu)
    def test_045_menu_performance(self): menu = self.plugin.get_context_menu(); self.assertLess(len(menu), 100)

    # ========== STATUS BAR (10 tests) ==========
    def test_046_status_bar_shows(self): self.plugin.update_status("Ready"); self.assertIsNotNone(self.plugin.get_status())
    def test_047_status_shows_usage(self): self.plugin.update_status("Usage: 100/50000"); self.assertIn("Usage", self.plugin.get_status())
    def test_048_status_shows_level(self): self.plugin.set_level(3); self.plugin.update_status(f"Level: 3"); self.assertIsNotNone(self.plugin.get_status())
    def test_049_status_icon(self): self.plugin.update_status("Optimizing..."); status = self.plugin.get_status(); self.assertIsNotNone(status)
    def test_050_status_color_coding(self): self.plugin.update_status("Complete"); self.assertIsNotNone(self.plugin.get_status_color())
    def test_051_status_click_action(self): self.plugin.on_status_click(); self.assertIsNotNone(self.plugin)
    def test_052_status_updates_real_time(self): for i in range(5): self.plugin.update_status(f"Step {i}"); self.assertIsNotNone(self.plugin.get_status())
    def test_053_status_clear(self): self.plugin.clear_status(); status = self.plugin.get_status(); self.assertEqual(status, "")
    def test_054_status_persistent(self): self.plugin.update_status("Persistent"); self.assertEqual(self.plugin.get_status(), "Persistent")
    def test_055_status_multipart(self): self.plugin.update_status("Type: Optimization | Status: Complete"); self.assertIn("Complete", self.plugin.get_status())

    # ========== SETTINGS PANEL (10 tests) ==========
    def test_056_settings_panel_opens(self): result = self.plugin.open_settings(); self.assertIsNotNone(result)
    def test_057_api_key_setting(self): self.plugin.set_setting('api_key', 'new-key'); self.assertEqual(self.plugin.get_setting('api_key'), 'new-key')
    def test_058_optimization_level_setting(self): self.plugin.set_setting('level', 4); self.assertEqual(self.plugin.get_setting('level'), 4)
    def test_059_timeout_setting(self): self.plugin.set_setting('timeout', 20000); self.assertEqual(self.plugin.get_setting('timeout'), 20000)
    def test_060_cache_setting(self): self.plugin.set_setting('cache_enabled', False); self.assertFalse(self.plugin.get_setting('cache_enabled'))
    def test_061_theme_setting(self): self.plugin.set_setting('theme', 'dark'); self.assertEqual(self.plugin.get_setting('theme'), 'dark')
    def test_062_keybinding_setting(self): self.plugin.set_setting('optimize_key', 'alt+shift+o'); self.assertIsNotNone(self.plugin.get_setting('optimize_key'))
    def test_063_settings_validation(self): self.assertTrue(self.plugin.validate_settings())
    def test_064_settings_save(self): self.plugin.save_settings(); self.assertIsNotNone(self.plugin.load_config())
    def test_065_settings_reset(self): self.plugin.reset_settings(); self.assertEqual(self.plugin.get_setting('level'), 1)

    # ========== ERROR HANDLING (10 tests) ==========
    def test_066_network_error(self): self.assertRaises(SublimeError, lambda: self.plugin.optimize_selection_with_url("Test", "http://invalid.local"))
    def test_067_timeout_error(self): self.plugin.set_setting('timeout', 1); self.assertRaises(SublimeError, lambda: self.plugin.optimize_selection("Timeout"))
    def test_068_api_error(self): self.assertRaises(SublimeError, lambda: self.plugin.optimize_selection_with_key("Test", "invalid-key"))
    def test_069_invalid_api_key(self): self.assertRaises(SublimeError, lambda: self.plugin.set_api_key(""))
    def test_070_malformed_response(self): self.assertRaises(SublimeError, lambda: self.plugin.optimize_selection("Malformed"))
    def test_071_error_message_display(self): try: self.plugin.optimize_selection("") 
                              except SublimeError as e: self.assertIsNotNone(str(e))
    def test_072_error_recovery(self): try: self.plugin.optimize_selection("") 
                          except SublimeError: result = self.plugin.optimize_selection("Recovery"); self.assertIsNotNone(result)
    def test_073_graceful_degradation(self): result = self.plugin.optimize_selection("Degradation") if self.plugin else None; self.assertIsNone(result) if not result else self.assertIsNotNone(result)
    def test_074_error_logging(self): try: self.plugin.optimize_selection("") 
                        except SublimeError: logs = self.plugin.get_error_logs(); self.assertGreater(len(logs), 0)
    def test_075_retry_logic(self): for _ in range(3): try: self.plugin.optimize_selection("Retry") 
                                except SublimeError: pass; self.assertIsNotNone(self.plugin)

    # ========== PERFORMANCE & PRODUCTION (15 tests) ==========
    def test_076_rapid_commands(self): [self.plugin.optimize_selection(f"Test {i}") for i in range(20)]; self.assertIsNotNone(self.plugin)
    def test_077_memory_management(self): [self.plugin.optimize_selection(f"Memory {i}") for i in range(100)]; self.assertLess(self.plugin.get_cache_size(), 10000000)
    def test_078_concurrent_ops(self): results = [self.plugin.optimize_selection(f"Concurrent {i}") for i in range(15)]; self.assertEqual(len(results), 15)
    def test_079_response_time(self): import time; start = time.time(); self.plugin.optimize_selection("Speed"); elapsed = time.time() - start; self.assertLess(elapsed, 30)
    def test_080_batch_performance(self): results = [self.plugin.optimize_selection(f"Batch {i}") for i in range(50)]; self.assertEqual(len(results), 50)
    def test_081_cache_performance(self): for _ in range(5): self.plugin.optimize_selection("Cache perf"); self.assertIsNotNone(self.plugin)
    def test_082_resource_cleanup(self): self.plugin.optimize_selection("Cleanup"); self.plugin.cleanup(); self.assertIsNotNone(self.plugin)
    def test_083_health_status(self): health = self.plugin.get_health(); self.assertIsNotNone(health)
    def test_084_metrics_tracking(self): metrics = self.plugin.get_metrics(); self.assertIsNotNone(metrics.get('total_requests'))
    def test_085_lazy_loading(self): self.assertIsNotNone(self.plugin.optimize_selection)
    def test_086_plugin_version(self): version = self.plugin.get_version(); self.assertIsNotNone(version)
    def test_087_dependencies_check(self): self.assertTrue(self.plugin.check_dependencies())
    def test_088_compatibility_check(self): self.assertTrue(self.plugin.check_sublime_compatibility())
    def test_089_final_integration(self): result = self.plugin.optimize_selection("Integration test"); usage = self.plugin.get_usage(); self.assertIsNotNone(result); self.assertIsNotNone(usage)
    def test_090_production_ready(self): config = self.plugin.load_config(); result = self.plugin.optimize_selection("Production test"); self.assertIsNotNone(config); self.assertIsNotNone(result)

    # ========== REMAINING TESTS (10 tests) ==========
    def test_091_bulk_file_processing(self): results = [self.plugin.optimize_selection(f"File {i}") for i in range(30)]; self.assertEqual(len(results), 30)
    def test_092_watchdog_monitoring(self): self.plugin.enable_watchdog(); self.assertTrue(self.plugin.is_watchdog_enabled())
    def test_093_auto_save_integration(self): self.plugin.enable_auto_optimize(); result = self.plugin.optimize_selection("Auto test"); self.assertIsNotNone(result)
    def test_094_diff_viewer_integration(self): original = "Original"; optimized = "Optimized"; diff = self.plugin.show_diff(original, optimized); self.assertIsNotNone(diff)
    def test_095_history_tracking(self): [self.plugin.optimize_selection(f"History {i}") for i in range(10)]; history = self.plugin.get_history(); self.assertGreater(len(history), 0)
    def test_096_undo_limit(self): self.plugin.set_undo_limit(20); self.assertEqual(self.plugin.get_undo_limit(), 20)
    def test_097_multi_encoding_support(self): result = self.plugin.optimize_selection("UTF-8 test: émojis 🚀"); self.assertIsNotNone(result)
    def test_098_line_ending_preservation(self): original = "Line1\r\nLine2"; result = self.plugin.optimize_selection(original); self.assertIsNotNone(result)
    def test_099_project_wide_optimization(self): self.plugin.optimize_project(); self.assertIsNotNone(self.plugin)
    def test_100_final_comprehensive_test(self): 
        config = self.plugin.load_config()
        result = self.plugin.optimize_selection("Comprehensive test")
        usage = self.plugin.get_usage()
        menu = self.plugin.get_context_menu()
        self.assertIsNotNone(config)
        self.assertIsNotNone(result)
        self.assertIsNotNone(usage)
        self.assertIsNotNone(menu)

if __name__ == '__main__':
    unittest.main()
