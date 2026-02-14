# Fortress Token Optimizer - Neovim Plugin

Neovim plugin for token optimization directly in your editor.

## Installation

Using vim-plug:
```vim
Plug 'diawest82/fortress-optimizer.nvim'
```

Using packer:
```lua
use 'diawest82/fortress-optimizer.nvim'
```

## Configuration

```lua
require('fortress-optimizer').setup({
  api_key = os.getenv('FORTRESS_API_KEY'),
  optimization_level = 'balanced',
})
```

## Usage

### Commands

```vim
:FortressOptimize        " Optimize selected text
:FortressOptimizeBuffer  " Optimize entire buffer
:FortressUsage           " Show token usage
```

### Keybindings

```lua
-- Add to init.lua
local opts = { noremap = true, silent = true }
vim.keymap.set('v', '<leader>fo', ':FortressOptimize<CR>', opts)
```

## Features

- Real-time optimization
- Multiple optimization levels
- Token counting
- Usage statistics
- Works in normal, visual, and insert modes

## Coming Soon

Full implementation for Feb 17 launch.
