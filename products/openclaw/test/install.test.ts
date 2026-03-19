/**
 * Phase 2: Install Simulation Tests
 * Validates that ClawHub can discover and load the skill
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Install Simulation', () => {
  it('should export registerSkill function', () => {
    const { registerSkill } = require('../src/index');
    expect(typeof registerSkill).toBe('function');
  });

  it('should have SKILL.md name matching package name pattern', () => {
    const skillContent = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    const nameMatch = skillContent.match(/name:\s*(.+)/);
    expect(nameMatch).not.toBeNull();

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    // SKILL.md name: fortress-optimizer, package: @fortress-optimizer/openclaw-skill
    // Both should contain "fortress-optimizer"
    expect(pkg.name).toContain('fortress-optimizer');
    expect(nameMatch![1].trim()).toContain('fortress-optimizer');
  });

  it('registerSkill() should return object with contextEngine', () => {
    const { registerSkill } = require('../src/index');
    const skill = registerSkill({ apiKey: 'fk_test_install_key_12345' });
    expect(skill.contextEngine).toBeDefined();
    expect(typeof skill.contextEngine.bootstrap).toBe('function');
    expect(typeof skill.contextEngine.ingest).toBe('function');
    expect(typeof skill.contextEngine.assemble).toBe('function');
    expect(typeof skill.contextEngine.compact).toBe('function');
    expect(typeof skill.contextEngine.afterTurn).toBe('function');
    expect(typeof skill.contextEngine.dispose).toBe('function');
  });

  it('registerSkill() should return object with hooks', () => {
    const { registerSkill } = require('../src/index');
    const skill = registerSkill({ apiKey: 'fk_test_install_key_12345' });
    expect(skill.hooks).toBeDefined();
    expect(typeof skill.hooks['before-tool-call']).toBe('function');
  });

  it('SKILL.md should have configuration section with FORTRESS_API_KEY', () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    expect(content).toMatch(/FORTRESS_API_KEY/);
    expect(content).toMatch(/required:\s*true/);
  });
});
