# Stealth Token Optimizer

> **Invisibly reduce LLM token usage while visibly demonstrating savings.** ⚡

Transform your AI development workflow with intelligent prompt optimization. Stealth Token Optimizer seamlessly integrates into VS Code to reduce token consumption—saving you money while maintaining prompt quality.

---

## ✨ Features

### 🎯 Intelligent Optimization
- **Semantic Duplicate Detection** - Removes redundant sentences while preserving meaning
- **Code-Aware Optimization** - Handles code blocks differently than natural language
- **Provider-Specific Rules** - Tailored optimization for OpenAI, Anthropic, or custom providers
- **Configurable Aggressiveness** - Conservative (15-25%), Balanced (25-40%), or Aggressive (40-55%) savings

### 📊 Real-Time Metrics
- **Savings Dashboard** - See tokens saved, cost reduction, and ROI
- **Analytics Dashboard** - Track optimization effectiveness over time
- **Provider Comparison** - Compare savings across OpenAI and Anthropic
- **Historical Tracking** - 7-day and 30-day trend analysis

### 🔧 Easy Configuration
- **VS Code Settings** - All options configurable in VS Code preferences
- **Real API Integration** - Connect to OpenAI and Anthropic for accurate token counting
- **Secure Credential Storage** - API keys stored securely using VS Code secrets
- **User-Friendly Setup** - One-click configuration wizard

### 🛡️ Security-First
- **No Data Collection by Default** - Telemetry is opt-in and can be disabled
- **Secure Credentials** - API keys encrypted at rest using VS Code's secrets API
- **Local Processing** - Optimization runs locally; no prompts sent to unknown servers
- **Transparent** - See exactly what's being optimized

---

## 🚀 Quick Start

### Installation

1. Open VS Code Extensions Marketplace
2. Search for "Stealth Token Optimizer"
3. Click Install

### First Run

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Stealth Optimizer: Configure API Keys"
3. Select your provider (OpenAI, Anthropic, or both)
4. Enter your API key
5. Select your preferred model

### Test It Out

```bash
Cmd+Shift+P → Stealth Optimizer: Simulate Optimization Run
```

Watch as your prompts get optimized with estimated token savings displayed!

---

## 📖 Usage

### Commands Available

| Command | Description |
|---------|-------------|
| **Toggle Optimization** | Turn optimizer on/off with a click |
| **Open Savings Dashboard** | View real-time metrics and trends |
| **Open Settings** | Configure optimization preferences |
| **Configure API Keys** | Set up OpenAI/Anthropic integration |
| **View Analytics** | See detailed usage statistics |
| **Simulate Optimization** | Test with demo prompts |

### Configuration Options

Access via `Cmd+Shift+P` → "Preferences: Open Settings" → Search for "Stealth Optimizer"

| Setting | Options | Default | Impact |
|---------|---------|---------|--------|
| **Optimization Level** | Conservative / Balanced / Aggressive | Balanced | Controls savings percentage |
| **Provider** | OpenAI / Anthropic / Custom | OpenAI | Tailors optimization rules |
| **Detect Code** | On / Off | On | Preserves code structure |
| **Semantic Threshold** | 0.5 - 1.0 | 0.90 | How similar lines must be to merge |
| **Enable Telemetry** | On / Off | Off | Send anonymous usage stats |

---

## 📊 How It Works

### The Optimization Pipeline

1. **Input** - Your prompt (any length)
2. **Analysis** - Detect code blocks, identify duplicates
3. **Optimization** - Remove semantic duplicates, compress whitespace
4. **Output** - Optimized prompt with token count comparison
5. **Tracking** - Record savings to dashboard

### Typical Savings by Level

```
Conservative:  15-25% savings (minimal changes)
Balanced:      25-40% savings (recommended)
Aggressive:    40-55% savings (power users)
```

### Example

**Original Prompt:**
```
Review this code for performance. Check the code for optimization issues.
Look for performance problems. Identify performance concerns.
```
**Tokens:** 35  
**Cost:** $0.00035

**Optimized Prompt:**
```
Review this code for performance. Look for performance problems.
```
**Tokens:** 13  
**Cost:** $0.00013  
**Saved:** 63% ⚡

---

## 🔐 Security & Privacy

### Your Data is Safe
- **Local Processing** - Optimization happens on your machine
- **No Cloud Storage** - Prompts are never stored or sent anywhere
- **Secure API Keys** - Credentials encrypted using VS Code's secrets vault
- **Telemetry Opt-in** - Analytics only sent if explicitly enabled

### What Gets Sent (If Telemetry Enabled)
- Optimization event metadata (no prompt content)
- Token counts before/after
- Duration and success status
- Anonymous user ID

### What Never Gets Sent
- Your actual prompts
- Your API keys
- Proprietary code or content
- Personal information

---

## ⚙️ Troubleshooting

### Dashboard Not Showing Data
- Click "Open Savings Dashboard" and run a test optimization
- Check that "Enabled" is turned on in settings

### API Key Errors
- Verify your API key is valid at:
  - OpenAI: https://platform.openai.com/account/api-keys
  - Anthropic: https://console.anthropic.com/account/keys
- Try removing and re-adding the key

### No Savings Shown
- Ensure your prompt has some redundant or semantic duplicate content
- Try the "Simulate Optimization Run" command for a demo
- Check the optimization level (Conservative might be too strict)

### Performance Issues
- Disable "Detect Code" if you're primarily optimizing code
- Reduce "Semantic Threshold" to be less strict (more aggressive)

---

## 💡 Tips for Best Results

### Maximize Savings
1. Use **Balanced** level for consistent 25-40% savings
2. Enable **Code Detection** for mixed code/language prompts
3. Pair with verbose, instructive prompts (they have more duplication)

### Maintain Quality
1. Test optimized prompts with your LLM first
2. Use **Conservative** mode for critical instructions
3. Monitor dashboard to see what's being removed

### Track ROI
1. Note token counts before/after
2. Check "View Analytics" to see aggregate savings
3. Calculate monthly cost savings based on usage

---

## 📈 Real-World Impact

**For a typical developer:**
- 100 prompts/day
- 500 tokens average
- 30% savings with Balanced mode
- OpenAI's GPT-4 pricing ($0.03/1K input tokens)

**Monthly Savings:**
- Tokens saved: 1.5M
- Cost saved: ~$45/month
- Annual savings: ~$540

**For an agency with 10 developers:**
- Annual savings: ~$5,400
- Compounds with more prompts and larger models

---

## 🎯 Roadmap

### Q1 2026
- ✅ Real-time token counting via provider APIs
- ✅ Analytics dashboard
- ✅ Multi-provider support

### Q2 2026
- Dashboard trends and comparisons
- Optimization suggestions
- Performance metrics

### Q3+ 2026
- IDE integration for other editors
- Enterprise analytics
- Custom optimization rules

---

## 📞 Support

- **Issues:** Report on GitHub Issues
- **Questions:** Check the FAQ in documentation
- **Feature Requests:** Open a discussion on GitHub

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

We welcome contributions! Please see CONTRIBUTING.md for guidelines.

---

## ⭐ Show Your Support

If Stealth Token Optimizer helps you save on LLM costs, please:
- Give us a ⭐ on GitHub
- Leave a review on VS Code Marketplace
- Share your savings story with us!

---

**Made with ❤️ by Stealth Utilities**  
*Reduce token usage. Increase productivity. Grow profitably.*
- Stealth Optimizer: Open Savings Dashboard
- Stealth Optimizer: Simulate Optimization Run (demo)
