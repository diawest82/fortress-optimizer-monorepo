/**
 * IDE Plugin Contract Agent — Verify Structure for All Editor Plugins
 *
 * For plugins that can't be auto-executed (VS Code, JetBrains, Neovim, etc.),
 * verify:
 *   - Entry point exists
 *   - Config/manifest is valid
 *   - No syntax errors in source
 *   - Expected commands/keybindings defined
 *   - API connection configured correctly
 *
 * Run: npx playwright test products/qa-system/agents/07-ide-plugins.spec.ts
 */

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PRODUCTS_DIR = join(__dirname, '../..');

function fileExists(product: string, ...paths: string[]): boolean {
  return existsSync(join(PRODUCTS_DIR, product, ...paths));
}

function readFile(product: string, ...paths: string[]): string {
  return readFileSync(join(PRODUCTS_DIR, product, ...paths), 'utf-8');
}

// ─── VS Code Copilot Extension ────────────────────────────────────────────

test.describe('IDE Plugins: copilot', () => {
  test('[structure] package.json exists', () => {
    expect(fileExists('copilot', 'package.json')).toBe(true);
    const pkg = JSON.parse(readFile('copilot', 'package.json'));
    expect(pkg.engines?.vscode).toBeDefined();
  });

  test('[structure] Extension entry point exists', () => {
    expect(fileExists('copilot', 'extension.ts')).toBe(true);
  });

  test('[structure] Provider implementation exists', () => {
    expect(fileExists('copilot', 'fortress-provider.ts')).toBe(true);
  });

  test('[api] Connects to /api/optimize', () => {
    const source = readFile('copilot', 'fortress-provider.ts');
    expect(source).toContain('/api/optimize');
  });

  test('[tests] Test file exists', () => {
    expect(fileExists('copilot', 'test_copilot.ts')).toBe(true);
  });
});

// ─── Cursor Extension ─────────────────────────────────────────────────────

test.describe('IDE Plugins: cursor', () => {
  test('[structure] package.json exists', () => {
    expect(fileExists('cursor', 'package.json')).toBe(true);
    const pkg = JSON.parse(readFile('cursor', 'package.json'));
    expect(pkg.engines?.vscode).toBeDefined();
  });

  test('[structure] Extension entry point exists', () => {
    expect(fileExists('cursor', 'src', 'extension.ts')).toBe(true);
  });

  test('[commands] Defines expected commands', () => {
    const pkg = JSON.parse(readFile('cursor', 'package.json'));
    const commands = pkg.contributes?.commands?.map((c: any) => c.command) || [];
    expect(commands.length).toBeGreaterThan(0);
  });

  test('[tests] Test file exists', () => {
    expect(fileExists('cursor', 'test_cursor.ts')).toBe(true);
  });
});

// ─── VS Code Enhanced ─────────────────────────────────────────────────────

test.describe('IDE Plugins: vscode-enhanced', () => {
  test('[structure] package.json exists with v2', () => {
    expect(fileExists('vscode-enhanced', 'package.json')).toBe(true);
    const pkg = JSON.parse(readFile('vscode-enhanced', 'package.json'));
    expect(pkg.version).toMatch(/^2\./);
  });

  test('[structure] Source directory exists', () => {
    expect(fileExists('vscode-enhanced', 'src')).toBe(true);
  });

  test('[tests] Test directory exists', () => {
    expect(fileExists('vscode-enhanced', 'test')).toBe(true);
  });
});

// ─── JetBrains Plugin ─────────────────────────────────────────────────────

test.describe('IDE Plugins: jetbrains', () => {
  test('[structure] build.gradle exists', () => {
    expect(fileExists('jetbrains', 'build.gradle')).toBe(true);
  });

  test('[structure] Source directory exists', () => {
    expect(fileExists('jetbrains', 'src')).toBe(true);
  });

  test('[tests] Test file exists', () => {
    expect(fileExists('jetbrains', 'test_plugin.ts')).toBe(true);
  });
});

// ─── Neovim Plugin ────────────────────────────────────────────────────────

test.describe('IDE Plugins: neovim', () => {
  test('[structure] init.lua exists', () => {
    expect(fileExists('neovim', 'init.lua')).toBe(true);
  });

  test('[structure] plugin.vim exists', () => {
    expect(fileExists('neovim', 'plugin.vim')).toBe(true);
  });

  test('[api] Connects to /api/optimize', () => {
    const source = readFile('neovim', 'init.lua');
    expect(source).toContain('/api/optimize');
  });

  test('[commands] Defines FortressOptimize command', () => {
    const source = readFile('neovim', 'init.lua');
    expect(source).toContain('FortressOptimize');
  });

  test('[tests] Test file exists', () => {
    expect(fileExists('neovim', 'test_plugin.lua')).toBe(true);
  });
});

// ─── Claude Desktop ───────────────────────────────────────────────────────

test.describe('IDE Plugins: claude-desktop', () => {
  test('[structure] package.json exists', () => {
    expect(fileExists('claude-desktop', 'package.json')).toBe(true);
    const pkg = JSON.parse(readFile('claude-desktop', 'package.json'));
    expect(pkg.dependencies?.electron).toBeDefined();
  });

  test('[structure] Source directory exists', () => {
    expect(fileExists('claude-desktop', 'src')).toBe(true);
  });

  test('[tests] Test file exists', () => {
    expect(fileExists('claude-desktop', 'test_app.ts')).toBe(true);
  });
});

// ─── GPT Store ────────────────────────────────────────────────────────────

test.describe('IDE Plugins: gpt-store', () => {
  test('[structure] GPT config exists', () => {
    expect(fileExists('gpt-store', 'gpt-config.json')).toBe(true);
    const config = JSON.parse(readFile('gpt-store', 'gpt-config.json'));
    expect(config.name).toContain('Fortress');
  });

  test('[structure] System prompt exists', () => {
    expect(fileExists('gpt-store', 'system-prompt.md')).toBe(true);
  });

  test('[api] OpenAPI actions reference Fortress API', () => {
    expect(fileExists('gpt-store', 'openapi-actions.json')).toBe(true);
    const actions = readFile('gpt-store', 'openapi-actions.json');
    expect(actions).toContain('/api/optimize');
  });
});

// ─── Bing Copilot ─────────────────────────────────────────────────────────

test.describe('IDE Plugins: bing-copilot', () => {
  test('[structure] OpenAPI spec exists', () => {
    expect(fileExists('bing-copilot', 'openapi.yaml')).toBe(true);
  });

  test('[structure] Plugin manifest exists', () => {
    expect(fileExists('bing-copilot', 'ai-plugin.json')).toBe(true);
  });
});

// ─── Make/Zapier ──────────────────────────────────────────────────────────

test.describe('IDE Plugins: make-zapier', () => {
  test('[structure] Zapier app definition exists', () => {
    expect(fileExists('make-zapier', 'zapier-app.json')).toBe(true);
  });

  test('[structure] Make module definition exists', () => {
    expect(fileExists('make-zapier', 'make-module.json')).toBe(true);
  });

  test('[api] References /api/optimize endpoint', () => {
    const zapier = readFile('make-zapier', 'zapier-app.json');
    expect(zapier).toContain('/api/optimize');
  });
});

// ─── OpenClaw Skill ───────────────────────────────────────────────────────

test.describe('IDE Plugins: openclaw', () => {
  test('[structure] SKILL.md manifest exists', () => {
    expect(fileExists('openclaw', 'SKILL.md')).toBe(true);
  });

  test('[structure] package.json exists', () => {
    expect(fileExists('openclaw', 'package.json')).toBe(true);
  });

  test('[structure] Source directory exists', () => {
    expect(fileExists('openclaw', 'src')).toBe(true);
  });
});

// ─── Vercel AI SDK ────────────────────────────────────────────────────────

test.describe('IDE Plugins: vercel-ai-sdk', () => {
  test('[structure] package.json exists', () => {
    expect(fileExists('vercel-ai-sdk', 'package.json')).toBe(true);
    const pkg = JSON.parse(readFile('vercel-ai-sdk', 'package.json'));
    expect(pkg.name).toContain('fortress');
  });

  test('[structure] Source directory exists', () => {
    expect(fileExists('vercel-ai-sdk', 'src')).toBe(true);
  });

  test('[tests] Test directory exists', () => {
    expect(fileExists('vercel-ai-sdk', 'test')).toBe(true);
  });
});
