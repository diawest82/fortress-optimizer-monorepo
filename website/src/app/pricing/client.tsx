"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
// Auth check uses localStorage token (not NextAuth session — avoids hydration mismatch)
import Link from "next/link";
import { analytics } from "@/lib/tracking";

// Sliding scale team pricing calculator — graduated tiers
function calculateTeamPrice(seats: number): { total: number; perSeat: number; tier: string; discount: number } {
  if (seats <= 5) {
    return { total: 60, perSeat: 60 / seats, tier: "Team Starter", discount: 0 };
  } else if (seats <= 25) {
    const total = 60 + (seats - 5) * 10;
    return { total, perSeat: total / seats, tier: "Team", discount: Math.round((1 - (total / seats) / 12.00) * 100) };
  } else if (seats <= 100) {
    const total = 60 + 20 * 10 + (seats - 25) * 8;
    return { total, perSeat: total / seats, tier: "Team Business", discount: Math.round((1 - (total / seats) / 12.00) * 100) };
  } else if (seats <= 249) {
    const total = 60 + 20 * 10 + 75 * 8 + (seats - 100) * 7;
    return { total, perSeat: total / seats, tier: "Team Scale", discount: Math.round((1 - (total / seats) / 12.00) * 100) };
  } else if (seats <= 500) {
    const total = 60 + 20 * 10 + 75 * 8 + 149 * 7 + (seats - 249) * 6;
    return { total, perSeat: total / seats, tier: "Team Scale+", discount: Math.round((1 - (total / seats) / 12.00) * 100) };
  }
  return { total: 0, perSeat: 0, tier: "Enterprise", discount: 0 };
}

// Map slider position (0-100) to seats using logarithmic scale for better low-end granularity
function sliderToSeats(pos: number): number {
  const min = Math.log(2);
  const max = Math.log(500);
  return Math.round(Math.exp(min + (pos / 100) * (max - min)));
}
function seatsToSlider(seats: number): number {
  const min = Math.log(2);
  const max = Math.log(500);
  return Math.round(((Math.log(seats) - min) / (max - min)) * 100);
}

export default function PricingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [teamSeats, setTeamSeats] = useState(5);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    setMounted(true);
    analytics.pricingViewed();
  }, []);

  const teamPricing = useMemo(() => calculateTeamPrice(teamSeats), [teamSeats]);

  const handleCheckout = async (tierDisplay: string) => {
    const tierMap: Record<string, string> = {
      "Free": "free",
      "Pro": "individual",
      "Teams": "teams",
      "Enterprise": "enterprise",
    };

    const tier = tierMap[tierDisplay];

    if (!tier) {
      console.error(`Unknown tier: ${tierDisplay}`);
      alert("Invalid tier selected");
      return;
    }

    if (tier === "free") {
      analytics.signupStarted();
      router.push("/auth/signup");
      return;
    }

    // Check authentication — need to be logged in for paid tiers
    const hasAuth = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');

    if (!hasAuth) {
      // Send to appropriate signup page based on tier
      if (tier === "teams") {
        window.location.assign(`/auth/signup/team?seats=${teamSeats}&callbackUrl=${encodeURIComponent('/pricing')}`);
      } else {
        window.location.assign(`/auth/signup?plan=${tier}&callbackUrl=${encodeURIComponent('/pricing')}`);
      }
      return;
    }

    if (tier === "enterprise") {
      window.open("mailto:sales@fortress-optimizer.com?subject=Enterprise%20Plan%20Inquiry%20(500%2B%20seats)", "_blank");
      return;
    }

    const currentTier = "free"; // Tier will be determined by Stripe checkout
    analytics.upgradeStarted(currentTier, tier);

    setLoading(tierDisplay);
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tier,
          seats: tier === "teams" ? teamSeats : 1,
          interval: annual ? "year" : "month",
          successUrl: `${window.location.origin}/dashboard?upgrade=success`,
          cancelUrl: `${window.location.origin}/pricing?upgrade=cancelled`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      alert("Error starting checkout. Please try again.");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const PricingHero = () => (
    <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-8 mb-12">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300 font-semibold">Pay For What You Use</p>
          <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
            Simple Pricing. Real Savings.
          </h1>
          <p className="mt-4 text-base text-slate-300 max-w-2xl">
            Stop paying for verbose prompts. Choose your plan and start optimizing today. Teams get volume discounts up to 59% off.
          </p>
        </div>
      </div>
    </section>
  );

  const CheckIcon = () => (
    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );

  // Slider tick marks for visual reference
  const sliderTicks = [5, 10, 25, 50, 100, 250, 500];

  return (
    <div className="flex flex-col gap-16">
      <section className="space-y-12">
        <PricingHero />

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition ${annual ? 'bg-emerald-500' : 'bg-slate-700'}`}
            aria-label="Toggle annual billing"
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${annual ? 'left-6' : 'left-0.5'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-slate-500'}`}>Annual</span>
          {annual && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Save 20%</span>}
        </div>

        {/* Free + Pro cards side by side */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full">
          {/* Free */}
          <div className="relative rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950/60 to-slate-900/40 p-8 flex flex-col hover:border-slate-600 transition-all duration-300">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-block bg-slate-800 px-4 py-1 rounded-full text-xs font-semibold text-slate-300">
                Get Started
              </span>
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
              <p className="text-sm text-slate-400">Try Fortress risk-free</p>
            </div>
            <div className="mb-8">
              <p className="text-4xl font-bold text-white">Free</p>
            </div>
            <button
              onClick={() => handleCheckout("Free")}
              disabled={loading === "Free"}
              className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 mb-8 border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "Free" ? "Processing..." : "Get Early Access"}
            </button>
            <div className="space-y-4">
              {["50K tokens/month", "5 core integration channels", "Basic metrics dashboard", "Community support via Discord"].map((f) => (
                <div key={f} className="flex items-center gap-3"><CheckIcon /><span className="text-slate-300">{f}</span></div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="relative rounded-3xl border border-blue-500/50 bg-gradient-to-br from-blue-950/30 to-slate-900/40 p-8 flex flex-col hover:border-blue-400/60 transition-all duration-300 ring-1 ring-blue-500/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-block bg-blue-600 px-4 py-1 rounded-full text-xs font-semibold text-white">
                Most Popular
              </span>
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <p className="text-sm text-slate-400">For individual developers</p>
            </div>
            <div className="mb-8">
              <span className="text-4xl font-bold text-white">${annual ? '12' : '15'}</span>
              <span className="text-slate-400">/{annual ? 'mo (billed annually)' : 'month'}</span>
            </div>
            <button
              onClick={() => handleCheckout("Pro")}
              disabled={loading === "Pro"}
              className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 mb-8 border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "Pro" ? "Processing..." : "Subscribe now"}
            </button>
            <div className="space-y-4">
              {[
                "Unlimited tokens",
                "All 12 integration platforms",
                "Real-time optimization",
                "Advanced analytics dashboard",
                "Email support (24-48 hour response)",
                "API access",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3"><CheckIcon /><span className="text-slate-300">{f}</span></div>
              ))}
            </div>
          </div>

          {/* Enterprise */}
          <div className="relative rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950/60 to-slate-900/40 p-8 flex flex-col hover:border-slate-600 transition-all duration-300">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-block bg-amber-700 px-4 py-1 rounded-full text-xs font-semibold text-amber-200">
                Coming Soon
              </span>
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-sm text-slate-400">Custom solutions for large organizations</p>
            </div>
            <div className="mb-8">
              <p className="text-4xl font-bold text-white">Custom</p>
            </div>
            <a
              href="mailto:sales@fortress-optimizer.com?subject=Enterprise%20Plan%20Inquiry&body=Hi%2C%20I'm%20interested%20in%20the%20Enterprise%20plan%20for%20my%20organization.%0A%0ACompany%3A%20%0ATeam%20size%3A%20%0AUse%20case%3A%20"
              className="block w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 mb-8 border border-purple-500/50 text-purple-300 hover:bg-purple-500/10 text-center"
            >
              Contact Sales
            </a>
            <div className="space-y-4">
              {[
                "Everything in Teams, plus:",
                "500+ team seats",
                "Dedicated account manager",
                "Priority support with SLA",
                "Custom integrations",
                "On-premise deployment option",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3"><CheckIcon /><span className="text-slate-300">{f}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* Teams - Full Width with Sliding Scale Calculator */}
        <div className="max-w-6xl mx-auto w-full">
          <div className="relative rounded-3xl border border-cyan-500/60 bg-gradient-to-br from-cyan-500/10 to-slate-900/20 shadow-lg shadow-cyan-500/20 p-8">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-block bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-1 rounded-full text-xs font-bold text-white">
                Best for Teams
              </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Info + Features */}
              <div className="flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Teams</h3>
                  <p className="text-sm text-slate-400">
                    Sliding scale pricing — pay less per seat as your team grows
                  </p>
                </div>

                <div className="mb-6" aria-live="polite" aria-atomic="true">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      ${teamPricing.total}
                    </span>
                    <span className="text-slate-400">/month</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-cyan-300">
                      ${teamPricing.perSeat.toFixed(2)}/seat
                    </span>
                    {teamPricing.discount > 0 && (
                      <span className="inline-block bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {teamPricing.discount}% volume discount
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{teamPricing.tier}</p>
                </div>

                <button
                  onClick={() => handleCheckout("Teams")}
                  disabled={loading === "Teams"}
                  className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 mb-8 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === "Teams" ? "Processing..." : `Subscribe — ${teamSeats} seats`}
                </button>

                <div className="space-y-4">
                  {[
                    "Unlimited tokens for every seat",
                    "Team seat management & RBAC",
                    "All 12 integration platforms",
                    "Advanced analytics & team usage tracking",
                    "Priority email support (4-8 hour response)",
                    "Slack integration for team alerts",
                    "Admin dashboard",
                    "API access with higher rate limits",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-3"><CheckIcon /><span className="text-slate-300">{f}</span></div>
                  ))}
                </div>
              </div>

              {/* Right: Slider + Cost Breakdown */}
              <div className="flex flex-col">
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-6 mb-6">
                  <label className="block text-sm font-semibold text-white mb-4">
                    How many seats do you need?
                  </label>
                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={seatsToSlider(teamSeats)}
                      onChange={(e) => setTeamSeats(sliderToSeats(Number(e.target.value)))}
                      aria-label="Team seat count slider"
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={2}
                        max={500}
                        value={teamSeats}
                        aria-label="Team seat count"
                        onChange={(e) => {
                          const v = Math.max(2, Math.min(500, Number(e.target.value) || 2));
                          setTeamSeats(v);
                        }}
                        className="w-16 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  {/* Tick labels — positioned at correct logarithmic positions */}
                  <div className="relative h-6 text-xs text-slate-500 mt-1">
                    {sliderTicks.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTeamSeats(t)}
                        style={{ position: 'absolute', left: `${seatsToSlider(t)}%`, transform: 'translateX(-50%)' }}
                        className={`hover:text-cyan-400 transition-colors ${teamSeats === t ? "text-cyan-400 font-semibold" : ""}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cost breakdown table */}
                <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6">
                  <h4 className="text-sm font-semibold text-white mb-4">Pricing Breakdown</h4>
                  <div className="space-y-3">
                    {[
                      { range: "1-5 seats", rate: "$12.00/seat", total: "$60 base" },
                      { range: "6-25 seats", rate: "$10.00/seat", total: "+$10 each" },
                      { range: "26-100 seats", rate: "$8.00/seat", total: "+$8 each" },
                      { range: "101-249 seats", rate: "$7.00/seat", total: "+$7 each" },
                      { range: "250-500 seats", rate: "$6.00/seat", total: "+$6 each" },
                    ].map((row) => (
                      <div key={row.range} className="flex justify-between text-sm">
                        <span className="text-slate-400">{row.range}</span>
                        <span className="text-slate-300">{row.rate}</span>
                        <span className="text-slate-500">{row.total}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-700 pt-3 mt-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-white">{teamSeats} seats</span>
                        <span className="text-cyan-400">${teamPricing.total}/mo</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick examples */}
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-6">
                  <h4 className="text-sm font-semibold text-white mb-3">Quick Examples</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { seats: 5, label: "Small team" },
                      { seats: 10, label: "Growing team" },
                      { seats: 25, label: "Department" },
                      { seats: 50, label: "Division" },
                      { seats: 100, label: "Large org" },
                      { seats: 150, label: "Mid-enterprise" },
                      { seats: 250, label: "Company-wide" },
                      { seats: 500, label: "Max scale" },
                    ].map(({ seats, label }) => {
                      const p = calculateTeamPrice(seats);
                      return (
                        <button
                          key={seats}
                          onClick={() => setTeamSeats(seats)}
                          className={`text-left rounded-xl border p-3 transition-all text-sm ${
                            teamSeats === seats
                              ? "border-cyan-500/60 bg-cyan-500/10"
                              : "border-slate-700 hover:border-slate-600"
                          }`}
                        >
                          <div className="text-slate-400 text-xs">{label}</div>
                          <div className="text-white font-semibold">{seats} seats</div>
                          <div className="text-cyan-400 text-xs">${p.total}/mo (${p.perSeat.toFixed(2)}/seat)</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Channels Explanation */}
      <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-950/40 p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            5 Core Integration Channels
          </h2>
          <p className="text-slate-400 mb-6">
            All tiers include access to our 5 most popular integration channels, plus 7 additional platforms for paid tiers:
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {[
            { emoji: "📦", name: "npm Package", desc: "JavaScript/TypeScript projects", users: "1M+" },
            { emoji: "⚙️", name: "VS Code Extension", desc: "Native editor integration", users: "500K+" },
            { emoji: "🤖", name: "GitHub Copilot", desc: "AI code assistant integration", users: "200K+" },
            { emoji: "💬", name: "Slack Bot", desc: "Team collaboration platform", users: "100K+" },
            { emoji: "🌫️", name: "Claude Desktop", desc: "Anthropic Claude client", users: "50K+" },
          ].map((channel, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 text-center hover:border-blue-500/60 transition"
            >
              <div className="text-3xl mb-2">{channel.emoji}</div>
              <h4 className="font-semibold text-white text-sm mb-1">{channel.name}</h4>
              <p className="text-xs text-slate-400 mb-2">{channel.desc}</p>
              <p className="text-xs text-blue-300 font-semibold">{channel.users} users</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-950/10 p-4">
          <p className="text-sm text-blue-200">
            <span className="font-semibold">Plus 7 Additional Platforms:</span> Neovim, Sublime Text, JetBrains IDEs, Make.com/Zapier, Anthropic SDK, and GPT Store
          </p>
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
              q: "How does team pricing work?",
              a: "Team pricing uses a sliding scale — the more seats you add, the less you pay per seat. It starts at $12/seat for the first 5 (base $60), then $10/seat for 6-25, $8/seat for 26-100, $7/seat for 101-249, and $6/seat for 250-500. Use the calculator above to see your exact price.",
            },
            {
              q: "Can I add or remove seats anytime?",
              a: "Yes. You can adjust your seat count at any time. Additions are prorated for the current billing cycle, and reductions take effect at the next cycle.",
            },
            {
              q: "What are the 5 core integration channels?",
              a: "The 5 core channels are: npm Package, VS Code Extension, GitHub Copilot, Slack Bot, and Claude Desktop. These cover 90% of our user base. Paid tiers also include 7 additional platforms (Neovim, Sublime, JetBrains, etc.).",
            },
            {
              q: "Do you offer annual discounts?",
              a: "Yes. Annual plans receive a 20% discount. Contact our sales team for custom enterprise pricing.",
            },
            {
              q: "What support do I get with each tier?",
              a: "Free: Community support via Discord. Pro: Email support (24-48 hour response). Teams: Priority email support (4-8 hour response) + Slack integration. Enterprise: Dedicated account manager with custom SLA.",
            },
            {
              q: "What if I need more than 500 seats?",
              a: "Contact our sales team for Enterprise pricing. We offer custom solutions including dedicated infrastructure, SSO/SAML, on-premise deployment, and a dedicated account manager.",
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
