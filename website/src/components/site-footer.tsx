export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
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
    </footer>
  );
}
