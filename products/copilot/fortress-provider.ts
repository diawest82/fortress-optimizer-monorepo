import * as vscode from 'vscode';
import axios from 'axios';

export class FortressCopilotProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(private context?: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('fortress');
    // Prefer env var over settings (settings.json is plaintext)
    this.apiKey = process.env.FORTRESS_API_KEY || config.get('apiKey') || '';
    const url = config.get<string>('apiUrl') || 'https://api.fortress-optimizer.com';
    if (!url.startsWith('https://') && !url.startsWith('http://localhost')) {
      throw new Error('Fortress API requires HTTPS.');
    }
    this.apiUrl = url;

    // Load API key from SecretStorage if available (async)
    if (context?.secrets) {
      context.secrets.get('fortress-api-key').then(secret => {
        if (secret) this.apiKey = secret;
      });
    }
  }

  /** Store API key securely via VS Code SecretStorage */
  async setApiKey(key: string): Promise<void> {
    this.apiKey = key;
    if (this.context?.secrets) {
      await this.context.secrets.store('fortress-api-key', key);
    }
  }

  /**
   * Handle Copilot Chat participant requests
   */
  async handleRequest(
    request: any,
    context: any
  ): Promise<string> {
    const prompt = request.prompt || '';
    
    if (!prompt) {
      return 'Please provide a prompt to optimize';
    }

    try {
      return await this.optimizePrompt(prompt);
    } catch (error) {
      console.error('Fortress optimization error:', error);
      return 'Optimization unavailable. Please try again.';
    }
  }

  /**
   * Optimize prompt via Fortress API
   */
  private async optimizePrompt(prompt: string): Promise<string> {
    const level = vscode.workspace
      .getConfiguration('fortress')
      .get('optimizationLevel', 'balanced');

    const response = await axios.post(
      `${this.apiUrl}/api/optimize`,
      {
        prompt,
        level,
        provider: 'openai',
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.status === 'success') {
      const opt = response.data.optimization;
      const tokens = response.data.tokens;

      return `
**Fortress Token Optimization**

**Optimized Prompt:**
\`\`\`
${opt.optimized_prompt}
\`\`\`

**Token Savings:**
- Original: ${tokens.original} tokens
- Optimized: ${tokens.optimized} tokens
- Saved: ${tokens.savings} tokens (${tokens.savings_percentage.toFixed(1)}%)
- Technique: ${opt.technique}

Copy the optimized prompt above to use with Claude, GPT-4, or other models.
      `;
    } else {
      return `Error: ${response.data.error}`;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<string> {
    const response = await axios.get(
      `${this.apiUrl}/api/usage`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 5000,
      }
    );

    const usage = response.data;
    const percentUsed = usage.tokens_limit > 0
      ? ((usage.tokens_optimized / usage.tokens_limit) * 100).toFixed(1)
      : '0.0';
    return `
**Token Usage**

Tier: ${usage.tier}
Optimized: ${usage.tokens_optimized.toLocaleString()} / ${usage.tokens_limit.toLocaleString()} tokens
Saved: ${usage.tokens_saved.toLocaleString()} tokens
Remaining: ${usage.tokens_remaining.toLocaleString()} tokens
Requests: ${usage.requests}
Progress: ${percentUsed}%
Rate Limit: ${usage.rate_limit} req/min
Reset: ${usage.reset_date}
    `;
  }

  /**
   * Set optimization level
   */
  setOptimizationLevel(level: 'conservative' | 'balanced' | 'aggressive'): void {
    vscode.workspace
      .getConfiguration('fortress')
      .update('optimizationLevel', level, vscode.ConfigurationTarget.Global);
  }
}
