// Fortress Token Optimizer — Desktop App Tests
//
// These tests exercise the IPC handler logic and API client behaviour
// without requiring a running Electron instance. They mock axios and
// electron-store so the handler functions can be tested in isolation.

import axios from 'axios';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Minimal in-memory mock for electron-store */
class MockStore {
  private data: Record<string, unknown> = {};
  get(key: string) {
    return this.data[key];
  }
  set(key: string, value: unknown) {
    this.data[key] = value;
  }
  get store() {
    return { ...this.data };
  }
  clear() {
    this.data = {};
  }
}

/** Helper to build a fake axios response */
function fakeAxiosResponse(data: unknown, status = 200) {
  return Promise.resolve({ data, status, statusText: 'OK', headers: {}, config: {} });
}

/** Helper to build a fake axios error */
function fakeAxiosError(message: string, status = 500, responseData?: unknown) {
  const err: any = new Error(message);
  if (responseData) {
    err.response = { data: responseData, status };
  }
  return Promise.reject(err);
}

// ---------------------------------------------------------------------------
// Simulated handler logic (mirrors main.ts without Electron dependencies)
// ---------------------------------------------------------------------------

const API_BASE = 'https://api.fortress-optimizer.com';

function getAuthHeaders(store: MockStore): Record<string, string> {
  const apiKey = store.get('api_key') as string;
  if (!apiKey) throw new Error('API key not configured. Open Settings to add your key.');
  return { Authorization: `Bearer ${apiKey}` };
}

async function handleOptimize(
  store: MockStore,
  args: { prompt: string; level: string; provider: string },
  httpPost: typeof axios.post = axios.post
) {
  const { prompt, level, provider } = args;
  const response = await httpPost(
    `${API_BASE}/api/optimize`,
    { prompt, level, provider },
    { headers: getAuthHeaders(store), timeout: 15000 }
  );
  return response.data;
}

async function handleGetUsage(
  store: MockStore,
  httpGet: typeof axios.get = axios.get
) {
  const response = await httpGet(`${API_BASE}/api/usage`, {
    headers: getAuthHeaders(store),
    timeout: 5000,
  });
  return response.data;
}

function handleSaveSettings(store: MockStore, settings: Record<string, unknown>) {
  Object.entries(settings).forEach(([key, value]) => store.set(key, value));
  return { success: true };
}

function handleGetSettings(store: MockStore) {
  return {
    api_key: (store.get('api_key') as string) || '',
    provider: (store.get('provider') as string) || 'openai',
    optimization_level: (store.get('optimization_level') as string) || 'balanced',
  };
}

// ---------------------------------------------------------------------------
// Test runner (zero-dependency)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e: any) {
    failed++;
    const msg = e?.message || String(e);
    failures.push(`${name}: ${msg}`);
    console.error(`  FAIL  ${name} — ${msg}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function assertEqual(actual: unknown, expected: unknown, label = '') {
  if (actual !== expected)
    throw new Error(`${label ? label + ': ' : ''}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('\nFortress Token Optimizer — Test Suite\n');

  // ---- MockStore ----------------------------------------------------------

  await test('MockStore: set and get values', () => {
    const s = new MockStore();
    s.set('key', 'value');
    assertEqual(s.get('key'), 'value');
  });

  await test('MockStore: returns undefined for missing keys', () => {
    const s = new MockStore();
    assertEqual(s.get('missing'), undefined);
  });

  await test('MockStore: .store returns shallow copy', () => {
    const s = new MockStore();
    s.set('a', 1);
    const copy = s.store;
    assertEqual(copy.a, 1);
    s.set('a', 2);
    assertEqual(copy.a, 1, 'should be a snapshot');
  });

  await test('MockStore: clear resets all data', () => {
    const s = new MockStore();
    s.set('x', 10);
    s.clear();
    assertEqual(s.get('x'), undefined);
  });

  // ---- Auth headers -------------------------------------------------------

  await test('getAuthHeaders: throws when no API key', () => {
    const s = new MockStore();
    let threw = false;
    try { getAuthHeaders(s); } catch { threw = true; }
    assert(threw, 'should throw without API key');
  });

  await test('getAuthHeaders: returns Bearer token', () => {
    const s = new MockStore();
    s.set('api_key', 'fort-test123');
    const h = getAuthHeaders(s);
    assertEqual(h.Authorization, 'Bearer fort-test123');
  });

  // ---- handleOptimize -----------------------------------------------------

  await test('handleOptimize: sends correct payload and returns data', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-abc');

    const mockPost: any = (_url: string, body: any, config: any) => {
      assertEqual(body.prompt, 'hello world');
      assertEqual(body.level, 'balanced');
      assertEqual(body.provider, 'openai');
      assert(config.headers.Authorization === 'Bearer fort-abc', 'auth header');
      return fakeAxiosResponse({
        request_id: 'r1',
        status: 'success',
        optimization: { optimized_prompt: 'hi', technique: 'compression' },
        tokens: { original: 10, optimized: 5, savings: 5, savings_percentage: 50 },
      });
    };

    const result = await handleOptimize(s, { prompt: 'hello world', level: 'balanced', provider: 'openai' }, mockPost);
    assertEqual(result.status, 'success');
    assertEqual(result.optimization.optimized_prompt, 'hi');
    assertEqual(result.tokens.savings, 5);
  });

  await test('handleOptimize: propagates HTTP errors', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-abc');

    const mockPost: any = () => fakeAxiosError('timeout', 408);
    let threw = false;
    try {
      await handleOptimize(s, { prompt: 'test', level: 'aggressive', provider: 'openai' }, mockPost);
    } catch {
      threw = true;
    }
    assert(threw, 'should throw on HTTP error');
  });

  await test('handleOptimize: throws when no API key configured', async () => {
    const s = new MockStore();
    let threw = false;
    try {
      await handleOptimize(s, { prompt: 'test', level: 'balanced', provider: 'openai' });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('API key'), 'error mentions API key');
    }
    assert(threw, 'should throw');
  });

  await test('handleOptimize: passes aggressive level correctly', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-key');
    let receivedLevel = '';
    const mockPost: any = (_: any, body: any) => {
      receivedLevel = body.level;
      return fakeAxiosResponse({ status: 'success', optimization: {}, tokens: {} });
    };
    await handleOptimize(s, { prompt: 'x', level: 'aggressive', provider: 'openai' }, mockPost);
    assertEqual(receivedLevel, 'aggressive');
  });

  await test('handleOptimize: passes provider through', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-key');
    let receivedProvider = '';
    const mockPost: any = (_: any, body: any) => {
      receivedProvider = body.provider;
      return fakeAxiosResponse({ status: 'success', optimization: {}, tokens: {} });
    };
    await handleOptimize(s, { prompt: 'x', level: 'balanced', provider: 'anthropic' }, mockPost);
    assertEqual(receivedProvider, 'anthropic');
  });

  await test('handleOptimize: hits correct URL', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-key');
    let hitUrl = '';
    const mockPost: any = (url: string) => {
      hitUrl = url;
      return fakeAxiosResponse({ status: 'success', optimization: {}, tokens: {} });
    };
    await handleOptimize(s, { prompt: 'x', level: 'balanced', provider: 'openai' }, mockPost);
    assertEqual(hitUrl, 'https://api.fortress-optimizer.com/api/optimize');
  });

  // ---- handleGetUsage -----------------------------------------------------

  await test('handleGetUsage: returns usage data', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-abc');

    const mockGet: any = (_url: string, config: any) => {
      assert(config.headers.Authorization === 'Bearer fort-abc', 'auth header');
      return fakeAxiosResponse({
        tier: 'pro',
        tokens_optimized: 50000,
        tokens_saved: 12000,
        requests: 150,
        tokens_limit: 100000,
        tokens_remaining: 50000,
        rate_limit: 60,
        reset_date: '2026-04-01',
      });
    };

    const data = await handleGetUsage(s, mockGet);
    assertEqual(data.tier, 'pro');
    assertEqual(data.tokens_saved, 12000);
    assertEqual(data.tokens_remaining, 50000);
    assertEqual(data.rate_limit, 60);
  });

  await test('handleGetUsage: throws without API key', async () => {
    const s = new MockStore();
    let threw = false;
    try { await handleGetUsage(s); } catch { threw = true; }
    assert(threw, 'should throw');
  });

  await test('handleGetUsage: hits correct URL', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-key');
    let hitUrl = '';
    const mockGet: any = (url: string) => {
      hitUrl = url;
      return fakeAxiosResponse({ tier: 'free' });
    };
    await handleGetUsage(s, mockGet);
    assertEqual(hitUrl, 'https://api.fortress-optimizer.com/api/usage');
  });

  await test('handleGetUsage: propagates server errors', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-key');
    const mockGet: any = () => fakeAxiosError('Server Error', 500, { message: 'Internal' });
    let threw = false;
    try { await handleGetUsage(s, mockGet); } catch { threw = true; }
    assert(threw, 'should throw on server error');
  });

  // ---- handleSaveSettings -------------------------------------------------

  await test('handleSaveSettings: saves all key-value pairs', () => {
    const s = new MockStore();
    const result = handleSaveSettings(s, { api_key: 'fort-new', provider: 'anthropic' });
    assertEqual(result.success, true);
    assertEqual(s.get('api_key'), 'fort-new');
    assertEqual(s.get('provider'), 'anthropic');
  });

  await test('handleSaveSettings: overwrites existing values', () => {
    const s = new MockStore();
    s.set('api_key', 'old');
    handleSaveSettings(s, { api_key: 'new' });
    assertEqual(s.get('api_key'), 'new');
  });

  await test('handleSaveSettings: handles empty object', () => {
    const s = new MockStore();
    s.set('api_key', 'keep');
    handleSaveSettings(s, {});
    assertEqual(s.get('api_key'), 'keep');
  });

  // ---- handleGetSettings --------------------------------------------------

  await test('handleGetSettings: returns defaults when empty', () => {
    const s = new MockStore();
    const settings = handleGetSettings(s);
    assertEqual(settings.api_key, '');
    assertEqual(settings.provider, 'openai');
    assertEqual(settings.optimization_level, 'balanced');
  });

  await test('handleGetSettings: returns stored values', () => {
    const s = new MockStore();
    s.set('api_key', 'fort-xyz');
    s.set('provider', 'google');
    s.set('optimization_level', 'aggressive');
    const settings = handleGetSettings(s);
    assertEqual(settings.api_key, 'fort-xyz');
    assertEqual(settings.provider, 'google');
    assertEqual(settings.optimization_level, 'aggressive');
  });

  await test('handleGetSettings: uses defaults for missing keys only', () => {
    const s = new MockStore();
    s.set('api_key', 'fort-partial');
    const settings = handleGetSettings(s);
    assertEqual(settings.api_key, 'fort-partial');
    assertEqual(settings.provider, 'openai');
    assertEqual(settings.optimization_level, 'balanced');
  });

  // ---- Integration: save then get -----------------------------------------

  await test('Integration: saveSettings then getSettings round-trip', () => {
    const s = new MockStore();
    handleSaveSettings(s, { api_key: 'fort-rt', provider: 'anthropic', optimization_level: 'conservative' });
    const settings = handleGetSettings(s);
    assertEqual(settings.api_key, 'fort-rt');
    assertEqual(settings.provider, 'anthropic');
    assertEqual(settings.optimization_level, 'conservative');
  });

  await test('Integration: optimize after saving API key', async () => {
    const s = new MockStore();
    // Before saving — should fail
    let threw = false;
    try {
      await handleOptimize(s, { prompt: 'x', level: 'balanced', provider: 'openai' });
    } catch { threw = true; }
    assert(threw, 'should fail without key');

    // Save key, then optimize
    handleSaveSettings(s, { api_key: 'fort-saved' });
    const mockPost: any = () =>
      fakeAxiosResponse({ status: 'success', optimization: { optimized_prompt: 'ok', technique: 't' }, tokens: { original: 5, optimized: 3, savings: 2, savings_percentage: 40 } });
    const result = await handleOptimize(s, { prompt: 'test', level: 'balanced', provider: 'openai' }, mockPost);
    assertEqual(result.status, 'success');
  });

  // ---- Response shape validation ------------------------------------------

  await test('Optimize response contains required fields', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-key');
    const mockPost: any = () =>
      fakeAxiosResponse({
        request_id: 'abc',
        status: 'success',
        optimization: { optimized_prompt: 'shorter', technique: 'dedup' },
        tokens: { original: 100, optimized: 70, savings: 30, savings_percentage: 30 },
      });
    const r = await handleOptimize(s, { prompt: 'long text', level: 'balanced', provider: 'openai' }, mockPost);
    assert('request_id' in r, 'has request_id');
    assert('optimization' in r, 'has optimization');
    assert('tokens' in r, 'has tokens');
    assert('optimized_prompt' in r.optimization, 'has optimized_prompt');
    assert('technique' in r.optimization, 'has technique');
    assert('savings_percentage' in r.tokens, 'has savings_percentage');
  });

  await test('Usage response contains required fields', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-key');
    const mockGet: any = () =>
      fakeAxiosResponse({
        tier: 'enterprise',
        tokens_optimized: 500000,
        tokens_saved: 120000,
        requests: 2000,
        tokens_limit: 1000000,
        tokens_remaining: 500000,
        rate_limit: 120,
        reset_date: '2026-04-01',
      });
    const u = await handleGetUsage(s, mockGet);
    for (const field of ['tier', 'tokens_optimized', 'tokens_saved', 'requests', 'tokens_limit', 'tokens_remaining', 'rate_limit', 'reset_date']) {
      assert(field in u, `has ${field}`);
    }
  });

  // ---- Edge cases ---------------------------------------------------------

  await test('handleOptimize: handles empty prompt without crash', async () => {
    const s = new MockStore();
    s.set('api_key', 'fort-key');
    const mockPost: any = (_: any, body: any) => {
      assertEqual(body.prompt, '');
      return fakeAxiosResponse({ status: 'success', optimization: { optimized_prompt: '', technique: 'none' }, tokens: { original: 0, optimized: 0, savings: 0, savings_percentage: 0 } });
    };
    const r = await handleOptimize(s, { prompt: '', level: 'balanced', provider: 'openai' }, mockPost);
    assertEqual(r.tokens.savings, 0);
  });

  await test('handleSaveSettings: handles non-string values', () => {
    const s = new MockStore();
    handleSaveSettings(s, { history_size: 1000, auto_optimize: true });
    assertEqual(s.get('history_size'), 1000);
    assertEqual(s.get('auto_optimize'), true);
  });

  await test('API_BASE constant is correct', () => {
    assertEqual(API_BASE, 'https://api.fortress-optimizer.com');
  });

  // ---- Summary ------------------------------------------------------------

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
