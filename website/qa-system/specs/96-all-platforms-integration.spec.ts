/**
 * All 12 Platforms Integration — verify each platform's docs and install path
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'https://www.fortress-optimizer.com';

const PLATFORMS = [
  { name: 'npm', slug: 'npm', docPath: '/docs/installation/npm' },
  { name: 'VS Code', slug: 'vscode', docPath: '/docs/installation/vscode' },
  { name: 'Copilot', slug: 'copilot', docPath: '/docs/installation/copilot' },
  { name: 'Slack', slug: 'slack', docPath: '/docs/installation/slack' },
  { name: 'Claude Desktop', slug: 'claude-desktop', docPath: '/docs/installation/claude-desktop' },
  { name: 'OpenClaw', slug: 'openclaw', docPath: '/docs/installation/openclaw' },
  { name: 'JetBrains', slug: 'jetbrains', docPath: '/docs/installation/jetbrains' },
  { name: 'Neovim', slug: 'neovim', docPath: '/docs/installation/neovim' },
  { name: 'Anthropic SDK', slug: 'anthropic-sdk', docPath: '/docs/installation/anthropic-sdk' },
  { name: 'LangChain', slug: 'langchain', docPath: '/docs/installation/langchain' },
  { name: 'Vercel AI SDK', slug: 'vercel-ai-sdk', docPath: '/docs/installation/vercel-ai-sdk' },
  { name: 'Cursor', slug: 'cursor', docPath: '/docs/installation/cursor' },
];

test.describe('All Platforms: Documentation Exists', () => {
  for (const platform of PLATFORMS) {
    test(`${platform.name} docs page returns 200`, async ({ request }) => {
      const res = await request.get(`${BASE}${platform.docPath}`);
      expect(res.status(), `${platform.docPath} returned ${res.status()}`).toBe(200);
    });
  }
});

test.describe('All Platforms: Docs Have Content', () => {
  for (const platform of PLATFORMS.slice(0, 6)) { // Test first 6 in detail
    test(`${platform.name} docs have installation instructions`, async ({ page }) => {
      await page.goto(`${BASE}${platform.docPath}`);
      await page.waitForTimeout(3000);
      const body = await page.locator('body').textContent() || '';
      expect(body.length).toBeGreaterThan(100);
      expect(body).toMatch(/install|setup|configuration|usage/i);
    });
  }
});
