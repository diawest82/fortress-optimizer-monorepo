# Fortress Token Optimizer - JetBrains Plugin

Plugin for IntelliJ IDEA, PyCharm, WebStorm, and other JetBrains IDEs that adds token optimization directly into your IDE.

## Features

- **Editor Integration**: Optimize text right from the editor
- **Context Menu**: Right-click to optimize
- **Intention Actions**: Alt+Enter quick fixes
- **Status Bar**: Real-time token count display
- **Settings Panel**: Configure within IDE settings
- **History**: Browse optimization history
- **Analytics**: Token usage analytics dashboard
- **Sync**: Cloud sync across IDE installations

## Architecture

```
JetBrains Plugin
├── Actions (context menu, toolbar)
├── Intention Actions (quick fixes)
├── Editor Components (token counter, etc.)
├── Settings Panel
└── API Client (Fortress backend)
```

## Installation

### From Plugin Marketplace

1. In JetBrains IDE: Preferences → Plugins
2. Search "Fortress Token Optimizer"
3. Click Install
4. Restart IDE

### Manual Installation

```bash
# Download .jar file
curl -L https://github.com/diawest82/fortress-optimizer-jetbrains/releases/download/v1.0.0/fortress-optimizer.jar

# Place in plugins directory
cp fortress-optimizer.jar ~/.config/JetBrains/IntelliJIdea2024.1/plugins/

# Restart IDE
```

## Usage

### Right-Click Menu
```
1. Select text in editor
2. Right-click → "Optimize with Fortress"
3. View results in popup
```

### Intention Actions
```
1. Position cursor on text
2. Alt+Enter (or Cmd+Enter on Mac)
3. Select "Optimize prompt"
4. View results
```

### Status Bar
```
Token count displayed in IDE status bar
Updates in real-time as you type
```

### Settings
```
IDE Settings → Tools → Fortress
├─ API Key
├─ Optimization Level
├─ Auto-optimize
└─ History size
```

## Tech Stack

- **Language**: Kotlin
- **Framework**: IntelliJ Platform SDK
- **Build**: Gradle
- **API**: Fortress backend

## Coming Soon

Wave 2 Launch (Feb 24):
- [ ] Kotlin plugin scaffold
- [ ] Action implementations
- [ ] UI components
- [ ] Settings panel
- [ ] History browser
- [ ] Analytics dashboard
- [ ] All IDE support (IDEA, PyCharm, WebStorm, etc.)
- [ ] Marketplace submission
