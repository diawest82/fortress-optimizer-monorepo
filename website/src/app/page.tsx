import Link from "next/link";
import HowItWorks from "@/components/how-it-works";
import ProductDemoGrid from "@/components/product-demo-grid";

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-blue-400 font-semibold">
            🚀 Coming Soon - Join the Revolution
          </p>
          <h1 className="text-5xl font-bold text-white md:text-6xl leading-tight">
            Stop wasting tokens on verbose prompts
          </h1>
          <p className="max-w-2xl text-lg text-slate-300 leading-relaxed">
            Fortress automatically optimizes your prompts across 15+ platforms—npm, Copilot, VS Code, Slack, and Claude Desktop. Cut token costs by 20% and reduce latency by 68ms without losing a single detail. Works in real-time.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/install"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            >
              🎉 Join Early Access →
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-900/50"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-sm text-blue-300 font-medium">⏰ Public beta launching February 2026 — Be first to optimize</p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-3xl border border-blue-500/40 bg-blue-500/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold">
                  Token Savings
                </p>
                <p className="mt-3 text-4xl font-bold text-white">20%</p>
                <p className="mt-2 text-sm text-blue-200">
                  Typical savings on first deployment
                </p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-semibold">
                ⚡ Speed
              </p>
              <p className="mt-3 text-2xl font-bold text-white">68ms</p>
              <p className="mt-1 text-xs text-slate-400">Real-time optimization latency</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-semibold">
                🔌 Platforms
              </p>
              <p className="mt-3 text-2xl font-bold text-white">15+</p>
              <p className="mt-1 text-xs text-slate-400">Supported integrations ready</p>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />

      <ProductDemoGrid />

      <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Be among the first to revolutionize your token usage
            </h2>
            <p className="mt-3 text-base text-slate-300">
              Join our early access program launching February 2026. Limited beta spots available for the first 500 teams. Free tier: 50k tokens/month.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <Link
              href="/install"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-500/20 whitespace-nowrap"
            >
              🎯 Get Early Access →
            </Link>
            <Link
              href="/support"
              className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-900/50 whitespace-nowrap"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
