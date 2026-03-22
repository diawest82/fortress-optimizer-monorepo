/**
 * SDK Publish Verification — Package structure, exports, build artifacts
 * Full publish test requires npm test registry (verdaccio).
 * These tests verify packages are structured correctly for publishing.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = join(__dirname, '..', '..', '..');

test.describe('SDK Publish: Package Structure', () => {

  test.describe('npm Package', () => {
    test('package.json exists with correct name', async () => {
      const pkgPath = join(ROOT_DIR, 'products/npm/package.json');
      expect(existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      expect(pkg.name).toBeTruthy();
      expect(pkg.version).toBeTruthy();
      expect(pkg.main || pkg.exports).toBeTruthy();
    });

    test('Source exports FortressClient', async () => {
      const src = readFileSync(join(ROOT_DIR, 'products/npm/src/index.ts'), 'utf-8');
      expect(src).toContain('export');
      expect(src).toContain('FortressClient');
    });

    test('tsconfig.json exists for TypeScript compilation', async () => {
      const tsconfigPath = join(ROOT_DIR, 'products/npm/tsconfig.json');
      expect(existsSync(tsconfigPath)).toBe(true);
    });

    test('Test file exists for npm package', async () => {
      const testPath = join(ROOT_DIR, 'products/npm/test/client.test.ts');
      expect(existsSync(testPath), 'client.test.ts should exist').toBe(true);
    });
  });

  test.describe('Python Packages', () => {
    test('shared-libs has pyproject.toml', async () => {
      const pyprojectPath = join(ROOT_DIR, 'shared-libs/pyproject.toml');
      expect(existsSync(pyprojectPath)).toBe(true);
    });

    test('shared-libs exports FortressClient', async () => {
      const client = readFileSync(join(ROOT_DIR, 'shared-libs/http_client.py'), 'utf-8');
      expect(client).toContain('class FortressClient');
    });

    test('Anthropic SDK has setup.py or pyproject.toml', async () => {
      const setupExists = existsSync(join(ROOT_DIR, 'products/anthropic-sdk/setup.py'));
      const pyprojectExists = existsSync(join(ROOT_DIR, 'products/anthropic-sdk/pyproject.toml'));
      expect(setupExists || pyprojectExists, 'Needs setup.py or pyproject.toml').toBe(true);
    });

    test('LangChain package has setup.py', async () => {
      const setupExists = existsSync(join(ROOT_DIR, 'products/langchain/setup.py'));
      const pyprojectExists = existsSync(join(ROOT_DIR, 'products/langchain/pyproject.toml'));
      expect(setupExists || pyprojectExists).toBe(true);
    });
  });

  test.describe('VS Code Extension', () => {
    test('VS Code extension package.json exists', async () => {
      const paths = [
        join(ROOT_DIR, 'products/vscode-enhanced/package.json'),
        join(ROOT_DIR, 'products/copilot/package.json'),
      ];
      const exists = paths.some(p => existsSync(p));
      expect(exists, 'VS Code extension package.json should exist').toBe(true);
    });

    test('Extension has entry point (extension.ts)', async () => {
      const paths = [
        join(ROOT_DIR, 'products/vscode-enhanced/src/extension.ts'),
        join(ROOT_DIR, 'products/copilot/extension.ts'),
      ];
      const exists = paths.some(p => existsSync(p));
      expect(exists, 'Extension entry point should exist').toBe(true);
    });
  });

  test.describe('OpenClaw Skill', () => {
    test('OpenClaw package.json exists', async () => {
      const pkgPath = join(ROOT_DIR, 'products/openclaw/package.json');
      expect(existsSync(pkgPath)).toBe(true);
    });

    test('OpenClaw exports registerSkill', async () => {
      const src = readFileSync(join(ROOT_DIR, 'products/openclaw/src/index.ts'), 'utf-8');
      expect(src).toContain('registerSkill');
    });
  });
});
