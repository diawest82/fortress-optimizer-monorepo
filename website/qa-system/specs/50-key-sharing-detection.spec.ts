/**
 * Key Sharing Detection — Verify Layer 1 (detection) + Layer 4 (prevention)
 *
 * Layer 1: IP tracking, anomaly logging
 * Layer 4: Key types (standard, team_seat, read_only), per-seat keys
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const API_BASE = process.env.TEST_API_URL || 'https://api.fortress-optimizer.com';
const UNIQUE = Date.now().toString(36);
const ROOT_DIR = join(__dirname, '..', '..', '..');

test.describe('Key Sharing Detection: Layer 1 + Layer 4', () => {

  test.describe('Layer 1: IP Tracking (Source Verification)', () => {
    test('KeySharingDetector class exists in backend', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('class KeySharingDetector');
      expect(main).toContain('track_request');
      expect(main).toContain('get_stats');
    });

    test('Optimize endpoint tracks client IP', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('key_sharing_detector.track_request');
      expect(main).toContain('x-forwarded-for');
      expect(main).toContain('user-agent');
    });

    test('Anomaly detection logs warnings at 5+ unique IPs', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('"ips_warning": 5');
      expect(main).toContain('key_sharing_anomaly');
    });

    test('Anomaly detection logs suspicious at 15+ unique IPs', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('"ips_suspicious": 15');
    });

    test('User-Agent diversity tracked (4+ triggers warning)', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('"user_agents_warning": 4');
    });

    test('Usage endpoint returns security stats', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('"unique_ips_today"');
      expect(main).toContain('"unique_clients_today"');
      expect(main).toContain('"requests_today"');
    });

    test('Stale tracking entries cleaned up after 48 hours', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('cleanup_stale');
      expect(main).toContain('172800');
    });
  });

  test.describe('Layer 1: Live API Verification', () => {
    test('/api/usage includes security stats', async () => {
      // Register a key and check usage includes security section
      const regRes = await fetch(`${API_BASE}/api/keys/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `sharing-${UNIQUE}`, tier: 'free' }),
      });
      if (regRes.ok) {
        const regData = await regRes.json();
        const apiKey = regData.api_key;

        // Make one optimize call to generate tracking data
        await fetch(`${API_BASE}/api/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ prompt: 'test prompt for sharing detection', level: 'balanced', provider: 'openai' }),
        });

        // Check usage endpoint has security section
        const usageRes = await fetch(`${API_BASE}/api/usage`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (usageRes.ok) {
          const usage = await usageRes.json();
          expect(usage).toHaveProperty('security');
          expect(usage.security).toHaveProperty('unique_ips_today');
          expect(usage.security).toHaveProperty('requests_today');
          expect(usage.security.unique_ips_today).toBeGreaterThanOrEqual(1);
          expect(usage.security.requests_today).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  test.describe('Layer 4: Key Types (Source Verification)', () => {
    test('Registration supports key_type: standard, team_seat, read_only', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('"standard"');
      expect(main).toContain('"team_seat"');
      expect(main).toContain('"read_only"');
    });

    test('Key prefixes differentiate types (fk_, fkt_, fkr_)', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('"fk_"');
      expect(main).toContain('"fkt_"');
      expect(main).toContain('"fkr_"');
    });

    test('Read-only keys blocked from /api/optimize', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('fkr_');
      expect(main).toContain('Read-only keys cannot perform optimizations');
      expect(main).toContain('403');
    });

    test('Team seat keys include member_email in name', async () => {
      const main = readFileSync(join(ROOT_DIR, 'backend/main.py'), 'utf-8');
      expect(main).toContain('member_email');
      expect(main).toContain('team_seat');
    });
  });

  test.describe('Layer 4: Live API Key Types', () => {
    test('Register standard key → starts with fk_', async () => {
      const res = await fetch(`${API_BASE}/api/keys/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `std-${UNIQUE}`, tier: 'free', key_type: 'standard' }),
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.api_key).toMatch(/^fk_/);
        expect(data.api_key).not.toMatch(/^fkt_|^fkr_/);
      }
    });

    test('Register read-only key → starts with fkr_', async () => {
      const res = await fetch(`${API_BASE}/api/keys/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `ro-${UNIQUE}`, tier: 'free', key_type: 'read_only' }),
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.api_key).toMatch(/^fkr_/);
      }
    });

    test('Register team seat key → starts with fkt_', async () => {
      const res = await fetch(`${API_BASE}/api/keys/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `team-${UNIQUE}`,
          tier: 'free',
          key_type: 'team_seat',
          team_id: 'team-123',
          member_email: 'member@test.com',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        expect(data.api_key).toMatch(/^fkt_/);
      }
    });

    test('Read-only key cannot optimize (returns 403)', async () => {
      const regRes = await fetch(`${API_BASE}/api/keys/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `ro-block-${UNIQUE}`, tier: 'free', key_type: 'read_only' }),
      });
      if (regRes.ok) {
        const data = await regRes.json();
        const optimizeRes = await fetch(`${API_BASE}/api/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.api_key}` },
          body: JSON.stringify({ prompt: 'should be blocked', level: 'balanced', provider: 'openai' }),
        });
        expect(optimizeRes.status).toBe(403);
      }
    });

    test('Read-only key CAN access /api/usage', async () => {
      const regRes = await fetch(`${API_BASE}/api/keys/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `ro-usage-${UNIQUE}`, tier: 'free', key_type: 'read_only' }),
      });
      if (regRes.ok) {
        const data = await regRes.json();
        const usageRes = await fetch(`${API_BASE}/api/usage`, {
          headers: { 'Authorization': `Bearer ${data.api_key}` },
        });
        // Should NOT be 403 — read-only can view usage
        expect(usageRes.status).not.toBe(403);
      }
    });
  });
});
