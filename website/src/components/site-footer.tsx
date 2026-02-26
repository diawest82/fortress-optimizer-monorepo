import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-200">
            Fortress Token Optimizer
          </p>
          <p>Realtime token savings for every interface.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>Secure</span>
          <span>Observable</span>
          <span>Low Latency</span>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-6 pb-10 text-xs text-slate-500">
        <Link href="/docs" className="hover:text-slate-300 transition">Documentation</Link>
        <Link href="/support" className="hover:text-slate-300 transition">Support</Link>
        <Link href="/legal/privacy" className="hover:text-slate-300 transition">Privacy Policy</Link>
        <Link href="/legal/terms" className="hover:text-slate-300 transition">Terms of Service</Link>
      </div>
    </footer>
  );
}
