#!/usr/bin/env node

/**
 * Simulate 10 beta users per tool
 * - Sends optimization_completed events with token savings
 * - Verifies savings appear in analytics metrics
 */

const TOOL_SOURCES = [
  'npm',
  'slack',
  'vscode',
  'sublime',
  'neovim',
  'jetbrains',
  'anthropic-sdk',
  'claude-desktop',
  'make-zapier',
  'github-copilot',
  'gpt-store'
];

const USERS_PER_TOOL = 10;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const COST_PER_TOKEN = 0.00003; // $0.03 per 1K tokens

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function randomTokens(min = 600, max = 2400) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeEvent(tool, userIndex) {
  const tokensBefore = randomTokens();
  const savingsRate = 0.18 + Math.random() * 0.07; // 18-25%
  const tokensSaved = Math.max(Math.round(tokensBefore * savingsRate), 1);
  const tokensAfter = Math.max(tokensBefore - tokensSaved, 1);
  const costSavedUSD = Number((tokensSaved * COST_PER_TOKEN).toFixed(4));

  return {
    eventName: 'optimization_completed',
    email: `beta-${tool}-${userIndex}@example.com`,
    source: tool,
    eventData: {
      tokensBefore,
      tokensAfter,
      tokensSaved,
      costSavedUSD,
      promptSample: `Beta test prompt ${userIndex} for ${tool}`
    },
    page: '/tools',
  };
}

async function postEvent(event) {
  const res = await fetch(`${BASE_URL}/api/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    throw new Error(`Tracking failed (${res.status})`);
  }
  return res.json();
}

async function fetchToolSavings(days = 7) {
  const res = await fetch(`${BASE_URL}/api/analytics/metrics?days=${days}&includeToolSavings=true`, {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error(`Metrics fetch failed (${res.status})`);
  }
  return res.json();
}

async function run() {
  console.log(`\nSimulating beta usage against: ${BASE_URL}`);
  console.log(`Tools: ${TOOL_SOURCES.length}, Users per tool: ${USERS_PER_TOOL}`);

  let sent = 0;
  for (const tool of TOOL_SOURCES) {
    for (let i = 1; i <= USERS_PER_TOOL; i++) {
      const event = makeEvent(tool, i);
      await postEvent(event);
      sent++;
      if (sent % 10 === 0) {
        process.stdout.write(`.`);
      }
      await sleep(50);
    }
  }

  console.log(`\nSent ${sent} optimization events.`);

  const metrics = await fetchToolSavings(7);
  const toolSavings = metrics.toolSavingsBySource || [];

  const missing = TOOL_SOURCES.filter(
    (tool) => !toolSavings.find((entry) => entry.source === tool)
  );

  console.log(`\nTool Savings Summary (Last 7 days):`);
  toolSavings
    .sort((a, b) => b.tokensSaved - a.tokensSaved)
    .forEach((entry) => {
      console.log(
        `- ${entry.source}: ${entry.tokensSaved} tokens saved across ${entry.events} runs ($${entry.costSavedUSD.toFixed(2)})`
      );
    });

  if (missing.length > 0) {
    console.error(`\nMissing savings for tools: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n✅ All tools recorded savings and appear in dashboard metrics.`);
}

run().catch((error) => {
  console.error(`\n❌ Simulation failed: ${error.message}`);
  process.exit(1);
});
