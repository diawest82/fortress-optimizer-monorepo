"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialManager = void 0;
const vscode = require("vscode");
class CredentialManager {
    constructor(context) {
        this.context = context;
    }
    /**
     * Store API credentials securely using VS Code's secret storage
     */
    async storeCredential(provider, apiKey, options) {
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
        }
        catch (error) {
            console.error(`Failed to store ${provider} credentials:`, error);
            throw new Error(`Failed to store ${provider} API key`);
        }
    }
    /**
     * Retrieve API credentials from secure storage
     */
    async getCredential(provider) {
        const key = `stealthOptimizer.${provider}.apiKey`;
        try {
            return await this.context.secrets.get(key);
        }
        catch (error) {
            console.error(`Failed to retrieve ${provider} credentials:`, error);
            return undefined;
        }
    }
    /**
     * Retrieve additional credential options (e.g., endpoints)
     */
    async getCredentialOption(provider, optionKey) {
        const key = `stealthOptimizer.${provider}.${optionKey}`;
        try {
            return await this.context.secrets.get(key);
        }
        catch (error) {
            console.error(`Failed to retrieve ${provider} option ${optionKey}:`, error);
            return undefined;
        }
    }
    /**
     * Delete stored credentials
     */
    async deleteCredential(provider) {
        const key = `stealthOptimizer.${provider}.apiKey`;
        try {
            await this.context.secrets.delete(key);
        }
        catch (error) {
            console.error(`Failed to delete ${provider} credentials:`, error);
        }
    }
    /**
     * Store selected model for a provider
     */
    async storeModel(provider, model) {
        const config = vscode.workspace.getConfiguration('stealthOptimizer');
        const key = `${provider}Model`;
        await config.update(key, model, vscode.ConfigurationTarget.Global);
    }
    /**
     * Get stored model for a provider
     */
    getModel(provider) {
        const config = vscode.workspace.getConfiguration('stealthOptimizer');
        if (provider === 'openai') {
            return config.get('openaiModel', 'gpt-4');
        }
        else if (provider === 'anthropic') {
            return config.get('anthropicModel', 'claude-3-sonnet-20240229');
        }
        else {
            return 'copilot'; // Copilot model is always 'copilot'
        }
    }
    /**
     * Check if credentials are configured for a provider
     */
    async hasCredentials(provider) {
        const cred = await this.getCredential(provider);
        return !!cred && cred.length > 0;
    }
    /**
     * Prompt user to enter API key
     */
    async promptForApiKey(provider) {
        const displayName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
        const helpUrl = provider === 'openai'
            ? 'https://platform.openai.com/account/api-keys'
            : 'https://console.anthropic.com/account/keys';
        const input = await vscode.window.showInputBox({
            prompt: `Enter your ${displayName} API key`,
            placeHolder: `sk-... (Get one at ${helpUrl})`,
            password: true,
            validateInput: (value) => {
                if (!value)
                    return 'API key cannot be empty';
                if (value.length < 10)
                    return 'API key seems too short';
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
    async promptForModel(provider, availableModels) {
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
exports.CredentialManager = CredentialManager;
//# sourceMappingURL=credentialManager.js.map