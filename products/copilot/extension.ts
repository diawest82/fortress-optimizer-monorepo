import * as vscode from 'vscode';
import { FortressCopilotProvider } from './fortress-provider';

let provider: FortressCopilotProvider;

export function activate(context: vscode.ExtensionContext) {
  provider = new FortressCopilotProvider();

  // Register Copilot participant
  const chatParticipantHandler = vscode.chat.registerChatParticipantHandler(
    'fortress',
    async (request, context, response, token) => {
      try {
        const result = await provider.handleRequest(request, context);
        response.markdown(result);
      } catch (error) {
        response.markdown(`Error: ${error}`);
      }
    }
  );

  // Register commands
  const optimizeCommand = vscode.commands.registerCommand(
    'fortress.optimize',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showErrorMessage('No text selected');
        return;
      }

      // Call optimization
      const result = await provider.handleRequest({ prompt: text }, null);
      
      // Show result in output panel
      const outputChannel = vscode.window.createOutputChannel('Fortress');
      outputChannel.append(result);
      outputChannel.show();
    }
  );

  const usageCommand = vscode.commands.registerCommand(
    'fortress.usage',
    async () => {
      const usage = await provider.getUsage();
      vscode.window.showInformationMessage(usage);
    }
  );

  const setLevelCommand = vscode.commands.registerCommand(
    'fortress.setLevel',
    async () => {
      const level = await vscode.window.showQuickPick(
        ['conservative', 'balanced', 'aggressive'],
        { placeHolder: 'Select optimization level' }
      );

      if (level) {
        provider.setOptimizationLevel(
          level as 'conservative' | 'balanced' | 'aggressive'
        );
        vscode.window.showInformationMessage(`Optimization level set to: ${level}`);
      }
    }
  );

  context.subscriptions.push(
    chatParticipantHandler,
    optimizeCommand,
    usageCommand,
    setLevelCommand
  );
}

export function deactivate() {}
