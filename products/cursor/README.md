# Fortress Token Optimizer for Cursor

Reduce your AI token costs directly inside Cursor. The Fortress Token Optimizer analyzes your prompts and rewrites them for maximum efficiency -- fewer tokens, same results.

## Features

- **Optimize Selection** -- Select text in any editor tab, run the command, and the selection is replaced with an optimized version.
- **Optimize Clipboard** -- Optimize whatever is on your clipboard without leaving your flow. The optimized text is written back to the clipboard ready to paste into Cursor's AI chat.
- **Usage Dashboard** -- See how many tokens and dollars you have saved over time.
- **Status Bar** -- A persistent indicator shows your session savings at a glance.
- **Three Optimization Levels** -- Conservative (5-15%), Balanced (15-30%), or Aggressive (30-50%) token reduction.

## Installation

### From VSIX (recommended for Cursor)

1. Download the latest `.vsix` from [Releases](https://github.com/fortress-optimizer/fortress-cursor/releases).
2. Open Cursor.
3. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
4. Run **Extensions: Install from VSIX...** and select the downloaded file.

### From Source

```bash
cd products/cursor
npm install
npm run compile
# Then install the generated VSIX or use --extensionDevelopmentPath during development
```

## Getting Started

1. Get a Fortress API key at [https://fortress-optimizer.com](https://fortress-optimizer.com). Keys start with `fk_`.
2. Open the Command Palette in Cursor and run **Fortress Cursor: Set API Key**.
3. Paste your key. It is stored securely in Cursor's secret storage.
4. Select some text and run **Fortress Cursor: Optimize Selection** (or press `Cmd+Shift+F`).

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Fortress Cursor: Optimize Selection | `Cmd+Shift+F` | Optimize the selected text in the editor |
| Fortress Cursor: Optimize Clipboard | `Cmd+Shift+Alt+F` | Optimize clipboard contents |
| Fortress Cursor: Show Usage Stats | -- | Display token savings and request history |
| Fortress Cursor: Set API Key | -- | Configure your Fortress API key |
| Fortress Cursor: Set Optimization Level | -- | Choose conservative / balanced / aggressive |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `fortress.apiUrl` | `https://api.fortress-optimizer.com` | API endpoint |
| `fortress.optimizationLevel` | `balanced` | Optimization aggressiveness |
| `fortress.defaultProvider` | `openai` | Target AI provider for token counting |
| `fortress.showStatusBar` | `true` | Show the status bar indicator |

## How It Works

1. You select text (a prompt, a code comment, documentation) in Cursor.
2. The extension sends it to the Fortress API (`POST /api/optimize`).
3. The server applies proprietary optimization techniques and returns a shorter version.
4. The extension replaces your selection with the optimized text.

All optimization logic runs server-side. The extension never contains or exposes the optimization algorithm.

## Cursor-Specific Notes

Cursor is a fork of VS Code, so this extension uses the standard `vscode` extension API. It is tested against Cursor and references Cursor in all user-facing messages. If you run it in VS Code it will work, but the branding will say "Cursor".

## API Reference

The extension communicates with these endpoints:

- `POST /api/optimize` -- Optimize a prompt. Body: `{"prompt": "...", "level": "balanced", "provider": "openai"}`
- `GET /api/usage` -- Fetch usage statistics.
- `GET /api/providers` -- List supported AI providers.

Authentication: `X-API-Key: fk_...` header.

## License

Proprietary. Copyright Fortress Optimizer LLC.
