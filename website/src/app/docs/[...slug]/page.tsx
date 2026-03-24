import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Import documentation content
const docContent: Record<string, string> = {
  'getting-started': `# Getting Started

Welcome to Fortress Token Optimizer! This guide will help you get up and running in minutes.

## What is Fortress?

Fortress Token Optimizer is an intelligent token optimization platform that helps you save 10-20% on LLM API costs. By analyzing your prompts and restructuring them intelligently, Fortress reduces token usage while maintaining quality.

## Quick Start

### 1. Get an API Key

Sign up at [www.fortress-optimizer.com](https://www.fortress-optimizer.com) and generate your API key from the dashboard.

### 2. Choose Your Platform

Fortress works with your favorite tools:

- **npm Package** - For Node.js/TypeScript projects
- **GitHub Copilot** - VS Code extension
- **Slack** - Team collaboration
- **VS Code** - Direct editor integration
- **Claude Desktop** - Desktop app integration
- **+ 6 more platforms**

### 3. Start Optimizing

Once installed, simply use Fortress normally. It automatically optimizes your prompts in the background.

## Key Features

- ⚡ **Real-time Optimization** - Instant token calculation and savings
- 🔒 **Secure** - Your data stays private, encrypted end-to-end
- 💰 **Cost Savings** - Save 10-20% on API costs automatically
- 📊 **Analytics** - Track savings with detailed dashboards
- 🚀 **Easy Setup** - Works with your existing tools

## Next Steps

1. [Install Fortress](/docs/installation/npm) for your platform
2. [Learn how it works](/docs/guides/how-it-works)
3. [Check the API reference](/docs/api-reference)`,

  'what-is-fortress': `# What is Fortress?

Fortress Token Optimizer is a tool that helps you save money on Large Language Model (LLM) API costs like OpenAI's GPT-4, Claude, and others.

## The Problem

Every time you send a prompt to an LLM API, you pay based on the number of tokens in your request. Many prompts contain:

- Redundant sentences
- Unnecessary context
- Verbose explanations
- Duplicate information

This means you're paying for tokens you don't actually need.

## The Solution

Fortress analyzes your prompts and restructures them to be more efficient while keeping the meaning intact. The result: you use fewer tokens and pay less, typically **10-20% savings**.

## How Much Can You Save?

Your savings depend on your usage. Typical examples:

- **Individual developer** spending $50-100/mo on APIs → saves ~$10-20/month
- **Team of 10** spending $500/mo → saves ~$100/month
- **Large org** spending $5,000+/mo → saves ~$1,000+/month

## Pricing

- **Free**: 50K tokens/month, 5 core platforms — $0
- **Pro**: Unlimited tokens, all 12 platforms — $15/month ($12/month annual)
- **Teams**: Unlimited tokens, team management — starting at $60/month (5 seats)
- **Enterprise**: Custom pricing — [contact sales](mailto:sales@fortress-optimizer.com)

[View full pricing →](/pricing)

## Who Should Use Fortress?

✅ Teams using Claude, ChatGPT, or other LLMs regularly
✅ Companies looking to reduce API costs
✅ Developers optimizing prompt engineering
✅ Anyone sending frequent API requests

## What Makes Fortress Different?

- **Privacy-first** — Prompts are processed in real-time and not stored permanently. Optimization logs are retained for 90 days for analytics, then automatically deleted.
- **Works everywhere** — 12+ platforms including npm, VS Code, GitHub Copilot, Slack, Claude Desktop, and more
- **Real-time** — See savings immediately in your dashboard
- **Transparent** — Control exactly how aggressively to optimize with 3 levels (conservative, balanced, aggressive)
- **API key security** — Keys are hashed with SHA-256, never stored in plaintext`,

  'quick-start': `# Quick Start (5 minutes)

Get Fortress Token Optimizer running in just 5 minutes.

## Step 1: Create Account (1 min)

1. Go to [fortress-optimizer.com](https://fortress-optimizer.com)
2. Click "Sign Up"
3. Create account with email/password

## Step 2: Generate API Key (1 min)

1. Log in to your dashboard
2. Go to Settings → API Keys
3. Click "Generate New Key"
4. Copy your API key (keep it secret!)

## Step 3: Install Fortress (2 min)

Choose your platform:

- **[npm Package](/docs/installation/npm)** - For JavaScript/Node.js
- **[VS Code](/docs/installation/vscode)** - IDE extension
- **[GitHub Copilot](/docs/installation/copilot)** - Copilot integration
- **[Slack](/docs/installation/slack)** - Team collaboration
- **[Claude Desktop](/docs/installation/claude-desktop)** - Desktop app

## Step 4: Start Optimizing (1 min)

Once installed:

1. Paste your prompt into Fortress
2. See your optimized version
3. View token savings
4. Copy optimized prompt
5. Use it with your LLM API

## Example

**Original prompt:**
"Can you please help me write a function that takes an array and returns a new array with only the even numbers filtered out? I need it to work with any type of array."

**Optimized:**
"Filter array to return only even numbers"

**Savings:** 78% tokens saved!

## Pricing

- **Free**: 50K tokens/month, 5 core platforms
- **Pro**: $15/mo - Unlimited tokens, all 12 platforms
- **Teams**: Starting at $60/mo - Unlimited tokens, team management
- **Enterprise**: Coming soon - Custom pricing, 500+ seats

## Next Steps

- Read [How It Works](/docs/guides/how-it-works)
- Check [Best Practices](/docs/guides/best-practices)
- View [API Reference](/docs/api-reference)
- Get [Help](/support)`,

  'installation/npm': `# Install npm Package

Use Fortress with Node.js and TypeScript projects.

## Installation

\`\`\`bash
npm install fortress-optimizer
\`\`\`

## Usage

\`\`\`javascript
import { optimize } from 'fortress-optimizer';

const result = await optimize({
  prompt: 'Your prompt here',
  apiKey: process.env.FORTRESS_API_KEY,
  level: 'balanced', // 'conservative', 'balanced', 'aggressive'
});

console.log(result.optimized);
console.log(\`Saved \${result.savings} tokens\`);
\`\`\`

## Configuration

Set your API key:

\`\`\`bash
export FORTRESS_API_KEY=your_api_key_here
\`\`\`

Or pass it directly:

\`\`\`javascript
const result = await optimize({
  prompt: 'Your prompt',
  apiKey: 'your_api_key',
});
\`\`\`

## Options

\`\`\`javascript
{
  prompt: string,           // Required: prompt to optimize
  apiKey: string,          // Required: your API key
  level: 'conservative' | 'balanced' | 'aggressive', // Default: 'balanced'
  provider: 'openai' | 'claude' | 'custom', // Default: 'openai'
  maxTokens: number,       // Max tokens in prompt (default: 50000)
}
\`\`\`

## Examples

### Basic Usage

\`\`\`javascript
const { optimize } = require('fortress-optimizer');

(async () => {
  const result = await optimize({
    prompt: 'Write a function to sort an array of numbers',
    apiKey: process.env.FORTRESS_API_KEY,
  });

  console.log(result);
  // {
  //   optimized: 'Sort numeric array',
  //   savings: 15,
  //   savings_percentage: 65,
  // }
})();
\`\`\`

### With Custom Level

\`\`\`javascript
// Conservative (minimal changes)
const conservative = await optimize({
  prompt: myPrompt,
  apiKey: myKey,
  level: 'conservative',
});

// Aggressive (maximum optimization)
const aggressive = await optimize({
  prompt: myPrompt,
  apiKey: myKey,
  level: 'aggressive',
});
\`\`\`

## Troubleshooting

### Invalid API Key
\`\`\`
Error: Invalid API key
\`\`\`
Check your FORTRESS_API_KEY is set correctly.

### Rate Limited
\`\`\`
Error: Rate limit exceeded
\`\`\`
You've exceeded your tier's API call limit. Upgrade your plan.

## Next Steps

- Check [Best Practices](/docs/guides/best-practices)
- Review [API Reference](/docs/api-reference)
- Get [Help](/support)`,

  'installation/vscode': `# VS Code Extension

Install Fortress Token Optimizer in VS Code.

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Fortress Token Optimizer"
4. Click Install

## Setup

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Search for "Fortress: Set API Key"
3. Paste your API key
4. Save

## Usage

### Optimize Selected Text

1. Select your prompt in the editor
2. Right-click → "Fortress: Optimize Selection"
3. See optimization in sidebar
4. Click "Insert Optimized" to replace

### View Dashboard

1. Open Command Palette
2. "Fortress: Open Dashboard"
3. View your savings over time

## Settings

Open VS Code Settings (Cmd+,) and search "Fortress":

- **Optimization Level** - conservative/balanced/aggressive
- **Auto-optimize** - Toggle auto-optimization
- **Show Inline Hints** - Show token count inline`,

  'installation/copilot': `# GitHub Copilot Integration

Use Fortress with GitHub Copilot.

## Setup

1. Install Fortress npm package
2. Configure your .github/workflows
3. Fortress will optimize Copilot suggestions

## Usage

Fortress automatically optimizes prompts sent to Copilot Chat.

See token savings in the Copilot sidebar.`,

  'installation/slack': `# Slack Integration

Add Fortress Token Optimizer to Slack.

## Installation

1. Go to [fortress-optimizer.com/integrations/slack](https://fortress-optimizer.com/integrations/slack)
2. Click "Add to Slack"
3. Authorize the app

## Usage

### Optimize Messages

Use the /fortress command:

\`\`\`
/fortress optimize "Your prompt here"
\`\`\`

### View Savings

View team savings dashboard with:

\`\`\`
/fortress dashboard
\`\`\`

## Best Practices

- Use in thread for context
- Reference the previous message with @Fortress
- See token counts in real-time`,

  'installation/claude-desktop': `# Claude Desktop Integration

Use Fortress with Anthropic's Claude Desktop app.

## Installation

1. Download [Claude Desktop](https://claude.ai/download)
2. Install Fortress plugin from settings
3. Authorize with your API key

## Usage

Fortress automatically optimizes prompts in Claude Desktop.

See token savings before sending prompts.`,

  'guides/how-it-works': `# How Token Optimization Works

Understand the algorithm behind Fortress.

## The 4-Step Process

### 1. Analysis

Fortress scans your prompt for:
- Redundant sentences
- Duplicate concepts
- Verbose language
- Unnecessary context

### 2. Restructuring

Based on the analysis, Fortress:
- Removes duplicates
- Condenses verbose phrases
- Reorders information logically
- Preserves core meaning

### 3. Token Estimation

Fortress calculates:
- Original token count
- Optimized token count
- Percentage saved
- Cost savings (in USD)

### 4. Delivery

You receive:
- Optimized prompt
- Savings breakdown
- Side-by-side comparison

## Example

**Original:**
"Can you help me write a function? I need a function that takes an array and returns only the even numbers. The function should work with any kind of array and return a new array."

Analysis:
- "Can you help me" = polite filler
- "I need a function" + "a function that" = redundant
- "The function should work" = already stated
- "return a new array" = obvious from context

**Optimized:**
"Function: filter array to even numbers"

**Result:**
- Original: 45 tokens
- Optimized: 10 tokens
- Saved: 35 tokens (78%)
- Cost savings: $0.00035 per call

## Optimization Levels

### Conservative
- Minimal changes
- 5-10% savings
- Best for: sensitive content

### Balanced (Recommended)
- Good balance of safety and savings
- 15-25% savings
- Best for: most use cases

### Aggressive
- Maximum optimization
- 25-40% savings
- Best for: high-volume queries

## What Fortress Doesn't Do

❌ Remove important information
❌ Change the meaning
❌ Store your prompts
❌ Share your data

## The Algorithm

Fortress uses:
- Semantic analysis to identify redundancy
- NLP to understand context
- Intelligent restructuring
- Token counting accuracy

All processing happens on our secure servers.
Your prompts are never logged or stored.`,

  'guides/best-practices': `# Best Practices

Get the most out of Fortress Token Optimizer.

## Prompt Engineering Tips

### 1. Be Specific
❌ "Write code for a thing"
✅ "Write a Python function to calculate factorial"

Specific prompts are easier to optimize.

### 2. Remove Redundancy
❌ "I need help. Can you help me? I'm looking for help to..."
✅ "How do I implement OAuth?"

Fortress catches some, but clear prompts = better optimization.

### 3. Use Consistent Voice
❌ Mix of formal and casual language
✅ Consistent tone throughout

Helps Fortress identify unnatural phrasing.

### 4. Organize Information
❌ Scattered requirements
✅ Ordered list of requirements

Structured prompts optimize better.

## Usage Patterns

### High-Volume Queries
Use **Aggressive** optimization for:
- Batch processing
- Automated systems
- High-frequency APIs

Savings: 25-40% tokens

### Sensitive Content
Use **Conservative** optimization for:
- Customer data
- Legal documents
- Creative work

Savings: 5-10% tokens

### Default: Balanced
Recommended for most cases:
- Good savings (15-25%)
- Safe restructuring
- Works across use cases

## Monitoring Savings

Track in your dashboard:
- Daily savings
- Weekly trends
- Cost impact
- ROI calculation

## Common Mistakes

### ❌ Over-Optimizing
Don't lose meaning chasing savings. Use Balanced level.

### ❌ Inconsistent Formatting
Use the same format for similar prompts. Fortress learns patterns.

### ❌ Ignoring Context
Some prompts need context. Don't strip it all away.

### ❌ Not Reviewing Changes
Always review optimized version before using with expensive APIs.

## Tips for Teams

1. Set team optimization level (usually Balanced)
2. Review savings weekly
3. Share best practices
4. Document patterns that save most
5. Celebrate milestones!`,

  'how-we-differ': `# How We Differ

Fortress vs other token optimization solutions.

## Fortress vs Manual Optimization

| Feature | Fortress | Manual |
|---------|----------|--------|
| Time per prompt | <1 second | 5-10 minutes |
| Consistency | 100% | Varies |
| Cost | From $15/mo | Your time |
| Scale | Unlimited | Limited |
| Learning | AI-powered | Manual |

**Winner:** Fortress for teams

## Fortress vs Prompt Compression

| Feature | Fortress | Compression |
|---------|----------|-------------|
| Preserves meaning | ✅ Yes | ⚠️ Sometimes |
| Token savings | 10-20% avg | 30% avg |
| Quality loss | Minimal | Moderate |
| Ease of use | Very easy | Complex |

**Winner:** Fortress for safety

## Fortress vs LLM-Native Tools

Some LLMs have built-in compression. How does Fortress compare?

✅ **Fortress advantages:**
- Works across all LLMs
- Consistent optimization
- Detailed analytics
- Cost tracking

⚠️ **LLM tools advantages:**
- No external API call
- Integrated experience

**Verdict:** Use Fortress for multi-LLM workflows

## Fortress vs In-House Solutions

Building your own:

❌ **Disadvantages:**
- Engineering cost: $10K-50K
- Ongoing maintenance
- Infrastructure costs
- Team training

✅ **Fortress:**
- Ready-to-use
- From $15/mo (Pro) to custom (Enterprise)
- No infrastructure
- Instant savings

**Cost comparison:**
- In-house: ~$1000+/month ongoing
- Fortress: $15-500+/month

**Winner:** Fortress for SMBs

## When NOT to Use Fortress

- Prompts < 50 tokens (optimization overhead)
- One-time queries (no ROI)
- Ultra-sensitive data (consider self-hosted)`,

  'api-reference': `# API Reference

Complete Fortress Token Optimizer API documentation.

## Base URL

\`\`\`
https://api.fortress-optimizer.com/v1
\`\`\`

## Authentication

All requests require an API key:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Endpoints

### POST /optimize

Optimize a prompt.

**Request:**
\`\`\`json
{
  "prompt": "Your prompt here",
  "level": "balanced",
  "provider": "openai"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": "opt_1234567890",
  "prompt": "Your prompt here",
  "optimized": "Optimized prompt",
  "tokens": {
    "original": 45,
    "optimized": 10,
    "saved": 35
  },
  "savings_percentage": 77.8,
  "cost_saved_usd": 0.00035,
  "level": "balanced",
  "technique": "deduplication+compression"
}
\`\`\`

### GET /usage

Get API usage for current month.

**Response:**
\`\`\`json
{
  "api_key": "sk_...",
  "tier": "individual",
  "tokens_used": 50000,
  "tokens_limit": 500000,
  "tokens_remaining": 450000,
  "api_calls_used": 100,
  "api_calls_limit": 5000,
  "reset_date": "2026-03-26"
}
\`\`\`

### GET /health

Health check.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "version": "1.0.0"
}
\`\`\`

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request |
| 401 | Unauthorized (invalid API key) |
| 429 | Rate limited |
| 500 | Server error |

## Rate Limits

Based on tier:

- **Free:** 100 calls/day
- **Individual:** 5,000 calls/month
- **Teams:** 50,000 calls/month
- **Enterprise:** Custom

## SDKs

- **JavaScript/TypeScript:** npm install fortress-optimizer
- **Python:** pip install fortress-optimizer
- **Go:** go get github.com/fortress-optimizer/go`,

  'installation/openclaw': `# OpenClaw Integration

Use Fortress Token Optimizer as an [OpenClaw](https://openclaw.ai) skill to automatically optimize prompts before they reach your AI model.

## What is OpenClaw?

OpenClaw is an open-source personal AI assistant that runs locally on your machine. It connects to messaging apps (WhatsApp, Telegram, Slack, Discord) and supports Claude, OpenAI, and local models as backends.

## Installation

Install the Fortress skill from ClawHub:

\`\`\`bash
clawhub install fortress-optimizer
\`\`\`

Or install manually:

\`\`\`bash
git clone https://github.com/fortress-optimizer/openclaw-skill
cd openclaw-skill
npm install
\`\`\`

## Configuration

Set your Fortress API key:

\`\`\`bash
claw config set fortress.apiKey "YOUR_API_KEY"
\`\`\`

Get your API key from your [Account page](https://www.fortress-optimizer.com/account) → API Keys tab.

## How It Works

The Fortress skill acts as a **context engine adapter** that intercepts prompts before they hit the AI model:

1. You send a message to OpenClaw
2. Fortress optimizes the prompt (removes filler, compresses redundancy)
3. The optimized prompt is sent to your AI model (Claude, GPT, etc.)
4. You get the same quality response with fewer tokens

All optimization happens server-side via the Fortress API — your prompts are processed and never stored.

## Usage

Once installed, Fortress runs automatically. Every prompt is optimized before reaching the model.

### Check Savings

\`\`\`
/fortress stats
\`\`\`

Shows tokens saved, cost savings, and optimization rate.

### Adjust Optimization Level

\`\`\`
/fortress level conservative|balanced|aggressive
\`\`\`

- **Conservative**: 5-10% savings, minimal changes
- **Balanced** (default): 15-25% savings, safe restructuring
- **Aggressive**: 25-40% savings, maximum compression

### Disable Temporarily

\`\`\`
/fortress pause
/fortress resume
\`\`\`

## Graceful Degradation

If the Fortress API is unreachable, the skill falls back to sending the original unoptimized prompt. Your OpenClaw experience is never interrupted.

## Requirements

- OpenClaw v1.0+
- Node.js 22+
- Fortress API key ([get one free](https://www.fortress-optimizer.com/auth/signup))

## Support

- [Fortress Support](https://www.fortress-optimizer.com/support)
- [OpenClaw Community](https://openclaw.ai/community)
- Email: support@fortress-optimizer.com`,

  'installation/jetbrains': `# JetBrains IDE Integration

Use Fortress Token Optimizer in IntelliJ IDEA, WebStorm, PyCharm, and other JetBrains IDEs.

## Installation

1. Open your JetBrains IDE
2. Go to **Settings → Plugins → Marketplace**
3. Search for "Fortress Token Optimizer"
4. Click **Install** and restart the IDE

Or install from disk:
1. Download the plugin from [fortress-optimizer.com/downloads/jetbrains](https://fortress-optimizer.com/downloads/jetbrains)
2. Go to **Settings → Plugins → ⚙️ → Install Plugin from Disk**

## Configuration

1. Go to **Settings → Tools → Fortress Token Optimizer**
2. Enter your API key (get one from your [Account page](https://www.fortress-optimizer.com/account))
3. Select your default optimization level

## Usage

### Optimize Selected Text
1. Select text in the editor
2. Right-click → **Fortress → Optimize Selection**
3. Or use the keyboard shortcut: \`Ctrl+Shift+F\` (Windows/Linux) / \`Cmd+Shift+F\` (macOS)

### View Token Savings
Click the Fortress icon in the status bar to see your session savings.

### Optimization Levels
- **Conservative**: Minimal changes, safe for production code comments
- **Balanced**: Default, good for most use cases
- **Aggressive**: Maximum savings for high-volume workflows`,

  'installation/neovim': `# Neovim Integration

Use Fortress Token Optimizer in Neovim.

## Installation

### Using lazy.nvim

\`\`\`lua
{
  "fortress-optimizer/fortress.nvim",
  config = function()
    require("fortress").setup({
      api_key = vim.env.FORTRESS_API_KEY,
    })
  end,
}
\`\`\`

### Using packer.nvim

\`\`\`lua
use {
  "fortress-optimizer/fortress.nvim",
  config = function()
    require("fortress").setup()
  end,
}
\`\`\`

## Configuration

Set your API key as an environment variable:

\`\`\`bash
export FORTRESS_API_KEY="your-api-key-here"
\`\`\`

Or configure in your \`init.lua\`:

\`\`\`lua
require("fortress").setup({
  api_key = "your-api-key-here",
  level = "balanced",  -- conservative, balanced, aggressive
  auto_optimize = false, -- set true to auto-optimize on save
})
\`\`\`

## Usage

### Commands

| Command | Description |
|---------|-------------|
| \`:FortressOptimize\` | Optimize selected text or current buffer |
| \`:FortressUsage\` | Show token usage stats |
| \`:FortressLevel balanced\` | Set optimization level |

### Keybindings

Default keybindings (customizable):

| Key | Action |
|-----|--------|
| \`<leader>fo\` | Optimize selection |
| \`<leader>fu\` | Show usage stats |`,

  'installation/anthropic-sdk': `# Anthropic SDK Integration

Use Fortress with the Anthropic Python SDK to automatically optimize prompts before they reach Claude.

## Installation

\`\`\`bash
pip install fortress-anthropic
\`\`\`

## Usage

Replace your Anthropic client with the Fortress-wrapped client:

\`\`\`python
# Before
from anthropic import Anthropic
client = Anthropic(api_key="your-anthropic-key")

# After
from fortress_anthropic import FortressAnthropicClient
client = FortressAnthropicClient(
    anthropic_api_key="your-anthropic-key",
    fortress_api_key="your-fortress-key",
)
\`\`\`

All \`client.messages.create()\` calls are automatically optimized. No other code changes needed.

## How It Works

1. You call \`client.messages.create()\` as normal
2. Fortress intercepts the prompt and optimizes it
3. The optimized prompt is sent to Claude
4. You get the same quality response with fewer tokens

## Configuration

\`\`\`python
client = FortressAnthropicClient(
    anthropic_api_key="your-anthropic-key",
    fortress_api_key="your-fortress-key",
    optimization_level="balanced",  # conservative, balanced, aggressive
)
\`\`\`

## Graceful Degradation

If the Fortress API is unreachable, the original prompt is sent to Claude unchanged. Your application never breaks.`,

  'installation/langchain': `# LangChain Integration

Use Fortress with LangChain to optimize prompts in your LLM pipelines.

## Installation

\`\`\`bash
pip install fortress-langchain
\`\`\`

## Usage

### As a Callback

\`\`\`python
from fortress_langchain import FortressCallback

callback = FortressCallback(api_key="your-fortress-key")

from langchain_openai import ChatOpenAI
llm = ChatOpenAI(callbacks=[callback])

# All prompts are automatically optimized
response = llm.invoke("Your prompt here")
\`\`\`

### As Middleware

\`\`\`python
from fortress_langchain import FortressMiddleware

middleware = FortressMiddleware(
    api_key="your-fortress-key",
    level="balanced",
)

# Wrap any LLM
optimized_llm = middleware.wrap(llm)
response = optimized_llm.invoke("Your prompt here")
\`\`\`

## Configuration

Set via environment variable:

\`\`\`bash
export FORTRESS_API_KEY="your-fortress-key"
\`\`\`

Or pass directly:

\`\`\`python
FortressCallback(
    api_key="your-key",
    level="balanced",
    provider="openai",
)
\`\`\``,

  'installation/vercel-ai-sdk': `# Vercel AI SDK Integration

Use Fortress as middleware in your Vercel AI SDK application.

## Installation

\`\`\`bash
npm install @fortress-optimizer/vercel-ai
\`\`\`

## Usage

Add Fortress as middleware to your AI SDK route:

\`\`\`typescript
import { fortressMiddleware } from '@fortress-optimizer/vercel-ai';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    messages,
    experimental_transform: fortressMiddleware({
      apiKey: process.env.FORTRESS_API_KEY!,
      level: 'balanced',
    }),
  });

  return result.toDataStreamResponse();
}
\`\`\`

## How It Works

The middleware intercepts prompts before they reach the model:

1. Your app calls \`streamText()\` as normal
2. Fortress middleware optimizes the prompt
3. The optimized prompt is sent to the model
4. Streaming response is returned unchanged

## Graceful Degradation

If Fortress is unavailable, the middleware is a no-op — your original prompt passes through unchanged.`,

  'installation/cursor': `# Cursor IDE Integration

Use Fortress Token Optimizer in Cursor to save on AI-assisted coding costs.

## Installation

1. Open Cursor
2. Go to **Extensions** panel (\`Ctrl+Shift+X\`)
3. Search for "Fortress Token Optimizer"
4. Click **Install**

## Configuration

1. Open Command Palette (\`Ctrl+Shift+P\`)
2. Type "Fortress: Set API Key"
3. Enter your API key from your [Account page](https://www.fortress-optimizer.com/account)

## Usage

Fortress automatically optimizes prompts sent to Cursor's AI features:
- Chat prompts
- Inline completions
- Code generation requests

### View Savings

Click the Fortress icon in the status bar to see tokens saved this session.`,

  'installation/sublime': `# Sublime Text Integration

Use Fortress Token Optimizer in Sublime Text.

## Installation

### Via Package Control (Recommended)

1. Open Command Palette (\`Ctrl+Shift+P\`)
2. Type "Package Control: Install Package"
3. Search for "Fortress Token Optimizer"
4. Click to install

### Manual Installation

1. Download from [GitHub releases](https://github.com/fortress-optimizer/sublime-plugin)
2. Extract to \`~/.config/sublime-text/Packages/Fortress/\` (Linux/Mac)
3. Or \`%APPDATA%/Sublime Text/Packages/Fortress/\` (Windows)

## Configuration

Open **Preferences → Package Settings → Fortress → Settings** and add:

\`\`\`json
{
  "api_key": "your-fortress-api-key",
  "optimization_level": "balanced"
}
\`\`\`

## Usage

### Optimize Selected Text

1. Select text
2. Right-click → **Fortress: Optimize**
3. Or use \`Ctrl+Shift+O\` (Windows/Linux) / \`Cmd+Shift+O\` (macOS)

### Keybindings

| Key | Action |
|-----|--------|
| \`Ctrl+Shift+O\` | Optimize selection |
| \`Ctrl+Shift+U\` | Show usage stats |`,

  'installation/make-zapier': `# Make.com & Zapier Integration

Use Fortress Token Optimizer in your automation workflows.

## Make.com

### Setup

1. In your Make.com scenario, add an **HTTP module**
2. Set method to **POST**
3. URL: \`https://api.fortress-optimizer.com/api/optimize\`
4. Headers:
   - \`Authorization: Bearer YOUR_API_KEY\`
   - \`Content-Type: application/json\`
5. Body:

\`\`\`json
{
  "prompt": "{{your_prompt_variable}}",
  "level": "balanced",
  "provider": "openai"
}
\`\`\`

6. Use the response \`optimization.optimized_prompt\` in your next module

## Zapier

### Setup

1. Add a **Webhooks by Zapier** action (POST)
2. URL: \`https://api.fortress-optimizer.com/api/optimize\`
3. Headers: \`Authorization: Bearer YOUR_API_KEY\`
4. Data: \`prompt\`, \`level\`, \`provider\`
5. Use the optimized prompt in subsequent steps

## Use Cases

- **Customer support automation**: Optimize AI-generated responses before sending
- **Content generation**: Reduce costs on batch content creation
- **Data analysis**: Compress analytical prompts for GPT-4 processing`,
};

export const dynamicParams = true;

export function generateStaticParams() {
  const slugs = Object.keys(docContent);
  return slugs.map(slug => ({
    slug: slug.split('/'),
  }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug: slugArray } = await params;
  const slug = slugArray.join('/');
  const content = docContent[slug];

  if (!content) {
    notFound();
  }

  return (
    <article className="prose prose-invert max-w-none">
      <style>{`
        .prose {
          --tw-prose-body: rgb(148 163 184);
          --tw-prose-headings: rgb(248 250 252);
          --tw-prose-links: rgb(16 185 129);
          --tw-prose-code: rgb(226 232 240);
          --tw-prose-pre-bg: rgb(15 23 42);
          --tw-prose-pre-code: rgb(226 232 240);
          --tw-prose-hr: rgb(30 41 59);
          --tw-prose-th-borders: rgb(71 85 99);
          --tw-prose-td-borders: rgb(71 85 99);
        }
        
        .prose h1,
        .prose h2,
        .prose h3 {
          @apply text-white font-bold;
        }
        
        .prose h1 { @apply text-3xl mt-8 mb-4; }
        .prose h2 { @apply text-2xl mt-6 mb-3; }
        .prose h3 { @apply text-xl mt-4 mb-2; }
        
        .prose a {
          @apply text-emerald-400 hover:text-emerald-300;
        }
        
        .prose code {
          @apply bg-slate-900 px-2 py-1 rounded text-sm;
        }
        
        .prose pre {
          @apply bg-slate-900 rounded-lg overflow-x-auto;
        }
        
        .prose pre code {
          @apply bg-transparent px-0 py-0;
        }
        
        .prose table {
          @apply border-collapse border border-slate-700;
        }
        
        .prose th,
        .prose td {
          @apply border border-slate-700 p-3;
        }
        
        .prose th {
          @apply bg-slate-900 text-white font-semibold;
        }
        
        .prose ul,
        .prose ol {
          @apply ml-6;
        }
        
        .prose li {
          @apply my-1;
        }
      `}</style>
      
      <div 
        dangerouslySetInnerHTML={{
          __html: markdownToHtml(content)
        }}
      />

      {/* Footer Navigation */}
      <div className="mt-12 pt-8 border-t border-slate-700">
        <Link
          href="/support"
          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
        >
          <span>Need help?</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}

// Simple markdown to HTML converter
function markdownToHtml(md: string): string {
  let html = md;
  
  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  // Code blocks
  html = html.replace(/```(.*?)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  
  // Inline code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)/m, '<ul>$1</ul>');
  
  // Paragraphs
  html = html.split('\n\n').map(para => {
    if (para.match(/^<[hul]/)) return para;
    if (para.trim() === '') return '';
    return `<p>${para.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  
  return html;
}
