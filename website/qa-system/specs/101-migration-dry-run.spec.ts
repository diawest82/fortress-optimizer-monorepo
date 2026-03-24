/**
 * Migration Dry Run — verify Prisma schema is valid and migrations exist
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');

test.describe('Migration Dry Run', () => {

  test('Prisma schema exists and is valid', () => {
    const file = join(WEBSITE_DIR, 'prisma/schema.prisma');
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('datasource db');
    expect(content).toContain('generator client');
    expect(content).toContain('model User');
  });

  test('Prisma schema has all required models', () => {
    const file = join(WEBSITE_DIR, 'prisma/schema.prisma');
    const content = readFileSync(file, 'utf-8');
    const requiredModels = ['User', 'Team', 'SupportTicket', 'Email', 'Event', 'TokenCountUsage'];
    for (const model of requiredModels) {
      expect(content, `Missing model: ${model}`).toContain(`model ${model}`);
    }
  });

  test('Migration directory exists', () => {
    const dir = join(WEBSITE_DIR, 'prisma/migrations');
    expect(existsSync(dir), 'prisma/migrations directory missing').toBe(true);
  });

  test('At least one migration file exists', () => {
    const dir = join(WEBSITE_DIR, 'prisma/migrations');
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir);
    const migrations = entries.filter(e => !e.startsWith('.') && e !== 'migration_lock.toml');
    expect(migrations.length, 'No migration files found').toBeGreaterThan(0);
  });

  test('User model has required fields', () => {
    const file = join(WEBSITE_DIR, 'prisma/schema.prisma');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/model User[\s\S]*?email\s+String/);
    expect(content).toMatch(/model User[\s\S]*?password\s+String/);
    expect(content).toMatch(/model User[\s\S]*?role\s+String/);
  });

  test('Team model has owner relation', () => {
    const file = join(WEBSITE_DIR, 'prisma/schema.prisma');
    const content = readFileSync(file, 'utf-8');
    expect(content).toMatch(/model Team[\s\S]*?ownerId/);
    expect(content).toMatch(/model Team[\s\S]*?members/);
  });
});
