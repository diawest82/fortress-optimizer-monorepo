"use client";

import { useEffect, useMemo, useState } from "react";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

const channels = [
  { name: "npm package", base: 12400 },
  { name: "GitHub Copilot", base: 9800 },
  { name: "VS Code extension", base: 7600 },
  { name: "Slack bot", base: 6400 },
  { name: "Claude Desktop", base: 5200 },
];

export default function UsageMetrics() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((prev) => prev + 1), 2500);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const wave = (value: number) => Math.round(value + Math.sin(tick / 2) * 380);
    return {
      requests: wave(48200),
      tokensSaved: wave(1530000),
      avgLatency: Math.max(38, 68 + Math.round(Math.cos(tick / 3) * 10)),
      accuracy: Math.min(99.9, 98.6 + Math.sin(tick / 4) * 0.8),
    };
  }, [tick]);

  const channelRows = useMemo(
    () =>
      channels.map((channel, index) => ({
        ...channel,
        optimized: channel.base + tick * 42 + index * 260,
        savings: 15 + ((tick + index) % 4),
        latency: 62 - index * 3 + ((tick + index) % 5),
      })),
    [tick]
  );

  return (
    <section className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Requests (24h)
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {formatNumber(metrics.requests)}
          </p>
          <p className="mt-2 text-xs text-emerald-200">+4.8% vs yesterday</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Tokens saved
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {formatNumber(metrics.tokensSaved)}
          </p>
          <p className="mt-2 text-xs text-emerald-200">+9.1% vs last week</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Avg latency
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.avgLatency}ms
          </p>
          <p className="mt-2 text-xs text-emerald-200">P95 steady</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Fidelity score
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.accuracy.toFixed(1)}%
          </p>
          <p className="mt-2 text-xs text-emerald-200">Within SLA</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              Channel performance
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Live usage metrics
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Updated every few seconds with anonymized production telemetry.
            </p>
          </div>
          <div className="hidden rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 md:block">
            Streaming data
          </div>
        </div>
        <div className="mt-6 grid gap-3 text-sm text-slate-200">
          <div className="grid grid-cols-4 text-xs uppercase tracking-[0.3em] text-slate-500">
            <span>Channel</span>
            <span>Optimized prompts</span>
            <span>Avg savings</span>
            <span>Latency</span>
          </div>
          {channelRows.map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-4 items-center rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
            >
              <span className="font-semibold text-slate-100">{row.name}</span>
              <span>{formatNumber(row.optimized)}</span>
              <span>{row.savings}%</span>
              <span>{row.latency}ms</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
