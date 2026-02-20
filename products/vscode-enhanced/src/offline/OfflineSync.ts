import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OptimizationRulesEngine } from './OptimizationRules';
import { TokenCounter } from './TokenCounter';

/**
 * Offline Synchronization Manager
 * 
 * Handles:
 * - Local optimization rule caching
 * - Provider pricing data caching
 * - Encrypted storage of rules and preferences
 * - Periodic sync with server (optional, user-controlled)
 */
export class FortressOfflineSync {
  private context: vscode.ExtensionContext;
  private cacheDir: string;
  private rulesEngine: OptimizationRulesEngine;
  private tokenCounter: TokenCounter;
  private encryptionKey: string;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.cacheDir = path.join(context.globalStoragePath, 'fortress-cache');
    this.rulesEngine = new OptimizationRulesEngine();
    this.tokenCounter = new TokenCounter();
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.ensureCacheDir();
  }

  /**
   * Start offline sync mode
   * Initializes local caches and enables offline operation
   */
  async startSync(): Promise<void> {
    try {
      // Load cached rules
      await this.loadCachedRules();

      // Load provider pricing data
      await this.loadProviderPricingData();

      // Load user preferences
      await this.loadUserPreferences();

      // Set up optional background sync (if enabled)
      if (this.isAutoSyncEnabled()) {
        this.startBackgroundSync();
      }

      vscode.window.showInformationMessage('Fortress: Offline mode enabled');
    } catch (error) {
      vscode.window.showErrorMessage(`Fortress: Failed to enable offline mode: ${error}`);
    }
  }

  /**
   * Optimize a prompt completely offline (no network calls)
   * Uses cached rules and local algorithms
   */
  async optimizeOffline(
    prompt: string,
    options?: {
      optimizationLevel?: 'light' | 'balanced' | 'aggressive';
      provider?: string;
      customRules?: string[];
    }
  ): Promise<{
    optimized: string;
    originalTokens: number;
    optimizedTokens: number;
    savedTokens: number;
    savedPercent: number;
    report: OptimizationReport;
  }> {
    // Count original tokens (offline)
    const provider = options?.provider || 'openai';
    const originalTokens = this.tokenCounter.estimate(prompt, provider);

    // Apply optimization rules (offline)
    const rules = options?.customRules || this.rulesEngine.getDefaultRules(options?.optimizationLevel || 'balanced');
    let optimized = prompt;

    for (const ruleName of rules) {
      const rule = this.rulesEngine.getRule(ruleName);
      if (rule) {
        optimized = rule.apply(optimized);
      }
    }

    // Count optimized tokens (offline)
    const optimizedTokens = this.tokenCounter.estimate(optimized, provider);
    const savedTokens = originalTokens - optimizedTokens;
    const savedPercent = (savedTokens / originalTokens) * 100;

    // Generate report (offline)
    const report = await this.generateOptimizationReport(
      prompt,
      optimized,
      originalTokens,
      optimizedTokens,
      rules,
      provider
    );

    return {
      optimized,
      originalTokens,
      optimizedTokens,
      savedTokens,
      savedPercent,
      report,
    };
  }

  /**
   * Generate detailed optimization report (offline)
   */
  private async generateOptimizationReport(
    original: string,
    optimized: string,
    originalTokens: number,
    optimizedTokens: number,
    appliedRules: string[],
    provider: string
  ): Promise<OptimizationReport> {
    // Get provider pricing (from cache)
    const pricing = this.getProviderPricing(provider);
    const originalCost = (originalTokens / 1000) * pricing.avgCostPer1k;
    const optimizedCost = (optimizedTokens / 1000) * pricing.avgCostPer1k;
    const moneySaved = originalCost - optimizedCost;

    return {
      timestamp: new Date(),
      provider,
      originalLength: original.length,
      optimizedLength: optimized.length,
      lengthReduction: ((original.length - optimized.length) / original.length) * 100,
      originalTokens,
      optimizedTokens,
      tokenReduction: ((originalTokens - optimizedTokens) / originalTokens) * 100,
      originalCost,
      optimizedCost,
      moneySaved,
      appliedRules,
      rulesCount: appliedRules.length,
      metrics: {
        sentenceCount: this.countSentences(original),
        averageTokensPerSentence: originalTokens / this.countSentences(original),
        readabilityScore: this.calculateReadability(original),
      }
    };
  }

  /**
   * Load cached optimization rules from disk
   */
  private async loadCachedRules(): Promise<void> {
    const rulesFile = path.join(this.cacheDir, 'rules.json');
    
    if (fs.existsSync(rulesFile)) {
      const encrypted = fs.readFileSync(rulesFile, 'utf-8');
      const decrypted = this.decrypt(encrypted);
      const rules = JSON.parse(decrypted);
      this.rulesEngine.loadRules(rules);
    } else {
      // Initialize with default rules
      const defaultRules = this.rulesEngine.getDefaultRuleSet();
      this.saveCachedRules(defaultRules);
    }
  }

  /**
   * Load provider pricing data (cached locally, no network needed)
   */
  private async loadProviderPricingData(): Promise<void> {
    const pricingFile = path.join(this.cacheDir, 'provider-pricing.json');
    
    if (!fs.existsSync(pricingFile)) {
      // Initialize with default pricing (from public sources)
      const defaultPricing = {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06, updated: new Date() },
          'gpt-3.5-turbo': { input: 0.0005, output: 0.0015, updated: new Date() },
        },
        anthropic: {
          'claude-3-opus': { input: 0.015, output: 0.075, updated: new Date() },
          'claude-3-sonnet': { input: 0.003, output: 0.015, updated: new Date() },
        },
        google: {
          'gemini-pro': { input: 0.000125, output: 0.000375, updated: new Date() },
          'gemini-1.5-pro': { input: 0.00375, output: 0.015, updated: new Date() },
        }
      };
      
      fs.writeFileSync(pricingFile, JSON.stringify(defaultPricing, null, 2));
    }
  }

  /**
   * Load user preferences for offline mode
   */
  private async loadUserPreferences(): Promise<void> {
    const prefsFile = path.join(this.cacheDir, 'preferences.json');
    
    if (!fs.existsSync(prefsFile)) {
      const defaultPrefs = {
        offlineMode: true,
        autoSync: false,
        syncInterval: 86400000, // 24 hours
        lastSync: new Date(),
        analyticsEnabled: false,
        encryptionEnabled: true,
      };
      
      const encrypted = this.encrypt(JSON.stringify(defaultPrefs));
      fs.writeFileSync(prefsFile, encrypted);
    }
  }

  /**
   * Save cached rules to disk (encrypted)
   */
  private saveCachedRules(rules: any): void {
    const rulesFile = path.join(this.cacheDir, 'rules.json');
    const encrypted = this.encrypt(JSON.stringify(rules, null, 2));
    fs.writeFileSync(rulesFile, encrypted);
  }

  /**
   * Check if auto-sync is enabled
   */
  private isAutoSyncEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('fortress');
    return config.get('offline.autoSync', false);
  }

  /**
   * Start background sync process (optional, user-controlled)
   */
  private startBackgroundSync(): void {
    const syncInterval = vscode.workspace.getConfiguration('fortress').get('offline.syncInterval', 86400000);
    
    setInterval(async () => {
      if (vscode.window.state.focused) {
        // Only sync when window is focused (less intrusive)
        try {
          // This would call the server to get updated rules
          // But only if the user has enabled it
          await this.syncWithServer();
        } catch (error) {
          // Fail silently in offline mode - still works without sync
          console.log('Background sync failed (offline mode continues to work):', error);
        }
      }
    }, syncInterval);
  }

  /**
   * Sync with server (optional, requires network)
   * Only updates cached data, doesn't transmit user prompts
   */
  private async syncWithServer(): Promise<void> {
    const config = vscode.workspace.getConfiguration('fortress');
    const serverUrl = config.get('serverUrl', 'https://api.fortress-optimizer.com');
    
    try {
      // Fetch updated rules (no user data transmitted)
      const response = await fetch(`${serverUrl}/api/rules/latest`, {
        headers: { 'X-Client': 'vscode-extension' }
      });
      
      if (response.ok) {
        const updatedRules = await response.json();
        this.saveCachedRules(updatedRules);
      }
    } catch (error) {
      // If network fails, offline mode still works perfectly
      throw new Error(`Server sync failed: ${error}`);
    }
  }

  /**
   * Get provider pricing from cache
   */
  private getProviderPricing(provider: string): { avgCostPer1k: number } {
    const pricingFile = path.join(this.cacheDir, 'provider-pricing.json');
    const pricingData = JSON.parse(fs.readFileSync(pricingFile, 'utf-8'));
    
    if (pricingData[provider]) {
      const models = Object.values(pricingData[provider]) as any[];
      const avgCost = models.reduce((sum: number, model: any) => {
        return sum + (model.input + model.output) / 2;
      }, 0) / models.length;
      
      return { avgCostPer1k: avgCost };
    }
    
    return { avgCostPer1k: 0.03 }; // Default fallback
  }

  /**
   * Encryption/Decryption (simple XOR-based for local storage)
   * For production, use stronger encryption
   */
  private encrypt(text: string): string {
    // TODO: Implement proper AES-256-GCM encryption
    // For now, use base64 as placeholder
    return Buffer.from(text).toString('base64');
  }

  private decrypt(text: string): string {
    // TODO: Implement proper AES-256-GCM decryption
    // For now, use base64 as placeholder
    return Buffer.from(text, 'base64').toString('utf-8');
  }

  /**
   * Get or create encryption key from secure storage
   */
  private getOrCreateEncryptionKey(): string {
    const stored = this.context.secrets.get('fortress-encryption-key');
    
    if (stored) {
      return stored;
    }
    
    // Generate new key
    const newKey = Buffer.from(require('crypto').randomBytes(32)).toString('hex');
    this.context.secrets.store('fortress-encryption-key', newKey);
    return newKey;
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // Utility methods
  private countSentences(text: string): number {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  private calculateReadability(text: string): number {
    // Simple readability score (0-100)
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = this.countSentences(text);
    const avgWordsPerSentence = wordCount / sentenceCount;
    return Math.max(0, 100 - (avgWordsPerSentence * 2));
  }

  /**
   * Export optimization results for sharing
   */
  async exportReport(report: OptimizationReport, format: 'json' | 'markdown' = 'json'): Promise<string> {
    if (format === 'markdown') {
      return `
# Fortress Optimization Report

**Date**: ${report.timestamp}
**Provider**: ${report.provider}

## Metrics

| Metric | Value |
|--------|-------|
| Original Tokens | ${report.originalTokens} |
| Optimized Tokens | ${report.optimizedTokens} |
| Tokens Saved | ${report.optimizedTokens - report.originalTokens} (${report.tokenReduction.toFixed(1)}%) |
| Cost Saved | $${report.moneySaved.toFixed(4)} |

## Applied Rules

${report.appliedRules.map(r => `- ${r}`).join('\n')}

## Readability

- Original Readability: ${report.metrics.readabilityScore.toFixed(1)}/100
`;
    }
    
    return JSON.stringify(report, null, 2);
  }
}

interface OptimizationReport {
  timestamp: Date;
  provider: string;
  originalLength: number;
  optimizedLength: number;
  lengthReduction: number;
  originalTokens: number;
  optimizedTokens: number;
  tokenReduction: number;
  originalCost: number;
  optimizedCost: number;
  moneySaved: number;
  appliedRules: string[];
  rulesCount: number;
  metrics: {
    sentenceCount: number;
    averageTokensPerSentence: number;
    readabilityScore: number;
  };
}
