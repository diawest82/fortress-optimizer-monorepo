/**
 * Fortress Status Bar for Cursor
 *
 * Displays a persistent status bar item showing session optimization stats.
 * Updates after each optimization call.
 */

import * as vscode from 'vscode';

export class FortressStatusBar {
  private item: vscode.StatusBarItem;
  private totalSaved = 0;
  private requestCount = 0;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      50,
    );
    this.item.command = 'fortress.showUsage';
    this.render();
  }

  /** Call after a successful optimization to update counters. */
  recordOptimization(tokensSaved: number): void {
    this.totalSaved += tokensSaved;
    this.requestCount += 1;
    this.render();
  }

  /** Show or hide based on user preference. */
  setVisible(visible: boolean): void {
    if (visible) {
      this.item.show();
    } else {
      this.item.hide();
    }
  }

  /** Clean up the status bar item. */
  dispose(): void {
    this.item.dispose();
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private render(): void {
    if (this.requestCount === 0) {
      this.item.text = '$(zap) Fortress';
      this.item.tooltip = 'Fortress Token Optimizer for Cursor -- no optimizations yet';
    } else {
      const formatted = this.totalSaved >= 1000
        ? `${(this.totalSaved / 1000).toFixed(1)}k`
        : String(this.totalSaved);
      this.item.text = `$(zap) ${formatted} tokens saved`;
      this.item.tooltip = [
        'Fortress Token Optimizer for Cursor',
        `Session: ${this.requestCount} optimization${this.requestCount === 1 ? '' : 's'}`,
        `Total tokens saved: ${this.totalSaved.toLocaleString()}`,
      ].join('\n');
    }

    this.item.show();
  }
}
