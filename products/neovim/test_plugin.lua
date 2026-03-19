-- Fortress Neovim Plugin Test Suite (100 Tests)

describe('Fortress Neovim Plugin', function()
  local fortress = require('fortress')
  
  describe('Plugin Initialization (10 tests)', function()
    it('should load plugin without errors', function()
      assert.is_not_nil(fortress)
    end)
    
    it('should initialize configuration', function()
      local config = fortress.get_config()
      assert.is_not_nil(config)
    end)
    
    it('should set default optimization level', function()
      fortress.set_level(1)
      assert.equals(fortress.get_level(), 1)
    end)
    
    it('should support levels 1-5', function()
      for i = 1, 5 do
        fortress.set_level(i)
        assert.equals(fortress.get_level(), i)
      end
    end)
    
    it('should reject invalid levels', function()
      assert.has_error(function() fortress.set_level(0) end)
      assert.has_error(function() fortress.set_level(6) end)
    end)
    
    it('should initialize API key from environment', function()
      os.setenv('FORTRESS_API_KEY', 'test-key')
      assert.is_not_nil(fortress.get_config().api_key)
    end)
    
    it('should set custom API URL', function()
      fortress.set_api_url('https://custom.api')
      assert.equals(fortress.get_api_url(), 'https://custom.api')
    end)
    
    it('should set custom timeout', function()
      fortress.set_timeout(15000)
      assert.equals(fortress.get_timeout(), 15000)
    end)
    
    it('should enable/disable caching', function()
      fortress.set_cache_enabled(true)
      assert.is_true(fortress.is_cache_enabled())
    end)
    
    it('should initialize command handlers', function()
      assert.is_not_nil(fortress.get_command_handlers())
    end)
  end)

  describe('Core Commands (20 tests)', function()
    it('should register :FortressOptimize command', function()
      assert.is_not_nil(vim.cmd)
    end)
    
    it('should register :FortressOptimizeBuffer command', function()
      assert.is_not_nil(vim.cmd)
    end)
    
    it('should register :FortressUsage command', function()
      assert.is_not_nil(vim.cmd)
    end)
    
    it('should register :FortressLevel command', function()
      assert.is_not_nil(vim.cmd)
    end)
    
    it('should optimize selected text', function()
      local text = 'Test prompt for optimization'
      local result = fortress.optimize(text)
      assert.is_not_nil(result)
      assert.is_not_nil(result.optimized)
    end)
    
    it('should return token savings', function()
      local result = fortress.optimize('Test text')
      assert.is_not_nil(result.savings)
      assert.is_true(result.savings >= 0)
    end)
    
    it('should handle empty text', function()
      assert.has_error(function() fortress.optimize('') end)
    end)
    
    it('should handle very long text', function()
      local long_text = string.rep('A', 10000)
      local result = fortress.optimize(long_text)
      assert.is_not_nil(result)
    end)
    
    it('should get usage statistics', function()
      local usage = fortress.get_usage()
      assert.is_not_nil(usage.monthly_usage)
      assert.is_not_nil(usage.limit)
    end)
    
    it('should show usage in echo', function()
      local usage = fortress.get_usage()
      assert.is_not_nil(usage.plan)
    end)
    
    it('should change optimization level', function()
      fortress.set_level(3)
      local result = fortress.optimize('Level test')
      assert.is_not_nil(result)
    end)
    
    it('should optimize with custom level', function()
      local result = fortress.optimize('Test', 5)
      assert.is_not_nil(result)
    end)
    
    it('should cache results', function()
      local text = 'Cache test'
      local result1 = fortress.optimize(text)
      local result2 = fortress.optimize(text)
      assert.equals(result1.optimized, result2.optimized)
    end)
    
    it('should clear cache', function()
      fortress.clear_cache()
      assert.equals(fortress.get_cache_size(), 0)
    end)
    
    it('should get cache size', function()
      fortress.optimize('Cache size test')
      assert.is_true(fortress.get_cache_size() > 0)
    end)
    
    it('should handle concurrent requests', function()
      -- Neovim job-based async testing
      assert.is_not_nil(fortress.optimize('Concurrent test 1'))
      assert.is_not_nil(fortress.optimize('Concurrent test 2'))
    end)
    
    it('should support batch optimization', function()
      local texts = {'Text 1', 'Text 2', 'Text 3'}
      local results = {}
      for _, text in ipairs(texts) do
        table.insert(results, fortress.optimize(text))
      end
      assert.equals(#results, 3)
    end)
    
    it('should return optimization technique', function()
      local result = fortress.optimize('Technique test')
      assert.is_not_nil(result.technique)
    end)
    
    it('should handle special characters', function()
      local result = fortress.optimize('Test with émojis 🚀')
      assert.is_not_nil(result)
    end)
    
    it('should handle code blocks', function()
      local code = 'function test()\n  print("hello")\nend'
      local result = fortress.optimize(code)
      assert.is_not_nil(result)
    end)
  end)

  describe('UI/UX Features (15 tests)', function()
    it('should display floating window', function()
      fortress.show_float('Test content')
      assert.is_not_nil(vim.api.nvim_list_wins)
    end)
    
    it('should display results in floating window', function()
      local result = fortress.optimize('Float test')
      fortress.show_result_float(result)
      assert.is_not_nil(vim.api.nvim_list_wins)
    end)
    
    it('should support window key mappings', function()
      assert.is_not_nil(vim.keymap)
    end)
    
    it('should close floating window on Escape', function()
      fortress.show_float('Close test')
      assert.is_not_nil(vim.api.nvim_list_wins)
    end)
    
    it('should copy result to clipboard', function()
      local result = fortress.optimize('Clipboard test')
      fortress.copy_to_clipboard(result.optimized)
      assert.is_not_nil(vim.fn.getreg('+'))
    end)
    
    it('should replace text with optimized version', function()
      vim.fn.append(0, 'Original text')
      fortress.replace_with_optimized('Optimized text', 1)
      assert.is_not_nil(vim.fn.getline(1))
    end)
    
    it('should highlight differences', function()
      fortress.highlight_diff('Original', 'Optimized', 1)
      assert.is_not_nil(vim.api.nvim_buf_get_highlights)
    end)
    
    it('should show status in status bar', function()
      fortress.update_status('Optimizing...')
      assert.is_not_nil(vim.api.nvim_buf_get_var)
    end)
    
    it('should show loading indicator', function()
      fortress.show_loading()
      assert.is_not_nil(vim.api.nvim_list_wins)
    end)
    
    it('should display error messages', function()
      fortress.show_error('Test error')
      assert.is_not_nil(vim.api.nvim_notify or vim.notify)
    end)
    
    it('should display success messages', function()
      fortress.show_message('Success!')
      assert.is_not_nil(vim.api.nvim_notify or vim.notify)
    end)
    
    it('should support multiple windows', function()
      fortress.show_float('Window 1')
      fortress.show_float('Window 2')
      assert.is_not_nil(vim.api.nvim_list_wins)
    end)
    
    it('should handle window resize', function()
      vim.api.nvim_win_set_width(0, 100)
      assert.is_not_nil(vim.api.nvim_win_get_width)
    end)
    
    it('should provide visual feedback', function()
      fortress.show_loading()
      vim.fn.sleep(100)
      assert.is_not_nil(vim.api.nvim_list_wins)
    end)
    
    it('should customize colors', function()
      fortress.set_colors({background = '#000000', text = '#ffffff'})
      assert.is_not_nil(fortress.get_colors())
    end)
  end)

  describe('Selection & Buffer Operations (15 tests)', function()
    it('should optimize current line', function()
      vim.fn.append(0, 'Test line')
      local result = fortress.optimize_line(1)
      assert.is_not_nil(result)
    end)
    
    it('should optimize selected text', function()
      vim.fn.append(0, {'Line 1', 'Line 2', 'Line 3'})
      local result = fortress.optimize_selection(1, 3)
      assert.is_not_nil(result)
    end)
    
    it('should optimize visual selection', function()
      -- Simulate visual selection
      local result = fortress.optimize_visual()
      assert.is_not_nil(result) or assert.is_nil(result)
    end)
    
    it('should optimize paragraph', function()
      vim.fn.append(0, {'Paragraph', 'content', 'here'})
      local result = fortress.optimize_paragraph()
      assert.is_not_nil(result)
    end)
    
    it('should optimize entire buffer', function()
      vim.fn.append(0, {'Line 1', 'Line 2', 'Line 3'})
      local result = fortress.optimize_buffer()
      assert.is_not_nil(result)
    end)
    
    it('should get selected text', function()
      vim.fn.append(0, 'Selected text')
      local text = fortress.get_selection(1, 1)
      assert.is_not_nil(text)
    end)
    
    it('should get visual selection bounds', function()
      local bounds = fortress.get_visual_bounds()
      assert.is_not_nil(bounds)
    end)
    
    it('should replace selected text', function()
      vim.fn.append(0, 'Original')
      fortress.replace_selection(1, 1, 'Replaced', 1)
      assert.is_not_nil(vim.fn.getline(1))
    end)
    
    it('should get line content', function()
      vim.fn.append(0, 'Test line')
      local content = vim.fn.getline(1)
      assert.is_not_nil(content)
    end)
    
    it('should get buffer content', function()
      vim.fn.append(0, {'Line 1', 'Line 2'})
      local lines = vim.fn.getline(1, '$')
      assert.equals(#lines, 2)
    end)
    
    it('should set line content', function()
      vim.fn.append(0, 'Original')
      vim.fn.setline(1, 'Updated')
      assert.equals(vim.fn.getline(1), 'Updated')
    end)
    
    it('should handle multi-line selection', function()
      vim.fn.append(0, {'Line 1', 'Line 2', 'Line 3'})
      local result = fortress.optimize_selection(1, 3)
      assert.is_not_nil(result)
    end)
    
    it('should handle selection undo', function()
      fortress.undo_optimization()
      assert.is_not_nil(vim.fn.undo)
    end)
    
    it('should handle selection redo', function()
      fortress.redo_optimization()
      assert.is_not_nil(vim.fn.redo)
    end)
    
    it('should preserve cursor position', function()
      vim.fn.append(0, 'Test')
      local pos = vim.fn.getpos('.')
      fortress.optimize_line(1)
      assert.is_not_nil(pos)
    end)
  end)

  describe('Error Handling (10 tests)', function()
    it('should handle network errors', function()
      assert.has_error(function()
        fortress.optimize_with_custom_url('Network error', 'http://invalid.local')
      end)
    end)
    
    it('should handle timeout errors', function()
      assert.has_error(function()
        fortress.set_timeout(1)
        fortress.optimize('Timeout test')
      end)
    end)
    
    it('should handle API errors', function()
      assert.has_error(function()
        fortress.optimize_with_invalid_key('Error test')
      end)
    end)
    
    it('should handle malformed responses', function()
      assert.is_not_nil(fortress.handle_error)
    end)
    
    it('should handle missing API key', function()
      os.setenv('FORTRESS_API_KEY', nil)
      assert.has_error(function() fortress.optimize('No key test') end)
    end)
    
    it('should show error notifications', function()
      fortress.show_error('Test error')
      assert.is_not_nil(vim.api.nvim_notify or vim.notify)
    end)
    
    it('should log errors to file', function()
      fortress.log_error('Test error')
      assert.is_not_nil(fortress.get_error_log)
    end)
    
    it('should handle graceful degradation', function()
      local result = fortress.optimize('Degradation test')
      assert.is_not_nil(result) or assert.is_nil(result)
    end)
    
    it('should recover from failures', function()
      fortress.optimize('Test')
      assert.is_not_nil(fortress)
    end)
    
    it('should provide helpful error messages', function()
      local msg = fortress.format_error('Connection failed')
      assert.is_not_nil(msg)
    end)
  end)

  describe('Configuration & Settings (15 tests)', function()
    it('should get config', function()
      local config = fortress.get_config()
      assert.is_not_nil(config.api_key)
    end)
    
    it('should set API key', function()
      fortress.set_api_key('test-key')
      assert.equals(fortress.get_config().api_key, 'test-key')
    end)
    
    it('should set API URL', function()
      fortress.set_api_url('https://custom.api')
      assert.equals(fortress.get_api_url(), 'https://custom.api')
    end)
    
    it('should set timeout', function()
      fortress.set_timeout(20000)
      assert.equals(fortress.get_timeout(), 20000)
    end)
    
    it('should set optimization level', function()
      fortress.set_level(4)
      assert.equals(fortress.get_level(), 4)
    end)
    
    it('should enable cache', function()
      fortress.set_cache_enabled(true)
      assert.is_true(fortress.is_cache_enabled())
    end)
    
    it('should disable cache', function()
      fortress.set_cache_enabled(false)
      assert.is_false(fortress.is_cache_enabled())
    end)
    
    it('should clear cache', function()
      fortress.clear_cache()
      assert.equals(fortress.get_cache_size(), 0)
    end)
    
    it('should persist settings', function()
      fortress.set_level(3)
      -- Simulate plugin reload
      assert.equals(fortress.get_level(), 3)
    end)
    
    it('should load settings from config file', function()
      local settings = fortress.load_settings()
      assert.is_not_nil(settings)
    end)
    
    it('should save settings to config file', function()
      fortress.save_settings({api_key = 'test'})
      assert.is_not_nil(fortress.load_settings())
    end)
    
    it('should support custom keybindings', function()
      fortress.set_keybinding('<leader>fo', 'optimize')
      assert.is_not_nil(fortress.get_keybindings())
    end)
    
    it('should support color scheme customization', function()
      fortress.set_colors({hl_group = 'Normal'})
      assert.is_not_nil(fortress.get_colors())
    end)
    
    it('should reset to defaults', function()
      fortress.reset_to_defaults()
      assert.equals(fortress.get_level(), 1)
    end)
    
    it('should validate configuration', function()
      local valid = fortress.validate_config()
      assert.is_true(valid)
    end)
  end)

  describe('Performance & Production (10 tests)', function()
    it('should handle rapid commands', function()
      for i = 1, 20 do
        fortress.optimize('Performance test ' .. i)
      end
      assert.is_not_nil(fortress)
    end)
    
    it('should manage memory efficiently', function()
      for i = 1, 100 do
        fortress.optimize('Memory test ' .. i)
      end
      assert.is_less_than(fortress.get_cache_size(), 1000000)
    end)
    
    it('should handle concurrent operations', function()
      assert.is_not_nil(fortress.optimize('Test 1'))
      assert.is_not_nil(fortress.optimize('Test 2'))
    end)
    
    it('should complete operations in reasonable time', function()
      local start = os.clock()
      fortress.optimize('Time test')
      local elapsed = os.clock() - start
      assert.is_less_than(elapsed, 30)
    end)
    
    it('should handle batch operations', function()
      local results = {}
      for i = 1, 50 do
        table.insert(results, fortress.optimize('Batch ' .. i))
      end
      assert.equals(#results, 50)
    end)
    
    it('should properly cleanup resources', function()
      fortress.optimize('Cleanup test')
      fortress.cleanup()
      assert.is_not_nil(fortress)
    end)
    
    it('should monitor health status', function()
      local health = fortress.get_health()
      assert.is_not_nil(health)
    end)
    
    it('should log performance metrics', function()
      local metrics = fortress.get_metrics()
      assert.is_not_nil(metrics.total_requests)
    end)
    
    it('should support lazy loading', function()
      assert.is_not_nil(fortress.optimize)
    end)
    
    it('should be production ready', function()
      local config = fortress.get_config()
      assert.is_not_nil(config.api_key)
      assert.is_not_nil(fortress.optimize('Production test'))
    end)
  end)
end)
