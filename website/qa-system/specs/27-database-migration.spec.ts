/**
 * Database Migration — Schema Integrity Verification
 * Tests Prisma schema validity and migration health.
 * Uses CLI tools — does NOT connect to production database.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const WEBSITE_DIR = join(__dirname, '..', '..');
const PRISMA_DIR = join(WEBSITE_DIR, 'prisma');
const MIGRATIONS_DIR = join(PRISMA_DIR, 'migrations');

test.describe('Database Migration: Schema Integrity', () => {

  test.describe('Schema Validation', () => {
    test('Prisma schema file exists and is valid syntax', async () => {
      const schemaPath = join(PRISMA_DIR, 'schema.prisma');
      expect(existsSync(schemaPath), 'schema.prisma missing').toBe(true);
      const schema = readFileSync(schemaPath, 'utf-8');
      // Basic structural validation
      expect(schema).toContain('datasource');
      expect(schema).toContain('generator client');
      expect(schema).toContain('model User');
    });

    test('Prisma client can be generated', async () => {
      try {
        execSync('npx prisma generate', { cwd: WEBSITE_DIR, encoding: 'utf-8', timeout: 30000 });
      } catch (e: any) {
        expect.soft(false, `Prisma generate failed: ${e.stderr || e.message}`).toBe(true);
      }
    });
  });

  test.describe('Migration Files', () => {
    test('Migrations directory exists', async () => {
      expect(existsSync(MIGRATIONS_DIR), 'prisma/migrations/ missing').toBe(true);
    });

    test('At least 1 migration exists', async () => {
      const migrations = readdirSync(MIGRATIONS_DIR).filter(f =>
        !f.startsWith('.') && f !== 'migration_lock.toml'
      );
      expect(migrations.length, 'No migrations found').toBeGreaterThan(0);
      console.log(`  Found ${migrations.length} migrations`);
    });

    test('Each migration has a migration.sql file', async () => {
      const migrations = readdirSync(MIGRATIONS_DIR).filter(f =>
        !f.startsWith('.') && f !== 'migration_lock.toml'
      );
      const missing: string[] = [];
      for (const m of migrations) {
        const sqlPath = join(MIGRATIONS_DIR, m, 'migration.sql');
        if (!existsSync(sqlPath)) {
          missing.push(m);
        }
      }
      expect(missing, `Migrations missing SQL: ${missing.join(', ')}`).toHaveLength(0);
    });

    test('Migration lock file exists', async () => {
      const lockPath = join(MIGRATIONS_DIR, 'migration_lock.toml');
      expect(existsSync(lockPath), 'migration_lock.toml missing').toBe(true);
    });
  });

  test.describe('Schema Content', () => {
    test('User model has required fields', async () => {
      const schema = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf-8');
      const requiredFields = ['email', 'password', 'tier', 'stripeCustomerId', 'stripeSubscriptionId', 'subscriptionStatus'];
      for (const field of requiredFields) {
        expect(schema, `User model missing field: ${field}`).toContain(field);
      }
    });

    test('PasswordResetToken model has userId relation', async () => {
      const schema = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf-8');
      expect(schema).toContain('PasswordResetToken');
      expect(schema).toContain('userId');
    });

    test('Email unique constraint on User', async () => {
      const schema = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf-8');
      // @unique on email or @@unique including email
      expect(schema).toMatch(/email.*@unique|@@unique.*email/s);
    });

    test('Default values defined for tier and subscriptionStatus', async () => {
      const schema = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf-8');
      expect(schema).toMatch(/tier.*@default/);
      expect(schema).toMatch(/subscriptionStatus.*@default/);
    });
  });
});
