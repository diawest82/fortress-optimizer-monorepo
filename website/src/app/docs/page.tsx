import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-blue-300 font-semibold">
            Documentation
          </p>
          <h1 className="text-4xl font-semibold md:text-5xl">Fortress Docs</h1>
          <p className="text-slate-300 max-w-2xl">
            Operational documentation with a focus on monitoring, alerts, and production readiness.
          </p>
        </header>

        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Monitoring & Alerts</h2>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Active
            </span>
          </div>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Infrastructure logs in CloudWatch (ECS, ALB, RDS).</li>
            <li>Frontend analytics via Vercel (page speed, errors, traffic).</li>
            <li>Application error tracking via Sentry (client + server).</li>
            <li>Health checks for API uptime and key dependencies.</li>
          </ul>
          <p className="text-slate-300">
            Alerts are configured for error rate, latency, and availability thresholds. On-call
            notifications are routed to email and Slack.
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-8">
          <h2 className="text-2xl font-semibold">Status & Incident Response</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Uptime tracking and health checks every 60 seconds.</li>
            <li>Incident response targets: acknowledge in 15 minutes, resolve in 4 hours.</li>
            <li>Post-incident review within 72 hours for root cause analysis.</li>
          </ul>
          <p className="text-slate-300">
            If you experience issues, contact support immediately.
            <span className="ml-2">
              <Link href="/support" className="text-blue-400 hover:text-blue-300 transition">
                Visit Support
              </Link>
            </span>
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-8">
          <h2 className="text-2xl font-semibold">Backup & Recovery</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Database backups daily with retention policy.</li>
            <li>Restore drills conducted prior to major releases.</li>
            <li>Point-in-time recovery available for production data.</li>
          </ul>
          <div className="space-y-3 text-slate-300">
            <p className="font-semibold text-slate-200">Operational Commands</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Full backup: npm run backup:full</li>
              <li>List backups: npm run backup:list</li>
              <li>Verify backup: npm run backup:verify &lt;file&gt;</li>
              <li>Restore backup: npm run backup:restore &lt;file&gt;</li>
              <li>RDS snapshot: npm run backup:rds:snapshot</li>
              <li>RDS snapshot list: npm run backup:rds:list</li>
              <li>RDS snapshot restore: npm run backup:rds:restore &lt;snapshot-id&gt;</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-8">
          <h2 className="text-2xl font-semibold">Security & Compliance</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Encrypted data in transit (TLS) and at rest (database storage).</li>
            <li>Strict API key handling with rotating credentials.</li>
            <li>Access logging and audit trails for sensitive actions.</li>
          </ul>
          <p className="text-slate-300">
            For compliance inquiries, review our legal pages:
            <span className="ml-2">
              <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300 transition">
                Privacy Policy
              </Link>
              <span className="mx-2 text-slate-600">|</span>
              <Link href="/legal/terms" className="text-blue-400 hover:text-blue-300 transition">
                Terms of Service
              </Link>
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
