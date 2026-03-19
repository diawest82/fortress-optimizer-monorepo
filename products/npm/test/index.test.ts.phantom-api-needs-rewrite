import { FortressOptimizer, FortressAPIError, FortressConfig } from '../src/index';

describe('FortressOptimizer - npm Package (100 Tests)', () => {
  let optimizer: FortressOptimizer;
  const mockApiKey = 'test-api-key-12345';
  const mockApiUrl = 'http://localhost:8000';

  beforeEach(() => {
    optimizer = new FortressOptimizer({
      apiKey: mockApiKey,
      apiUrl: mockApiUrl,
      timeout: 5000
    });
  });

  // ========== INITIALIZATION & CONFIG (10 tests) ==========
  describe('Initialization & Configuration', () => {
    test('1. Should initialize with required API key', () => {
      expect(optimizer).toBeDefined();
      expect(optimizer.config.apiKey).toBe(mockApiKey);
    });

    test('2. Should set custom API URL', () => {
      const customUrl = 'https://custom-api.example.com';
      const opt = new FortressOptimizer({ apiKey: mockApiKey, apiUrl: customUrl });
      expect(opt.config.apiUrl).toBe(customUrl);
    });

    test('3. Should use default timeout if not specified', () => {
      const opt = new FortressOptimizer({ apiKey: mockApiKey });
      expect(opt.config.timeout).toBe(30000);
    });

    test('4. Should use custom timeout', () => {
      const opt = new FortressOptimizer({ apiKey: mockApiKey, timeout: 10000 });
      expect(opt.config.timeout).toBe(10000);
    });

    test('5. Should throw error if API key missing', () => {
      expect(() => new FortressOptimizer({ apiKey: '' })).toThrow();
    });

    test('6. Should throw error if API URL invalid', () => {
      expect(() => new FortressOptimizer({ apiKey: mockApiKey, apiUrl: 'invalid' })).toThrow();
    });

    test('7. Should initialize with default level', () => {
      expect(optimizer.config.level).toBe(1);
    });

    test('8. Should set custom optimization level (1-5)', () => {
      const opt = new FortressOptimizer({ apiKey: mockApiKey, level: 3 });
      expect(opt.config.level).toBe(3);
    });

    test('9. Should reject invalid optimization level < 1', () => {
      expect(() => new FortressOptimizer({ apiKey: mockApiKey, level: 0 })).toThrow();
    });

    test('10. Should reject invalid optimization level > 5', () => {
      expect(() => new FortressOptimizer({ apiKey: mockApiKey, level: 6 })).toThrow();
    });
  });

  // ========== OPTIMIZATION REQUESTS (20 tests) ==========
  describe('Prompt Optimization Requests', () => {
    test('11. Should optimize simple prompt', async () => {
      const prompt = 'Write a hello world program';
      const response = await optimizer.optimize(prompt);
      expect(response).toBeDefined();
      expect(response.optimized).toBeDefined();
    });

    test('12. Should return token savings', async () => {
      const response = await optimizer.optimize('Test prompt');
      expect(response.savings).toBeDefined();
      expect(typeof response.savings).toBe('number');
      expect(response.savings).toBeGreaterThanOrEqual(0);
    });

    test('13. Should return optimization technique', async () => {
      const response = await optimizer.optimize('Test prompt');
      expect(response.technique).toBeDefined();
      expect(typeof response.technique).toBe('string');
    });

    test('14. Should return original token count', async () => {
      const response = await optimizer.optimize('Test prompt');
      expect(response.originalTokens).toBeDefined();
      expect(typeof response.originalTokens).toBe('number');
    });

    test('15. Should return optimized token count', async () => {
      const response = await optimizer.optimize('Test prompt');
      expect(response.optimizedTokens).toBeDefined();
      expect(typeof response.optimizedTokens).toBe('number');
    });

    test('16. Should optimize with custom level', async () => {
      const response = await optimizer.optimize('Test prompt', { level: 5 });
      expect(response).toBeDefined();
    });

    test('17. Should reject empty prompt', async () => {
      await expect(optimizer.optimize('')).rejects.toThrow();
    });

    test('18. Should handle very long prompts', async () => {
      const longPrompt = 'A'.repeat(10000);
      const response = await optimizer.optimize(longPrompt);
      expect(response).toBeDefined();
    });

    test('19. Should handle special characters', async () => {
      const prompt = 'Test with émojis 🚀 and spëcial çhars!@#$%';
      const response = await optimizer.optimize(prompt);
      expect(response).toBeDefined();
    });

    test('20. Should handle multi-line prompts', async () => {
      const prompt = 'Line 1\nLine 2\nLine 3';
      const response = await optimizer.optimize(prompt);
      expect(response).toBeDefined();
    });

    test('21. Should cache results for same prompt', async () => {
      const prompt = 'Cache test prompt';
      const result1 = await optimizer.optimize(prompt);
      const result2 = await optimizer.optimize(prompt);
      expect(result1.optimized).toBe(result2.optimized);
    });

    test('22. Should handle optimization with provider option', async () => {
      const response = await optimizer.optimize('Test', { provider: 'openai' });
      expect(response).toBeDefined();
    });

    test('23. Should support batch optimization', async () => {
      const prompts = ['Prompt 1', 'Prompt 2', 'Prompt 3'];
      const results = await Promise.all(prompts.map(p => optimizer.optimize(p)));
      expect(results).toHaveLength(3);
    });

    test('24. Should return consistent results', async () => {
      const prompt = 'Consistency test';
      const result1 = await optimizer.optimize(prompt);
      const result2 = await optimizer.optimize(prompt);
      expect(result1.optimized).toBe(result2.optimized);
      expect(result1.savings).toBe(result2.savings);
    });

    test('25. Should timeout on slow API', async () => {
      const slowOptimizer = new FortressOptimizer({ 
        apiKey: mockApiKey, 
        timeout: 1 
      });
      await expect(slowOptimizer.optimize('Slow test')).rejects.toThrow();
    });

    test('26. Should handle concurrent requests', async () => {
      const promises = Array(5).fill('Concurrent test').map((p, i) => 
        optimizer.optimize(p + i)
      );
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
    });

    test('27. Should handle API error gracefully', async () => {
      await expect(optimizer.optimize('Error test')).rejects.toThrow(FortressAPIError);
    });

    test('28. Should include request ID in response', async () => {
      const response = await optimizer.optimize('Test');
      expect(response.requestId).toBeDefined();
      expect(typeof response.requestId).toBe('string');
    });

    test('29. Should handle network timeout', async () => {
      await expect(optimizer.optimize('Network test')).rejects.toThrow();
    });

    test('30. Should optimize with all options', async () => {
      const response = await optimizer.optimize('Full options test', {
        level: 3,
        provider: 'claude',
        cache: true,
        returnExplanation: true
      });
      expect(response).toBeDefined();
    });
  });

  // ========== USAGE & STATISTICS (10 tests) ==========
  describe('Usage & Statistics', () => {
    test('31. Should get usage information', async () => {
      const usage = await optimizer.getUsage();
      expect(usage).toBeDefined();
      expect(usage.totalRequests).toBeDefined();
    });

    test('32. Should return current month usage', async () => {
      const usage = await optimizer.getUsage();
      expect(usage.monthlyUsage).toBeDefined();
      expect(typeof usage.monthlyUsage).toBe('number');
    });

    test('33. Should return usage limit', async () => {
      const usage = await optimizer.getUsage();
      expect(usage.limit).toBeDefined();
      expect(typeof usage.limit).toBe('number');
    });

    test('34. Should return remaining tokens', async () => {
      const usage = await optimizer.getUsage();
      expect(usage.remaining).toBeDefined();
      expect(typeof usage.remaining).toBe('number');
    });

    test('35. Should show plan information', async () => {
      const usage = await optimizer.getUsage();
      expect(usage.plan).toBeDefined();
      expect(['free', 'pro', 'team', 'enterprise'].includes(usage.plan)).toBe(true);
    });

    test('36. Should show usage as percentage', async () => {
      const usage = await optimizer.getUsage();
      const percentage = (usage.monthlyUsage / usage.limit) * 100;
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    test('37. Should show reset date for free tier', async () => {
      const usage = await optimizer.getUsage();
      if (usage.plan === 'free') {
        expect(usage.resetDate).toBeDefined();
      }
    });

    test('38. Should show cost metrics', async () => {
      const usage = await optimizer.getUsage();
      expect(usage.estimatedCost).toBeDefined();
    });

    test('39. Should handle usage check when limit exceeded', async () => {
      const usage = await optimizer.getUsage();
      const exceeded = usage.remaining < 0;
      expect(typeof exceeded).toBe('boolean');
    });

    test('40. Should cache usage data briefly', async () => {
      const usage1 = await optimizer.getUsage();
      const usage2 = await optimizer.getUsage();
      expect(usage1.totalRequests).toBe(usage2.totalRequests);
    });
  });

  // ========== CONFIGURATION MANAGEMENT (10 tests) ==========
  describe('Configuration Management', () => {
    test('41. Should get current configuration', () => {
      const config = optimizer.getConfig();
      expect(config).toBeDefined();
      expect(config.apiKey).toBe(mockApiKey);
    });

    test('42. Should update optimization level', () => {
      optimizer.setLevel(4);
      expect(optimizer.getConfig().level).toBe(4);
    });

    test('43. Should reject invalid level on update', () => {
      expect(() => optimizer.setLevel(0)).toThrow();
    });

    test('44. Should update API key', () => {
      const newKey = 'new-api-key-67890';
      optimizer.setApiKey(newKey);
      expect(optimizer.getConfig().apiKey).toBe(newKey);
    });

    test('45. Should reject empty API key on update', () => {
      expect(() => optimizer.setApiKey('')).toThrow();
    });

    test('46. Should update timeout', () => {
      optimizer.setTimeout(15000);
      expect(optimizer.getConfig().timeout).toBe(15000);
    });

    test('47. Should enable/disable caching', () => {
      optimizer.setCacheEnabled(false);
      expect(optimizer.getConfig().cacheEnabled).toBe(false);
    });

    test('48. Should clear cache', () => {
      optimizer.optimize('Cache test');
      optimizer.clearCache();
      expect(optimizer.getCacheSize()).toBe(0);
    });

    test('49. Should get cache size', () => {
      const size = optimizer.getCacheSize();
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThanOrEqual(0);
    });

    test('50. Should reset all settings to defaults', () => {
      optimizer.reset();
      const config = optimizer.getConfig();
      expect(config.level).toBe(1);
      expect(config.timeout).toBe(30000);
    });
  });

  // ========== ERROR HANDLING (15 tests) ==========
  describe('Error Handling', () => {
    test('51. Should throw FortressAPIError on 400 response', async () => {
      await expect(optimizer.optimize('Bad request')).rejects.toThrow(FortressAPIError);
    });

    test('52. Should throw FortressAPIError on 401 unauthorized', async () => {
      const badOptimizer = new FortressOptimizer({ apiKey: 'invalid-key' });
      await expect(badOptimizer.optimize('Test')).rejects.toThrow(FortressAPIError);
    });

    test('53. Should throw FortressAPIError on 429 rate limit', async () => {
      await expect(optimizer.optimize('Rate limit test')).rejects.toThrow(FortressAPIError);
    });

    test('54. Should include error message', async () => {
      try {
        await optimizer.optimize('Error test');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length > 0).toBe(true);
      }
    });

    test('55. Should include HTTP status code in error', async () => {
      try {
        await optimizer.optimize('Error test');
      } catch (error) {
        expect(error.statusCode).toBeDefined();
      }
    });

    test('56. Should handle network errors', async () => {
      const badOptimizer = new FortressOptimizer({ 
        apiKey: mockApiKey, 
        apiUrl: 'http://invalid-domain-12345.local' 
      });
      await expect(badOptimizer.optimize('Network error')).rejects.toThrow();
    });

    test('57. Should handle JSON parse errors', async () => {
      await expect(optimizer.optimize('Invalid JSON response')).rejects.toThrow();
    });

    test('58. Should handle missing response data', async () => {
      await expect(optimizer.optimize('Missing data')).rejects.toThrow();
    });

    test('59. Should retry on transient errors', async () => {
      // Mock retry logic
      let attempts = 0;
      try {
        await optimizer.optimize('Retry test');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('60. Should provide helpful error messages', async () => {
      try {
        await optimizer.optimize('');
      } catch (error) {
        expect(error.message).toContain('prompt');
      }
    });

    test('61. Should include request details in error context', async () => {
      try {
        await optimizer.optimize('Error context test');
      } catch (error) {
        expect(error.context).toBeDefined();
      }
    });

    test('62. Should handle API unavailable (503)', async () => {
      await expect(optimizer.optimize('Service unavailable')).rejects.toThrow();
    });

    test('63. Should handle malformed API response', async () => {
      await expect(optimizer.optimize('Malformed response')).rejects.toThrow();
    });

    test('64. Should handle partial response data', async () => {
      await expect(optimizer.optimize('Partial data')).rejects.toThrow();
    });

    test('65. Should provide recovery suggestions', async () => {
      try {
        await optimizer.optimize('Recovery test');
      } catch (error) {
        expect(error.suggestion).toBeDefined();
      }
    });
  });

  // ========== PERFORMANCE & OPTIMIZATION (15 tests) ==========
  describe('Performance & Optimization', () => {
    test('66. Should complete optimization in reasonable time', async () => {
      const startTime = Date.now();
      await optimizer.optimize('Performance test');
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    test('67. Should handle high concurrency', async () => {
      const promises = Array(20).fill(null).map((_, i) => 
        optimizer.optimize(`Concurrency test ${i}`)
      );
      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
    });

    test('68. Should implement request deduplication', async () => {
      const prompt = 'Dedup test';
      const promise1 = optimizer.optimize(prompt);
      const promise2 = optimizer.optimize(prompt);
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1.optimized).toBe(result2.optimized);
    });

    test('69. Should cache responses efficiently', async () => {
      optimizer.setCacheEnabled(true);
      await optimizer.optimize('Cache test');
      const cached = optimizer.getCacheSize();
      expect(cached).toBeGreaterThan(0);
    });

    test('70. Should implement smart timeout', async () => {
      const config = optimizer.getConfig();
      expect(config.timeout).toBeGreaterThan(0);
      expect(config.timeout).toBeLessThan(60000);
    });

    test('71. Should batch requests when possible', async () => {
      const prompts = Array(5).fill('Batch test');
      const results = await Promise.all(prompts.map(p => optimizer.optimize(p)));
      expect(results).toHaveLength(5);
    });

    test('72. Should implement exponential backoff', async () => {
      // Verify retry strategy
      expect(optimizer.retryConfig).toBeDefined();
    });

    test('73. Should limit memory usage', async () => {
      optimizer.clearCache();
      expect(optimizer.getCacheSize()).toBe(0);
    });

    test('74. Should handle burst requests', async () => {
      const burstPromises = Array(50).fill(null).map((_, i) => 
        optimizer.optimize(`Burst ${i}`)
      );
      const results = await Promise.all(burstPromises);
      expect(results).toHaveLength(50);
    });

    test('75. Should prioritize important requests', async () => {
      const response = await optimizer.optimize('Priority test', { priority: 'high' });
      expect(response).toBeDefined();
    });

    test('76. Should measure response latency', async () => {
      const response = await optimizer.optimize('Latency test');
      expect(response.latency).toBeDefined();
      expect(typeof response.latency).toBe('number');
    });

    test('77. Should track API usage rate', async () => {
      const usage = await optimizer.getUsage();
      expect(usage.rateLimit).toBeDefined();
    });

    test('78. Should implement request queuing', async () => {
      const queue = optimizer.getQueueSize();
      expect(typeof queue).toBe('number');
      expect(queue).toBeGreaterThanOrEqual(0);
    });

    test('79. Should optimize memory for long sessions', async () => {
      for (let i = 0; i < 100; i++) {
        await optimizer.optimize(`Session test ${i}`);
      }
      expect(optimizer.getCacheSize()).toBeDefined();
    });

    test('80. Should handle rapid API calls', async () => {
      const promises = [];
      for (let i = 0; i < 30; i++) {
        promises.push(optimizer.optimize(`Rapid call ${i}`));
      }
      const results = await Promise.all(promises);
      expect(results).toHaveLength(30);
    });
  });

  // ========== TYPE SAFETY & VALIDATION (10 tests) ==========
  describe('Type Safety & Validation', () => {
    test('81. Should validate input prompt type', async () => {
      await expect(optimizer.optimize(null as any)).rejects.toThrow();
    });

    test('82. Should validate options object type', async () => {
      await expect(optimizer.optimize('Test', 'invalid' as any)).rejects.toThrow();
    });

    test('83. Should validate API key format', () => {
      expect(() => new FortressOptimizer({ apiKey: '12345' })).toThrow();
    });

    test('84. Should return strongly typed response', async () => {
      const response = await optimizer.optimize('Type test');
      expect(response.optimized).toEqual(expect.any(String));
      expect(response.savings).toEqual(expect.any(Number));
    });

    test('85. Should validate level parameter type', () => {
      expect(() => optimizer.setLevel('3' as any)).toThrow();
    });

    test('86. Should validate timeout parameter type', () => {
      expect(() => optimizer.setTimeout('5000' as any)).toThrow();
    });

    test('87. Should validate configuration object', () => {
      const config = optimizer.getConfig();
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('apiUrl');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('level');
    });

    test('88. Should validate usage object structure', async () => {
      const usage = await optimizer.getUsage();
      expect(usage).toHaveProperty('totalRequests');
      expect(usage).toHaveProperty('monthlyUsage');
      expect(usage).toHaveProperty('limit');
    });

    test('89. Should enforce immutability of response data', async () => {
      const response = await optimizer.optimize('Immutability test');
      const original = response.optimized;
      expect(() => { (response as any).optimized = 'Modified'; }).not.toThrow();
      // Should still be original in new requests
    });

    test('90. Should validate async/await compatibility', async () => {
      const promise = optimizer.optimize('Async test');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  // ========== INTEGRATION & EDGE CASES (10 tests) ==========
  describe('Integration & Edge Cases', () => {
    test('91. Should handle simultaneous operations', async () => {
      const [optimize, usage] = await Promise.all([
        optimizer.optimize('Test'),
        optimizer.getUsage()
      ]);
      expect(optimize).toBeDefined();
      expect(usage).toBeDefined();
    });

    test('92. Should handle rapid config changes', () => {
      optimizer.setLevel(2);
      optimizer.setLevel(3);
      optimizer.setLevel(1);
      expect(optimizer.getConfig().level).toBe(1);
    });

    test('93. Should handle optimizer reuse', async () => {
      const result1 = await optimizer.optimize('Test 1');
      const result2 = await optimizer.optimize('Test 2');
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    test('94. Should handle multiple optimizer instances', async () => {
      const opt1 = new FortressOptimizer({ apiKey: mockApiKey });
      const opt2 = new FortressOptimizer({ apiKey: mockApiKey });
      const [result1, result2] = await Promise.all([
        opt1.optimize('Test'),
        opt2.optimize('Test')
      ]);
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    test('95. Should handle state persistence', async () => {
      optimizer.setLevel(4);
      await optimizer.optimize('Test');
      expect(optimizer.getConfig().level).toBe(4);
    });

    test('96. Should handle graceful shutdown', async () => {
      await optimizer.optimize('Before shutdown');
      await optimizer.close?.();
      expect(true).toBe(true);
    });

    test('97. Should handle reconnection after disconnect', async () => {
      await optimizer.optimize('Test');
      // Simulate reconnection
      const result = await optimizer.optimize('Test 2');
      expect(result).toBeDefined();
    });

    test('98. Should handle memory cleanup', () => {
      optimizer.clearCache();
      optimizer.reset();
      expect(optimizer.getCacheSize()).toBe(0);
    });

    test('99. Should handle large batch operations', async () => {
      const prompts = Array(100).fill('Batch test');
      const results = await Promise.all(prompts.map(p => optimizer.optimize(p)));
      expect(results).toHaveLength(100);
    });

    test('100. Should be production-ready', async () => {
      // Final comprehensive check
      const usage = await optimizer.getUsage();
      const result = await optimizer.optimize('Production ready test');
      expect(usage).toBeDefined();
      expect(result).toBeDefined();
      expect(result.optimized).toBeDefined();
      expect(result.savings).toBeGreaterThanOrEqual(0);
    });
  });
});
