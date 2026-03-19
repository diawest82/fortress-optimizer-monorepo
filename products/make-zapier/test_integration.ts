/**
 * Fortress Token Optimizer — Make.com & Zapier Integration Tests
 *
 * Validates that zapier-app.json and make-module.json have correct schemas,
 * match the backend API contract, and handle edge cases properly.
 *
 * Run:  npx jest test_integration.ts  (or ts-jest / vitest)
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_DIR = __dirname;
const loadJSON = (file: string): any =>
  JSON.parse(fs.readFileSync(path.join(BASE_DIR, file), 'utf-8'));

// Canonical values the configs MUST agree with
const API_BASE_URL = 'https://api.fortress-optimizer.com';
const OPTIMIZE_PATH = '/api/optimize';
const USAGE_PATH = '/api/usage';

const VALID_LEVELS = ['conservative', 'balanced', 'aggressive'];
const VALID_PROVIDERS = ['openai', 'anthropic', 'azure', 'gemini', 'groq', 'ollama'];

// Backend POST /api/optimize response shape
interface OptimizeResponse {
  request_id: string;
  status: string;
  optimization: {
    optimized_prompt: string;
    technique: string;
  };
  tokens: {
    original: number;
    optimized: number;
    savings: number;
    savings_percentage: number;
  };
  timestamp: string;
}

// A mock successful API response used for field-mapping checks
const MOCK_OPTIMIZE_RESPONSE: OptimizeResponse = {
  request_id: 'req_test_001',
  status: 'success',
  optimization: {
    optimized_prompt: 'Summarize document key points',
    technique: 'semantic_compression',
  },
  tokens: {
    original: 150,
    optimized: 120,
    savings: 30,
    savings_percentage: 20.0,
  },
  timestamp: '2026-03-08T12:00:00Z',
};

// ===========================================================================
// ZAPIER APP JSON TESTS
// ===========================================================================

describe('Zapier App Configuration (zapier-app.json)', () => {
  let zapier: any;

  beforeAll(() => {
    zapier = loadJSON('zapier-app.json');
  });

  // ---- Top-level required fields ----

  describe('Top-level schema', () => {
    it('has a version string', () => {
      expect(zapier.version).toBeDefined();
      expect(typeof zapier.version).toBe('string');
      expect(zapier.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('has a non-empty name', () => {
      expect(zapier.name).toBeDefined();
      expect(zapier.name.length).toBeGreaterThan(0);
    });

    it('has a non-empty description', () => {
      expect(zapier.description).toBeDefined();
      expect(zapier.description.length).toBeGreaterThan(0);
    });

    it('has zapier platform config', () => {
      expect(zapier.zapier).toBeDefined();
      expect(zapier.zapier.version).toBeDefined();
      expect(zapier.zapier.platformVersion).toBeDefined();
    });
  });

  // ---- Authentication ----

  describe('Authentication', () => {
    it('defines authentication block', () => {
      expect(zapier.authentication).toBeDefined();
    });

    it('has type "custom"', () => {
      expect(zapier.authentication.type).toBe('custom');
    });

    it('requires an api_key field', () => {
      const fields = zapier.authentication.fields;
      expect(Array.isArray(fields)).toBe(true);
      const apiKeyField = fields.find((f: any) => f.key === 'api_key');
      expect(apiKeyField).toBeDefined();
      expect(apiKeyField.required).toBe(true);
    });

    it('has a test request pointing to /api/usage', () => {
      const test = zapier.authentication.test;
      expect(test).toBeDefined();
      expect(test.url).toBe(`${API_BASE_URL}${USAGE_PATH}`);
      expect(test.method).toBe('GET');
    });

    it('test request uses Bearer token auth', () => {
      const headers = zapier.authentication.test.headers;
      expect(headers.Authorization).toContain('Bearer');
    });
  });

  // ---- Creates: Optimize Prompt ----

  describe('Create Action — Optimize Prompt', () => {
    let action: any;

    beforeAll(() => {
      action = zapier.creates?.create_optimization;
    });

    it('exists', () => {
      expect(action).toBeDefined();
    });

    it('has display label and description', () => {
      expect(action.display.label).toBeDefined();
      expect(action.display.description).toBeDefined();
    });

    it('is not hidden', () => {
      expect(action.display.hidden).toBe(false);
    });

    // -- Operation --

    describe('Operation', () => {
      it('POSTs to the correct optimize URL', () => {
        const op = action.operation.perform;
        expect(op.url).toBe(`${API_BASE_URL}${OPTIMIZE_PATH}`);
        expect(op.method).toBe('POST');
      });

      it('sends Authorization Bearer header', () => {
        const headers = action.operation.perform.headers;
        expect(headers.Authorization).toContain('Bearer');
      });

      it('sends Content-Type application/json', () => {
        const headers = action.operation.perform.headers;
        expect(headers['Content-Type']).toBe('application/json');
      });

      it('body includes prompt, level, and provider', () => {
        const body = action.operation.perform.body;
        expect(body).toHaveProperty('prompt');
        expect(body).toHaveProperty('level');
        expect(body).toHaveProperty('provider');
      });
    });

    // -- Input Fields --

    describe('Input Fields', () => {
      it('prompt field is required text', () => {
        const prompt = action.inputFields.find((f: any) => f.key === 'prompt');
        expect(prompt).toBeDefined();
        expect(prompt.required).toBe(true);
        expect(prompt.type).toBe('text');
      });

      it('level field offers exactly the valid optimization levels', () => {
        const level = action.inputFields.find((f: any) => f.key === 'level');
        expect(level).toBeDefined();
        const choiceKeys = Object.keys(level.choices);
        expect(choiceKeys.sort()).toEqual([...VALID_LEVELS].sort());
      });

      it('level defaults to balanced', () => {
        const level = action.inputFields.find((f: any) => f.key === 'level');
        expect(level.default).toBe('balanced');
      });

      it('provider field offers all valid providers including ollama', () => {
        const provider = action.inputFields.find((f: any) => f.key === 'provider');
        expect(provider).toBeDefined();
        const choiceKeys = Object.keys(provider.choices);
        expect(choiceKeys.sort()).toEqual([...VALID_PROVIDERS].sort());
      });

      it('provider defaults to openai', () => {
        const provider = action.inputFields.find((f: any) => f.key === 'provider');
        expect(provider.default).toBe('openai');
      });
    });

    // -- Output Fields --

    describe('Output Fields', () => {
      const requiredOutputKeys = [
        'request_id',
        'status',
        'optimization__optimized_prompt',
        'optimization__technique',
        'tokens__original',
        'tokens__optimized',
        'tokens__savings',
        'tokens__savings_percentage',
        'timestamp',
      ];

      it('contains all fields matching the backend API response', () => {
        const outputKeys = action.outputFields.map((f: any) => f.key);
        for (const key of requiredOutputKeys) {
          expect(outputKeys).toContain(key);
        }
      });

      it('integer/number types are set for token fields', () => {
        const tokenFields = action.outputFields.filter((f: any) =>
          f.key.startsWith('tokens__')
        );
        for (const tf of tokenFields) {
          expect(['integer', 'number']).toContain(tf.type);
        }
      });
    });

    // -- Sample Data --

    describe('Sample data', () => {
      it('includes a sample object', () => {
        expect(action.sample).toBeDefined();
      });

      it('sample has all top-level response keys', () => {
        const sample = action.sample;
        expect(sample).toHaveProperty('request_id');
        expect(sample).toHaveProperty('status');
        expect(sample).toHaveProperty('optimization');
        expect(sample).toHaveProperty('tokens');
        expect(sample).toHaveProperty('timestamp');
      });

      it('sample optimization contains optimized_prompt and technique', () => {
        expect(action.sample.optimization.optimized_prompt).toBeDefined();
        expect(action.sample.optimization.technique).toBeDefined();
      });

      it('sample tokens contain original, optimized, savings, savings_percentage', () => {
        const t = action.sample.tokens;
        expect(typeof t.original).toBe('number');
        expect(typeof t.optimized).toBe('number');
        expect(typeof t.savings).toBe('number');
        expect(typeof t.savings_percentage).toBe('number');
      });
    });
  });
});

// ===========================================================================
// MAKE.COM MODULE JSON TESTS
// ===========================================================================

describe('Make.com Module Configuration (make-module.json)', () => {
  let make: any;

  beforeAll(() => {
    make = loadJSON('make-module.json');
  });

  // ---- Top-level required fields ----

  describe('Top-level schema', () => {
    it('has an id', () => {
      expect(make.id).toBeDefined();
      expect(typeof make.id).toBe('string');
    });

    it('has a non-empty name', () => {
      expect(make.name).toBeDefined();
      expect(make.name.length).toBeGreaterThan(0);
    });

    it('has a semver version', () => {
      expect(make.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('baseURL points to the Fortress API', () => {
      expect(make.baseURL).toBe(API_BASE_URL);
    });

    it('has a non-empty description', () => {
      expect(make.description).toBeDefined();
      expect(make.description.length).toBeGreaterThan(0);
    });

    it('has documentation URL', () => {
      expect(make.documentation).toBeDefined();
      expect(make.documentation).toContain('fortress-optimizer');
    });
  });

  // ---- Authentication ----

  describe('Authentication', () => {
    it('uses api_key type', () => {
      expect(make.authentication).toBeDefined();
      expect(make.authentication.type).toBe('api_key');
    });

    it('maps api_key to Bearer authorization header', () => {
      const mapping = make.authentication.mapping;
      expect(mapping.api_key).toContain('Bearer');
    });
  });

  // ---- Rate Limiting ----

  describe('Rate Limiting', () => {
    it('defines a rate limit', () => {
      expect(make.rateLimit).toBeDefined();
      expect(typeof make.rateLimit.limit).toBe('number');
      expect(typeof make.rateLimit.period).toBe('number');
    });
  });

  // ---- Operations ----

  describe('Operations array', () => {
    it('has at least 2 operations', () => {
      expect(Array.isArray(make.operations)).toBe(true);
      expect(make.operations.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---- Optimize Prompt Operation ----

  describe('Operation — optimize_prompt', () => {
    let op: any;

    beforeAll(() => {
      op = make.operations.find((o: any) => o.slug === 'optimize_prompt');
    });

    it('exists', () => {
      expect(op).toBeDefined();
    });

    it('uses POST method', () => {
      expect(op.method).toBe('POST');
    });

    it('url is /api/optimize', () => {
      expect(op.url).toBe(OPTIMIZE_PATH);
    });

    it('sends Authorization Bearer header', () => {
      expect(op.headers.Authorization).toContain('Bearer');
    });

    it('sends Content-Type application/json', () => {
      expect(op.headers['Content-Type']).toBe('application/json');
    });

    // Parameters

    describe('Parameters', () => {
      it('has prompt, level, and provider parameters', () => {
        const names = op.parameters.map((p: any) => p.name);
        expect(names).toContain('prompt');
        expect(names).toContain('level');
        expect(names).toContain('provider');
      });

      it('prompt is required', () => {
        const prompt = op.parameters.find((p: any) => p.name === 'prompt');
        expect(prompt.required).toBe(true);
      });

      it('prompt supports multiline', () => {
        const prompt = op.parameters.find((p: any) => p.name === 'prompt');
        expect(prompt.multiline).toBe(true);
      });

      it('level options match valid levels', () => {
        const level = op.parameters.find((p: any) => p.name === 'level');
        const values = level.options.map((o: any) => o.value);
        expect(values.sort()).toEqual([...VALID_LEVELS].sort());
      });

      it('level defaults to balanced', () => {
        const level = op.parameters.find((p: any) => p.name === 'level');
        expect(level.default).toBe('balanced');
      });

      it('provider options match all valid providers including ollama', () => {
        const provider = op.parameters.find((p: any) => p.name === 'provider');
        const values = provider.options.map((o: any) => o.value);
        expect(values.sort()).toEqual([...VALID_PROVIDERS].sort());
      });

      it('provider defaults to openai', () => {
        const provider = op.parameters.find((p: any) => p.name === 'provider');
        expect(provider.default).toBe('openai');
      });
    });

    // Response mapping

    describe('Response mapping', () => {
      it('maps request_id', () => {
        expect(op.response.request_id).toBeDefined();
        expect(op.response.request_id.type).toBe('text');
      });

      it('maps status', () => {
        expect(op.response.status).toBeDefined();
      });

      it('maps optimization.optimized_prompt', () => {
        expect(op.response.optimization.optimized_prompt).toBeDefined();
      });

      it('maps optimization.technique', () => {
        expect(op.response.optimization.technique).toBeDefined();
      });

      it('maps tokens.original', () => {
        expect(op.response.tokens.original).toBeDefined();
        expect(op.response.tokens.original.type).toBe('number');
      });

      it('maps tokens.optimized', () => {
        expect(op.response.tokens.optimized).toBeDefined();
      });

      it('maps tokens.savings', () => {
        expect(op.response.tokens.savings).toBeDefined();
      });

      it('maps tokens.savings_percentage', () => {
        expect(op.response.tokens.savings_percentage).toBeDefined();
      });

      it('maps timestamp', () => {
        expect(op.response.timestamp).toBeDefined();
        expect(op.response.timestamp.type).toBe('text');
      });

      it('response keys match the mock API response shape', () => {
        // Top-level keys in response config should mirror OptimizeResponse keys
        const responseKeys = Object.keys(op.response).sort();
        const apiKeys = Object.keys(MOCK_OPTIMIZE_RESPONSE).sort();
        expect(responseKeys).toEqual(apiKeys);
      });

      it('nested optimization keys match API', () => {
        const configKeys = Object.keys(op.response.optimization).sort();
        const apiKeys = Object.keys(MOCK_OPTIMIZE_RESPONSE.optimization).sort();
        expect(configKeys).toEqual(apiKeys);
      });

      it('nested tokens keys match API', () => {
        const configKeys = Object.keys(op.response.tokens).sort();
        const apiKeys = Object.keys(MOCK_OPTIMIZE_RESPONSE.tokens).sort();
        expect(configKeys).toEqual(apiKeys);
      });
    });
  });

  // ---- Get Usage Operation ----

  describe('Operation — get_usage', () => {
    let op: any;

    beforeAll(() => {
      op = make.operations.find((o: any) => o.slug === 'get_usage');
    });

    it('exists', () => {
      expect(op).toBeDefined();
    });

    it('uses GET method', () => {
      expect(op.method).toBe('GET');
    });

    it('url is /api/usage', () => {
      expect(op.url).toBe(USAGE_PATH);
    });

    it('sends Authorization Bearer header', () => {
      expect(op.headers.Authorization).toContain('Bearer');
    });

    it('response includes tokens_used_this_month', () => {
      expect(op.response.tokens_used_this_month).toBeDefined();
    });

    it('response includes tokens_limit', () => {
      expect(op.response.tokens_limit).toBeDefined();
    });

    it('response includes tokens_remaining', () => {
      expect(op.response.tokens_remaining).toBeDefined();
    });

    it('response includes percentage_used', () => {
      expect(op.response.percentage_used).toBeDefined();
    });

    it('response includes reset_date', () => {
      expect(op.response.reset_date).toBeDefined();
    });
  });
});

// ===========================================================================
// CROSS-CONFIG CONSISTENCY TESTS
// ===========================================================================

describe('Cross-config consistency', () => {
  let zapier: any;
  let make: any;

  beforeAll(() => {
    zapier = loadJSON('zapier-app.json');
    make = loadJSON('make-module.json');
  });

  it('both configs target the same API base URL', () => {
    const zapierUrl = zapier.creates.create_optimization.operation.perform.url;
    const makeBaseUrl = make.baseURL;
    const makeOptimizeUrl = make.operations.find(
      (o: any) => o.slug === 'optimize_prompt'
    ).url;
    expect(zapierUrl).toBe(`${makeBaseUrl}${makeOptimizeUrl}`);
  });

  it('both configs use the same optimization levels', () => {
    const zapierLevels = Object.keys(
      zapier.creates.create_optimization.inputFields.find(
        (f: any) => f.key === 'level'
      ).choices
    ).sort();

    const makeLevels = make.operations
      .find((o: any) => o.slug === 'optimize_prompt')
      .parameters.find((p: any) => p.name === 'level')
      .options.map((o: any) => o.value)
      .sort();

    expect(zapierLevels).toEqual(makeLevels);
  });

  it('both configs use the same provider list', () => {
    const zapierProviders = Object.keys(
      zapier.creates.create_optimization.inputFields.find(
        (f: any) => f.key === 'provider'
      ).choices
    ).sort();

    const makeProviders = make.operations
      .find((o: any) => o.slug === 'optimize_prompt')
      .parameters.find((p: any) => p.name === 'provider')
      .options.map((o: any) => o.value)
      .sort();

    expect(zapierProviders).toEqual(makeProviders);
  });

  it('both configs use Bearer token authentication', () => {
    const zapierAuth =
      zapier.creates.create_optimization.operation.perform.headers.Authorization;
    const makeAuth = make.operations.find(
      (o: any) => o.slug === 'optimize_prompt'
    ).headers.Authorization;

    expect(zapierAuth).toContain('Bearer');
    expect(makeAuth).toContain('Bearer');
  });

  it('both configs share the same name', () => {
    expect(zapier.name).toBe(make.name);
  });

  it('both configs share the same version', () => {
    expect(zapier.version).toBe(make.version);
  });
});

// ===========================================================================
// API URL VALIDATION TESTS
// ===========================================================================

describe('API URL validation', () => {
  let zapier: any;
  let make: any;

  beforeAll(() => {
    zapier = loadJSON('zapier-app.json');
    make = loadJSON('make-module.json');
  });

  it('Zapier optimize URL uses HTTPS', () => {
    const url = zapier.creates.create_optimization.operation.perform.url;
    expect(url).toMatch(/^https:\/\//);
  });

  it('Zapier optimize URL points to fortress-optimizer.com', () => {
    const url = zapier.creates.create_optimization.operation.perform.url;
    expect(url).toContain('api.fortress-optimizer.com');
  });

  it('Make baseURL uses HTTPS', () => {
    expect(make.baseURL).toMatch(/^https:\/\//);
  });

  it('Make baseURL points to fortress-optimizer.com', () => {
    expect(make.baseURL).toContain('api.fortress-optimizer.com');
  });

  it('Make baseURL does not have trailing slash', () => {
    expect(make.baseURL.endsWith('/')).toBe(false);
  });

  it('Make operation paths start with /', () => {
    for (const op of make.operations) {
      expect(op.url.startsWith('/')).toBe(true);
    }
  });

  it('all API URLs resolve to valid endpoint paths', () => {
    const validPaths = [OPTIMIZE_PATH, USAGE_PATH];
    for (const op of make.operations) {
      expect(validPaths).toContain(op.url);
    }
  });
});

// ===========================================================================
// EDGE CASE & MALFORMED DATA TESTS
// ===========================================================================

describe('Edge cases and error handling', () => {
  let zapier: any;
  let make: any;

  beforeAll(() => {
    zapier = loadJSON('zapier-app.json');
    make = loadJSON('make-module.json');
  });

  it('Zapier config is valid JSON (already parsed without error)', () => {
    expect(zapier).toBeDefined();
    expect(typeof zapier).toBe('object');
  });

  it('Make config is valid JSON (already parsed without error)', () => {
    expect(make).toBeDefined();
    expect(typeof make).toBe('object');
  });

  it('Zapier config has no duplicate input field keys', () => {
    const fields = zapier.creates.create_optimization.inputFields;
    const keys = fields.map((f: any) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('Make config has no duplicate parameter names per operation', () => {
    for (const op of make.operations) {
      if (op.parameters) {
        const names = op.parameters.map((p: any) => p.name);
        expect(new Set(names).size).toBe(names.length);
      }
    }
  });

  it('Make config has no duplicate operation slugs', () => {
    const slugs = make.operations.map((o: any) => o.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('Zapier output field keys are unique', () => {
    const fields = zapier.creates.create_optimization.outputFields;
    const keys = fields.map((f: any) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('no empty string values in Zapier input field labels', () => {
    const fields = zapier.creates.create_optimization.inputFields;
    for (const f of fields) {
      expect(f.label.length).toBeGreaterThan(0);
    }
  });

  it('no empty string values in Make parameter labels', () => {
    for (const op of make.operations) {
      if (op.parameters) {
        for (const p of op.parameters) {
          expect(p.label.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('optimization level choices do not include unknown values', () => {
    const zapierLevels = Object.keys(
      zapier.creates.create_optimization.inputFields.find(
        (f: any) => f.key === 'level'
      ).choices
    );
    for (const lvl of zapierLevels) {
      expect(VALID_LEVELS).toContain(lvl);
    }
  });

  it('provider choices do not include unknown values', () => {
    const zapierProviders = Object.keys(
      zapier.creates.create_optimization.inputFields.find(
        (f: any) => f.key === 'provider'
      ).choices
    );
    for (const p of zapierProviders) {
      expect(VALID_PROVIDERS).toContain(p);
    }
  });

  it('Make operation URLs do not contain double slashes', () => {
    for (const op of make.operations) {
      const fullUrl = `${make.baseURL}${op.url}`;
      // Only the protocol should have //
      const withoutProtocol = fullUrl.replace('https://', '');
      expect(withoutProtocol).not.toContain('//');
    }
  });

  it('Zapier auth test URL does not contain double slashes (excluding protocol)', () => {
    const url = zapier.authentication.test.url;
    const withoutProtocol = url.replace('https://', '');
    expect(withoutProtocol).not.toContain('//');
  });
});

// ===========================================================================
// FIELD TYPE VALIDATION
// ===========================================================================

describe('Field type correctness', () => {
  let zapier: any;
  let make: any;

  beforeAll(() => {
    zapier = loadJSON('zapier-app.json');
    make = loadJSON('make-module.json');
  });

  it('Zapier prompt field type is text', () => {
    const prompt = zapier.creates.create_optimization.inputFields.find(
      (f: any) => f.key === 'prompt'
    );
    expect(prompt.type).toBe('text');
  });

  it('Zapier level and provider fields are string type', () => {
    const level = zapier.creates.create_optimization.inputFields.find(
      (f: any) => f.key === 'level'
    );
    const provider = zapier.creates.create_optimization.inputFields.find(
      (f: any) => f.key === 'provider'
    );
    expect(level.type).toBe('string');
    expect(provider.type).toBe('string');
  });

  it('Make prompt parameter type is text', () => {
    const op = make.operations.find((o: any) => o.slug === 'optimize_prompt');
    const prompt = op.parameters.find((p: any) => p.name === 'prompt');
    expect(prompt.type).toBe('text');
  });

  it('Make level and provider parameters are select type', () => {
    const op = make.operations.find((o: any) => o.slug === 'optimize_prompt');
    const level = op.parameters.find((p: any) => p.name === 'level');
    const provider = op.parameters.find((p: any) => p.name === 'provider');
    expect(level.type).toBe('select');
    expect(provider.type).toBe('select');
  });

  it('all Make response fields have a type property', () => {
    for (const op of make.operations) {
      const checkTypes = (obj: any, path: string) => {
        for (const [key, val] of Object.entries(obj)) {
          if (val && typeof val === 'object' && 'type' in (val as any)) {
            expect(typeof (val as any).type).toBe('string');
          } else if (val && typeof val === 'object') {
            // Nested object — recurse
            checkTypes(val, `${path}.${key}`);
          }
        }
      };
      checkTypes(op.response, op.slug);
    }
  });
});
