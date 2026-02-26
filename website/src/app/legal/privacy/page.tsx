import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-blue-300 font-semibold">
            Legal
          </p>
          <h1 className="text-4xl font-semibold md:text-5xl">Privacy Policy</h1>
          <p className="text-slate-400">Last updated: February 22, 2026</p>
        </header>

        <section className="space-y-4 text-slate-300">
          <p>
            This Privacy Policy explains how Fortress Token Optimizer (&quot;Fortress&quot;, &quot;we&quot;, &quot;us&quot;)
            collects, uses, discloses, and safeguards information when you use our websites,
            applications, extensions, and services (collectively, the &quot;Services&quot;).
          </p>
          <p>
            By using the Services, you consent to the practices described in this Privacy Policy.
            If you do not agree, do not use the Services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Information We Collect</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Account data: name, email address, organization, and authentication details.</li>
            <li>Usage data: feature usage, performance metrics, and diagnostics.</li>
            <li>Payment data: billing details processed by our payment provider.</li>
            <li>Support data: messages and files submitted to support.</li>
            <li>Device data: browser type, IP address, and operating system.</li>
          </ul>
          <p className="text-slate-300">
            We do not store customer prompts or proprietary content for optimization beyond
            transient processing required to provide the Services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How We Use Information</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Provide, operate, and improve the Services.</li>
            <li>Process transactions and manage subscriptions.</li>
            <li>Monitor performance, security, and reliability.</li>
            <li>Respond to support requests and communicate with you.</li>
            <li>Comply with legal obligations and enforce our terms.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">International Use & Legal Bases</h2>
          <p className="text-slate-300">
            We operate globally. If you are in the EU, UK, or other regions with data protection
            laws, we process personal data under legal bases such as contract performance,
            legitimate interests, and consent where required.
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>EU/EEA/UK/Switzerland: GDPR or local data protection laws apply.</li>
            <li>California: CCPA/CPRA rights apply for eligible residents.</li>
            <li>Brazil: LGPD rights apply for eligible residents.</li>
            <li>Canada: PIPEDA or provincial privacy laws may apply.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Rights</h2>
          <p className="text-slate-300">
            Depending on your location, you may have rights to access, correct, delete, or
            restrict processing of your personal data, and to opt out of certain data uses.
            You may also have the right to data portability and to withdraw consent.
          </p>
          <p className="text-slate-300">
            To exercise these rights, contact us at support@fortress-optimizer.com.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Data Retention</h2>
          <p className="text-slate-300">
            We retain personal data only as long as necessary to provide the Services, comply
            with legal obligations, resolve disputes, and enforce agreements.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Security</h2>
          <p className="text-slate-300">
            We use administrative, technical, and physical safeguards designed to protect your
            data. No system is 100% secure, so we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Cookies & Tracking</h2>
          <p className="text-slate-300">
            We use cookies and similar technologies for essential site functionality and
            performance analytics. You can control cookie settings in your browser.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact</h2>
          <p className="text-slate-300">
            If you have questions about this Privacy Policy, contact us at
            support@fortress-optimizer.com.
          </p>
        </section>

        <div className="text-sm text-slate-400">
          Also review our
          <span className="ml-2">
            <Link href="/legal/terms" className="text-blue-400 hover:text-blue-300 transition">
              Terms of Service
            </Link>
          </span>
          .
        </div>
      </div>
    </div>
  );
}
