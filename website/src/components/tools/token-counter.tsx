'use client';

import { useState } from 'react';

interface TokenResult {
  originalTokens: number;
  optimizedTokens: number;
  savings: number;
  costGPT4: string;
  costOptimizedGPT4: string;
  costClaude: string;
  costOptimizedClaude: string;
}

export function TokenCounter() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TokenResult | null>(null);
  const [error, setError] = useState('');

  const handleCount = async () => {
    if (!prompt.trim()) {
      setError('Please paste a prompt');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Estimate tokens based on rough rule: ~1 token per 4 characters
      const estimatedTokens = Math.ceil(prompt.length / 4);
      
      // Optimization savings (average 18%)
      const optimizedTokens = Math.floor(estimatedTokens * 0.82);
      const savings = 18;

      // Price calculations
      const costGPT4 = (estimatedTokens * 0.000045).toFixed(4);
      const costOptimizedGPT4 = (optimizedTokens * 0.000045).toFixed(4);
      const costClaude = (estimatedTokens * 0.000003).toFixed(6);
      const costOptimizedClaude = (optimizedTokens * 0.000003).toFixed(6);

      setResults({
        originalTokens: estimatedTokens,
        optimizedTokens,
        savings,
        costGPT4,
        costOptimizedGPT4,
        costClaude,
        costOptimizedClaude
      });

      // Track usage
      await fetch('/api/tools/track-token-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputTokens: prompt.length,
          originalTokens: estimatedTokens,
          optimizedTokens,
          savings
        })
      }).catch(() => {}); // Silently fail if tracking doesn't work
    } catch {
      setError('Failed to count tokens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">Your Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste your AI prompt here..."
          className="w-full h-40 bg-zinc-800 text-white rounded-lg p-4 border border-zinc-700 focus:border-blue-500 focus:outline-none resize-none"
        />
        <p className="text-xs text-zinc-400 mt-2">{prompt.length} characters</p>
      </div>

      <button
        onClick={handleCount}
        disabled={loading || !prompt.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
      >
        {loading ? 'Counting...' : 'Count Tokens'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          {/* Main Stats */}
          <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-lg p-8 border border-zinc-700">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <div className="text-sm text-zinc-400 mb-1">Original</div>
                <div className="text-4xl font-bold">{results.originalTokens}</div>
                <div className="text-xs text-zinc-500 mt-1">tokens</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-400 mb-1">With Fortress</div>
                <div className="text-4xl font-bold text-green-400">{results.optimizedTokens}</div>
                <div className="text-xs text-green-500 mt-1">{results.savings}% saved</div>
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-6">
              <div className="text-sm font-semibold mb-4 text-zinc-300">Cost Comparison</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">GPT-4 (Original)</span>
                  <span className="font-mono font-semibold">${results.costGPT4}</span>
                </div>
                <div className="flex justify-between items-center text-sm bg-green-900 bg-opacity-20 -mx-4 px-4 py-2 rounded border border-green-900">
                  <span className="text-green-300">GPT-4 (With Fortress)</span>
                  <span className="font-mono font-semibold text-green-300">${results.costOptimizedGPT4}</span>
                </div>

                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="text-zinc-400">Claude 3 (Original)</span>
                  <span className="font-mono text-xs font-semibold">${results.costClaude}</span>
                </div>
                <div className="flex justify-between items-center text-sm bg-green-900 bg-opacity-20 -mx-4 px-4 py-2 rounded border border-green-900">
                  <span className="text-green-300">Claude 3 (With Fortress)</span>
                  <span className="font-mono text-xs font-semibold text-green-300">${results.costOptimizedClaude}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Box */}
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Want automatic optimization?</h3>
            <p className="text-sm text-zinc-300 mb-4">
              See exactly how much you could save with Fortress running on all your prompts.
            </p>
            <a
              href="/auth/signup"
              className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
            >
              Try Free Now
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
