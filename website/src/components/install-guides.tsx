"use client";

import { useState } from "react";

const guides = [
  {
    title: "npm package",
    audience: "Backend + frontend apps",
    steps: [
      "Install the SDK and initialize the optimizer client.",
      "Wrap prompt builders and send text through the optimizer.",
      "Inspect token savings before dispatching to your model gateway.",
    ],
    snippet: "npm install fortress-token-optimizer",
    icon: "📦",
  },
  {
    title: "GitHub Copilot",
    audience: "Developer productivity",
    steps: [
      "Enable the Fortress Copilot workflow in your IDE settings.",
      "Select the files that should be summarized before completion runs.",
      "Review the token savings badge inline with the suggestions.",
    ],
    snippet: "Enable: Fortress › Copilot Optimizer",
    icon: "🤖",
  },
  {
    title: "VS Code extension",
    audience: "Workspace compression",
    steps: [
      "Install the extension from the marketplace and reload VS Code.",
      "Pick target folders for realtime summaries.",
      "Run the Optimize Workspace command from the command palette.",
    ],
    snippet: "Command Palette › Fortress: Optimize Workspace",
    icon: "⚙️",
  },
  {
    title: "Slack bot",
    audience: "Incident + support rooms",
    steps: [
      "Add the bot to the channel and authorize access.",
      "Configure the prompt template for incident updates.",
      "Use /fortress summarize to compress long threads.",
    ],
    snippet: "/fortress summarize last 50 messages",
    icon: "💬",
  },
  {
    title: "Claude Desktop",
    audience: "Analyst workflows",
    steps: [
      "Enable Fortress in the desktop assistant settings.",
      "Choose the preferred optimization level per workspace.",
      "Review side-by-side token diffs before sending prompts.",
    ],
    snippet: "Settings › Integrations › Fortress Optimizer",
    icon: "🧠",
  },
];

export default function InstallGuides() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeGuide = guides[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeGuide.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-4 border-b border-slate-800">
        {guides.map((guide, index) => (
          <button
            key={guide.title}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === index
                ? "text-emerald-100 border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="mr-2">{guide.icon}</span>
            {guide.title}
          </button>
        ))}
      </div>

      {/* Active Guide Content */}
      <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-slate-900/40 p-8 transition-all duration-300">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-semibold">
            {activeGuide.audience}
          </p>
          <h3 className="text-3xl font-semibold text-white">{activeGuide.title}</h3>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {activeGuide.steps.map((step, index) => (
            <div key={step} className="flex items-start gap-4 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/40 to-cyan-500/40 border border-emerald-500/60 text-xs font-bold text-emerald-100 flex-shrink-0 group-hover:from-emerald-500/60 group-hover:to-cyan-500/60 transition-all duration-200">
                {index + 1}
              </div>
              <p className="text-slate-300 pt-1 group-hover:text-slate-100 transition-colors duration-200">
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* Code Snippet */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 flex items-center justify-between group hover:border-cyan-500/40 transition-colors duration-200">
          <code className="text-xs text-cyan-300 font-mono">{activeGuide.snippet}</code>
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              copied
                ? "bg-emerald-500/30 text-emerald-200"
                : "bg-slate-800 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-200"
            }`}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>
    </section>
  );
}
