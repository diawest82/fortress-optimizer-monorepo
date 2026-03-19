/**
 * Fortress VSCode Extension - Main Integration
 * 
 * This extension optimizes prompts by communicating with Fortress backend.
 * All optimization logic runs server-side for maximum IP protection.
 * 
 * The extension only:
 * 1. Sends prompts to server
 * 2. Displays results to user
 * 3. Manages API credentials
 * 
 * No algorithm implementation here.
 */

import * as vscode from 'vscode';
import {
  FortressServerAPI,
  initializeAPI,
  isValidAPIKey,
  OptimizeRequest,
  OptimizeResponse,
} from './api/ServerAPI';

// ============================================================================
// Global State
// ============================================================================

let api: FortressServerAPI | null = null;
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

// Cumulative session metrics (in-memory only)
let totalTokensSaved = 0;
let totalCostSaved = 0;
let totalOptimizations = 0;

// ============================================================================
// Status Bar Helpers
// ============================================================================

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return `${count}`;
}

function updateStatusBar(): void {
  if (!statusBarItem) {
    return;
  }
  if (totalOptimizations === 0) {
    statusBarItem.text = '$(shield) Fortress: Ready';
    statusBarItem.tooltip = 'No optimizations yet\nClick to view usage';
  } else {
    statusBarItem.text = `$(shield) Fortress: ${formatTokenCount(totalTokensSaved)} saved`;
    statusBarItem.tooltip =
      `${totalTokensSaved.toLocaleString()} tokens saved | $${totalCostSaved.toFixed(2)} saved | ${totalOptimizations} optimizations\nClick to view usage`;
  }
}

// ============================================================================
// Extension Activation
// ============================================================================

export async function activate(context: vscode.ExtensionContext) {
  console.log('🚀 Fortress Token Optimizer (Server-Side Only) activated');

  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('Fortress Optimizer');
  outputChannel.appendLine('🔐 Fortress Token Optimizer - Server-Side Only Edition');
  outputChannel.appendLine('━'.repeat(50));
  outputChannel.appendLine('✅ All optimization logic runs on secure backend');
  outputChannel.appendLine('✅ No rules exposed to client');
  outputChannel.appendLine('✅ Rules updated instantly for all users');
  outputChannel.appendLine('━'.repeat(50));

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'fortress.showUsage';
  updateStatusBar();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register commands
  const commands = [
    registerOptimizeCommand(context),
    registerConfigureAPIKeyCommand(context),
    registerShowOutputCommand(context),
    registerCheckHealthCommand(context),
    registerShowUsageCommand(context),
  ];

  commands.forEach((cmd) => context.subscriptions.push(cmd));

  // Try to initialize API with stored key
  const storedKey = context.globalState.get<string>('fortress.apiKey');
  if (storedKey && isValidAPIKey(storedKey)) {
    api = initializeAPI(storedKey, outputChannel);
    outputChannel.appendLine('✅ Using stored API key');
    
    // Check health in background
    api.checkHealth().catch(() => {
      vscode.window.showWarningMessage(
        'Fortress Server: Unable to reach API. Check your connection.'
      );
    });
  } else {
    outputChannel.appendLine('⚠️  No valid API key configured');
    outputChannel.appendLine('   Run: Fortress: Configure API Key');
    
    vscode.window.showInformationMessage(
      'Fortress: Configure your API key to get started',
      'Configure Now',
    ).then((choice) => {
      if (choice === 'Configure Now') {
        vscode.commands.executeCommand('fortress.configureAPIKey');
      }
    });
  }
}

// ============================================================================
// Command: Optimize Selected Text
// ============================================================================

function registerOptimizeCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand('fortress.optimize', async () => {
    // Check API is configured
    if (!api) {
      vscode.window.showErrorMessage(
        'Fortress: API key not configured. Run: Fortress: Configure API Key'
      );
      return;
    }

    // Get active editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Fortress: No active editor');
      return;
    }

    // Get selected text (or use entire document)
    const selection = editor.selection;
    const text = selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(selection);

    if (!text.trim()) {
      vscode.window.showErrorMessage('Fortress: No text selected to optimize');
      return;
    }

    // Show progress
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Fortress: Optimizing prompt...',
        cancellable: false,
      },
      async (progress) => {
        try {
          // Get optimization level from config
          const level = vscode.workspace
            .getConfiguration('fortress')
            .get<'conservative' | 'balanced' | 'aggressive'>(
              'optimizationLevel',
              'balanced'
            );

          // Get provider from config
          const provider = vscode.workspace
            .getConfiguration('fortress')
            .get<string>('provider', 'openai');

          outputChannel.appendLine(`\n📝 Optimizing prompt...`);
          outputChannel.appendLine(`   Level: ${level}`);
          outputChannel.appendLine(`   Provider: ${provider}`);
          outputChannel.show(true);

          // Call server API
          const request: OptimizeRequest = {
            prompt: text,
            level,
            provider,
          };

          const response = await api!.optimizePrompt(request);

          if (response.status === 'success' && response.optimization) {
            // Replace text with optimized version
            const optimized = response.optimization.optimized_prompt;
            
            await editor.edit((edit) => {
              if (selection.isEmpty) {
                edit.replace(
                  new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(text.length)
                  ),
                  optimized
                );
              } else {
                edit.replace(selection, optimized);
              }
            });

            // Track cumulative savings and update status bar
            const tokens = response.tokens;
            if (tokens) {
              totalTokensSaved += tokens.savings;
              totalOptimizations += 1;
              // Estimate cost: ~$0.002 per 1K tokens (conservative average)
              totalCostSaved += (tokens.savings / 1000) * 0.002;
              updateStatusBar();

              vscode.window.showInformationMessage(
                `✅ Optimized! Saved ${tokens.savings} tokens (${tokens.savings_percentage.toFixed(1)}%)`
              );
            }
          } else {
            vscode.window.showErrorMessage(
              `❌ Optimization failed: ${response.error || 'Unknown error'}`
            );
          }
        } catch (error) {
          outputChannel.appendLine(`❌ Error: ${error}`);
          vscode.window.showErrorMessage(`Fortress: ${error}`);
        }
      }
    );
  });
}

// ============================================================================
// Command: Configure API Key
// ============================================================================

function registerConfigureAPIKeyCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand('fortress.configureAPIKey', async () => {
    const apiKey = await vscode.window.showInputBox({
      title: 'Fortress: Enter API Key',
      placeHolder: 'fortress_xxxxxxxxxxxxxxxxxxxxx',
      prompt: 'Get your API key from https://fortress-optimizer.com/settings',
      password: true,
    });

    if (!apiKey) {
      return;
    }

    if (!isValidAPIKey(apiKey)) {
      vscode.window.showErrorMessage(
        'Invalid API key format (should start with "fortress_")'
      );
      return;
    }

    // Store in global state
    await context.globalState.update('fortress.apiKey', apiKey);

    // Reinitialize API
    api = initializeAPI(apiKey, outputChannel);

    outputChannel.appendLine('✅ API key saved');

    // Test connection
    const isHealthy = await api.checkHealth();
    if (isHealthy) {
      vscode.window.showInformationMessage(
        '✅ API key configured and connected!'
      );
    } else {
      vscode.window.showWarningMessage(
        '⚠️  API key saved but unable to reach server'
      );
    }
  });
}

// ============================================================================
// Command: Show Output Channel
// ============================================================================

function registerShowOutputCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand('fortress.showOutput', () => {
    outputChannel.show(true);
  });
}

// ============================================================================
// Command: Check Server Health
// ============================================================================

function registerCheckHealthCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand('fortress.checkHealth', async () => {
    if (!api) {
      vscode.window.showErrorMessage('Fortress: API key not configured');
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Checking Fortress server...',
      },
      async () => {
        const isHealthy = await api!.checkHealth();
        if (isHealthy) {
          vscode.window.showInformationMessage('✅ Fortress server is healthy');
        } else {
          vscode.window.showErrorMessage('❌ Fortress server is unavailable');
        }
      }
    );
  });
}

// ============================================================================
// Command: Show Usage Info
// ============================================================================

function registerShowUsageCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand('fortress.showUsage', () => {
    if (totalOptimizations === 0) {
      vscode.window.showInformationMessage(
        'Fortress: No optimizations yet this session. Select text and run "Fortress: Optimize" to get started.'
      );
    } else {
      vscode.window.showInformationMessage(
        `Fortress Session Usage: ${totalTokensSaved.toLocaleString()} tokens saved | $${totalCostSaved.toFixed(2)} estimated savings | ${totalOptimizations} optimization${totalOptimizations === 1 ? '' : 's'}`
      );
    }
  });
}

// ============================================================================
// Extension Deactivation
// ============================================================================

export function deactivate() {
  console.log('🛑 Fortress Token Optimizer deactivated');
  statusBarItem?.dispose();
  outputChannel?.dispose();
}
