---
sidebar_position: 3
title: Slack
---

# Slack Bot Installation

Use Fortress in your Slack workspace to optimize prompts in team chat.

## Overview

The Fortress Slack bot lets your team optimize prompts directly in Slack.

- **Slack**: All workspaces supported
- **Setup**: 3 minutes
- **Users**: Unlimited in your workspace

## Installation

### Step 1: Add to Slack

1. Go to [Fortress Slack App](https://slack.com/apps)
2. Search: "Fortress Token Optimizer"
3. Click "Add to Slack"
4. Choose your workspace
5. Click "Authorize"

### Step 2: Configure API Key

1. Open Fortress app in Slack
2. Click "Home" tab
3. Click "Configure API Key"
4. Paste your key from [dashboard](https://www.fortress-optimizer.com/dashboard)

### Step 3: Verify

1. In any Slack channel, type: `@fortress optimize "Your prompt here"`
2. Bot responds with optimized version

## Usage

### Basic Command

```
@fortress optimize "Your prompt here"
```

Response shows:
- ✅ Optimized text
- 📊 Token savings
- 💰 Cost reduction

### Example

```
@fortress optimize "Can you write a function that takes an array and returns only the even numbers?"
```

**Bot responds**:
```
Original: "Can you write a function that takes an array and returns only the even numbers?"
Tokens: 23

Optimized: "Filter array to even numbers"
Tokens: 5

Savings: 78% (18 tokens) - Save ~$0.0054 per call
```

### Advanced Options

```
@fortress optimize -m gpt-4 -l en "Your prompt here"
```

**Options**:
- `-m` / `--model` - Target model (gpt-4, gpt-3.5, claude, etc.)
- `-l` / `--language` - Language (en, es, fr, de, etc.)
- `-a` / `--aggressive` - Aggressive optimization

## Commands

| Command | Description |
|---------|-------------|
| `@fortress optimize` | Optimize a prompt |
| `@fortress help` | Show help |
| `@fortress config` | Configure API key |
| `@fortress stats` | Show team stats |
| `@fortress history` | View recent optimizations |

## Features

### Team Statistics

Track your team's total savings:

```
@fortress stats
```

Shows:
- Total optimizations
- Average savings
- Cost reduction
- Team comparison

### Optimization History

View recent optimizations:

```
@fortress history
```

Shows last 10 optimizations with results.

### Threaded Responses

Use in threads to keep conversations clean:

1. Reply in thread
2. Type `@fortress optimize "prompt"`
3. Result appears in thread

## Permissions

Fortress needs:
- `chat:write` - Send messages
- `app_mentions:read` - Respond to mentions
- `users:read` - Read user info (for attribution)

All permissions are workspace-specific and can be revoked anytime.

## Settings

### Channel Configuration

Allow Fortress in specific channels:

```
@fortress config channels #general #ai-prompts
```

### Notification Preferences

```
@fortress config notify @username on-milestone
```

Notify when team reaches savings milestones.

### Auto-Optimization

Enable automatic optimization:

```
@fortress config auto enabled
```

Fortress will automatically optimize messages containing prompts.

## Troubleshooting

### "Command not recognized"

1. Ensure Fortress is added to workspace
2. Try in different channel
3. Reload Slack: Cmd+Q then reopen

### "API key invalid"

1. Get new key from [Dashboard](https://www.fortress-optimizer.com/dashboard)
2. Run `@fortress config` 
3. Paste key

### "Rate limit reached"

Your team has exceeded monthly quota.

Check [Dashboard](https://www.fortress-optimizer.com/dashboard) for:
- Remaining tokens
- Usage breakdown
- Upgrade options

### "Prompt too long"

Slack has 4000 character limit. Break into multiple prompts:

```
@fortress optimize "First part of prompt" "Second part"
```

## Permissions & Privacy

- ✅ Your prompts are encrypted
- ✅ No data stored after optimization
- ✅ GDPR compliant
- ✅ SOC 2 certified

See [Privacy Policy](https://www.fortress-optimizer.com/privacy) for details.

## Uninstall

1. Open Slack workspace
2. Settings → Apps & integrations
3. Find "Fortress Token Optimizer"
4. Click "Remove"

This removes the bot but doesn't affect your Fortress account.

## Support

- 📚 [Full docs](../)
- 🆘 [Troubleshooting](../guides/troubleshooting)
- 💬 [Support](https://www.fortress-optimizer.com/support)

## Next Steps

- [VS Code Extension](./vscode) - VS Code guide
- [API Reference](../api-reference) - Complete API docs
- [Best Practices](../guides/best-practices) - Tips for success
