import Link from "next/link";
import HowItWorks from "@/components/how-it-works";
import ProductDemoGrid from "@/components/product-demo-grid";
import SiteFooter from "@/components/site-footer";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      {/* Hero Section */}
      <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-12">
        <div className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-blue-300 font-semibold mb-4">
              Cut AI Costs Automatically
            </p>
            <h1 className="text-5xl font-bold text-white mb-4">
              Cut your AI API costs by 10-20% without changing your code
            </h1>
            <p className="max-w-2xl text-lg text-slate-300 mb-8">
              Fortress compresses your prompts in realtime across npm, Copilot, VS Code, Slack, and Claude Desktop — reducing token usage while preserving quality. Start free, no credit card required.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth/signup"
                className="rounded-full bg-blue-600 hover:bg-blue-500 px-8 py-3 text-sm font-semibold text-white transition"
              >
                Get Started Free
              </Link>
              <Link
                href="/install"
                className="rounded-full border border-blue-500 px-8 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-950/30 transition"
              >
                🎯 View Install Guides
              </Link>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3 pt-8">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-blue-200 mb-2">
                Live savings
              </p>
              <p className="text-4xl font-bold text-white">10-20%</p>
              <p className="text-sm text-blue-200 mt-1">Average token reduction</p>
            </div>
            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-blue-200 mb-2">
                Latency
              </p>
              <p className="text-4xl font-bold text-white">68ms</p>
              <p className="text-sm text-blue-200 mt-1">Optimization time</p>
            </div>
            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-blue-200 mb-2">
                Coverage
              </p>
              <p className="text-4xl font-bold text-white">12+</p>
              <p className="text-sm text-blue-200 mt-1">Integration platforms</p>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />
      <ProductDemoGrid />

      {/* Team Dashboard Preview */}
      <section className="mt-4">
        <div className="flex flex-col gap-3 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Team visibility</p>
          <h2 className="text-3xl font-semibold text-white">See where every token goes</h2>
          <p className="max-w-2xl text-sm text-slate-400">
            Track savings across your entire team — by member, platform, and project. Know exactly how much you&apos;re saving and where.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Team Overview Card */}
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300 mb-4">Team Overview</p>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-400">Total Tokens Saved</span>
                <span className="text-2xl font-bold text-green-400">1.2M</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-400">Cost Saved This Month</span>
                <span className="text-2xl font-bold text-green-400">$54.80</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-400">Avg Savings Rate</span>
                <span className="text-2xl font-bold text-white">14.2%</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-400">Active Members</span>
                <span className="text-2xl font-bold text-white">8</span>
              </div>
            </div>
          </div>

          {/* Per-Member Usage */}
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300 mb-4">Per-Member Savings</p>
            <div className="space-y-3">
              {[
                { name: 'Sarah K.', tokens: '285K', pct: 16.1, bar: 85 },
                { name: 'Marcus R.', tokens: '210K', pct: 14.8, bar: 72 },
                { name: 'Alex T.', tokens: '178K', pct: 13.2, bar: 62 },
                { name: 'Priya M.', tokens: '156K', pct: 15.4, bar: 55 },
                { name: 'Jake L.', tokens: '132K', pct: 12.9, bar: 48 },
              ].map((m) => (
                <div key={m.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{m.name}</span>
                    <span className="text-slate-400">{m.tokens} saved ({m.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-1.5 rounded-full" style={{ width: `${m.bar}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300 mb-4">By Platform</p>
            <div className="space-y-3">
              {[
                { name: 'npm SDK', tokens: '482K', pct: 40, color: 'bg-blue-500' },
                { name: 'VS Code', tokens: '312K', pct: 26, color: 'bg-purple-500' },
                { name: 'Copilot', tokens: '198K', pct: 17, color: 'bg-green-500' },
                { name: 'Slack Bot', tokens: '124K', pct: 10, color: 'bg-yellow-500' },
                { name: 'Claude Desktop', tokens: '84K', pct: 7, color: 'bg-pink-500' },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.color} flex-shrink-0`} />
                  <span className="text-sm text-slate-300 flex-1">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.tokens}</span>
                  <span className="text-xs text-slate-400 w-8 text-right">{p.pct}%</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex h-3 rounded-full overflow-hidden">
                <div className="bg-blue-500" style={{ width: '40%' }} />
                <div className="bg-purple-500" style={{ width: '26%' }} />
                <div className="bg-green-500" style={{ width: '17%' }} />
                <div className="bg-yellow-500" style={{ width: '10%' }} />
                <div className="bg-pink-500" style={{ width: '7%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition"
          >
            View full dashboard demo →
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-12">
        <div className="flex flex-col items-center justify-between gap-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              Ready to stop wasting tokens?
            </h2>
            <p className="text-slate-300">
              Start with the install guides or explore realtime usage metrics.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="rounded-full bg-blue-600 hover:bg-blue-500 px-8 py-3 text-sm font-semibold text-white transition"
            >
              Start Free — No Credit Card
            </Link>
            <Link
              href="/install"
              className="rounded-full border border-blue-500 px-6 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-950/30 transition"
            >
              View Install Guides
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
