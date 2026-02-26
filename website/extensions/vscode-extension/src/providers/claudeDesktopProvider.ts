import * as vscode from 'vscode';

/**
 * Claude Desktop Provider
 * Manages Claude Desktop token counting and optimization
 * 
 * Claude Desktop is Anthropic's native desktop app for Claude AI
 * This provider detects Claude Desktop extension (when available)
 * and enables optimization for messages sent via Claude Desktop
 */

export class ClaudeDesktopProvider {
  /**
   * Count tokens for Claude Desktop using heuristic formula
   * Based on Claude/Anthropic token counting (roughly 1 token per 3.5 characters)
   * 
   * @param text - Input prompt text
   * @returns Estimated token count
   */
  async countTokens(text: string): Promise<number> {
    if (!text) return 1; // Minimum 1 token

    // Claude uses roughly similar tokenization to GPT-4
    // Heuristic: text.length / 3.5 (slightly more aggressive than Copilot)
    const baseTokens = Math.ceil(text.length / 3.5);
    
    // Apply 0.97 adjustment factor for Claude's actual tokenization
    return Math.max(1, Math.ceil(baseTokens * 0.97));
  }

  /**
   * List available Claude Desktop models
   * Currently returns single identifier, but can expand as more models become available
   * 
   * @returns Array of model identifiers
   */
  async listModels(): Promise<string[]> {
    return ['claude-desktop'];
  }

  /**
   * Check if Claude Desktop extension is installed and active
   * 
   * @returns true if Claude Desktop is available
   */
  async isAvailable(): Promise<boolean> {
    return ClaudeDesktopProvider.isClaudeDesktopAvailable();
  }

  /**
   * Calculate cost estimate for Claude Desktop usage
   * 
   * @param tokens - Token count
   * @returns Estimated cost in USD
   */
  async getCostEstimate(tokens: number): Promise<number> {
    const config = vscode.workspace.getConfiguration('stealthOptimizer');
    const costPer1K = config.get<number>('costPer1KTokensUSD') ?? 0.002;
    return (tokens / 1000) * costPer1K;
  }

  /**
   * Get user-facing integration information
   * 
   * @returns Integration info for UI display
   */
  static getIntegrationInfo(): {
    name: string;
    description: string;
    features: string[];
    status: 'experimental' | 'beta' | 'production';
  } {
    return {
      name: 'Claude Desktop',
      description: 'Optimize prompts for Claude Desktop with Anthropic-level optimization',
      features: [
        'Semantic duplicate removal',
        'Code-aware processing',
        'Token counting (heuristic)',
        'Chat message optimization'
      ],
      status: 'beta'
    };
  }

  /**
   * Static method: Check if Claude Desktop extension is available
   * Detects: Anthropic.claude-desktop, Anthropic.claude, or related extensions
   * 
   * @returns true if Claude Desktop is detected
   */
  static async isClaudeDesktopAvailable(): Promise<boolean> {
    // Check for official Claude Desktop extension (when available)
    const claudeDesktop = vscode.extensions.getExtension('Anthropic.claude-desktop');
    const claude = vscode.extensions.getExtension('Anthropic.claude');
    
    // Also check for community extensions
    const communityClaudeFinder = Array.from(vscode.extensions.all || []).find(ext => 
      ext.id.toLowerCase().includes('claude') && ext.id.toLowerCase().includes('desktop')
    );

    return !!(
      (claudeDesktop?.isActive || claude?.isActive || communityClaudeFinder?.isActive)
    );
  }
}

/**
 * Export type for provider selection
 */
export type ClaudeDesktopModel = 'claude-desktop';
