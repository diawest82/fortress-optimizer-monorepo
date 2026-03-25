import * as vscode from 'vscode';
import { ServerAPI } from './api/ServerAPI';

export class FortressEnhanced {
  private api: ServerAPI;

  constructor(private context: vscode.ExtensionContext) {
    this.api = new ServerAPI();
  }

  /**
   * Show analytics in an output channel (analytics panel planned for future)
   */
  async showAnalytics(): Promise<void> {
    const channel = vscode.window.createOutputChannel('Fortress Analytics');
    channel.show();
    channel.appendLine('Fortress Token Optimizer — Usage Analytics');
    channel.appendLine('─'.repeat(50));

    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        channel.appendLine('No API key configured. Set via command palette: Fortress: Set API Key');
        return;
      }
      channel.appendLine('API Key: ' + apiKey.slice(0, 8) + '...');
      channel.appendLine('Analytics dashboard coming soon. Visit https://www.fortress-optimizer.com/account for full analytics.');
    } catch (e: any) {
      channel.appendLine(`Error: ${e.message}`);
    }
  }

  /**
   * Batch optimize files/folders
   */
  async batchOptimize(uris: vscode.Uri[]): Promise<void> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      vscode.window.showErrorMessage('Fortress: Set your API key first (Fortress: Set API Key)');
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Fortress: Optimizing files...',
        cancellable: true,
      },
      async (progress, token) => {
        let processed = 0;
        let totalSaved = 0;

        for (const uri of uris) {
          if (token.isCancellationRequested) break;

          try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type === vscode.FileType.File) {
              const saved = await this.optimizeFile(uri, apiKey);
              totalSaved += saved;
              processed++;
              progress.report({
                increment: (100 / uris.length),
                message: `${processed}/${uris.length} files (${totalSaved} tokens saved)`,
              });
            }
          } catch (e: any) {
            // Skip files that can't be optimized
          }
        }

        vscode.window.showInformationMessage(
          `Fortress: Optimized ${processed} files, saved ${totalSaved} tokens`
        );
      }
    );
  }

  /**
   * Optimize selected text
   */
  async optimizeSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('Fortress: No active editor');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) {
      vscode.window.showWarningMessage('Fortress: Select text to optimize');
      return;
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      vscode.window.showErrorMessage('Fortress: Set your API key first (Fortress: Set API Key)');
      return;
    }

    try {
      const result = await this.api.optimize(text, apiKey);
      if (result.optimized_prompt && result.optimized_prompt !== text) {
        await editor.edit(editBuilder => {
          editBuilder.replace(selection, result.optimized_prompt);
        });
        const saved = (result.tokens?.savings || 0);
        vscode.window.showInformationMessage(
          `Fortress: Saved ${saved} tokens (${result.tokens?.savings_percentage?.toFixed(1)}%)`
        );
      } else {
        vscode.window.showInformationMessage('Fortress: Text is already optimized');
      }
    } catch (e: any) {
      vscode.window.showErrorMessage(`Fortress: ${e.message}`);
    }
  }

  private async optimizeFile(uri: vscode.Uri, apiKey: string): Promise<number> {
    const doc = await vscode.workspace.openTextDocument(uri);
    const text = doc.getText();
    if (text.length < 50) return 0; // Skip tiny files

    try {
      const result = await this.api.optimize(text, apiKey);
      return result.tokens?.savings || 0;
    } catch {
      return 0;
    }
  }

  private async getApiKey(): Promise<string | undefined> {
    // Try SecretStorage first
    const stored = await this.context.secrets.get('fortress-api-key');
    if (stored) return stored;

    // Fallback to settings
    const config = vscode.workspace.getConfiguration('fortress');
    return config.get<string>('apiKey') || undefined;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const fortress = new FortressEnhanced(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('fortress.optimize', () => {
      fortress.optimizeSelection();
    }),

    vscode.commands.registerCommand('fortress.showAnalytics', () => {
      fortress.showAnalytics();
    }),

    vscode.commands.registerCommand('fortress.batchOptimize', async (uri: vscode.Uri) => {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: true,
        canSelectMany: true,
      });
      if (uris) {
        await fortress.batchOptimize(uris);
      }
    }),

    vscode.commands.registerCommand('fortress.setApiKey', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your Fortress API key',
        placeHolder: 'fk_...',
        password: true,
      });
      if (key) {
        await context.secrets.store('fortress-api-key', key);
        vscode.window.showInformationMessage('Fortress: API key saved securely');
      }
    })
  );
}
