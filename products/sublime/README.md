# Fortress Token Optimizer - Sublime Text Plugin

Sublime Text 3+ plugin for token optimization.

## Installation

Using Package Control:

1. Open Command Palette: `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Package Control: Install Package"
3. Search for "Fortress Token Optimizer"
4. Install

## Configuration

Create `Fortress.sublime-settings`:

```json
{
  "api_key": "fort-...",
  "optimization_level": "balanced",
  "auto_optimize": false
}
```

## Usage

### Commands

- **Command Palette** → "Fortress: Optimize Selection"
- **Command Palette** → "Fortress: Optimize Line"
- **Command Palette** → "Fortress: Show Usage"

### Keybindings

```json
[
  {
    "keys": ["cmd+shift+o"],
    "command": "fortress_optimize_selection"
  }
]
```

## Features

- Optimize selected text
- Optimize entire line
- Token counting
- Usage tracking
- Multi-level optimization

## Coming Soon

Full implementation for Feb 17 launch.
