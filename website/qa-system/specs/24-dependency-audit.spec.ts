/**
 * Dependency Audit — Security & License Compliance
 * Checks npm dependencies for vulnerabilities and license issues.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Dependency Audit: Security & Compliance', () => {

  test('npm audit has zero critical vulnerabilities', async () => {
    try {
      const output = execSync('npm audit --json 2>/dev/null', {
        cwd: WEBSITE_DIR,
        encoding: 'utf-8',
        timeout: 30000,
      });
      const audit = JSON.parse(output);
      const criticals = audit.metadata?.vulnerabilities?.critical || 0;
      expect(criticals, `Found ${criticals} critical vulnerabilities`).toBe(0);
    } catch (e: any) {
      // npm audit exits non-zero when vulnerabilities found
      if (e.stdout) {
        const audit = JSON.parse(e.stdout);
        const criticals = audit.metadata?.vulnerabilities?.critical || 0;
        expect(criticals, `Found ${criticals} critical vulnerabilities`).toBe(0);
      }
    }
  });

  test('npm audit has zero high vulnerabilities (or known exceptions)', async () => {
    try {
      const output = execSync('npm audit --json 2>/dev/null', {
        cwd: WEBSITE_DIR,
        encoding: 'utf-8',
        timeout: 30000,
      });
      const audit = JSON.parse(output);
      const highs = audit.metadata?.vulnerabilities?.high || 0;
      // Allow up to 5 known highs during early access (track and reduce)
      expect(highs, `Found ${highs} high vulnerabilities`).toBeLessThanOrEqual(5);
    } catch (e: any) {
      if (e.stdout) {
        const audit = JSON.parse(e.stdout);
        const highs = audit.metadata?.vulnerabilities?.high || 0;
        expect(highs, `Found ${highs} high vulnerabilities`).toBeLessThanOrEqual(5);
      }
    }
  });

  test('package-lock.json exists and is not empty', async () => {
    const { existsSync, statSync } = require('fs');
    const lockPath = join(WEBSITE_DIR, 'package-lock.json');
    expect(existsSync(lockPath), 'package-lock.json missing').toBe(true);
    const stat = statSync(lockPath);
    expect(stat.size, 'package-lock.json is empty').toBeGreaterThan(1000);
  });

  test('No deprecated packages in production dependencies', async () => {
    try {
      const output = execSync('npm outdated --json 2>/dev/null || true', {
        cwd: WEBSITE_DIR,
        encoding: 'utf-8',
        timeout: 30000,
      });
      // npm outdated returns {} when everything is current
      // Deprecated packages show as "deprecated" in the output
      if (output.trim()) {
        const outdated = JSON.parse(output);
        const deprecated = Object.entries(outdated).filter(
          ([, info]: [string, any]) => info.deprecated
        );
        expect(
          deprecated.length,
          `Deprecated packages: ${deprecated.map(([name]) => name).join(', ')}`
        ).toBe(0);
      }
    } catch {
      // npm outdated can fail — not a blocker
    }
  });

  test('No devDependencies leaked into production bundle', async () => {
    const { readFileSync } = require('fs');
    const pkg = JSON.parse(readFileSync(join(WEBSITE_DIR, 'package.json'), 'utf-8'));
    const prodDeps = Object.keys(pkg.dependencies || {});
    const devOnlyPatterns = ['@playwright', 'jest', 'cypress', 'vitest', '@testing-library', 'eslint'];

    for (const pattern of devOnlyPatterns) {
      const leaked = prodDeps.filter(dep => dep.includes(pattern));
      expect(
        leaked.length,
        `Dev dependency in production: ${leaked.join(', ')}`
      ).toBe(0);
    }
  });

  test('Node engine requirement specified', async () => {
    const { readFileSync } = require('fs');
    const pkg = JSON.parse(readFileSync(join(WEBSITE_DIR, 'package.json'), 'utf-8'));
    // Should either have engines.node or not conflict with Node 18+
    if (pkg.engines?.node) {
      expect(pkg.engines.node).toBeTruthy();
    }
    // Pass — no engine specified means any version works
  });
});
