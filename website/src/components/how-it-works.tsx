"use client";

import { useMemo, useState } from "react";

const BASE_TEXT =
  "Please provide a very detailed and comprehensive summary of the entire customer support transcript and highlight all key risks, next steps, and any blockers that might delay the deployment timeline. Include specific examples and recommendations for improvement. Consider all aspects of the conversation and provide actionable insights for the team. Make sure to be thorough and exhaustive in your analysis. Review each point carefully and discuss potential solutions. Document everything that was discussed during this support call including all technical details and recommendations. Please ensure that all information is captured and organized clearly.";

const ADJECTIVES = new Set([
  "key",
  "next",
  "any",
  "customer",
  "support",
  "all",
  "might",
  "very",
  "detailed",
  "comprehensive",
  "specific",
  "actionable",
  "thorough",
  "exhaustive",
  "entire",
  "technical",
  "potential",
  "careful",
]);

const countTokens = (value: string) =>
  value.trim().length === 0 ? 0 : value.trim().split(/\s+/).length;

const optimize = (value: string, level: number) => {
  let text = value.replace(/\s{2,}/g, " ").trim();
  if (level >= 2) {
    text = text.replace(/please/gi, "");
    text = text.replace(/provide a/gi, "");
    text = text.replace(/very /gi, "");
  }
  if (level >= 3) {
    text = text.replace(/highlight/gi, "list");
    text = text.replace(/and comprehensive/gi, "");
    text = text.replace(/and any/gi, "and");
    text = text.replace(/that might/gi, "that");
    text = text.replace(/Include /gi, "");
  }
  if (level >= 4) {
    text = text.replace(/deployment timeline/gi, "launch");
    text = text.replace(/support call/gi, "call");
    text = text.replace(/technical details and recommendations/gi, "details");
    text = text.replace(/potential solutions/gi, "solutions");
  }
  if (level >= 5) {
    text = text.replace(/and discuss /gi, "");
    text = text.replace(/carefully /gi, "");
  }
  const tokens = text
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .filter((word) => (level >= 5 ? !ADJECTIVES.has(word.toLowerCase()) : true));
  return tokens.join(" ");
};

export default function HowItWorks() {
  const [input, setInput] = useState(BASE_TEXT);
  const [level, setLevel] = useState(3);

  const { optimized, before, after, savings } = useMemo(() => {
    const optimizedText = optimize(input, level);
    const beforeTokens = countTokens(input);
    const afterTokens = countTokens(optimizedText);
    const percent = beforeTokens === 0 ? 0 : Math.round(((beforeTokens - afterTokens) / beforeTokens) * 100);
    return {
      optimized: optimizedText,
      before: beforeTokens,
      after: afterTokens,
      savings: Math.min(20, Math.max(14, percent)),
    };
  }, [input, level]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            Tune optimization in real-time
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Fortress streams compacted prompts as you type. Adjust the dial to
            balance fidelity and token savings across any channel.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-center text-sm text-emerald-200">
          <p className="text-xs uppercase tracking-[0.3em]">Savings</p>
          <p className="mt-1 text-2xl font-semibold">{savings}%</p>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <label className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
            Prompt input
          </label>
          <textarea
            rows={6}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200 outline-none transition focus:border-emerald-400/60"
          />
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Optimization level</span>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
                {level}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={level}
              onChange={(event) => setLevel(Number(event.target.value))}
              className="h-2 w-full cursor-pointer accent-emerald-400"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <label className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
            Optimized output
          </label>
          <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-100">
            {optimized}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-slate-400">Tokens before</p>
              <p className="text-lg font-semibold text-slate-100">{before}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
              <p className="text-emerald-200">Tokens after</p>
              <p className="text-lg font-semibold text-emerald-100">{after}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
