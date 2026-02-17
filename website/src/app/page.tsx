import Link from "next/link";
import HowItWorks from "@/components/how-it-works";
import ProductDemoGrid from "@/components/product-demo-grid";

export default function Home() {
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
              href="/pricing"
              className="rounded-full bg-emerald-400/20 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/30"
            >
              View pricing
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
              Live savings
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">20%</p>
            <p className="mt-2 text-sm text-emerald-100">
              Average token reduction across active teams.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Latency
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">68ms</p>
              <p className="mt-1 text-xs text-slate-400">Median optimization time.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Coverage
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">5</p>
              <p className="mt-1 text-xs text-slate-400">Channels with live demos.</p>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />

      <ProductDemoGrid />

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Ready to see the savings on your stack?
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Start with the install guides or explore realtime usage metrics.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100"
            >
              View dashboard
            </Link>
            <Link
              href="/install"
              className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200"
            >
              Install now
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 mt-16 pt-8 pb-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">Fortress</span>
            <p className="text-sm text-zinc-400">© 2026 Fortress Token Optimizer. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <Link href="/support" className="text-sm text-zinc-400 hover:text-white transition">
              Support
            </Link>
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition">
              Pricing
            </Link>
            <Link href="/install" className="text-sm text-zinc-400 hover:text-white transition">
              Install
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
