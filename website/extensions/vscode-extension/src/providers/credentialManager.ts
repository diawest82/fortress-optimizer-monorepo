import * as vscode from 'vscode';

export interface ProviderCredentials {
  openai?: {
    apiKey: string;
    model: string;
  };
  anthropic?: {
    apiKey: string;
    model: string;
  };
  copilot?: {
    model: string;
    interceptionEnabled: boolean;
  };
}

export class CredentialManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Store API credentials securely using VS Code's secret storage
   */
  async storeCredential(provider: 'openai' | 'anthropic' | 'azure' | 'gemini' | 'groq', apiKey: string, options?: Record<string, string>): Promise<void> {
    const key = `stealthOptimizer.${provider}.apiKey`;
    try {
      await this.context.secrets.store(key, apiKey);
      
      // Store additional options if provided (e.g., endpoint for Azure)
      if (options) {
        for (const [optKey, optValue] of Object.entries(options)) {
          const optionKey = `stealthOptimizer.${provider}.${optKey}`;
          await this.context.secrets.store(optionKey, optValue);
        }
      }
    } catch (error) {
      console.error(`Failed to store ${provider} credentials:`, error);
      throw new Error(`Failed to store ${provider} API key`);
    }
  }

  /**
   * Retrieve API credentials from secure storage
   */
  async getCredential(provider: 'openai' | 'anthropic' | 'azure' | 'gemini' | 'groq'): Promise<string | undefined> {
    const key = `stealthOptimizer.${provider}.apiKey`;
    try {
      return await this.context.secrets.get(key);
    } catch (error) {
      console.error(`Failed to retrieve ${provider} credentials:`, error);
      return undefined;
    }
  }

  /**
   * Retrieve additional credential options (e.g., endpoints)
   */
  async getCredentialOption(provider: string, optionKey: string): Promise<string | undefined> {
    const key = `stealthOptimizer.${provider}.${optionKey}`;
    try {
      return await this.context.secrets.get(key);
    } catch (error) {
      console.error(`Failed to retrieve ${provider} option ${optionKey}:`, error);
      return undefined;
    }
  }

  /**
   * Delete stored credentials
   */
  async deleteCredential(provider: 'openai' | 'anthropic'): Promise<void> {
    const key = `stealthOptimizer.${provider}.apiKey`;
    try {
      await this.context.secrets.delete(key);
    } catch (error) {
      console.error(`Failed to delete ${provider} credentials:`, error);
    }
  }

  /**
   * Store selected model for a provider
   */
  async storeModel(provider: 'openai' | 'anthropic', model: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('stealthOptimizer');
    const key = `${provider}Model`;
    await config.update(key, model, vscode.ConfigurationTarget.Global);
  }

  /**
   * Get stored model for a provider
   */
  getModel(provider: 'openai' | 'anthropic' | 'copilot'): string {
    const config = vscode.workspace.getConfiguration('stealthOptimizer');
    if (provider === 'openai') {
      return config.get<string>('openaiModel', 'gpt-4');
    } else if (provider === 'anthropic') {
      return config.get<string>('anthropicModel', 'claude-3-sonnet-20240229');
    } else {
      return 'copilot'; // Copilot model is always 'copilot'
    }
  }

  /**
   * Check if credentials are configured for a provider
   */
  async hasCredentials(provider: 'openai' | 'anthropic'): Promise<boolean> {
    const cred = await this.getCredential(provider);
    return !!cred && cred.length > 0;
  }

  /**
   * Prompt user to enter API key
   */
  async promptForApiKey(provider: 'openai' | 'anthropic'): Promise<string | undefined> {
    const displayName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
    const helpUrl = provider === 'openai' 
      ? 'https://platform.openai.com/account/api-keys'
      : 'https://console.anthropic.com/account/keys';

    const input = await vscode.window.showInputBox({
      prompt: `Enter your ${displayName} API key`,
      placeHolder: `sk-... (Get one at ${helpUrl})`,
      password: true,
      validateInput: (value) => {
        if (!value) return 'API key cannot be empty';
        if (value.length < 10) return 'API key seems too short';
        return null;
      }
    });

    if (input) {
      await this.storeCredential(provider, input);
      vscode.window.showInformationMessage(`${displayName} API key stored securely.`);
      return input;
    }

    return undefined;
  }

  /**
   * Prompt user to select a model
   */
  async promptForModel(provider: 'openai' | 'anthropic', availableModels: string[]): Promise<string | undefined> {
    const selected = await vscode.window.showQuickPick(availableModels, {
      placeHolder: `Select ${provider} model`
    });

    if (selected) {
      await this.storeModel(provider, selected);
      return selected;
    }

    return undefined;
  }
}
