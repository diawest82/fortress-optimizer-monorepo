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
              Cut your AI API costs by 20% without changing your code
            </h1>
            <p className="max-w-2xl text-lg text-slate-300 mb-8">
              Fortress compresses your prompts in realtime across npm, Copilot, VS Code, Slack, and Claude Desktop — reducing token usage while preserving quality. Start free, no credit card required.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth/signup"
                className="rounded-full bg-blue-600 hover:bg-blue-500 px-8 py-3 text-sm font-semibold text-white transition"
              >
                🎉 Join Early Access
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
              <p className="text-4xl font-bold text-white">20%</p>
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
              <p className="text-4xl font-bold text-white">5</p>
              <p className="text-sm text-blue-200 mt-1">Integration channels</p>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />
      <ProductDemoGrid />

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
