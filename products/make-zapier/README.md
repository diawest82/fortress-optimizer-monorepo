# Fortress Token Optimizer - Make.com & Zapier Integration

Automation platform integration for Make.com and Zapier.

## Make.com Integration

### Installation

1. Go to Make.com
2. Create new scenario
3. Search for "Fortress Token Optimizer"
4. Add module to workflow

### Module: Optimize Prompt

Input: Prompt text
Output: Optimized prompt, token savings

```json
{
  "prompt": "Your text to optimize",
  "level": "balanced",
  "provider": "openai"
}
```

Response:
```json
{
  "optimized_prompt": "...",
  "original_tokens": 150,
  "optimized_tokens": 120,
  "savings": 30,
  "savings_percentage": 20.0
}
```

## Zapier Integration

### Installation

1. Go to Zapier
2. Create new Zap
3. Search for "Fortress Token Optimizer"
4. Set up trigger and action

### Examples

**Slack → Fortress → Save to Sheet**
- Trigger: New message in Slack
- Action: Optimize prompt with Fortress
- Action: Save results to Google Sheets

**Email → Fortress → Email**
- Trigger: New email
- Action: Optimize email body
- Action: Send optimized version

## Features

- Real-time optimization
- Batch processing
- Token counting
- Integration with 5000+ apps

## Coming Soon

Full implementation for Feb 17 launch.
