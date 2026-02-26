import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-blue-300 font-semibold">
            Legal
          </p>
          <h1 className="text-4xl font-semibold md:text-5xl">Terms of Service</h1>
          <p className="text-slate-400">Last updated: February 22, 2026</p>
        </header>

        <section className="space-y-4 text-slate-300">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of Fortress Token Optimizer and
            related services (the &quot;Services&quot;). By accessing or using the Services, you agree to
            these Terms. If you do not agree, do not use the Services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Eligibility & Accounts</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>You must be at least 18 years old or have legal authority to use the Services.</li>
            <li>You are responsible for maintaining account security.</li>
            <li>You agree to provide accurate information and keep it up to date.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Acceptable Use</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Do not misuse the Services or attempt unauthorized access.</li>
            <li>Do not interfere with or disrupt system integrity or performance.</li>
            <li>Comply with all applicable laws, including export and sanctions rules.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Subscriptions & Billing</h2>
          <p className="text-slate-300">
            Paid plans are billed on a recurring basis unless canceled. You authorize us to charge
            applicable fees through our payment provider. Taxes may apply based on your location.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Intellectual Property</h2>
          <p className="text-slate-300">
            The Services, software, and content are owned by Fortress or its licensors. You may
            not copy, modify, distribute, or create derivative works without permission.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Confidentiality</h2>
          <p className="text-slate-300">
            You agree not to disclose proprietary or confidential information obtained through
            the Services without authorization.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Disclaimer of Warranties</h2>
          <p className="text-slate-300">
            The Services are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
            including merchantability, fitness for a particular purpose, or non-infringement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
          <p className="text-slate-300">
            To the maximum extent permitted by law, Fortress will not be liable for any indirect,
            incidental, or consequential damages, or for loss of data, profits, or revenue.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Termination</h2>
          <p className="text-slate-300">
            We may suspend or terminate access to the Services if you violate these Terms or if
            required by law. You may cancel your account at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">International Use</h2>
          <p className="text-slate-300">
            If you access the Services from outside the United States, you are responsible for
            compliance with local laws and regulations.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Changes to Terms</h2>
          <p className="text-slate-300">
            We may update these Terms from time to time. Continued use of the Services after
            changes become effective constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact</h2>
          <p className="text-slate-300">
            Questions about these Terms can be sent to support@fortress-optimizer.com.
          </p>
        </section>

        <div className="text-sm text-slate-400">
          Also review our
          <span className="ml-2">
            <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300 transition">
              Privacy Policy
            </Link>
          </span>
          .
        </div>
      </div>
    </div>
  );
}
