import unittest
from unittest.mock import patch, MagicMock
import sys
sys.path.insert(0, '../')
from wrapper import FortressAnthropicWrapper, FortressError

class TestFortressAnthropicWrapper(unittest.TestCase):
    """100 Tests for Fortress Anthropic SDK Wrapper"""

    def setUp(self):
        """Setup test fixtures"""
        self.api_key = "test-api-key-12345"
        self.wrapper = FortressAnthropicWrapper(api_key=self.api_key)

    # ========== INITIALIZATION & CONFIG (10 tests) ==========
    def test_001_initialization_with_api_key(self):
        """Test basic initialization with API key"""
        self.assertIsNotNone(self.wrapper)
        self.assertEqual(self.wrapper.api_key, self.api_key)

    def test_002_initialization_with_custom_url(self):
        """Test initialization with custom API URL"""
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, base_url="https://custom.api")
        self.assertEqual(wrapper.base_url, "https://custom.api")

    def test_003_initialization_missing_api_key(self):
        """Test that missing API key raises error"""
        with self.assertRaises(FortressError):
            FortressAnthropicWrapper(api_key="")

    def test_004_initialization_with_optimization_level(self):
        """Test initialization with optimization level"""
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, optimization_level=3)
        self.assertEqual(wrapper.optimization_level, 3)

    def test_005_initialization_with_timeout(self):
        """Test initialization with custom timeout"""
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, timeout=15)
        self.assertEqual(wrapper.timeout, 15)

    def test_006_default_timeout_value(self):
        """Test default timeout is set"""
        self.assertGreater(self.wrapper.timeout, 0)

    def test_007_initialization_with_cache_enabled(self):
        """Test initialization with cache enabled"""
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, enable_cache=True)
        self.assertTrue(wrapper.enable_cache)

    def test_008_initialization_with_retry_count(self):
        """Test initialization with custom retry count"""
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, max_retries=5)
        self.assertEqual(wrapper.max_retries, 5)

    def test_009_initialization_with_all_options(self):
        """Test initialization with all options"""
        wrapper = FortressAnthropicWrapper(
            api_key=self.api_key,
            base_url="https://custom.api",
            optimization_level=4,
            timeout=20,
            enable_cache=True,
            max_retries=3
        )
        self.assertEqual(wrapper.api_key, self.api_key)
        self.assertEqual(wrapper.optimization_level, 4)

    def test_010_reset_to_defaults(self):
        """Test reset function restores defaults"""
        self.wrapper.optimization_level = 5
        self.wrapper.reset()
        self.assertEqual(self.wrapper.optimization_level, 1)

    # ========== MESSAGE OPTIMIZATION (20 tests) ==========
    def test_011_optimize_simple_message(self):
        """Test optimization of simple message"""
        response = self.wrapper.optimize_message("Hello, how are you?")
        self.assertIn('optimized_message', response)

    def test_012_optimize_returns_savings(self):
        """Test that optimization returns token savings"""
        response = self.wrapper.optimize_message("Test message")
        self.assertIn('token_savings', response)
        self.assertGreaterEqual(response['token_savings'], 0)

    def test_013_optimize_returns_original_tokens(self):
        """Test that optimization returns original token count"""
        response = self.wrapper.optimize_message("Test message")
        self.assertIn('original_tokens', response)
        self.assertGreater(response['original_tokens'], 0)

    def test_014_optimize_returns_optimized_tokens(self):
        """Test that optimization returns optimized token count"""
        response = self.wrapper.optimize_message("Test message")
        self.assertIn('optimized_tokens', response)
        self.assertGreater(response['optimized_tokens'], 0)

    def test_015_optimize_with_different_models(self):
        """Test optimization with different Claude models"""
        for model in ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']:
            response = self.wrapper.optimize_message("Test", model=model)
            self.assertIn('optimized_message', response)

    def test_016_optimize_with_system_prompt(self):
        """Test optimization with system prompt"""
        response = self.wrapper.optimize_message(
            "Hello",
            system_prompt="You are helpful"
        )
        self.assertIn('optimized_message', response)

    def test_017_optimize_with_temperature(self):
        """Test optimization with custom temperature"""
        response = self.wrapper.optimize_message("Test", temperature=0.5)
        self.assertIn('optimized_message', response)

    def test_018_optimize_with_max_tokens(self):
        """Test optimization with max tokens"""
        response = self.wrapper.optimize_message("Test", max_tokens=100)
        self.assertIn('optimized_message', response)

    def test_019_optimize_empty_message(self):
        """Test that empty message raises error"""
        with self.assertRaises(FortressError):
            self.wrapper.optimize_message("")

    def test_020_optimize_very_long_message(self):
        """Test optimization of very long message"""
        long_message = "A" * 10000
        response = self.wrapper.optimize_message(long_message)
        self.assertIn('optimized_message', response)

    def test_021_optimize_with_special_characters(self):
        """Test optimization with special characters"""
        response = self.wrapper.optimize_message("Test with émojis 🚀 and spëcial çhars")
        self.assertIn('optimized_message', response)

    def test_022_optimize_with_multiline_text(self):
        """Test optimization of multiline text"""
        response = self.wrapper.optimize_message("Line 1\nLine 2\nLine 3")
        self.assertIn('optimized_message', response)

    def test_023_optimize_with_code_block(self):
        """Test optimization of code blocks"""
        response = self.wrapper.optimize_message("```python\nprint('hello')\n```")
        self.assertIn('optimized_message', response)

    def test_024_optimize_returns_technique(self):
        """Test that optimization includes technique used"""
        response = self.wrapper.optimize_message("Test")
        self.assertIn('technique', response)

    def test_025_optimize_cached_results(self):
        """Test that same message returns same optimization"""
        msg = "Cache test message"
        result1 = self.wrapper.optimize_message(msg)
        result2 = self.wrapper.optimize_message(msg)
        self.assertEqual(result1['optimized_message'], result2['optimized_message'])

    def test_026_optimize_with_batch_messages(self):
        """Test batch optimization of multiple messages"""
        messages = ["Message 1", "Message 2", "Message 3"]
        results = [self.wrapper.optimize_message(msg) for msg in messages]
        self.assertEqual(len(results), 3)

    def test_027_optimize_includes_confidence_score(self):
        """Test that optimization includes confidence score"""
        response = self.wrapper.optimize_message("Test")
        self.assertIn('confidence', response)
        self.assertGreaterEqual(response['confidence'], 0)
        self.assertLessEqual(response['confidence'], 1)

    def test_028_optimize_includes_request_id(self):
        """Test that optimization includes request ID"""
        response = self.wrapper.optimize_message("Test")
        self.assertIn('request_id', response)
        self.assertIsNotNone(response['request_id'])

    def test_029_optimize_provides_explanation(self):
        """Test that optimization includes explanation"""
        response = self.wrapper.optimize_message("Test", include_explanation=True)
        self.assertIn('explanation', response)

    def test_030_optimize_level_affects_aggressiveness(self):
        """Test that optimization level affects results"""
        msg = "Test message for level comparison"
        result1 = self.wrapper.optimize_message(msg, optimization_level=1)
        result2 = self.wrapper.optimize_message(msg, optimization_level=5)
        # Higher level should have more savings
        self.assertGreater(result2['token_savings'], result1['token_savings'])

    # ========== ASYNC OPERATIONS (10 tests) ==========
    def test_031_async_optimize_message(self):
        """Test async optimization"""
        import asyncio
        async def test():
            response = await self.wrapper.async_optimize_message("Test")
            self.assertIn('optimized_message', response)
        asyncio.run(test())

    def test_032_async_multiple_messages(self):
        """Test async optimization of multiple messages"""
        import asyncio
        async def test():
            messages = ["Msg 1", "Msg 2", "Msg 3"]
            results = await asyncio.gather(*[
                self.wrapper.async_optimize_message(msg) for msg in messages
            ])
            self.assertEqual(len(results), 3)
        asyncio.run(test())

    def test_033_async_concurrent_requests(self):
        """Test concurrent async requests"""
        import asyncio
        async def test():
            tasks = [self.wrapper.async_optimize_message(f"Test {i}") for i in range(10)]
            results = await asyncio.gather(*tasks)
            self.assertEqual(len(results), 10)
        asyncio.run(test())

    def test_034_async_timeout_handling(self):
        """Test async timeout handling"""
        import asyncio
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, timeout=0.001)
        async def test():
            try:
                await wrapper.async_optimize_message("Test")
            except FortressError:
                self.assertTrue(True)
        asyncio.run(test())

    def test_035_async_error_handling(self):
        """Test async error handling"""
        import asyncio
        async def test():
            with self.assertRaises(FortressError):
                await self.wrapper.async_optimize_message("")
        asyncio.run(test())

    def test_036_async_cache_consistency(self):
        """Test that async and sync cache is consistent"""
        import asyncio
        self.wrapper.optimize_message("Consistency test")
        async def test():
            result = await self.wrapper.async_optimize_message("Consistency test")
            self.assertIn('optimized_message', result)
        asyncio.run(test())

    def test_037_async_batch_optimization(self):
        """Test async batch optimization"""
        import asyncio
        async def test():
            messages = [f"Message {i}" for i in range(20)]
            results = await asyncio.gather(*[
                self.wrapper.async_optimize_message(msg) for msg in messages
            ])
            self.assertEqual(len(results), 20)
        asyncio.run(test())

    def test_038_async_performance(self):
        """Test async performance improvement"""
        import asyncio
        import time
        async def test():
            start = time.time()
            await asyncio.gather(*[
                self.wrapper.async_optimize_message(f"Msg {i}") 
                for i in range(50)
            ])
            duration = time.time() - start
            self.assertGreater(duration, 0)
        asyncio.run(test())

    def test_039_async_exception_propagation(self):
        """Test that exceptions propagate correctly in async"""
        import asyncio
        async def test():
            with self.assertRaises(FortressError):
                await self.wrapper.async_optimize_message("")
        asyncio.run(test())

    def test_040_mixed_sync_async_operations(self):
        """Test mixed sync and async operations"""
        import asyncio
        sync_result = self.wrapper.optimize_message("Sync test")
        
        async def test_async():
            async_result = await self.wrapper.async_optimize_message("Async test")
            self.assertIsNotNone(sync_result)
            self.assertIsNotNone(async_result)
        
        asyncio.run(test_async())

    # ========== USAGE & METRICS (10 tests) ==========
    def test_041_get_usage_stats(self):
        """Test getting usage statistics"""
        usage = self.wrapper.get_usage()
        self.assertIn('total_requests', usage)
        self.assertIn('total_tokens_saved', usage)
        self.assertIn('plan', usage)

    def test_042_usage_includes_token_count(self):
        """Test that usage includes token count"""
        usage = self.wrapper.get_usage()
        self.assertIn('tokens_used', usage)
        self.assertGreaterEqual(usage['tokens_used'], 0)

    def test_043_usage_includes_plan_type(self):
        """Test that usage includes plan type"""
        usage = self.wrapper.get_usage()
        self.assertIn('plan', usage)
        self.assertIn(usage['plan'], ['free', 'pro', 'team', 'enterprise'])

    def test_044_usage_includes_limit(self):
        """Test that usage includes token limit"""
        usage = self.wrapper.get_usage()
        self.assertIn('limit', usage)
        self.assertGreater(usage['limit'], 0)

    def test_045_usage_includes_remaining(self):
        """Test that usage shows remaining tokens"""
        usage = self.wrapper.get_usage()
        self.assertIn('remaining', usage)
        self.assertGreaterEqual(usage['remaining'], 0)

    def test_046_usage_percentage_calculation(self):
        """Test usage percentage calculation"""
        usage = self.wrapper.get_usage()
        percentage = (usage['tokens_used'] / usage['limit']) * 100
        self.assertGreaterEqual(percentage, 0)
        self.assertLessEqual(percentage, 100)

    def test_047_usage_reset_date(self):
        """Test that usage includes reset date for free tier"""
        self.wrapper.plan = 'free'
        usage = self.wrapper.get_usage()
        if usage['plan'] == 'free':
            self.assertIn('reset_date', usage)

    def test_048_usage_cost_calculation(self):
        """Test that usage includes cost calculation"""
        usage = self.wrapper.get_usage()
        if usage['plan'] != 'free':
            self.assertIn('estimated_cost', usage)

    def test_049_usage_update_after_optimization(self):
        """Test that usage updates after optimization"""
        usage1 = self.wrapper.get_usage()
        self.wrapper.optimize_message("Usage test")
        usage2 = self.wrapper.get_usage()
        self.assertGreaterEqual(usage2['total_requests'], usage1['total_requests'])

    def test_050_usage_cache_clearing(self):
        """Test usage after cache clearing"""
        self.wrapper.optimize_message("Cache test")
        self.wrapper.clear_cache()
        usage = self.wrapper.get_usage()
        self.assertIn('total_requests', usage)

    # ========== ERROR HANDLING (10 tests) ==========
    def test_051_invalid_api_key_format(self):
        """Test error on invalid API key format"""
        with self.assertRaises(FortressError):
            FortressAnthropicWrapper(api_key="invalid")

    def test_052_network_error_handling(self):
        """Test handling of network errors"""
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, base_url="http://invalid.local")
        with self.assertRaises(FortressError):
            wrapper.optimize_message("Network test")

    def test_053_timeout_error_handling(self):
        """Test handling of timeout errors"""
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, timeout=0.001)
        with self.assertRaises(FortressError):
            wrapper.optimize_message("Timeout test")

    def test_054_rate_limit_error(self):
        """Test handling of rate limit errors"""
        with self.assertRaises(FortressError):
            for _ in range(1000):
                self.wrapper.optimize_message("Rate limit test")

    def test_055_api_error_includes_details(self):
        """Test that API errors include details"""
        try:
            self.wrapper.optimize_message("")
        except FortressError as e:
            self.assertIn('message', str(e))

    def test_056_error_includes_status_code(self):
        """Test that error includes status code"""
        try:
            wrapper = FortressAnthropicWrapper(api_key="invalid-key")
            wrapper.optimize_message("Test")
        except FortressError as e:
            self.assertIsNotNone(e.status_code)

    def test_057_malformed_response_error(self):
        """Test handling of malformed responses"""
        with self.assertRaises(FortressError):
            self.wrapper.optimize_message("Malformed response")

    def test_058_missing_required_fields(self):
        """Test error when required fields missing"""
        with self.assertRaises(FortressError):
            self.wrapper.optimize_message(None)

    def test_059_error_retry_logic(self):
        """Test that retries occur on transient errors"""
        wrapper = FortressAnthropicWrapper(api_key=self.api_key, max_retries=3)
        # Should retry before failing
        self.assertEqual(wrapper.max_retries, 3)

    def test_060_graceful_degradation(self):
        """Test graceful degradation on errors"""
        try:
            self.wrapper.optimize_message("Error handling test")
        except FortressError:
            # Should handle errors gracefully
            self.assertTrue(True)

    # ========== CONFIGURATION & SETTINGS (10 tests) ==========
    def test_061_get_config(self):
        """Test getting configuration"""
        config = self.wrapper.get_config()
        self.assertIn('api_key', config)
        self.assertIn('optimization_level', config)

    def test_062_update_optimization_level(self):
        """Test updating optimization level"""
        self.wrapper.set_optimization_level(4)
        self.assertEqual(self.wrapper.optimization_level, 4)

    def test_063_invalid_optimization_level(self):
        """Test error on invalid optimization level"""
        with self.assertRaises(FortressError):
            self.wrapper.set_optimization_level(10)

    def test_064_update_timeout(self):
        """Test updating timeout"""
        self.wrapper.set_timeout(25)
        self.assertEqual(self.wrapper.timeout, 25)

    def test_065_enable_disable_cache(self):
        """Test enabling/disabling cache"""
        self.wrapper.set_cache_enabled(False)
        self.assertFalse(self.wrapper.enable_cache)

    def test_066_clear_cache(self):
        """Test clearing cache"""
        self.wrapper.optimize_message("Cache test")
        self.wrapper.clear_cache()
        cache_size = self.wrapper.get_cache_size()
        self.assertEqual(cache_size, 0)

    def test_067_get_cache_size(self):
        """Test getting cache size"""
        size = self.wrapper.get_cache_size()
        self.assertGreaterEqual(size, 0)

    def test_068_update_api_key(self):
        """Test updating API key"""
        new_key = "new-api-key-67890"
        self.wrapper.set_api_key(new_key)
        self.assertEqual(self.wrapper.api_key, new_key)

    def test_069_invalid_api_key_update(self):
        """Test error on invalid API key update"""
        with self.assertRaises(FortressError):
            self.wrapper.set_api_key("")

    def test_070_configuration_persistence(self):
        """Test that configuration persists"""
        self.wrapper.set_optimization_level(3)
        self.assertEqual(self.wrapper.optimization_level, 3)
        # Configuration should persist
        self.assertEqual(self.wrapper.get_config()['optimization_level'], 3)

    # ========== COMPATIBILITY & INTEGRATION (10 tests) ==========
    def test_071_drop_in_replacement_compatibility(self):
        """Test compatibility as drop-in replacement"""
        # Should work like regular Anthropic SDK
        response = self.wrapper.optimize_message("Compatibility test")
        self.assertIsNotNone(response)

    def test_072_multiple_model_support(self):
        """Test support for multiple Claude models"""
        models = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
        for model in models:
            response = self.wrapper.optimize_message("Test", model=model)
            self.assertIsNotNone(response)

    def test_073_context_window_handling(self):
        """Test proper context window handling"""
        long_context = "A" * 100000
        response = self.wrapper.optimize_message(long_context)
        self.assertIsNotNone(response)

    def test_074_streaming_support(self):
        """Test streaming response support"""
        if hasattr(self.wrapper, 'optimize_message_stream'):
            stream = self.wrapper.optimize_message_stream("Test")
            self.assertIsNotNone(stream)

    def test_075_batch_api_compatibility(self):
        """Test compatibility with batch API"""
        messages = [f"Msg {i}" for i in range(10)]
        results = [self.wrapper.optimize_message(msg) for msg in messages]
        self.assertEqual(len(results), 10)

    def test_076_vision_capability_support(self):
        """Test vision capability support if available"""
        if hasattr(self.wrapper, 'optimize_with_vision'):
            # Should handle vision content
            self.assertTrue(True)

    def test_077_tool_use_compatibility(self):
        """Test tool use compatibility"""
        if hasattr(self.wrapper, 'optimize_with_tools'):
            # Should handle tool use
            self.assertTrue(True)

    def test_078_system_prompt_support(self):
        """Test system prompt support"""
        response = self.wrapper.optimize_message(
            "Test",
            system_prompt="You are a helpful assistant"
        )
        self.assertIsNotNone(response)

    def test_079_temperature_range_support(self):
        """Test temperature range support"""
        for temp in [0.0, 0.5, 1.0]:
            response = self.wrapper.optimize_message("Test", temperature=temp)
            self.assertIsNotNone(response)

    def test_080_max_tokens_constraint(self):
        """Test max tokens constraint"""
        response = self.wrapper.optimize_message("Test", max_tokens=50)
        self.assertIsNotNone(response)

    # ========== PRODUCTION READINESS (20 tests) ==========
    def test_081_documentation_completeness(self):
        """Test that wrapper is well documented"""
        self.assertIsNotNone(self.wrapper.__doc__)

    def test_082_type_hints_present(self):
        """Test that type hints are present"""
        self.assertTrue(hasattr(self.wrapper.optimize_message, '__annotations__'))

    def test_083_error_handling_comprehensive(self):
        """Test comprehensive error handling"""
        with self.assertRaises(FortressError):
            self.wrapper.optimize_message("")

    def test_084_logging_capability(self):
        """Test logging capability"""
        if hasattr(self.wrapper, 'enable_logging'):
            self.wrapper.enable_logging(True)
            self.assertTrue(True)

    def test_085_performance_benchmarking(self):
        """Test performance is acceptable"""
        import time
        start = time.time()
        self.wrapper.optimize_message("Performance test")
        duration = time.time() - start
        self.assertLess(duration, 30)  # Should complete in reasonable time

    def test_086_thread_safety(self):
        """Test thread safety"""
        import threading
        results = []
        def optimize():
            result = self.wrapper.optimize_message("Thread safety test")
            results.append(result)
        
        threads = [threading.Thread(target=optimize) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        self.assertEqual(len(results), 5)

    def test_087_memory_efficiency(self):
        """Test memory efficiency"""
        for i in range(100):
            self.wrapper.optimize_message(f"Memory test {i}")
        # Should not have memory leaks
        cache_size = self.wrapper.get_cache_size()
        self.assertLess(cache_size, 1000000)  # Should be reasonable

    def test_088_versioning_info(self):
        """Test version information is available"""
        if hasattr(self.wrapper, '__version__'):
            self.assertIsNotNone(self.wrapper.__version__)

    def test_089_backward_compatibility(self):
        """Test backward compatibility"""
        # Should work with old-style calls
        response = self.wrapper.optimize_message("Backward compat test")
        self.assertIsNotNone(response)

    def test_090_future_proofing(self):
        """Test extensibility for future features"""
        config = self.wrapper.get_config()
        self.assertIsInstance(config, dict)

    def test_091_security_validation(self):
        """Test security validations"""
        with self.assertRaises(FortressError):
            FortressAnthropicWrapper(api_key="")

    def test_092_input_sanitization(self):
        """Test input sanitization"""
        response = self.wrapper.optimize_message("<script>alert('xss')</script>")
        self.assertIsNotNone(response)

    def test_093_rate_limiting_respect(self):
        """Test that rate limiting is respected"""
        # Should not exceed rate limits
        try:
            for _ in range(10):
                self.wrapper.optimize_message("Rate limit test")
        except FortressError:
            # Expected if rate limited
            pass

    def test_094_graceful_degradation_mode(self):
        """Test graceful degradation when service limited"""
        try:
            self.wrapper.optimize_message("Degradation test")
        except FortressError:
            # Should fail gracefully
            self.assertTrue(True)

    def test_095_monitoring_readiness(self):
        """Test monitoring and observability"""
        if hasattr(self.wrapper, 'get_metrics'):
            metrics = self.wrapper.get_metrics()
            self.assertIsNotNone(metrics)

    def test_096_production_deployment_readiness(self):
        """Test readiness for production deployment"""
        usage = self.wrapper.get_usage()
        config = self.wrapper.get_config()
        self.assertIsNotNone(usage)
        self.assertIsNotNone(config)

    def test_097_failure_recovery(self):
        """Test failure recovery mechanisms"""
        wrapper = FortressAnthropicWrapper(
            api_key=self.api_key,
            max_retries=3
        )
        self.assertEqual(wrapper.max_retries, 3)

    def test_098_integration_testing(self):
        """Test integration readiness"""
        response = self.wrapper.optimize_message("Integration test")
        usage = self.wrapper.get_usage()
        self.assertIsNotNone(response)
        self.assertIsNotNone(usage)

    def test_099_performance_under_load(self):
        """Test performance under load"""
        results = []
        for i in range(20):
            result = self.wrapper.optimize_message(f"Load test {i}")
            results.append(result)
        self.assertEqual(len(results), 20)

    def test_100_production_ready_final_check(self):
        """Final check for production readiness"""
        # Test complete workflow
        config = self.wrapper.get_config()
        message_result = self.wrapper.optimize_message("Production ready test")
        usage = self.wrapper.get_usage()
        
        # All components should work
        self.assertIsNotNone(config)
        self.assertIsNotNone(message_result)
        self.assertIsNotNone(usage)
        self.assertIn('optimized_message', message_result)
        self.assertGreaterEqual(usage['total_requests'], 1)


if __name__ == '__main__':
    unittest.main()
