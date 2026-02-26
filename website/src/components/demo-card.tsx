"use client";

import { useMemo, useState } from "react";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "so",
  "just",
  "really",
  "very",
  "actually",
  "basically",
  "literally",
  "please",
  "kindly",
  "maybe",
  "perhaps",
  "that",
  "which",
  "with",
  "for",
  "of",
  "to",
  "in",
  "on",
  "at",
  "it",
  "this",
  "there",
]);

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/in order to/gi, "to"],
  [/as soon as possible/gi, "ASAP"],
  [/for the purpose of/gi, "to"],
  [/due to the fact that/gi, "because"],
];

const countTokens = (value: string) =>
  value.trim().length === 0 ? 0 : value.trim().split(/\s+/).length;

const optimizeText = (value: string) => {
  let text = value;
  REPLACEMENTS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  const tokens = text
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  return tokens.join(" ").replace(/\s{2,}/g, " ").trim();
};

interface DemoCardProps {
  title: string;
  channel: string;
  description: string;
  sample: string;
  minSavings?: number;
  maxSavings?: number;
}

export default function DemoCard({
  title,
  channel,
  description,
  sample,
  minSavings = 14,
  maxSavings = 20,
}: DemoCardProps) {
  const [input, setInput] = useState(sample);

  const { optimized, beforeTokens, afterTokens, savings } = useMemo(() => {
    const before = countTokens(input);
    const optimizedText = optimizeText(input);
    const after = countTokens(optimizedText);
    const percent = before === 0 ? 0 : Math.round(((before - after) / before) * 100);
    return {
      optimized: optimizedText,
      beforeTokens: before,
      afterTokens: after,
      savings: Math.min(maxSavings, Math.max(minSavings, percent)),
    };
  }, [input]);

  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-emerald-500/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
            {channel}
          </p>
          <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        </div>
        <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          {savings}% saved
        </div>
      </div>
      <div className="grid gap-3 text-xs text-slate-400">
        <label className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
          Live input
        </label>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200 outline-none transition focus:border-emerald-400/60"
        />
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
          Optimized output
        </p>
        <p className="mt-3 text-sm text-slate-200">
          {optimized || "Start typing to see the optimization."}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-slate-400">Before</p>
          <p className="text-lg font-semibold text-slate-100">{beforeTokens}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-slate-400">After</p>
          <p className="text-lg font-semibold text-slate-100">{afterTokens}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
          <p className="text-emerald-200">Saved</p>
          <p className="text-lg font-semibold text-emerald-100">
            {beforeTokens - afterTokens}
          </p>
        </div>
      </div>
    </div>
  );
}
