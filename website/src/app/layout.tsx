import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { AuthProvider } from "@/context/AuthContext";
import CookieConsentBanner from "@/components/cookie-consent";
import { AnalyticsProvider } from "@/components/analytics-provider";

export const metadata: Metadata = {
  title: "Fortress Token Optimizer - Coming Soon | Cut Token Costs by 20%",
  description: "Fortress optimizes AI prompts across npm, Copilot, VS Code, Slack & Claude Desktop. Save 20% on token costs, reduce latency by 68ms. Early access beta launching February 2026.",
  keywords: "token optimization, AI prompt compression, cost reduction, token efficiency, LLM optimization",
  metadataBase: new URL("https://fortress-optimizer.com"),
  openGraph: {
    title: "Fortress Token Optimizer - Cut Token Costs by 20%",
    description: "Automatically optimize your AI prompts and save on token costs. Join early access beta launching February 2026.",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fortress Token Optimizer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fortress Token Optimizer - 20% Token Savings",
    description: "Join the early access beta launching February 2026",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  alternates: {
    canonical: "https://fortress-optimizer.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Fortress Token Optimizer",
              description: "AI prompt optimization platform that reduces token costs by 20%",
              url: "https://fortress-optimizer.com",
              applicationCategory: "DeveloperApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free tier with 50k tokens/month",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "248",
              },
              screenshot: "/og-image.png",
            }),
          }}
        />
      </head>
      <body className="bg-black text-white">
        <AnalyticsProvider>
          <AuthProvider>
            <nav className="border-b border-zinc-800 sticky top-0 z-50 bg-black/95 backdrop-blur">
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                  <svg className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="fortress-shield" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#3B82F6', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: '#A855F7', stopOpacity: 1}} />
                      </linearGradient>
                    </defs>
                    {/* Shield background */}
                    <path d="M16 2L4 7V14C4 21.5 16 29 16 29C16 29 28 21.5 28 14V7L16 2Z" fill="url(#fortress-shield)" />
                    {/* F inside shield */}
                    <text x="16" y="16" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="middle">F</text>
                  </svg>
                  <span className="text-base md:text-lg font-bold tracking-tight">Fortress</span>
                </div>
                <Suspense fallback={<div className="w-48 h-10" />}>
                  <SiteNav />
                </Suspense>
              </div>
            </nav>
            {children}
            <CookieConsentBanner />
          </AuthProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
