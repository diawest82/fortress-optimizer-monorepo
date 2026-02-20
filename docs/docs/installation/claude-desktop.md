---
sidebar_position: 5
title: Claude Desktop
---

# Claude Desktop Installation

Integrate Fortress with Anthropic's Claude Desktop app.

## Overview

Use Fortress to optimize prompts before sending them to Claude in the desktop app.

- **Supports**: Claude Desktop 1.0+
- **Setup**: 2 minutes
- **Features**: Real-time optimization

## Installation

### Step 1: Install Plugin

1. Open Claude Desktop
2. Settings → Plugins
3. Search: "Fortress Token Optimizer"
4. Click "Install"

### Step 2: Configure

1. Go to Settings → Extensions
2. Find "Fortress"
3. Paste API key from [dashboard](https://www.fortress-optimizer.com/dashboard)

### Step 3: Verify

1. In chat, type a prompt
2. Click "Optimize" button before sending
3. See optimization preview

## Usage

### Before Sending

Before submitting a prompt:

1. Type your prompt
2. Click "Optimize with Fortress" button
3. See optimized version with savings
4. Send optimized or original

### Example

**Original**:
```
Can you help me write a Python function that takes a list of 
numbers and filters it to keep only the even numbers? I need 
comments in the code.
```
Tokens: 37

**Optimized**:
```
Python function: filter list to even numbers with comments
```
Tokens: 11

**Savings**: 70%

## Features

### One-Click Optimization

Button in chat input area:
- Click to optimize before sending
- See side-by-side comparison
- Use original or optimized

### History

View optimization history:

Settings → Fortress History

Shows:
- Recent optimizations
- Savings per optimization
- Total savings

### Settings

**Language**: Choose your language (en, es, fr, etc.)
**Aggressive**: More aggressive optimization
**Show Stats**: Display token counts

## Integration with Claude

Fortress works seamlessly with Claude:

1. **Supports all Claude models**: Claude 3 Opus, Sonnet, Haiku
2. **Smart detection**: Recognizes prompts automatically
3. **Preserves context**: Maintains meaning perfectly
4. **Fast**: < 1 second optimization

## Examples

### Technical Prompt

**Before**:
```
I need help writing a REST API endpoint in Express.js that 
retrieves user data from a PostgreSQL database. The endpoint 
should include authentication checks and proper error handling.
```
(38 tokens)

**After**:
```
Express REST API: fetch user data from PostgreSQL with auth & error handling
```
(14 tokens)

**Savings**: 63%

### Creative Prompt

**Before**:
```
Please write a creative short story about a robot who learns 
to appreciate art. The story should be around 500 words and 
have a meaningful message about the intersection of technology 
and human creativity.
```
(40 tokens)

**After**:
```
500-word story: robot discovers art, exploring tech-human creativity intersection
```
(14 tokens)

**Savings**: 65%

## Troubleshooting

### "Plugin not showing"

1. Check Claude Desktop version (1.0+)
2. Restart Claude Desktop
3. Go to Settings → Reload Plugins

### "API key error"

1. Get new key from [Dashboard](https://www.fortress-optimizer.com/dashboard)
2. Go to Settings → Fortress
3. Paste key and confirm
4. Restart Claude

### "Optimization not showing"

1. Ensure plugin is enabled
2. Check internet connection
3. Verify API key
4. Try shorter prompt first

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open optimization | Click button or `Opt+O` |
| Swap versions | `Opt+S` |
| Copy optimized | `Opt+C` |

## Privacy

- 🔒 Encrypted end-to-end
- ✅ No data stored
- ✅ GDPR compliant

Your prompts are optimized locally when possible, sent encrypted when needed.

## Uninstall

1. Settings → Plugins
2. Find "Fortress Token Optimizer"
3. Click "Uninstall"

## Support

- 📚 [Full docs](../)
- 🆘 [Troubleshooting](../guides/troubleshooting)
- 💬 [Support](https://www.fortress-optimizer.com/support)

## Next Steps

- [Other Integrations](./npm) - npm, Copilot, VS Code
- [API Reference](../api-reference) - Complete API docs
- [Best Practices](../guides/best-practices) - Optimization tips
