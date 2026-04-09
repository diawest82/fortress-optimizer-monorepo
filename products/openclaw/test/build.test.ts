/**
 * Phase 1: Build Verification Tests
 * Validates scaffolding, compilation, and packaging correctness
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..');

describe('Build Verification', () => {
  describe('SKILL.md manifest', () => {
    const skillPath = path.join(ROOT, 'SKILL.md');
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(skillPath, 'utf-8');
    });

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should contain required frontmatter fields', () => {
      expect(content).toMatch(/^---/);
      expect(content).toMatch(/name:\s*fortress-optimizer/);
      expect(content).toMatch(/description:/);
      expect(content).toMatch(/version:\s*\d+\.\d+\.\d+/);
      expect(content).toMatch(/entry:\s*dist\/index\.js/);
    });

    it('should have entry pointing to a buildable file', () => {
      // The entry is dist/index.js which is built from src/index.ts
      const srcEntry = path.join(ROOT, 'src', 'index.ts');
      expect(fs.existsSync(srcEntry)).toBe(true);
    });

    it('should have Usage and Configuration sections', () => {
      expect(content).toMatch(/## Usage/);
      expect(content).toMatch(/## Configuration/);
    });
  });

  describe('package.json', () => {
    let pkg: any;

    beforeAll(() => {
      pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    });

    it('should have correct package name', () => {
      expect(pkg.name).toBe('@diawest82/openclaw-skill');
    });

    it('should have build and test scripts', () => {
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
    });

    it('should not depend on axios', () => {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      };
      expect(allDeps.axios).toBeUndefined();
    });

    it('should require node >= 22', () => {
      expect(pkg.engines?.node).toMatch(/>=\s*22/);
    });

    it('should have correct exports field', () => {
      expect(pkg.exports['.']).toEqual({
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.js',
      });
    });
  });

  describe('TypeScript compilation', () => {
    it('should compile without errors', () => {
      expect(() => {
        execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    });

    it('should produce dist/index.js and dist/index.d.ts after build', () => {
      execSync('npx tsc', { cwd: ROOT, stdio: 'pipe' });
      expect(fs.existsSync(path.join(ROOT, 'dist', 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(ROOT, 'dist', 'index.d.ts'))).toBe(true);
    });
  });
});
