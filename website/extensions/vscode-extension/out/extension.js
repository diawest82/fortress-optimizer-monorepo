"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const metricsStore_1 = require("./metricsStore");
const dashboard_1 = require("./webview/dashboard");
const credentialManager_1 = require("./providers/credentialManager");
const analytics_1 = require("./utils/analytics");
const logger_1 = require("./utils/logger");
const usageTracker_1 = require("./utils/usageTracker");
const freemiumGate_1 = require("./utils/freemiumGate");
const serviceClient_1 = require("./utils/serviceClient");
const copilotChatInterceptor_1 = require("./copilotChatInterceptor");
const claudeDesktopChatInterceptor_1 = require("./claudeDesktopChatInterceptor");
const anthropicApiProvider_1 = require("./providers/anthropicApiProvider");
const azureOpenaiProvider_1 = require("./providers/azureOpenaiProvider");
const geminiProvider_1 = require("./providers/geminiProvider");
const groqProvider_1 = require("./providers/groqProvider");
const ollamaProvider_1 = require("./providers/ollamaProvider");
let statusBarItem;
let credentialManager;
let analytics;
let usageTracker;
let freemiumGate;
let serviceClient;
let copilotInterceptor;
let claudeDesktopInterceptor;
let providerRegistry;
function activate(context) {
    const logger = (0, logger_1.getLogger)();
    const metrics = new metricsStore_1.MetricsStore(context.globalState);
    // NOTE: All optimization logic moved to Python service (black box)
    // Extension is now pure UI client with no algorithm knowledge
    credentialManager = new credentialManager_1.CredentialManager(context);
    analytics = new analytics_1.Analytics(context);
    usageTracker = new usageTracker_1.UsageTracker(context.globalState);
    freemiumGate = new freemiumGate_1.FreemiumGate(usageTracker);
    serviceClient = new serviceClient_1.OptimizationServiceClient();
    copilotInterceptor = new copilotChatInterceptor_1.CopilotChatInterceptor(serviceClient, analytics);
    claudeDesktopInterceptor = new claudeDesktopChatInterceptor_1.ClaudeDesktopChatInterceptor(serviceClient, analytics);
    logger.info('Stealth Token Optimizer activated');
    // Initialize all cloud and local providers
    providerRegistry = new ProviderRegistry(logger);
    initializeProviders(context, providerRegistry, logger).catch(error => {
        logger.warn('Some providers failed to initialize:', error.message);
    });
    // Initialize Copilot integration
    copilotInterceptor.initialize(context).catch(error => {
        logger.debug('Copilot integration not available:', error.message);
    });
    // Initialize Claude Desktop integration
    claudeDesktopInterceptor.initialize().catch(error => {
        logger.debug('Claude Desktop integration not available:', error.message);
    });
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'stealthOptimizer.dashboard';
    statusBarItem.show();
    const updateStatus = async () => {
        const enabled = vscode.workspace.getConfiguration('stealthOptimizer').get('enabled', true);
        const last = await metrics.getLast();
        const badge = enabled ? 'ON' : 'OFF';
        const lastPct = (last && last.percentSaved) ? ` | last ${last.percentSaved.toFixed(0)}%` : '';
        statusBarItem.text = `$(shield) Optimizer ${badge}${lastPct}`;
        statusBarItem.tooltip = 'Open Token Savings Dashboard';
    };
    context.subscriptions.push(vscode.commands.registerCommand('stealthOptimizer.toggle', async () => {
        const cfg = vscode.workspace.getConfiguration('stealthOptimizer');
        const current = cfg.get('enabled', true);
        await cfg.update('enabled', !current, vscode.ConfigurationTarget.Global);
        await updateStatus();
        vscode.window.showInformationMessage(`Stealth Optimizer ${!current ? 'enabled' : 'disabled'}.`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('stealthOptimizer.dashboard', async () => {
        await dashboard_1.DashboardPanel.show(context.extensionUri, metrics, serviceClient);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('stealthOptimizer.settings', async () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'stealthOptimizer');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('stealthOptimizer.simulate', async () => {
        const enabled = vscode.workspace.getConfiguration('stealthOptimizer').get('enabled', true);
        const costPer1K = vscode.workspace.getConfiguration('stealthOptimizer').get('costPer1KTokensUSD', 0.01);
        const optimizationLevel = vscode.workspace.getConfiguration('stealthOptimizer').get('optimizationLevel', 'balanced');
        const provider = vscode.workspace.getConfiguration('stealthOptimizer').get('provider', 'openai');
        const detectCode = vscode.workspace.getConfiguration('stealthOptimizer').get('detectCode', true);
        const semanticThreshold = vscode.workspace.getConfiguration('stealthOptimizer').get('semanticThreshold', 0.85);
        // Array of 10 demo prompts with high semantic similarity lines (V1: Stealth savings)
        const demoPrompts = [
            `You are an expert code reviewer. Please analyze this codebase carefully.
You are an expert code reviewer, please analyze this codebase carefully.
Look for performance issues and code quality problems.
Identify performance issues and code quality.
Check for best practices and design patterns.
Review best practices and design patterns used.`,
            `Analyze the React component performance carefully.
Analyze React component performance carefully.
Focus on rendering efficiency and optimization.
Focus on rendering efficiency for optimization.
Look for unnecessary re-renders and state issues.
Identify unnecessary re-renders and state management issues.`,
            `Review the API endpoint for security issues.
Review API endpoint for security issues.
Check for SQL injection and authentication issues.
Check for SQL injection and authentication vulnerabilities.
Ensure proper input validation and sanitization.
Ensure input validation and sanitization are correct.`,
            `Examine the database schema for performance.
Examine database schema for performance issues.
Identify query bottlenecks and optimization opportunities.
Identify query bottlenecks and optimization areas.
Look for missing indexes and relationships.
Check for missing indexes and relationships here.`,
            `Refactor the TypeScript code for type safety.
Refactor TypeScript code for type safety improvements.
Improve code readability and remove duplication.
Improve code readability and eliminate duplication.
Add proper type annotations everywhere.
Add proper type annotations throughout the code.`,
            `Optimize CSS for performance and maintainability.
Optimize CSS for performance and maintainability concerns.
Remove unused styles and consolidate rules.
Remove unused styles and consolidate CSS rules.
Consider CSS variables and modern techniques.
Consider CSS variables and modern layout techniques.`,
            `Improve the GitHub Actions workflow efficiency.
Improve GitHub Actions workflow for efficiency.
Reduce build time and improve reliability.
Reduce build time for better reliability.
Optimize parallelization and caching strategies.
Optimize job parallelization and caching strategies.`,
            `Review the unit test suite thoroughly.
Review unit test suite for completeness.
Identify gaps in test coverage areas.
Identify test coverage gaps and issues.
Improve assertions and error scenarios.
Improve assertions for error scenarios.`,
            `Analyze the Docker configuration details.
Analyze Docker configuration for optimization.
Optimize image layers and build efficiency.
Optimize Docker image layers and build time.
Improve base image selection carefully.
Improve base image selection and multi-stage builds.`,
            `Evaluate the authentication system security.
Evaluate authentication system for security.
Check token handling and session security.
Check token handling and session management.
Review encryption and credential storage.
Review encryption and credential storage methods.`
        ];
        // Randomly select a demo prompt
        const randomIndex = Math.floor(Math.random() * demoPrompts.length);
        const rawPrompt = demoPrompts[randomIndex];
        const start = Date.now();
        let result;
        if (enabled && serviceClient.getIsHealthy()) {
            // Call Python service for optimization
            try {
                const optimizationResult = await serviceClient.optimize(rawPrompt, provider, optimizationLevel);
                result = {
                    tokensBefore: optimizationResult.metrics.tokensBefore,
                    tokensAfter: optimizationResult.metrics.tokensAfter,
                    percentSaved: optimizationResult.metrics.percentSaved,
                    estCostSavedUSD: optimizationResult.metrics.costUsdSaved,
                    optimizedPrompt: optimizationResult.optimizedPrompt
                };
            }
            catch (error) {
                logger.warn(`Service optimization failed, using no-op: ${error}`);
                // Fallback to no-op
                result = {
                    tokensBefore: rawPrompt.length / 4,
                    tokensAfter: rawPrompt.length / 4,
                    percentSaved: 0,
                    estCostSavedUSD: 0,
                    optimizedPrompt: rawPrompt
                };
            }
        }
        else {
            // No-op: return prompt unchanged
            const tokenCount = Math.max(1, rawPrompt.length / 4);
            result = {
                tokensBefore: tokenCount,
                tokensAfter: tokenCount,
                percentSaved: 0,
                estCostSavedUSD: 0,
                optimizedPrompt: rawPrompt
            };
        }
        const latencyMs = Date.now() - start;
        await metrics.add({
            ts: new Date().toISOString(),
            provider: 'demo',
            model: 'demo-model',
            tokensBefore: result.tokensBefore,
            tokensAfter: result.tokensAfter,
            percentSaved: result.percentSaved,
            estCostSavedUSD: result.estCostSavedUSD,
            latencyMs,
            success: true
        });
        // Track optimization event for analytics
        analytics.trackOptimization({
            provider,
            level: optimizationLevel,
            tokensBefore: result.tokensBefore,
            tokensAfter: result.tokensAfter,
            percentSaved: result.percentSaved,
            duration: latencyMs,
            success: true
        });
        await updateStatus();
        vscode.window.showInformationMessage(`Optimized: ${result.tokensBefore} → ${result.tokensAfter} tokens (${result.percentSaved.toFixed(1)}% saved).`);
        // Refresh dashboard if it's open
        if (dashboard_1.DashboardPanel.current) {
            await dashboard_1.DashboardPanel.show(context.extensionUri, metrics, serviceClient);
        }
    }));
    // API Configuration command
    context.subscriptions.push(vscode.commands.registerCommand('stealthOptimizer.configureAPIs', async () => {
        const provider = await vscode.window.showQuickPick(['OpenAI', 'Anthropic', 'Both'], { placeHolder: 'Configure API keys for...' });
        if (!provider)
            return;
        try {
            if (provider === 'OpenAI' || provider === 'Both') {
                const apiKey = await credentialManager.promptForApiKey('openai');
                if (apiKey) {
                    logger.info('OpenAI API key configured');
                    analytics.trackFeature('api_configured', { provider: 'openai' });
                }
            }
            if (provider === 'Anthropic' || provider === 'Both') {
                const apiKey = await credentialManager.promptForApiKey('anthropic');
                if (apiKey) {
                    logger.info('Anthropic API key configured');
                    analytics.trackFeature('api_configured', { provider: 'anthropic' });
                }
            }
        }
        catch (error) {
            logger.error('API configuration failed', error);
            vscode.window.showErrorMessage('Failed to configure API keys');
        }
    }));
    // View Analytics command
    context.subscriptions.push(vscode.commands.registerCommand('stealthOptimizer.viewAnalytics', async () => {
        try {
            const stats = analytics.getStatistics();
            const statsText = JSON.stringify(stats, null, 2);
            const panel = vscode.window.createWebviewPanel('analyticsView', 'Token Optimizer Analytics', vscode.ViewColumn.Two);
            panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Analytics</title>
          <style>
            body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #e0e0e0; }
            pre { background: #252526; padding: 10px; border-radius: 4px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h2>📊 Stealth Optimizer Analytics</h2>
          <pre>${escapeHtml(statsText)}</pre>
        </body>
        </html>
      `;
            logger.info('Analytics viewed');
            analytics.trackFeature('analytics_viewed');
        }
        catch (error) {
            logger.error('Failed to display analytics', error);
            vscode.window.showErrorMessage('Failed to load analytics');
        }
    }));
    // Copilot Configuration command
    context.subscriptions.push(vscode.commands.registerCommand('stealthOptimizer.configureCopilot', async () => {
        try {
            const isCopilotAvailable = await copilotChatInterceptor_1.CopilotChatInterceptor.isCopilotAvailable();
            if (!isCopilotAvailable) {
                vscode.window.showWarningMessage('GitHub Copilot Chat extension is not installed. Please install it from the VS Code Marketplace.');
                return;
            }
            const action = await vscode.window.showQuickPick(['Enable Chat Interception', 'Disable Chat Interception', 'Set as Provider'], { placeHolder: 'Configure Copilot integration...' });
            if (!action)
                return;
            const config = vscode.workspace.getConfiguration('stealthOptimizer');
            if (action === 'Enable Chat Interception') {
                await config.update('copilotInterception', true, vscode.ConfigurationTarget.Global);
                copilotInterceptor.setEnabled(true);
                vscode.window.showInformationMessage('Copilot chat interception enabled. Use @stealthOptimizer in Copilot chat to optimize prompts.');
                analytics.trackFeature('copilot_interception_enabled');
            }
            else if (action === 'Disable Chat Interception') {
                await config.update('copilotInterception', false, vscode.ConfigurationTarget.Global);
                copilotInterceptor.setEnabled(false);
                vscode.window.showInformationMessage('Copilot chat interception disabled.');
                analytics.trackFeature('copilot_interception_disabled');
            }
            else if (action === 'Set as Provider') {
                await config.update('provider', 'copilot', vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('Copilot set as default optimization provider.');
                analytics.trackFeature('copilot_set_as_provider');
            }
            logger.info('Copilot configuration updated', { action });
        }
        catch (error) {
            logger.error('Copilot configuration failed', error);
            vscode.window.showErrorMessage('Failed to configure Copilot');
        }
    }));
    // Claude Desktop Configuration command
    context.subscriptions.push(vscode.commands.registerCommand('stealthOptimizer.configureClaudeDesktop', async () => {
        try {
            const isClaudeDesktopAvailable = await claudeDesktopChatInterceptor_1.ClaudeDesktopChatInterceptor.isClaudeDesktopAvailable();
            if (!isClaudeDesktopAvailable) {
                vscode.window.showWarningMessage('Claude Desktop extension is not installed. Please install it from the VS Code Marketplace when available.');
                return;
            }
            const action = await vscode.window.showQuickPick(['Enable Chat Interception', 'Disable Chat Interception', 'Set as Provider'], { placeHolder: 'Configure Claude Desktop integration...' });
            if (!action)
                return;
            const config = vscode.workspace.getConfiguration('stealthOptimizer');
            if (action === 'Enable Chat Interception') {
                await config.update('claudeDesktopInterception', true, vscode.ConfigurationTarget.Global);
                claudeDesktopInterceptor.setEnabled(true);
                vscode.window.showInformationMessage('Claude Desktop chat interception enabled. Messages will be optimized automatically.');
                analytics.trackFeature('claude_desktop_interception_enabled');
            }
            else if (action === 'Disable Chat Interception') {
                await config.update('claudeDesktopInterception', false, vscode.ConfigurationTarget.Global);
                claudeDesktopInterceptor.setEnabled(false);
                vscode.window.showInformationMessage('Claude Desktop chat interception disabled.');
                analytics.trackFeature('claude_desktop_interception_disabled');
            }
            else if (action === 'Set as Provider') {
                await config.update('provider', 'claude-desktop', vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('Claude Desktop set as default optimization provider.');
                analytics.trackFeature('claude_desktop_set_as_provider');
            }
            logger.info('Claude Desktop configuration updated', { action });
        }
        catch (error) {
            logger.error('Claude Desktop configuration failed', error);
            vscode.window.showErrorMessage('Failed to configure Claude Desktop');
        }
    }));
    updateStatus();
}
/**
 * Provider Registry
 * Manages all available providers
 */
class ProviderRegistry {
    constructor(logger) {
        this.providers = new Map();
        this.logger = logger;
    }
    register(id, provider) {
        this.providers.set(id, provider);
        this.logger.debug(`Provider registered: ${id}`);
    }
    get(id) {
        return this.providers.get(id);
    }
    getAll() {
        return this.providers;
    }
    async detectAvailable() {
        const available = [];
        for (const [id, provider] of this.providers) {
            try {
                if (provider.isAvailable && provider.isAvailable()) {
                    available.push(id);
                }
            }
            catch (error) {
                this.logger.debug(`Provider availability check failed for ${id}`);
            }
        }
        return available;
    }
}
/**
 * Initialize all providers
 */
async function initializeProviders(context, registry, logger) {
    // Initialize Anthropic API
    const anthropicProvider = new anthropicApiProvider_1.AnthropicApiProvider(credentialManager);
    registry.register('anthropic-api', anthropicProvider);
    try {
        if (await anthropicProvider.detect()) {
            logger.info('✓ Anthropic API provider initialized');
            analytics.track('provider_initialized_anthropic');
        }
    }
    catch (error) {
        logger.debug(`Anthropic API initialization: ${error}`);
    }
    // Initialize Azure OpenAI
    const azureProvider = new azureOpenaiProvider_1.AzureOpenaiProvider(credentialManager);
    registry.register('azure-openai', azureProvider);
    try {
        if (await azureProvider.detect()) {
            logger.info('✓ Azure OpenAI provider initialized');
            analytics.track('provider_initialized_azure');
        }
    }
    catch (error) {
        logger.debug(`Azure OpenAI initialization: ${error}`);
    }
    // Initialize Google Gemini
    const geminiProvider = new geminiProvider_1.GeminiProvider(credentialManager);
    registry.register('gemini-api', geminiProvider);
    try {
        if (await geminiProvider.detect()) {
            logger.info('✓ Google Gemini API provider initialized');
            analytics.track('provider_initialized_gemini');
        }
    }
    catch (error) {
        logger.debug(`Gemini API initialization: ${error}`);
    }
    // Initialize Groq (speed specialist)
    const groqProvider = new groqProvider_1.GroqProvider(credentialManager);
    registry.register('groq-api', groqProvider);
    try {
        if (await groqProvider.detect()) {
            logger.info('✓ Groq API provider initialized');
            analytics.track('provider_initialized_groq');
        }
    }
    catch (error) {
        logger.debug(`Groq API initialization: ${error}`);
    }
    // Initialize Ollama (local models - no config needed)
    const ollamaProvider = new ollamaProvider_1.OllamaProvider();
    registry.register('ollama-local', ollamaProvider);
    try {
        if (await ollamaProvider.detect()) {
            logger.info('✓ Ollama local models detected');
            analytics.track('provider_initialized_ollama');
        }
    }
    catch (error) {
        logger.debug(`Ollama detection: ${error}`);
    }
    // Log summary
    const available = await registry.detectAvailable();
    logger.info(`Provider initialization complete. Available: ${available.join(', ')}`);
}
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}
function deactivate() {
    if (statusBarItem)
        statusBarItem.dispose();
    (0, logger_1.getLogger)().info('Stealth Token Optimizer deactivated');
}
//# sourceMappingURL=extension.js.map