'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function Install() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const installGuides = [
    {
      id: 'npm',
      title: 'npm Package',
      subtitle: 'The largest user base - JavaScript/TypeScript projects',
      icon: '📦',
      docsUrl: '#npm-installation',
      steps: [
        { cmd: 'npm install @fortress-optimizer/core', desc: 'Install the package' },
        { cmd: "import { FortressOptimizer } from '@fortress-optimizer/core';\n\nconst optimizer = new FortressOptimizer({\n  apiKey: process.env.FORTRESS_API_KEY\n});", desc: 'Initialize' },
        { cmd: "const result = await optimizer.optimize({\n  text: 'Your prompt here',\n  model: 'gpt-4'\n});\n\nconsole.log(result.optimized); // Optimized text\nconsole.log(result.savings);  // Token savings", desc: 'Use it' },
      ],
    },
    {
      id: 'copilot',
      title: 'GitHub Copilot',
      subtitle: 'VS Code extension - Huge developer audience',
      icon: '🤖',
      docsUrl: '#copilot-installation',
      steps: [
        { cmd: 'Install "Fortress Optimizer for Copilot" from VS Code Marketplace', desc: 'Install extension' },
        { cmd: 'Press Ctrl+Shift+P → "Fortress: Configure API Key"', desc: 'Set your API key' },
        { cmd: 'Use Copilot normally - optimization happens automatically', desc: 'Every prompt is optimized' },
      ],
    },
    {
      id: 'slack',
      title: 'Slack Bot',
      subtitle: 'Team collaboration - 750M+ Slack users',
      icon: '💬',
      docsUrl: '#slack-installation',
      steps: [
        { cmd: 'Add "Fortress Optimizer" from Slack App Directory', desc: 'Install app' },
        { cmd: '@fortress-optimizer optimize "Your prompt here"', desc: 'Use the bot' },
        { cmd: 'The bot returns optimized text + metrics', desc: 'See results instantly' },
      ],
    },
    {
      id: 'vscode',
      title: 'VS Code',
      subtitle: 'The most popular code editor - 20M+ users',
      icon: '⚙️',
      docsUrl: '#vscode-installation',
      steps: [
        { cmd: 'Install "Fortress Token Optimizer" extension', desc: 'From VS Code Marketplace' },
        { cmd: 'Cmd+K, Cmd+I → "Fortress Optimize"', desc: 'Highlight your prompt' },
        { cmd: 'Get instant optimization with side-by-side comparison', desc: 'Visual + metrics' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-8 mb-12">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold">⚡ Stop Wasting Tokens Now</p>
              <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
                Five ways to optimize
              </h1>
              <p className="mt-4 text-base text-slate-300 max-w-2xl">
                Choose your platform and start saving immediately. Real-time optimization with zero setup hassle. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* Guides Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {installGuides.map((guide) => (
            <div key={guide.id} className="card-dark p-8">
              <div className="mb-6">
                <div className="text-4xl mb-3">{guide.icon}</div>
                <h2 className="text-2xl font-bold mb-1">{guide.title}</h2>
                <p className="text-sm text-zinc-400">{guide.subtitle}</p>
              </div>

              {/* Steps */}
              <div className="space-y-6">
                {guide.steps.map((step, idx) => (
                  <div key={idx} className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                          {idx + 1}
                        </div>
                        <h3 className="font-semibold text-white">{step.desc}</h3>
                      </div>
                      <button
                        onClick={() => copyToClipboard(step.cmd, `${guide.id}-${idx}`)}
                        className="text-zinc-500 hover:text-white transition"
                      >
                        {copied === `${guide.id}-${idx}` ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <code className="text-sm text-green-400 bg-black rounded p-3 block overflow-x-auto whitespace-pre-wrap break-words">
                      {step.cmd}
                    </code>
                  </div>
                ))}
              </div>

              {/* Docs Link */}
              <a
                href={guide.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-6 text-center py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition"
              >
                Full Documentation →
              </a>
            </div>
          ))}
        </div>

        {/* Other Platforms */}
        <div className="mt-12 card-dark p-8">
          <h2 className="text-2xl font-bold mb-6">11+ More Platforms</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Neovim', user: '2.5M' },
              { name: 'Sublime Text', user: '2M' },
              { name: 'JetBrains IDEs', user: '10M' },
              { name: 'Make.com', user: '1.5M' },
              { name: 'Zapier', user: '3M' },
              { name: 'Claude Desktop', user: '400K' },
              { name: 'Anthropic SDK', user: '100K+' },
              { name: 'GPT Store', user: '5M+' },
            ].map((platform, idx) => (
              <div
                key={idx}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-center hover:border-blue-500 transition"
              >
                <p className="font-semibold text-sm mb-1">{platform.name}</p>
                <p className="text-xs text-zinc-400">{platform.user} users</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-400 text-center">
            All integrations share the same API → same token optimization across all platforms
          </p>
        </div>

        {/* Support */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="card-dark p-6 text-center">
            <div className="text-3xl mb-3">📧</div>
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-zinc-400 mb-4">Contact support@fortress-optimizer.com</p>
            <a
              href="mailto:support@fortress-optimizer.com"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Email Support →
            </a>
          </div>
          <div className="card-dark p-6 text-center">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="font-semibold mb-2">API Reference</h3>
            <p className="text-sm text-zinc-400 mb-4">Full documentation with examples</p>
            <a href="/account" className="text-blue-400 hover:text-blue-300 text-sm">
              Manage API Keys →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
