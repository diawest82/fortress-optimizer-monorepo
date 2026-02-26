import Link from "next/link";
import Logo from "@/components/logo";

export const dynamic = 'force-dynamic';

export default function LogoShowcase() {
  return (
    <div className="flex flex-col gap-16">
      <section>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
            Brand Identity
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-white">
            Logo & Visual System
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Fortress Token Optimizer branding with dynamic shield fortress
            design. Built with emerald primary and blue accent colors for a
            trustworthy, modern feel.
          </p>
        </div>
      </section>

      <section className="grid gap-12 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 flex items-center justify-center min-h-48">
            <Logo variant="icon" animated={true} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Icon</h3>
            <p className="mt-2 text-sm text-slate-400">
              Shield fortress with dynamic gradient. Works great for favicon,
              app icons, and compact contexts.
            </p>
            <p className="mt-3 text-xs text-emerald-300 uppercase tracking-wide">
              Use case: Favicon, avatar, badge
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 flex items-center justify-center min-h-48">
            <Logo variant="monogram" animated={true} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Monogram</h3>
            <p className="mt-2 text-sm text-slate-400">
              Shield with "F" letter mark. Combines icon and typography in one
              compact unit.
            </p>
            <p className="mt-3 text-xs text-emerald-300 uppercase tracking-wide">
              Use case: Small logos, profiles
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 flex items-center justify-center min-h-48">
            <Logo variant="full" animated={true} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Full Lockup</h3>
            <p className="mt-2 text-sm text-slate-400">
              Icon with text stacked. Primary header logo for websites and
              documents.
            </p>
            <p className="mt-3 text-xs text-emerald-300 uppercase tracking-wide">
              Use case: Headers, hero, branding
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
        <p className="mb-8 text-xs uppercase tracking-[0.3em] text-emerald-300">
          Color Palette
        </p>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <div className="mb-3 h-24 rounded-xl bg-emerald-500" />
            <p className="font-semibold text-white">Primary</p>
            <p className="text-xs text-slate-400">Emerald-500</p>
            <p className="mt-1 font-mono text-xs text-slate-500">#10b981</p>
          </div>
          <div>
            <div className="mb-3 h-24 rounded-xl bg-cyan-500" />
            <p className="font-semibold text-white">Secondary</p>
            <p className="text-xs text-slate-400">Cyan-500</p>
            <p className="mt-1 font-mono text-xs text-slate-500">#06b6d4</p>
          </div>
          <div>
            <div className="mb-3 h-24 rounded-xl bg-blue-500" />
            <p className="font-semibold text-white">Accent</p>
            <p className="text-xs text-slate-400">Blue-500</p>
            <p className="mt-1 font-mono text-xs text-slate-500">#3b82f6</p>
          </div>
          <div>
            <div className="mb-3 h-24 rounded-xl bg-amber-400" />
            <p className="font-semibold text-white">Highlight</p>
            <p className="text-xs text-slate-400">Amber-400</p>
            <p className="mt-1 font-mono text-xs text-slate-500">#fcd34d</p>
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
          <h2 className="text-2xl font-semibold text-white">Design Principles</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="font-semibold text-emerald-300">Trustworthy</h3>
              <p className="mt-2 text-sm text-slate-400">
                Shield fortress conveys security and protection. Stable geometry
                builds confidence.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-300">Modern</h3>
              <p className="mt-2 text-sm text-slate-400">
                Gradient colors and dynamic geometry feel contemporary. Works
                seamlessly on dark interfaces.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-300">Dynamic</h3>
              <p className="mt-2 text-sm text-slate-400">
                Multiple color transitions and optional animation suggest active
                optimization and motion.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Ready to launch?</h2>
            <p className="mt-2 text-sm text-slate-400">
              The new Fortress visual identity is live across the site.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100"
          >
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
