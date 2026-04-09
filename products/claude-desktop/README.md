# Fortress Token Optimizer - Claude Desktop App

Standalone desktop application for macOS/Windows that integrates with Claude Desktop and provides advanced token optimization features.

## Features

- **Real-time Optimization**: Optimize prompts as you type
- **Advanced Analytics**: Deep insights into token usage patterns
- **Batch Processing**: Optimize multiple prompts at once
- **History Tracking**: Keep history of all optimizations
- **Team Collaboration**: Share optimization templates with team
- **System Tray Integration**: Quick access from system menu
- **Keyboard Shortcuts**: Global hotkeys for fast optimization
- **Dark Mode**: Full dark mode support

## Architecture

```
Claude Desktop App (Electron)
    ├─ Main UI (React)
    ├─ Local storage (SQLite)
    ├─ API client (Fortress backend)
    └─ Tray integration
    
Data Flow:
  User Input → Local Processing → Fortress API → Results
```

## Installation

### macOS
```bash
# Download from GitHub releases
curl -L https://github.com/diawest82/fortress-optimizer/releases/download/v1.0.0/Fortress-Token-Optimizer.dmg

# Or install via Homebrew
brew install fortress-optimizer
```

### Windows
```
Download: https://fortress-optimizer.com/download/windows
```

## Usage

1. Launch Fortress Token Optimizer from Applications
2. Enter API key from settings
3. Paste or type prompt
4. Click "Optimize"
5. View results with token savings
6. Copy optimized text or send to Claude

## Key Bindings

- `Cmd+Shift+O` (Mac) or `Ctrl+Shift+O` (Windows) - Quick optimize
- `Cmd+Shift+H` (Mac) or `Ctrl+Shift+H` (Windows) - Show history
- `Cmd+,` (Mac) or `Ctrl+,` (Windows) - Settings

## Configuration

### Settings File
```json
{
  "api_key": "fort-...",
  "optimization_level": "balanced",
  "auto_optimize": true,
  "history_size": 1000,
  "theme": "dark"
}
```

## Tech Stack

- **Frontend**: React + TypeScript
- **Desktop**: Electron
- **Styling**: TailwindCSS
- **State**: Redux
- **Database**: SQLite
- **API**: Fortress backend

## Coming Soon

Wave 2 Launch (Feb 24):
- [ ] Electron app scaffold
- [ ] React UI components
- [ ] SQLite integration
- [ ] Batch processing
- [ ] Team features
- [ ] Advanced analytics
- [ ] macOS packaging
- [ ] Windows packaging
- [ ] Auto-update system
