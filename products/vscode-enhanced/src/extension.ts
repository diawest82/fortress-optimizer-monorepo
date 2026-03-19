import * as vscode from 'vscode';
import { FortressAnalyticsPanel } from './panels/AnalyticsPanel';
import { FortressTeamManager } from './team/TeamManager';
import { FortressOfflineSync } from './offline/OfflineSync';

export class FortressEnhanced {
  private analyticPanel: FortressAnalyticsPanel;
  private teamManager: FortressTeamManager;
  private offlineSync: FortressOfflineSync;

  constructor(context: vscode.ExtensionContext) {
    this.analyticPanel = new FortressAnalyticsPanel(context);
    this.teamManager = new FortressTeamManager(context);
    this.offlineSync = new FortressOfflineSync(context);
  }

  /**
   * Show analytics dashboard
   */
  showAnalytics(): void {
    this.analyticPanel.show();
  }

  /**
   * Batch optimize files/folders
   */
  async batchOptimize(uris: vscode.Uri[]): Promise<void> {
    const progress = vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Optimizing files...",
        cancellable: true,
      },
      async (progress) => {
        let completed = 0;
        for (const uri of uris) {
          progress.report({
            increment: (100 / uris.length),
            message: `Optimizing ${uri.fsPath}...`,
          });

          // Optimize file
          await this.optimizeFile(uri);
          completed++;
        }

        vscode.window.showInformationMessage(
          `Optimized ${completed} files successfully`
        );
      }
    );
  }

  /**
   * Create shared optimization template
   */
  async createTemplate(name: string, prompt: string, level: string): Promise<void> {
    await this.teamManager.saveTemplate({
      name,
      prompt,
      level,
      createdAt: new Date(),
      createdBy: await this.teamManager.getCurrentUser(),
    });

    vscode.window.showInformationMessage(`Template "${name}" created`);
  }

  /**
   * Share template with team
   */
  async shareTemplate(templateId: string, teamIds: string[]): Promise<void> {
    await this.teamManager.shareTemplate(templateId, teamIds);
    vscode.window.showInformationMessage("Template shared with team");
  }

  /**
   * Apply custom optimization rules
   */
  async applyCustomRules(text: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('fortress');
    const rules = config.get('customRules', []);

    // Apply rules based on patterns
    let optimized = text;
    for (const rule of rules) {
      if (this.matchesPattern(text, rule.patterns)) {
        optimized = await this.optimizeWithLevel(
          optimized,
          rule.optimizationLevel
        );
      }
    }

    return optimized;
  }

  /**
   * Enable offline mode with caching
   */
  async enableOfflineMode(): Promise<void> {
    await this.offlineSync.startSync();
    vscode.window.showInformationMessage("Offline mode enabled");
  }

  private matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(p => text.toLowerCase().includes(p.toLowerCase()));
  }

  private async optimizeFile(uri: vscode.Uri): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(uri);
    const text = doc.getText();
    // Optimization logic here
  }

  private async optimizeWithLevel(text: string, level: string): Promise<string> {
    // Call API with specified level
    return text;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const fortress = new FortressEnhanced(context);

  // Register commands
  context.subscriptions.push(
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

    vscode.commands.registerCommand('fortress.enableOffline', async () => {
      await fortress.enableOfflineMode();
    })
  );
}
