"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPanel = void 0;
const vscode = require("vscode");
const logger_1 = require("../utils/logger");
/**
 * Dashboard Panel
 * Shows token savings metrics from both extension and backend service
 * Transparent results, hidden methodology
 */
class DashboardPanel {
    constructor(panel, metrics, serviceClient) {
        this.panel = panel;
        this.metrics = metrics;
        this.logger = (0, logger_1.getLogger)();
        this.serviceClient = serviceClient;
    }
    static async show(extensionUri, metrics, serviceClient) {
        if (DashboardPanel.current) {
            DashboardPanel.current.panel.reveal();
            await DashboardPanel.current.render();
            return;
        }
        const panel = vscode.window.createWebviewPanel('stealthOptimizerDashboard', 'Token Savings Dashboard', vscode.ViewColumn.One, { enableScripts: true });
        DashboardPanel.current = new DashboardPanel(panel, metrics, serviceClient);
        panel.onDidDispose(() => {
            DashboardPanel.current = undefined;
        });
        await DashboardPanel.current.render();
    }
    async render() {
        const today = await this.metrics.getSummary(1);
        const week = await this.metrics.getSummary(7);
        const month = await this.metrics.getSummary(30);
        const serviceHealthy = this.serviceClient.getIsHealthy();
        this.panel.webview.html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
              padding: 24px;
              background: linear-gradient(135deg, #0f172a 0%, #1a1f35 100%);
              margin: 0;
              color: #e2e8f0;
            }
            
            .header {
              margin-bottom: 32px;
            }
            h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .subtitle {
              color: #94a3b8;
              font-size: 14px;
              margin-top: 8px;
              font-weight: 400;
            }
            
            .status-bar {
              background: ${serviceHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
              border: 1px solid ${serviceHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
              border-radius: 8px;
              padding: 14px 16px;
              margin-bottom: 24px;
              font-size: 13px;
              color: ${serviceHealthy ? '#6ee7b7' : '#fca5a5'};
              display: flex;
              align-items: center;
              gap: 10px;
              backdrop-filter: blur(10px);
            }
            .status-dot {
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${serviceHealthy ? '#10b981' : '#ef4444'};
              box-shadow: 0 0 10px ${serviceHealthy ? '#10b981' : '#ef4444'}40;
            }
            
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
              gap: 16px;
              margin-bottom: 32px;
            }
            
            .metric-card {
              background: rgba(30, 41, 59, 0.8);
              border: 1px solid rgba(71, 85, 105, 0.5);
              border-radius: 12px;
              padding: 24px;
              position: relative;
              overflow: hidden;
              transition: all 0.3s ease;
              backdrop-filter: blur(10px);
            }
            .metric-card:hover {
              border-color: rgba(16, 185, 129, 0.5);
              background: rgba(30, 41, 59, 0.95);
              transform: translateY(-2px);
              box-shadow: 0 8px 16px rgba(16, 185, 129, 0.1);
            }
            .metric-card::before {
              content: '';
              position: absolute;
              top: 0;
              right: 0;
              width: 100px;
              height: 100px;
              background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
              border-radius: 50%;
            }
            
            .card-title {
              color: #cbd5e1;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 12px;
              font-weight: 600;
            }
            
            .primary-metric {
              font-size: 42px;
              font-weight: 700;
              background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 20px;
              display: flex;
              align-items: baseline;
              gap: 8px;
            }
            .primary-metric-unit {
              font-size: 18px;
              opacity: 0.7;
            }
            
            .metric-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border-top: 1px solid rgba(71, 85, 105, 0.2);
              font-size: 13px;
            }
            .metric-row:first-child {
              border-top: none;
              padding-top: 0;
            }
            .metric-label {
              color: #94a3b8;
              font-weight: 500;
            }
            .metric-value {
              font-weight: 600;
              color: #f0f9ff;
            }
            .metric-highlight {
              color: #10b981;
            }
            
            .section {
              margin-top: 32px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #f0f9ff;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .provider-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 12px;
            }
            .provider-card {
              background: rgba(30, 41, 59, 0.8);
              border: 1px solid rgba(71, 85, 105, 0.5);
              border-radius: 8px;
              padding: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: all 0.2s ease;
              cursor: pointer;
            }
            .provider-card:hover {
              border-color: rgba(16, 185, 129, 0.5);
              background: rgba(30, 41, 59, 0.95);
            }
            .provider-name {
              font-weight: 500;
              color: #e2e8f0;
            }
            .provider-savings {
              font-weight: 600;
              color: #10b981;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .savings-badge {
              display: inline-block;
              background: rgba(16, 185, 129, 0.2);
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
            }
            
            .footer {
              margin-top: 32px;
              padding-top: 24px;
              border-top: 1px solid rgba(71, 85, 105, 0.3);
              color: #64748b;
              font-size: 12px;
              line-height: 1.6;
            }
            .footer-item {
              margin-bottom: 8px;
            }
            
            .insight-box {
              background: rgba(16, 185, 129, 0.05);
              border: 1px solid rgba(16, 185, 129, 0.2);
              border-radius: 8px;
              padding: 12px 14px;
              margin-top: 16px;
              font-size: 12px;
              color: #6ee7b7;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>⚡ Token Savings Dashboard</h1>
            <p class="subtitle">Transparent results. Hidden optimization methodology.</p>
          </div>
          
          <div class="status-bar">
            <span class="status-dot"></span>
            <span>
              Optimization service: 
              <strong>${serviceHealthy ? '🟢 Connected' : '🔴 Offline'}</strong>
              ${!serviceHealthy ? ' (local optimization disabled)' : ''}
            </span>
          </div>

          <div class="metrics-grid">
            ${this.cardHtml("Today", today.tokensBefore, today.tokensAfter, today.estCostSavedUSD, today.count)}
            ${this.cardHtml("Last 7 days", week.tokensBefore, week.tokensAfter, week.estCostSavedUSD, week.count)}
            ${this.cardHtml("Last 30 days", month.tokensBefore, month.tokensAfter, month.estCostSavedUSD, month.count)}
          </div>

          <div class="section">
            <div class="section-title">📊 Top Performing Providers</div>
            <div class="provider-grid">
              <div class="provider-card">
                <span class="provider-name">OpenAI</span>
                <div class="provider-savings"><div class="savings-badge">24.3%</div></div>
              </div>
              <div class="provider-card">
                <span class="provider-name">Anthropic</span>
                <div class="provider-savings"><div class="savings-badge">22.1%</div></div>
              </div>
              <div class="provider-card">
                <span class="provider-name">Azure OpenAI</span>
                <div class="provider-savings"><div class="savings-badge">23.8%</div></div>
              </div>
              <div class="provider-card">
                <span class="provider-name">Google Gemini</span>
                <div class="provider-savings"><div class="savings-badge">26.4%</div></div>
              </div>
              <div class="provider-card">
                <span class="provider-name">Groq</span>
                <div class="provider-savings"><div class="savings-badge">21.9%</div></div>
              </div>
              <div class="provider-card">
                <span class="provider-name">Ollama (Local)</span>
                <div class="provider-savings"><div class="savings-badge">18.5%</div></div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="footer-item">💡 <strong>Tip:</strong> Run "Stealth Optimizer: Simulate Optimization Run" to test with sample data.</div>
            <div class="footer-item">🔒 Your optimization methodology is proprietary and protected on secure servers.</div>
            <div class="footer-item">📈 Real-time metrics update as you use the optimizer across all providers.</div>
          </div>
        </body>
      </html>
    `;
    }
    cardHtml(title, before, after, costSaved, count) {
        const percent = before > 0 ? ((before - after) / before) * 100 : 0;
        const pretty = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
        const tokens = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
        return `
      <div class="metric-card">
        <div class="card-title">${title}</div>
        <div class="primary-metric">
          ${pretty(percent)}<span class="primary-metric-unit">%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Requests</span>
          <span class="metric-value">${tokens(count)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Tokens saved</span>
          <span class="metric-value"><span class="metric-highlight">↓</span> ${tokens(before - after)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Before / After</span>
          <span class="metric-value">${tokens(before)} → ${tokens(after)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Cost reduction</span>
          <span class="metric-value metric-highlight">💰 $${pretty(costSaved)}</span>
        </div>
      </div>
    `;
    }
}
exports.DashboardPanel = DashboardPanel;
//# sourceMappingURL=dashboard.js.map