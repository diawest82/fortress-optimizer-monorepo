import * as vscode from 'vscode';
import axios from 'axios';

export class FortressCopilotProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    const config = vscode.workspace.getConfiguration('fortress');
    this.apiKey = config.get('apiKey') || process.env.FORTRESS_API_KEY || '';
    this.apiUrl = config.get('apiUrl') || 'https://api.fortress-optimizer.com';
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
      return `Error optimizing prompt: ${error}`;
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
    return `
**Token Usage**

Used: ${usage.tokens_used_this_month.toLocaleString()} / ${usage.tokens_limit.toLocaleString()} tokens
Remaining: ${usage.tokens_remaining.toLocaleString()} tokens
Progress: ${usage.percentage_used.toFixed(1)}%
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
