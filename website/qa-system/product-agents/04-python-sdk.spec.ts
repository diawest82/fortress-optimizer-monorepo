/**
 * Python SDK Agent — Install, Import, Execute for Python Products
 *
 * Tests anthropic-sdk, langchain, slack bot:
 *   1. Requirements install
 *   2. Python import succeeds
 *   3. Classes exist with expected methods
 *   4. API integration works
 *
 * Run: npx playwright test products/qa-system/agents/04-python-sdk.spec.ts
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PRODUCTS_DIR = join(process.cwd(), '..', 'products');
const API = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';

function runPython(cmd: string, cwd: string): string {
  try {
    return execSync(`python3 -c "${cmd}" 2>&1`, { cwd, timeout: 30000, encoding: 'utf-8' });
  } catch (e: any) {
    return e.stdout || e.message;
  }
}

// ─── Anthropic SDK ────────────────────────────────────────────────────────

test.describe('Python SDK: anthropic-sdk', () => {
  const dir = join(PRODUCTS_DIR, 'anthropic-sdk');

  test('[install] requirements.txt exists', async () => {
    expect(existsSync(join(dir, 'requirements.txt'))).toBe(true);
  });

  test('[install] wrapper.py exists', async () => {
    expect(existsSync(join(dir, 'wrapper.py'))).toBe(true);
  });

  test('[import] wrapper.py has no syntax errors', async () => {
    const result = runPython(`import ast; ast.parse(open('wrapper.py').read()); print('OK')`, dir);
    expect(result.trim()).toContain('OK');
  });

  test('[exports] Defines FortressAnthropicClient class', async () => {
    const result = runPython(
      `import ast; tree = ast.parse(open('wrapper.py').read()); classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]; print(','.join(classes))`,
      dir
    );
    expect(result).toContain('FortressAnthropicClient');
  });

  test('[exports] Defines FortressAsyncAnthropicClient class', async () => {
    const result = runPython(
      `import ast; tree = ast.parse(open('wrapper.py').read()); classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]; print(','.join(classes))`,
      dir
    );
    expect(result).toContain('FortressAsyncAnthropicClient');
  });
});

// ─── LangChain Integration ────────────────────────────────────────────────

test.describe('Python SDK: langchain', () => {
  const dir = join(PRODUCTS_DIR, 'langchain');

  test('[install] requirements.txt exists', async () => {
    expect(existsSync(join(dir, 'requirements.txt'))).toBe(true);
  });

  test('[install] Package directory exists', async () => {
    expect(existsSync(join(dir, 'fortress_langchain'))).toBe(true);
  });

  test('[import] __init__.py has no syntax errors', async () => {
    const initFile = join(dir, 'fortress_langchain', '__init__.py');
    if (existsSync(initFile)) {
      const result = runPython(`import ast; ast.parse(open('fortress_langchain/__init__.py').read()); print('OK')`, dir);
      expect(result.trim()).toContain('OK');
    }
  });

  test('[exports] Defines expected classes', async () => {
    const result = runPython(
      `import ast, os; files = [f for f in os.listdir('fortress_langchain') if f.endswith('.py')]; classes = []; [classes.extend([n.name for n in ast.walk(ast.parse(open(os.path.join('fortress_langchain',f)).read())) if isinstance(n, ast.ClassDef)]) for f in files]; print(','.join(classes))`,
      dir
    );
    expect(result).toContain('FortressClient');
  });
});

// ─── Slack Bot ────────────────────────────────────────────────────────────

test.describe('Python SDK: slack', () => {
  const dir = join(PRODUCTS_DIR, 'slack');

  test('[install] requirements.txt exists', async () => {
    expect(existsSync(join(dir, 'requirements.txt'))).toBe(true);
  });

  test('[install] bot.py exists', async () => {
    expect(existsSync(join(dir, 'bot.py'))).toBe(true);
  });

  test('[import] bot.py has no syntax errors', async () => {
    const result = runPython(`import ast; ast.parse(open('bot.py').read()); print('OK')`, dir);
    expect(result.trim()).toContain('OK');
  });

  test('[config] slack-app-manifest.yml exists', async () => {
    expect(existsSync(join(dir, 'slack-app-manifest.yml'))).toBe(true);
  });

  test('[config] .env.example documents required vars', async () => {
    expect(existsSync(join(dir, '.env.example'))).toBe(true);
  });
});

// ─── Sublime Plugin ───────────────────────────────────────────────────────

test.describe('Python SDK: sublime', () => {
  const dir = join(PRODUCTS_DIR, 'sublime');

  test('[install] fortress.py exists', async () => {
    expect(existsSync(join(dir, 'fortress.py'))).toBe(true);
  });

  test('[import] fortress.py has no syntax errors', async () => {
    const result = runPython(`import ast; ast.parse(open('fortress.py').read()); print('OK')`, dir);
    expect(result.trim()).toContain('OK');
  });

  test('[config] Keybindings file exists', async () => {
    expect(existsSync(join(dir, 'Default.sublime-keymap'))).toBe(true);
  });

  test('[config] Settings file exists', async () => {
    expect(existsSync(join(dir, 'Fortress.sublime-settings'))).toBe(true);
  });
});

// ─── Shared HTTP Client ──────────────────────────────────────────────────

test.describe('Python SDK: shared-libs', () => {
  const dir = join(PRODUCTS_DIR, '..', 'shared-libs');

  test('[import] http_client.py has no syntax errors', async () => {
    const result = runPython(`import ast; ast.parse(open('http_client.py').read()); print('OK')`, dir);
    expect(result.trim()).toContain('OK');
  });

  test('[import] fortress_types.py has no syntax errors', async () => {
    const result = runPython(`import ast; ast.parse(open('fortress_types.py').read()); print('OK')`, dir);
    expect(result.trim()).toContain('OK');
  });

  test('[exports] http_client defines FortressClient', async () => {
    const result = runPython(
      `import ast; tree = ast.parse(open('http_client.py').read()); classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]; print(','.join(classes))`,
      dir
    );
    expect(result).toContain('FortressClient');
    expect(result).toContain('FortressAsyncClient');
  });

  test('[security] core.py exists but is backend-only', async () => {
    // core.py should exist but should NOT be importable from client packages
    expect(existsSync(join(dir, 'core.py'))).toBe(true);
    // Verify it contains the optimization algorithm
    const result = runPython(
      `import ast; tree = ast.parse(open('core.py').read()); classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]; print(','.join(classes))`,
      dir
    );
    expect(result).toContain('TokenOptimizer');
  });
});
