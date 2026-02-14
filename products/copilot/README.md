# Fortress Token Optimizer - GitHub Copilot Extension

GitHub Copilot Chat extension that integrates Fortress Token Optimizer.

## Installation

Through VS Code Extensions:

1. Open Extensions (Cmd+Shift+X)
2. Search "Fortress Token Optimizer"
3. Click Install
4. Reload VS Code

## Configuration

```json
{
  "fortress.apiKey": "${env:FORTRESS_API_KEY}",
  "fortress.optimizationLevel": "balanced",
  "fortress.autoOptimizePrompts": true
}
```

## Usage

In Copilot Chat:

```
@fortress Optimize this prompt for me: [your prompt]
@fortress Show token savings for: [your prompt]
@fortress Check my usage
```

## Features

- Chat integration
- Prompt optimization
- Token counting
- Usage tracking
- Works with all Copilot models

## Coming Soon

Full implementation for Feb 17 launch.
