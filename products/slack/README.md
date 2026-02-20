# Fortress Token Optimizer - Slack Bot

Slack bot for real-time token optimization in your Slack workspace.

## Installation

### 1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Name: "Fortress Token Optimizer"
5. Select your workspace

### 2. Configure Bot Permissions

In your app settings:

**Scopes needed:**
- `app_mentions:read` - Receive mentions
- `chat:write` - Send messages
- `commands` - Slash commands
- `message:read` - Read messages

### 3. Get Tokens

- **Bot Token**: Copy from "OAuth & Permissions" page (starts with `xoxb-`)
- **App Token**: Create in "Basic Information" (starts with `xapp-`)

### 4. Install Bot

1. In "OAuth & Permissions", click "Install to Workspace"
2. Grant permissions
3. Copy Bot Token and App Token

### 5. Enable Socket Mode

In "Basic Information", toggle "Socket Mode" ON

## Local Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_APP_TOKEN="xapp-..."
export FORTRESS_API_KEY="fort-..."

# Run bot
python bot.py
```

## Docker Deployment

```bash
docker build -t fortress-slack-bot .
docker run -e SLACK_BOT_TOKEN="xoxb-..." \
           -e SLACK_APP_TOKEN="xapp-..." \
           -e FORTRESS_API_KEY="fort-..." \
           fortress-slack-bot
```

## Commands

### Optimize Text
```
@fortress optimize Your text to be optimized here
```

Saves the optimized prompt and shows token savings.

### Get Usage
```
@fortress usage
```

Shows monthly token usage and limits.

### Get Help
```
@fortress help
```

Shows all available commands and usage.

### Pricing
```
@fortress pricing
```

Shows Fortress pricing tiers.

## Features

- ✅ Real-time prompt optimization
- ✅ Token counting and savings display
- ✅ Usage tracking and limits
- ✅ Multiple optimization levels
- ✅ Works in channels and DMs
- ✅ Supports message threads

## Optimization Levels

Add level at end of command:

```
@fortress optimize balanced Your text here
@fortress optimize conservative Your text here
@fortress optimize aggressive Your text here
```

- **Conservative**: ~5% token savings, minimal changes
- **Balanced**: ~15% token savings (default), good balance
- **Aggressive**: ~30% token savings, more changes

## Troubleshooting

### Bot not responding
- Check bot is invited to channel: `/invite @fortress`
- Verify tokens are correct
- Check app logs for errors

### "Optimization failed" error
- Verify `FORTRESS_API_KEY` is correct
- Check internet connection
- Ensure Fortress API is accessible

### Rate limiting
- You've hit your monthly token limit
- Upgrade plan or wait for reset

## Architecture

```
Slack Message
    ↓
Socket Mode
    ↓
Fortress Bot (Python)
    ↓
Fortress API (Backend)
    ↓
Optimization Result
    ↓
Slack Response
```

## Support

- 📖 Docs: [docs.fortress-optimizer.com](https://docs.fortress-optimizer.com)
- 💬 Discord: [discord.gg/fortress](https://discord.gg/fortress)
- 📧 Email: support@fortress-optimizer.com

## License

MIT
