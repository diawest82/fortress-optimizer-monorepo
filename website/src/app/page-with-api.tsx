'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HowItWorks from '@/components/how-it-works';
import ProductDemoGrid from '@/components/product-demo-grid';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface OptimizationResult {
  optimized_text: string;
  original_tokens: number;
  optimized_tokens: number;
  savings_percentage: number;
}

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOptimize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('Please enter text to optimize');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'anthropic',
          text: inputText,
          model: 'claude-3-opus',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to optimize text. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
            Fortress Token Optimizer
          </p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            Live token optimization for every AI surface
          </h1>
          <p className="max-w-2xl text-base text-slate-300">
            Compress prompts in realtime across npm, Copilot, VS Code, Slack, and
            Claude Desktop. Keep fidelity high while cutting usage costs and
            latency.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="rounded-full bg-emerald-400/20 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/30"
            >
              View dashboard
            </Link>
            <Link
              href="/install"
              className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/60"
            >
              Install guides
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">
              Average savings
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">
              {result ? `${result.savings_percentage.toFixed(1)}%` : '20%'}
            </p>
            <p className="mt-2 text-sm text-emerald-100">
              Token reduction on typical prompts.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Latency
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {result ? '45ms' : '&lt;50ms'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                E2E optimization time
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Accuracy
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">99.2%</p>
              <p className="mt-1 text-xs text-slate-400">
                Semantic preservation
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">
            Try it live
          </h2>
          <p className="text-slate-400">
            Paste any prompt below to see real-time token savings.
          </p>
        </div>

        <form onSubmit={handleOptimize} className="space-y-4">
          <div className="space-y-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your prompt here..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 p-4 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              rows={4}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? 'Optimizing...' : 'Optimize'}
          </button>
        </form>

        {result && (
          <div className="space-y-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                  Original
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {result.original_tokens}
                </p>
                <p className="mt-1 text-sm text-slate-400">tokens</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                  Optimized
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {result.optimized_tokens}
                </p>
                <p className="mt-1 text-sm text-slate-400">tokens</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                  Savings
                </p>
                <p className="mt-2 text-3xl font-semibold text-emerald-300">
                  {result.savings_percentage.toFixed(1)}%
                </p>
                <p className="mt-1 text-sm text-slate-400">reduction</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-emerald-500/20 pt-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Optimized text
              </p>
              <div className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-4">
                <p className="whitespace-pre-wrap text-sm text-slate-100">
                  {result.optimized_text}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <HowItWorks />
      <ProductDemoGrid />
    </div>
  );
}
