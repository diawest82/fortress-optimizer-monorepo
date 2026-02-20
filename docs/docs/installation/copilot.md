---
sidebar_position: 2
title: GitHub Copilot
---

# GitHub Copilot Installation

Optimize your Copilot suggestions with Fortress in VS Code.

## Overview

The Fortress extension for GitHub Copilot automatically optimizes all suggestions and generated code.

- **Supports**: VS Code 1.60+
- **Copilot**: Extension required
- **Setup**: 2 minutes

## Installation

### Step 1: Install Extension

1. Open VS Code
2. Press `Cmd+Shift+X` (or `Ctrl+Shift+X` on Windows)
3. Search: "Fortress Optimizer for Copilot"
4. Click "Install"

### Step 2: Configure API Key

1. Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows)
2. Type: "Fortress: Configure API Key"
3. Paste your API key from [dashboard](https://www.fortress-optimizer.com/dashboard)
4. Press Enter

### Step 3: Verify

1. Open any file
2. Start typing code
3. Trigger Copilot suggestion
4. You should see optimization info in the status bar

## Usage

### Automatic Optimization

Every Copilot suggestion is automatically analyzed:
- ✅ Optimized code appears in suggestions
- 📊 Savings shown in hover tooltip
- 💾 Uses cached results when available

### Manual Optimization

To optimize a code block:

1. Select the code
2. Press `Cmd+Shift+O` (or `Ctrl+Shift+O` on Windows)
3. Click "Optimize with Fortress"
4. See results in side panel

### Settings

Access settings: VS Code Settings → Extensions → Fortress Optimizer

**Options**:
- `fortressOptimizer.enabled` - Enable/disable optimization
- `fortressOptimizer.showSavings` - Show savings in tooltips
- `fortressOptimizer.language` - Language preference
- `fortressOptimizer.timeout` - Request timeout (ms)

## Examples

### Example 1: Function Generation

```javascript
// Copilot generated
function filterEvenNumbers(arr) {
  return arr.filter(num => num % 2 === 0);
}

// Fortress optimized
const filterEvenNumbers = arr => arr.filter(n => n % 2 === 0);

// Savings: 15% tokens
```

### Example 2: Comment Generation

```javascript
// Original
// This function takes an array of numbers and filters out
// all the odd numbers, returning only the even ones in order

// Optimized
// Filter to even numbers

// Savings: 78% tokens
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Optimize selection | `Cmd+Shift+O` / `Ctrl+Shift+O` |
| Configure API key | `Cmd+Shift+P` → "Fortress: Configure" |
| Show savings | Hover over suggestion |
| Disable temporarily | Click extension icon |

## Troubleshooting

### "Extension failed to activate"

1. Check VS Code version (1.60+)
2. Ensure Copilot extension is installed
3. Reload VS Code: `Cmd+Shift+P` → "Reload Window"

### "API key not recognized"

1. Get new key from [Dashboard](https://www.fortress-optimizer.com/dashboard)
2. Run "Fortress: Configure API Key"
3. Paste key and confirm

### "No optimization showing"

1. Check `fortressOptimizer.enabled` setting
2. Ensure you're in a supported language file
3. Restart VS Code

### Performance Issues

If optimization is slow:

1. Increase timeout: Settings → `fortressOptimizer.timeout` → 15000
2. Disable on large files: Add to `.fortressignore`
3. Check network connection

## Advanced Features

### Batch Optimization

Optimize entire files:

1. Open Command Palette: `Cmd+Shift+P`
2. Type: "Fortress: Optimize File"
3. See results in output panel

### Custom Rules

Create `.fortressrc.json` to customize behavior:

```json
{
  "optimization": {
    "level": "aggressive",
    "preserveComments": false,
    "language": "en"
  },
  "languages": ["javascript", "typescript", "python"],
  "ignored": ["*.test.js", "dist/"]
}
```

## Uninstall

1. Press `Cmd+Shift+X` (VS Code Extensions)
2. Find "Fortress Optimizer"
3. Click uninstall

This removes the extension but keeps your API key configuration.

## Support

- 📚 [Full docs](../)
- 🆘 [Troubleshooting](../guides/troubleshooting)
- 💬 [Support](https://www.fortress-optimizer.com/support)

## Next Steps

- [VS Code Extension](./vscode) - VS Code extension guide
- [API Reference](../api-reference) - Complete API docs
- [Best Practices](../guides/best-practices) - Optimization tips
