// Fortress Token Optimizer — Renderer (React)

import React, { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Level = 'conservative' | 'balanced' | 'aggressive';

interface OptimizationResult {
  request_id: string;
  status: string;
  optimization: {
    optimized_prompt: string;
    technique: string;
  };
  tokens: {
    original: number;
    optimized: number;
    savings: number;
    savings_percentage: number;
  };
}

interface UsageData {
  tier: string;
  tokens_optimized: number;
  tokens_saved: number;
  requests: number;
  tokens_limit: number;
  tokens_remaining: number;
  rate_limit: number;
  reset_date: string;
}

interface Settings {
  api_key: string;
  provider: string;
  optimization_level: string;
}

// Window augmentation for the preload bridge
declare global {
  interface Window {
    fortressAPI: {
      optimize: (args: { prompt: string; level: Level; provider: string }) => Promise<OptimizationResult>;
      getUsage: () => Promise<UsageData>;
      saveSettings: (s: Record<string, unknown>) => Promise<{ success: boolean }>;
      getSettings: () => Promise<Settings>;
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const LEVELS: Level[] = ['conservative', 'balanced', 'aggressive'];

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
];

export default function App() {
  // --- state ---------------------------------------------------------------
  const [prompt, setPrompt] = useState('');
  const [level, setLevel] = useState<Level>('balanced');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // sidebar
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  // settings
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openai');
  const [saveStatus, setSaveStatus] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // --- load settings + usage on mount --------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const s = await window.fortressAPI.getSettings();
        setApiKey(s.api_key || '');
        setProvider(s.provider || 'openai');
        setLevel((s.optimization_level as Level) || 'balanced');
        if (s.api_key) {
          setSettingsOpen(false);
        } else {
          setSettingsOpen(true);
        }
      } catch {
        // first launch, no settings yet
        setSettingsOpen(true);
      }
    })();
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      setUsageError(null);
      const data = await window.fortressAPI.getUsage();
      setUsage(data);
    } catch (e: any) {
      setUsageError(e?.message || 'Could not load usage');
    }
  }, []);

  useEffect(() => {
    if (apiKey) fetchUsage();
  }, [apiKey, fetchUsage]);

  // --- optimize ------------------------------------------------------------
  const handleOptimize = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const data = await window.fortressAPI.optimize({ prompt, level, provider });
      setResult(data);
      // refresh usage after optimization
      fetchUsage();
    } catch (e: any) {
      setError(e?.message || 'Optimization failed');
    } finally {
      setLoading(false);
    }
  };

  // --- copy ----------------------------------------------------------------
  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.optimization.optimized_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- save settings -------------------------------------------------------
  const handleSave = async () => {
    setSaveStatus('');
    try {
      await window.fortressAPI.saveSettings({
        api_key: apiKey,
        provider,
        optimization_level: level,
      });
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 2000);
      fetchUsage();
    } catch {
      setSaveStatus('Error saving');
    }
  };

  // --- keyboard shortcut ---------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleOptimize();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // --- render --------------------------------------------------------------
  return (
    <div className="app">
      {/* Title bar */}
      <div className="titlebar">
        <h1>Fortress Token Optimizer</h1>
        <span className="version">v1.0.0</span>
      </div>

      {/* Main panel */}
      <div className="main-panel">
        <textarea
          className="prompt-input"
          placeholder="Paste your prompt here..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {/* Controls */}
        <div className="controls">
          <div className="level-selector">
            {LEVELS.map((l) => (
              <button
                key={l}
                className={`level-btn ${l === level ? 'active' : ''}`}
                onClick={() => setLevel(l)}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>

          <button
            className="optimize-btn"
            disabled={loading || !prompt.trim()}
            onClick={handleOptimize}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              'Optimize'
            )}
          </button>
        </div>

        {/* Error */}
        {error && <div className="error-banner">{error}</div>}

        {/* Results */}
        <div className="results">
          {result ? (
            <div className="result-block">
              <div className="result-header">
                <span className="technique">{result.optimization.technique}</span>
                <span
                  className={`savings-badge ${
                    result.tokens.savings_percentage >= 10 ? 'positive' : 'neutral'
                  }`}
                >
                  -{result.tokens.savings_percentage.toFixed(1)}%
                </span>
                <button className="copy-btn" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="optimized-text">
                {result.optimization.optimized_prompt}
              </div>
              <div className="token-stats">
                <div>
                  Original: <span>{formatNumber(result.tokens.original)}</span>
                </div>
                <div>
                  Optimized: <span>{formatNumber(result.tokens.optimized)}</span>
                </div>
                <div>
                  Saved: <span>{formatNumber(result.tokens.savings)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="results-empty">
              {loading ? 'Optimizing...' : 'Results will appear here'}
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      <div className="side-panel">
        {/* Usage */}
        <div className="card">
          <div className="card-header">
            <h2>Usage</h2>
            {usage && <span className="tier-badge">{usage.tier}</span>}
          </div>

          {usageError && !usage && (
            <div className="error-banner" style={{ marginBottom: 8 }}>
              {usageError}
            </div>
          )}

          {usage ? (
            <>
              <div className="stat-row">
                <span className="stat-label">Tokens Optimized</span>
                <span className="stat-value">{formatNumber(usage.tokens_optimized)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Tokens Saved</span>
                <span className="stat-value green">{formatNumber(usage.tokens_saved)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Requests</span>
                <span className="stat-value">{formatNumber(usage.requests)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Remaining</span>
                <span
                  className={`stat-value ${
                    usage.tokens_remaining / usage.tokens_limit < 0.1
                      ? 'red'
                      : usage.tokens_remaining / usage.tokens_limit < 0.3
                      ? 'orange'
                      : 'green'
                  }`}
                >
                  {formatNumber(usage.tokens_remaining)}
                </span>
              </div>
              <div className="usage-bar-track">
                <div
                  className="usage-bar-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      ((usage.tokens_limit - usage.tokens_remaining) / usage.tokens_limit) * 100
                    )}%`,
                    background:
                      usage.tokens_remaining / usage.tokens_limit < 0.1
                        ? 'var(--red)'
                        : usage.tokens_remaining / usage.tokens_limit < 0.3
                        ? 'var(--orange)'
                        : 'var(--accent)',
                  }}
                />
              </div>
              <div className="stat-row" style={{ marginTop: 8 }}>
                <span className="stat-label">Rate Limit</span>
                <span className="stat-value">{usage.rate_limit}/min</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Resets</span>
                <span className="stat-value">{usage.reset_date}</span>
              </div>
            </>
          ) : (
            !usageError && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Add your API key to view usage.
              </div>
            )
          )}
        </div>

        {/* Settings */}
        <div className="card">
          <div className="card-header">
            <h2>Settings</h2>
            <button
              className="copy-btn"
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{ fontSize: 11 }}
            >
              {settingsOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {settingsOpen && (
            <div className="settings-group">
              <div>
                <label className="field-label">API Key</label>
                <input
                  type="password"
                  className="text-input"
                  placeholder="fort-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Provider</label>
                <select
                  className="select-input"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <button className="save-btn" onClick={handleSave}>
                Save Settings
              </button>
              <span className="save-status">{saveStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
