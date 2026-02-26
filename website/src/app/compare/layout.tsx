import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Fortress | Token Optimization Comparison',
  description: 'See why Fortress is the only token optimization platform that actually reduces your LLM costs by 20%. Compare Fortress vs CloudFlare, Azure, Google, and manual optimization.',
  keywords: [
    'token optimization',
    'LLM cost reduction',
    'API cost savings',
    'fortress vs competitors',
    'ChatGPT cost savings',
    'Claude optimization',
    'LLM cost optimization',
  ],
  openGraph: {
    title: 'Why Fortress Wins | Save 20% on LLM Costs',
    description: 'The only token optimization platform that delivers up to 20% savings consistently without sacrificing quality. No vendor lock-in, 5-minute setup.',
    url: 'https://www.fortress-optimizer.com/compare',
    type: 'website',
    images: [
      {
        url: 'https://www.fortress-optimizer.com/og-compare.png',
        width: 1200,
        height: 630,
        alt: 'Fortress Token Optimizer Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Why Fortress Wins | Save 20% on LLM Costs',
    description: 'The only token optimization platform that delivers up to 20% savings consistently. See the comparison.',
    images: ['https://www.fortress-optimizer.com/og-compare.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ComparisonChart',
            name: 'Fortress Token Optimizer vs Competitors',
            description: 'Compare Fortress with CloudFlare, Azure, Google, and manual token optimization',
            url: 'https://www.fortress-optimizer.com/compare',
            image: 'https://www.fortress-optimizer.com/og-compare.png',
            creator: {
              '@type': 'Organization',
              name: 'Fortress',
              url: 'https://www.fortress-optimizer.com',
            },
          }),
        }}
      />
      {children}
    </>
  );
}
