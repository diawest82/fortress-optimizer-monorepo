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

  // Register commands
  const commands = [
    registerOptimizeCommand(context),
    registerConfigureAPIKeyCommand(context),
    registerShowOutputCommand(context),
    registerCheckHealthCommand(context),
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

            // Show summary
            const tokens = response.tokens;
            if (tokens) {
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
// Extension Deactivation
// ============================================================================

export function deactivate() {
  console.log('🛑 Fortress Token Optimizer deactivated');
  outputChannel.dispose();
}
