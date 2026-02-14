# Neovim Plugin Setup

Add to your `init.lua`:

```lua
require("fortress-optimizer").setup({
  api_key = os.getenv("FORTRESS_API_KEY"),
  optimization_level = "balanced",
})

-- Optional: Set keybindings
vim.keymap.set("v", "<leader>fo", ":FortressOptimize<CR>", { noremap = true })
vim.keymap.set("n", "<leader>fb", ":FortressOptimizeBuffer<CR>", { noremap = true })
```

## Commands

- `:FortressOptimize` - Optimize selected text
- `:FortressOptimizeBuffer` - Optimize entire buffer
- `:FortressUsage` - Show token usage
- `:FortressLevel {level}` - Set optimization level (conservative/balanced/aggressive)
