-- Fortress Token Optimizer - Neovim Plugin
-- Lua implementation for Neovim

local M = {}

M.config = {
  api_key = os.getenv("FORTRESS_API_KEY"),
  api_url = os.getenv("FORTRESS_URL") or "https://api.fortress-optimizer.com",
  optimization_level = "balanced",
}

-- Setup function
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})
  
  -- Create commands
  vim.api.nvim_create_user_command("FortressOptimize", M.optimize_selection, {})
  vim.api.nvim_create_user_command("FortressOptimizeBuffer", M.optimize_buffer, {})
  vim.api.nvim_create_user_command("FortressUsage", M.show_usage, {})
  vim.api.nvim_create_user_command("FortressLevel", function(opts)
    M.set_optimization_level(opts.args)
  end, { nargs = 1 })
end

-- Get selection or line
local function get_selected_text()
  local start_pos = vim.fn.getpos("'<")
  local end_pos = vim.fn.getpos("'>")
  
  if start_pos[2] == 0 then
    -- No selection, get current line
    return vim.fn.getline(".")
  end
  
  local lines = vim.fn.getline(start_pos[2], end_pos[2])
  return table.concat(lines, "\n")
end

-- Optimize selected text
function M.optimize_selection()
  local text = get_selected_text()
  if text == "" then
    vim.notify("No text selected", vim.log.levels.WARN)
    return
  end
  
  M.call_api(text)
end

-- Optimize entire buffer
function M.optimize_buffer()
  local lines = vim.api.nvim_buf_get_lines(0, 0, -1, true)
  local text = table.concat(lines, "\n")
  
  M.call_api(text)
end

-- Call Fortress API
function M.call_api(text)
  if not M.config.api_key or M.config.api_key == "" then
    vim.notify("Fortress: API key not set. Set FORTRESS_API_KEY env var or call setup({api_key = 'fk_...'})", vim.log.levels.ERROR)
    return
  end
  vim.notify("Optimizing...", vim.log.levels.INFO)
  
  local payload = vim.fn.json_encode({
    prompt = text,
    level = M.config.optimization_level,
    provider = "general",
  })
  
  -- HTTPS enforcement
  if not M.config.api_url:match("^https://") and not M.config.api_url:match("^http://localhost") then
    vim.notify("Fortress API requires HTTPS.", vim.log.levels.ERROR)
    return
  end

  -- Use curl to call API (all arguments shell-escaped to prevent injection)
  local cmd = string.format(
    'curl -s -X POST %s -H %s -H "Content-Type: application/json" -d %s',
    vim.fn.shellescape(M.config.api_url .. "/api/optimize"),
    vim.fn.shellescape("Authorization: Bearer " .. M.config.api_key),
    vim.fn.shellescape(payload)
  )
  
  vim.fn.jobstart(cmd, {
    on_stdout = function(_, data)
      if data and #data > 0 then
        M.handle_response(table.concat(data, "\n"))
      end
    end,
    on_stderr = function(_, data)
      if data and #data > 0 then
        vim.notify("Error: " .. table.concat(data, "\n"), vim.log.levels.ERROR)
      end
    end,
  })
end

-- Handle API response
function M.handle_response(response)
  local ok, result = pcall(vim.fn.json_decode, response)
  
  if not ok or result.status ~= "success" then
    vim.notify("Optimization failed", vim.log.levels.ERROR)
    return
  end
  
  local opt = result.optimization
  local tokens = result.tokens
  
  -- Show results in a floating window
  local buf = vim.api.nvim_create_buf(false, true)
  
  local lines = {
    "Fortress Token Optimizer Results",
    "================================",
    "",
    "Optimized Text:",
    opt.optimized_prompt,
    "",
    "Statistics:",
    string.format("  Original: %d tokens", tokens.original),
    string.format("  Optimized: %d tokens", tokens.optimized),
    string.format("  Saved: %d tokens (%.1f%%)", tokens.savings, tokens.savings_percentage),
    string.format("  Technique: %s", opt.technique),
  }
  
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  
  -- Create floating window
  local width = 60
  local height = #lines + 2
  local opts = {
    relative = "cursor",
    width = width,
    height = height,
    col = 0,
    row = 1,
    style = "minimal",
    border = "rounded",
  }
  
  vim.api.nvim_open_win(buf, true, opts)
  
  -- Copy optimized text to clipboard
  vim.fn.setreg("+", opt.optimized_prompt)
  vim.notify("Optimized text copied to clipboard", vim.log.levels.INFO)
end

-- Show usage statistics
function M.show_usage()
  if not M.config.api_key or M.config.api_key == "" then
    vim.notify("Fortress: API key not set.", vim.log.levels.ERROR)
    return
  end
  local cmd = string.format(
    'curl -s -X GET %s -H %s',
    vim.fn.shellescape(M.config.api_url .. "/api/usage"),
    vim.fn.shellescape("Authorization: Bearer " .. M.config.api_key)
  )
  
  vim.fn.jobstart(cmd, {
    on_stdout = function(_, data)
      if data and #data > 0 then
        local ok, usage = pcall(vim.fn.json_decode, table.concat(data, "\n"))
        if ok then
          M.show_usage_window(usage)
        end
      end
    end,
  })
end

-- Show usage in floating window
function M.show_usage_window(usage)
  local buf = vim.api.nvim_create_buf(false, true)
  
  local limit_str = usage.tokens_limit == "unlimited" and "unlimited" or tostring(usage.tokens_limit)
  local remaining_str = usage.tokens_remaining == "unlimited" and "unlimited" or tostring(usage.tokens_remaining)

  local lines = {
    "Token Usage Statistics",
    "=====================",
    "",
    string.format("  Tier: %s", usage.tier or "free"),
    string.format("  Tokens Optimized: %d", usage.tokens_optimized or 0),
    string.format("  Tokens Saved: %d", usage.tokens_saved or 0),
    string.format("  Requests: %d", usage.requests or 0),
    string.format("  Limit: %s", limit_str),
    string.format("  Remaining: %s", remaining_str),
    string.format("  Reset: %s", usage.reset_date or "N/A"),
  }
  
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  
  local width = 40
  local height = #lines + 2
  local opts = {
    relative = "cursor",
    width = width,
    height = height,
    col = 0,
    row = 1,
    style = "minimal",
    border = "rounded",
  }
  
  vim.api.nvim_open_win(buf, true, opts)
end

-- Set optimization level
function M.set_optimization_level(level)
  if level == "conservative" or level == "balanced" or level == "aggressive" then
    M.config.optimization_level = level
    vim.notify(string.format("Optimization level set to: %s", level), vim.log.levels.INFO)
  else
    vim.notify("Invalid level. Use: conservative, balanced, or aggressive", vim.log.levels.ERROR)
  end
end

return M
