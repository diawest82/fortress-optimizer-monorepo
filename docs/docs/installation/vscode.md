---
sidebar_position: 4
title: VS Code Extension
---

# VS Code Extension Installation

Use Fortress directly in VS Code with the token optimizer extension.

## Overview

The Fortress Token Optimizer extension for VS Code provides real-time optimization for any text editor.

- **Supports**: VS Code 1.60+
- **Languages**: Works with any file type
- **Setup**: 2 minutes
- **Free tier**: 10K tokens/month

## Installation

### Step 1: Install Extension

1. Open VS Code
2. Press `Cmd+Shift+X` (or `Ctrl+Shift+X` on Windows)
3. Search: "Fortress Token Optimizer"
4. Click "Install"

Alternatively, install from [VS Code Marketplace](https://marketplace.visualstudio.com).

### Step 2: Set API Key

1. Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
2. Type: "Fortress: Configure API Key"
3. Paste your key from [dashboard](https://www.fortress-optimizer.com/dashboard)
4. Press Enter

### Step 3: Verify

1. Create a new file or open existing
2. Highlight any text
3. Press `Cmd+K, Cmd+I` (or `Ctrl+K, Ctrl+I`)
4. See optimization in popup

## Usage

### Quick Optimize

Highlight text and press shortcut:
- **Mac**: `Cmd+K, Cmd+I`
- **Windows/Linux**: `Ctrl+K, Ctrl+I`

Optimization appears in popup.

### Save Optimization

Click buttons in popup:
- 📋 Copy optimized text
- ↩️ Replace original
- 📊 View details

### Example

Original text:
```
Can you write a function that takes an array and returns only the even numbers?
```

After optimization:
```
Filter array to even numbers
```

Shown in popup:
- Original: 23 tokens
- Optimized: 5 tokens
- Savings: 78%

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|-------|
| Optimize | `Cmd+K, Cmd+I` | `Ctrl+K, Ctrl+I` |
| Quick fix | `Cmd+.` | `Ctrl+.` |
| Configure | `Cmd+Shift+P` | `Ctrl+Shift+P` |

## Settings

Access settings: VS Code Settings → Extensions → Fortress

**Available Options**:
- `fortress.enabled` - Enable/disable extension
- `fortress.showStats` - Show token stats
- `fortress.language` - Default language
- `fortress.timeout` - Request timeout (ms)
- `fortress.model` - Default model
- `fortress.aggressive` - Aggressive optimization

Example `.vscode/settings.json`:

```json
{
  "fortress": {
    "enabled": true,
    "showStats": true,
    "language": "en",
    "timeout": 10000,
    "aggressive": false
  }
}
```

## Features

### Status Bar Integration

Status bar shows:
- ✅ Extension active/inactive
- 📊 Current selection stats
- 💾 Cache status

Click to toggle or configure.

### Inline Lens

Hover over text to see token count:

```javascript
const prompt = "Filter array to even numbers"; // 5 tokens, -78%
```

Shows original token count and savings.

### Quick Fix

Use VS Code's quick fix feature:

1. Highlight text
2. Press `Cmd+.` (or `Ctrl+.`)
3. Select "Optimize with Fortress"
4. See results

### Batch Processing

Optimize entire file:

1. Open Command Palette: `Cmd+Shift+P`
2. Type: "Fortress: Optimize File"
3. Results shown in output panel

## Configuration Files

Create `.fortressrc.json` to customize behavior:

```json
{
  "apiKey": "env:FORTRESS_API_KEY",
  "optimization": {
    "level": "aggressive",
    "preserveFormatting": true,
    "language": "en"
  },
  "filePatterns": {
    "include": ["**/*.js", "**/*.ts", "**/*.py"],
    "exclude": ["node_modules/", "dist/", "**/*.test.*"]
  }
}
```

## Troubleshooting

### "Extension not activating"

1. Check VS Code version: should be 1.60+
2. Reload window: `Cmd+Shift+P` → "Developer: Reload Window"
3. Check output panel for errors

### "API key not working"

1. Verify key in [Dashboard](https://www.fortress-optimizer.com/dashboard)
2. Run "Fortress: Configure API Key" again
3. Try regenerating key if needed

### "No optimization appearing"

1. Ensure extension is enabled in settings
2. Check that text is selected
3. Verify API key is configured
4. Check network connection

### Performance Issues

If extension is slow:

1. Increase timeout: Settings → `fortress.timeout` → 15000
2. Disable on large files
3. Create `.fortressignore` to skip certain files
4. Check VS Code performance: `Cmd+Shift+P` → "Developer: Show Command Palette"

## Privacy & Security

- 🔒 End-to-end encryption
- ✅ No data storage
- ✅ GDPR compliant
- ✅ SOC 2 certified

See [Privacy Policy](https://www.fortress-optimizer.com/privacy) for details.

## Uninstall

1. Press `Cmd+Shift+X` (Extensions)
2. Find "Fortress Token Optimizer"
3. Click uninstall

This removes the extension. Your API key remains in settings.

## Support

- 📚 [Full docs](../)
- 🆘 [Troubleshooting](../guides/troubleshooting)
- 💬 [Support](https://www.fortress-optimizer.com/support)

## Next Steps

- [GitHub Copilot](./copilot) - Copilot integration
- [Slack Bot](./slack) - Slack integration
- [API Reference](../api-reference) - Complete API docs
- [Best Practices](../guides/best-practices) - Optimization tips
