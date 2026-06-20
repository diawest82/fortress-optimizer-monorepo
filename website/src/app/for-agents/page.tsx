import type { Metadata } from 'next';
import Link from 'next/link';
import { SAVINGS_DISPLAY } from '@/lib/pricing-config';

const API = 'https://api.fortress-optimizer.com';

export const metadata: Metadata = {
  title: 'For Agents | Fortress Token Optimizer — autonomous LLM cost optimization',
  description:
    `Fortress is built for AI agents: register your own API key with no human, optimize prompts, and cut LLM token costs ${SAVINGS_DISPLAY}. Copy-paste curl, MCP server, and a verifiable savings API.`,
  alternates: { canonical: 'https://fortress-optimizer.com/for-agents' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Fortress for AI Agents — autonomous token-cost optimization',
    description:
      'Self-register an API key, optimize a prompt, verify your own savings. No signup form, no human in the loop.',
    type: 'website',
    locale: 'en_US',
  },
};

const registerCurl = `curl -X POST ${API}/api/keys/register \\
  -H 'content-type: application/json' \\
  -d '{"name":"my-agent","tier":"free"}'
# -> {"api_key":"fk_...","tier":"free", ...}`;

const optimizeCurl = `curl -X POST ${API}/api/optimize \\
  -H 'authorization: Bearer fk_...' \\
  -H 'content-type: application/json' \\
  -d '{"prompt":"<your prompt>","level":"balanced","provider":"openai","model":"gpt-4o"}'
# -> { "optimization": { "optimized_prompt": "..." },
#      "tokens": { "original": 1200, "optimized": 1000,
#                  "savings": 200, "savings_percentage": 16.7 } }`;

const usageCurl = `curl ${API}/api/usage -H 'authorization: Bearer fk_...'`;

const mcpConfig = `{
  "mcpServers": {
    "fortress": {
      "command": "npx",
      "args": ["-y", "@fortress-optimizer/mcp-server"],
      "env": { "FORTRESS_API_KEY": "fk_..." }
    }
  }
}`;

const faq = [
  {
    q: 'Can an agent use Fortress without a human?',
    a: 'Yes. POST /api/keys/register issues a free API key with no authentication and no signup form. An agent can register a key, optimize prompts, and read its own usage entirely over HTTP.',
  },
  {
    q: 'How much does it save and is that verifiable?',
    a: `Typically ${SAVINGS_DISPLAY} of input tokens across optimization levels. Every optimize response returns tokens.original and tokens.optimized, so an agent can measure realized savings on its own prompts rather than trusting a marketing number.`,
  },
  {
    q: 'What does it cost?',
    a: 'Free tier is 50,000 tokens/month with no credit card. Pro is $15/month for unlimited tokens. Structured pricing is at /pricing.json.',
  },
  {
    q: 'How does an agent call it as a tool?',
    a: 'Via the Model Context Protocol (MCP) server @fortress-optimizer/mcp-server, which exposes an optimize_prompt tool to MCP hosts like Claude Desktop and Cursor.',
  },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-sm text-zinc-200">
      <code>{children}</code>
    </pre>
  );
}

export default function ForAgentsPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="mb-10">
        <p className="text-sm font-mono text-blue-400 mb-2">for AI agents</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Cut your own token costs — no human required
        </h1>
        <p className="text-lg text-zinc-300">
          Fortress reduces LLM token costs by {SAVINGS_DISPLAY} by optimizing prompts before they
          reach the model. It is built to be used by an agent: register your own key, optimize a
          prompt, and verify the savings — the entire loop is automatable over HTTP.
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          Machine-readable overview:{' '}
          <a className="text-blue-400 hover:underline" href="/llms.txt">/llms.txt</a>{' '}·{' '}
          <a className="text-blue-400 hover:underline" href="/llms-full.txt">/llms-full.txt</a>{' '}·{' '}
          <a className="text-blue-400 hover:underline" href="/pricing.json">/pricing.json</a>
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">1. Register your own key (no auth)</h2>
        <p className="text-zinc-300 mb-3">
          No signup form. The free tier gives 50,000 tokens/month with no credit card.
        </p>
        <Code>{registerCurl}</Code>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">2. Optimize a prompt</h2>
        <p className="text-zinc-300 mb-3">
          Send the prompt; use <code className="text-zinc-100">optimization.optimized_prompt</code>{' '}
          with your model in place of the original. <code className="text-zinc-100">level</code> is{' '}
          <code className="text-zinc-100">conservative</code> |{' '}
          <code className="text-zinc-100">balanced</code> |{' '}
          <code className="text-zinc-100">aggressive</code>. Pass{' '}
          <code className="text-zinc-100">model</code> to get a cost estimate back.
        </p>
        <Code>{optimizeCurl}</Code>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">3. Check usage</h2>
        <Code>{usageCurl}</Code>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">Call it as a tool (MCP)</h2>
        <p className="text-zinc-300 mb-3">
          The{' '}
          <Link className="text-blue-400 hover:underline" href="/docs/installation/mcp">
            Fortress MCP server
          </Link>{' '}
          exposes an <code className="text-zinc-100">optimize_prompt</code> tool to MCP hosts
          (Claude Desktop, Cursor, etc.). If <code className="text-zinc-100">FORTRESS_API_KEY</code>{' '}
          is unset it auto-registers a free key on first run.
        </p>
        <Code>{mcpConfig}</Code>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">Verify it yourself</h2>
        <p className="text-zinc-300">
          Fortress is auditable. Run the optimize endpoint on a sample of your real prompts and
          compare <code className="text-zinc-100">tokens.original</code> vs{' '}
          <code className="text-zinc-100">tokens.optimized</code>. The {SAVINGS_DISPLAY} figure is a
          measured range, not an estimate — confirm it on your own traffic before relying on it.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">Limits &amp; errors</h2>
        <ul className="text-zinc-300 space-y-1 list-disc pl-5">
          <li>Free tier: 100 req/min, 10,000 req/day, 50,000 optimization tokens/month.</li>
          <li><code className="text-zinc-100">401</code> — missing/invalid key.</li>
          <li><code className="text-zinc-100">403</code> — read-only key attempted a write.</li>
          <li><code className="text-zinc-100">429</code> — rate or monthly token limit reached.</li>
        </ul>
      </section>

      <section className="mb-4">
        <h2 className="text-2xl font-semibold mb-3">More</h2>
        <ul className="text-zinc-300 space-y-1 list-disc pl-5">
          <li><Link className="text-blue-400 hover:underline" href="/docs/api-reference">API reference</Link></li>
          <li><Link className="text-blue-400 hover:underline" href="/docs/installation/mcp">MCP server guide</Link></li>
          <li><Link className="text-blue-400 hover:underline" href="/install">All 15+ integrations</Link></li>
          <li><a className="text-blue-400 hover:underline" href="/pricing.json">Machine-readable pricing</a></li>
        </ul>
      </section>
    </div>
  );
}
