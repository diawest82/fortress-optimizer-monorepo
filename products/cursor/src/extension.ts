/**
 * Fortress Token Optimizer for Cursor -- Extension Entry Point
 *
 * Cursor is a fork of VS Code, so this extension uses the standard vscode API.
 * All optimization logic runs server-side via the Fortress API. This extension
 * only sends prompts, displays results, and manages credentials.
 *
 * Commands:
 *   fortress.optimizeSelection    - Optimize the selected text in the editor
 *   fortress.optimizeClipboard    - Optimize text from the clipboard
 *   fortress.showUsage            - Display usage statistics
 *   fortress.setApiKey            - Store API key in Cursor's secret storage
 *   fortress.setOptimizationLevel - Pick optimization level
 */

import * as vscode from 'vscode';
import { FortressClient, OptimizeRequest } from './client';
import { FortressStatusBar } from './statusBar';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let client: FortressClient | null = null;
let statusBar: FortressStatusBar;
let outputChannel: vscode.OutputChannel;

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('Fortress Cursor');
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine('Fortress Token Optimizer for Cursor activated');

  // Status bar
  statusBar = new FortressStatusBar();
  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  const config = vscode.workspace.getConfiguration('fortress');
  statusBar.setVisible(config.get<boolean>('showStatusBar', true));

  // React to config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('fortress.showStatusBar')) {
        const show = vscode.workspace
          .getConfiguration('fortress')
          .get<boolean>('showStatusBar', true);
        statusBar.setVisible(show);
      }
      if (e.affectsConfiguration('fortress.apiUrl')) {
        if (client) {
          const url = vscode.workspace
            .getConfiguration('fortress')
            .get<string>('apiUrl', 'https://api.fortress-optimizer.com');
          client.setBaseUrl(url);
        }
      }
    }),
  );

  // Try to restore API key from secret storage
  const storedKey = await context.secrets.get('fortress.apiKey');
  if (storedKey) {
    initClient(storedKey);
    outputChannel.appendLine('API key loaded from Cursor secret storage');
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('fortress.optimizeSelection', () =>
      cmdOptimizeSelection(context),
    ),
    vscode.commands.registerCommand('fortress.optimizeClipboard', () =>
      cmdOptimizeClipboard(context),
    ),
    vscode.commands.registerCommand('fortress.showUsage', () =>
      cmdShowUsage(),
    ),
    vscode.commands.registerCommand('fortress.setApiKey', () =>
      cmdSetApiKey(context),
    ),
    vscode.commands.registerCommand('fortress.setOptimizationLevel', () =>
      cmdSetOptimizationLevel(),
    ),
  );

  // Prompt for API key if not configured
  if (!storedKey) {
    const action = await vscode.window.showInformationMessage(
      'Fortress Cursor: Set your API key to start optimizing prompts.',
      'Set API Key',
    );
    if (action === 'Set API Key') {
      vscode.commands.executeCommand('fortress.setApiKey');
    }
  }
}

// ---------------------------------------------------------------------------
// Deactivation
// ---------------------------------------------------------------------------

export function deactivate(): void {
  outputChannel?.appendLine('Fortress Token Optimizer for Cursor deactivated');
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Optimize the currently selected text in the active editor.
 */
async function cmdOptimizeSelection(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (!ensureClient()) {
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Fortress Cursor: No active editor.');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage(
      'Fortress Cursor: Select text to optimize.',
    );
    return;
  }

  const text = editor.document.getText(selection);
  if (!text.trim()) {
    vscode.window.showWarningMessage(
      'Fortress Cursor: Selection is empty.',
    );
    return;
  }

  await runOptimization(text, async (optimized) => {
    await editor.edit((editBuilder) => {
      editBuilder.replace(selection, optimized);
    });
  });
}

/**
 * Optimize text from the clipboard and write the result back.
 */
async function cmdOptimizeClipboard(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (!ensureClient()) {
    return;
  }

  const clipboardText = await vscode.env.clipboard.readText();
  if (!clipboardText.trim()) {
    vscode.window.showWarningMessage(
      'Fortress Cursor: Clipboard is empty.',
    );
    return;
  }

  await runOptimization(clipboardText, async (optimized) => {
    await vscode.env.clipboard.writeText(optimized);
    vscode.window.showInformationMessage(
      'Fortress Cursor: Optimized prompt copied to clipboard.',
    );
  });
}

/**
 * Show usage statistics from the Fortress API.
 */
async function cmdShowUsage(): Promise<void> {
  if (!ensureClient()) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Fortress Cursor: Fetching usage stats...',
    },
    async () => {
      try {
        const usage = await client!.getUsage();

        outputChannel.appendLine('');
        outputChannel.appendLine('--- Usage Stats ---');
        outputChannel.appendLine(`Period: ${usage.period}`);
        outputChannel.appendLine(
          `Total requests: ${usage.total_requests.toLocaleString()}`,
        );
        outputChannel.appendLine(
          `Tokens saved: ${usage.tokens_saved.toLocaleString()}`,
        );
        outputChannel.appendLine(
          `Estimated cost saved: $${usage.cost_saved.toFixed(2)}`,
        );
        outputChannel.appendLine('-------------------');
        outputChannel.show(true);

        vscode.window.showInformationMessage(
          `Fortress Cursor: ${usage.tokens_saved.toLocaleString()} tokens saved | $${usage.cost_saved.toFixed(2)} saved | ${usage.total_requests} requests`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Fortress Cursor: ${msg}`);
        outputChannel.appendLine(`Usage fetch failed: ${msg}`);
      }
    },
  );
}

/**
 * Prompt the user to enter their Fortress API key and store it securely.
 */
async function cmdSetApiKey(context: vscode.ExtensionContext): Promise<void> {
  const key = await vscode.window.showInputBox({
    title: 'Fortress Cursor: Enter API Key',
    prompt: 'Your Fortress API key (starts with fk_). Get one at https://fortress-optimizer.com',
    placeHolder: 'fk_...',
    password: true,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'API key cannot be empty';
      }
      if (!value.startsWith('fk_')) {
        return 'Fortress API keys start with fk_';
      }
      if (value.length < 10) {
        return 'API key is too short';
      }
      return undefined;
    },
  });

  if (!key) {
    return; // cancelled
  }

  await context.secrets.store('fortress.apiKey', key);
  initClient(key);
  outputChannel.appendLine('API key stored in Cursor secret storage');
  vscode.window.showInformationMessage(
    'Fortress Cursor: API key saved securely.',
  );
}

/**
 * Let the user pick the optimization level from a quick-pick menu.
 */
async function cmdSetOptimizationLevel(): Promise<void> {
  const items: vscode.QuickPickItem[] = [
    {
      label: 'Conservative',
      description: '5-15% savings',
      detail: 'Minimal changes. Preserves nuance and detail.',
    },
    {
      label: 'Balanced',
      description: '15-30% savings',
      detail: 'Good trade-off between clarity and token reduction.',
    },
    {
      label: 'Aggressive',
      description: '30-50% savings',
      detail: 'Maximum compression. Best for straightforward prompts.',
    },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Fortress Cursor: Optimization Level',
    placeHolder: 'Choose how aggressively to optimize prompts',
  });

  if (!picked) {
    return;
  }

  const level = picked.label.toLowerCase();
  const config = vscode.workspace.getConfiguration('fortress');
  await config.update('optimizationLevel', level, vscode.ConfigurationTarget.Global);

  vscode.window.showInformationMessage(
    `Fortress Cursor: Optimization level set to ${picked.label}.`,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initClient(apiKey: string): void {
  const config = vscode.workspace.getConfiguration('fortress');
  const baseUrl = config.get<string>('apiUrl', 'https://api.fortress-optimizer.com');
  client = new FortressClient(baseUrl, apiKey);
}

function ensureClient(): boolean {
  if (client) {
    return true;
  }
  vscode.window
    .showWarningMessage(
      'Fortress Cursor: API key not configured.',
      'Set API Key',
    )
    .then((action) => {
      if (action === 'Set API Key') {
        vscode.commands.executeCommand('fortress.setApiKey');
      }
    });
  return false;
}

/**
 * Shared optimization flow: call the API, report results, invoke callback.
 */
async function runOptimization(
  text: string,
  onSuccess: (optimized: string) => Promise<void>,
): Promise<void> {
  const config = vscode.workspace.getConfiguration('fortress');
  const level = config.get<'conservative' | 'balanced' | 'aggressive'>(
    'optimizationLevel',
    'balanced',
  );
  const provider = config.get<string>('defaultProvider', 'openai');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Fortress Cursor: Optimizing...',
      cancellable: false,
    },
    async () => {
      try {
        const request: OptimizeRequest = { prompt: text, level, provider };
        const response = await client!.optimize(request);

        const { optimization, tokens } = response;

        // Apply the optimized text via callback
        await onSuccess(optimization.optimized_prompt);

        // Update status bar
        statusBar.recordOptimization(tokens.savings);

        // Log details
        outputChannel.appendLine('');
        outputChannel.appendLine(`Optimization complete (${level}, ${provider})`);
        outputChannel.appendLine(`  Technique: ${optimization.technique}`);
        outputChannel.appendLine(
          `  Tokens: ${tokens.original} -> ${tokens.optimized} (saved ${tokens.savings}, ${tokens.savings_percentage.toFixed(1)}%)`,
        );
        outputChannel.show(true);

        vscode.window.showInformationMessage(
          `Fortress Cursor: Saved ${tokens.savings} tokens (${tokens.savings_percentage.toFixed(1)}%)`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Fortress Cursor: ${msg}`);
        outputChannel.appendLine(`Optimization failed: ${msg}`);
      }
    },
  );
}
