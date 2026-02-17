"use client";

import Link from "next/link";

export default function Pricing() {
  // Hero section component
  const PricingHero = () => (
    <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-8 mb-12">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold">💰 Simple, Transparent Pricing</p>
          <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
            Plans for every team size
          </h1>
          <p className="mt-4 text-base text-slate-300 max-w-2xl">
            Join 500+ teams already saving 20% on token costs. Free tier includes 50k tokens/month with all 5 integration channels.
          </p>
        </div>
      </div>
    </section>
  );
  const tiers = [
    {
      name: "Free",
      description: "Try Fortress risk-free",
      price: "0",
      color: "slate",
      colorHex: "#64748b",
      features: [
        "50K tokens/month",
        "All 5 integration channels",
        "Basic metrics dashboard",
        "Community support",
      ],
      cta: "Get started free",
      ctaPrimary: false,
      badge: "Get Started",
    },
    {
      name: "Sign Up",
      description: "For individual developers",
      price: "9.99",
      color: "blue",
      colorHex: "#3b82f6",
      features: [
        "500K tokens/month",
        "All 5 integration channels",
        "Real-time optimization",
        "Advanced analytics dashboard",
        "Email support",
        "API access",
      ],
      cta: "Subscribe now",
      ctaPrimary: false,
      badge: null,
    },
    {
      name: "Teams",
      description: "For teams and organizations",
      price: "99",
      color: "cyan",
      colorHex: "#06b6d4",
      features: [
        "Unlimited tokens",
        "Team seat management",
        "Advanced analytics",
        "Priority email support",
        "Slack integration",
        "Saves $30-150+/month per team",
      ],
      cta: "Subscribe now",
      ctaPrimary: true,
      badge: "Most Popular",
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      price: "Custom",
      color: "purple",
      colorHex: "#a855f7",
      features: [
        "Unlimited everything",
        "Custom integrations",
        "Dedicated account manager",
        "24/7 priority support",
        "SLA guarantee",
        "On-premise deployment",
      ],
      cta: "Contact sales",
      ctaPrimary: false,
      badge: null,
    },
  ];


  /*
  const features = [
    { name: "Token optimization", included: [true, true, true] },
    { name: "Multi-channel support", included: [false, true, true] },
    { name: "Real-time metrics", included: [false, true, true] },
    { name: "API access", included: [false, true, true] },
    { name: "Priority support", included: [false, true, true] },
    { name: "SLA guarantee", included: [false, false, true] },
  ];
  */

  return (
    <div className="flex flex-col gap-16">
      {/* Pricing Cards */}
      <section className="space-y-12">
        <PricingHero />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto w-full">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-3xl border p-8 transition-all duration-300 flex flex-col ${
                tier.ctaPrimary
                  ? `border-cyan-500/60 bg-gradient-to-br from-cyan-500/10 to-slate-900/20 shadow-lg shadow-cyan-500/20 md:scale-105`
                  : `border-slate-700 bg-gradient-to-br from-slate-950/60 to-slate-900/40 hover:border-slate-600`
              }`}
            >
              {tier.ctaPrimary && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-block bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-1 rounded-full text-xs font-bold text-white">
                    {tier.badge}
                  </span>
                </div>
              )}
              {!tier.ctaPrimary && tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-block bg-slate-800 px-4 py-1 rounded-full text-xs font-semibold text-slate-300">
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-slate-400">{tier.description}</p>
              </div>

              <div className="mb-8">
                {tier.price === "Custom" ? (
                  <p className="text-4xl font-bold text-white">
                    Custom pricing
                  </p>
                ) : tier.price === "0" ? (
                  <p className="text-4xl font-bold text-white">
                    Free
                  </p>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-white">
                      ${tier.price}
                    </span>
                    <span className="text-slate-400">/month</span>
                  </>
                )}
              </div>

              <button
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 mb-8 ${
                  tier.ctaPrimary
                    ? `bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-cyan-500/30`
                    : `border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100`
                }`}
              >
                {tier.cta}
              </button>

              <div className="space-y-4">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-emerald-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950/60 to-slate-900/40 p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Frequently asked questions
          </h2>
          <p className="text-slate-400">
            Have questions about pricing? We have answers.
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              q: "Can I change plans anytime?",
              a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.",
            },
            {
              q: "Do you offer annual discounts?",
              a: "Yes. Annual plans receive a 20% discount. Contact our sales team for custom enterprise pricing.",
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="border-b border-slate-700 pb-6 last:border-b-0 last:pb-0"
            >
              <h4 className="font-semibold text-white mb-2">{faq.q}</h4>
              <p className="text-slate-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Ready to optimize your tokens?
          </h2>
          <p className="text-emerald-100">
            Start free and upgrade when you're ready. No credit card required.
          </p>
        </div>
        <Link
          href="/install"
          className="inline-block rounded-full bg-emerald-500 px-8 py-3 font-semibold text-white hover:bg-emerald-600 transition-colors duration-200"
        >
          Get started free
        </Link>
      </section>
    </div>
  );
}
