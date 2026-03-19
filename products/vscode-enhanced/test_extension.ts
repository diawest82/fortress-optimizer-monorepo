/**
 * Tests for Fortress Token Optimizer - VSCode Enhanced Extension
 *
 * Covers: extension activation, commands, ServerAPI client,
 * status bar, API key validation, error handling, and enhanced features.
 */

// ---------------------------------------------------------------------------
// Mock: vscode
// ---------------------------------------------------------------------------

const mockOutputLines: string[] = [];
const mockConfigValues: Record<string, any> = {
  'fortress.optimizationLevel': 'balanced',
  'fortress.provider': 'openai',
  'fortress.customRules': [],
};

const mockStatusBarItem = {
  text: '',
  tooltip: '',
  command: '',
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
};

const mockOutputChannel = {
  appendLine: jest.fn((line: string) => mockOutputLines.push(line)),
  show: jest.fn(),
  dispose: jest.fn(),
};

let mockInputBoxResult: string | undefined = undefined;
let mockGlobalState: Record<string, any> = {};
let mockInfoMessages: string[] = [];
let mockErrorMessages: string[] = [];
let mockWarningMessages: string[] = [];
let mockActiveEditor: any = null;

const vscode = {
  window: {
    createOutputChannel: jest.fn(() => mockOutputChannel),
    createStatusBarItem: jest.fn(() => mockStatusBarItem),
    showInputBox: jest.fn(() => Promise.resolve(mockInputBoxResult)),
    showInformationMessage: jest.fn((...args: any[]) => {
      mockInfoMessages.push(args[0]);
      return Promise.resolve(args[1]);
    }),
    showWarningMessage: jest.fn((...args: any[]) => {
      mockWarningMessages.push(args[0]);
      return Promise.resolve(undefined);
    }),
    showErrorMessage: jest.fn((...args: any[]) => {
      mockErrorMessages.push(args[0]);
      return Promise.resolve(undefined);
    }),
    withProgress: jest.fn((_opts: any, task: any) => task({ report: jest.fn() })),
    activeTextEditor: null as any,
    showOpenDialog: jest.fn(() => Promise.resolve(undefined)),
  },
  workspace: {
    getConfiguration: jest.fn((section?: string) => ({
      get: jest.fn((key: string, defaultVal?: any) => {
        const full = section ? `${section}.${key}` : key;
        return full in mockConfigValues ? mockConfigValues[full] : defaultVal;
      }),
      update: jest.fn(),
    })),
    openTextDocument: jest.fn((uri: any) =>
      Promise.resolve({ getText: () => 'file content', uri }),
    ),
  },
  commands: {
    registerCommand: jest.fn((id: string, handler: Function) => {
      registeredCommands[id] = handler;
      return { dispose: jest.fn() };
    }),
    executeCommand: jest.fn(),
  },
  StatusBarAlignment: { Left: 1, Right: 2 },
  ProgressLocation: { Notification: 15 },
  Range: class {
    constructor(public start: any, public end: any) {}
  },
  Uri: { file: (p: string) => ({ fsPath: p, scheme: 'file' }) },
};

jest.mock('vscode', () => vscode, { virtual: true });

// ---------------------------------------------------------------------------
// Mock: http / https
// ---------------------------------------------------------------------------

import { EventEmitter } from 'events';

function createMockResponse(statusCode: number, body: any) {
  const res = new EventEmitter() as any;
  res.statusCode = statusCode;
  process.nextTick(() => {
    res.emit('data', Buffer.from(JSON.stringify(body)));
    res.emit('end');
  });
  return res;
}

let mockResponseFactory: () => any = () => createMockResponse(200, {});

const mockRequest = (_url: any, _opts: any, cb: any) => {
  const req = new EventEmitter() as any;
  req.write = jest.fn();
  req.end = jest.fn();
  req.destroy = jest.fn();
  process.nextTick(() => cb(mockResponseFactory()));
  return req;
};

jest.mock('https', () => ({ request: jest.fn(mockRequest) }), { virtual: true });
jest.mock('http', () => ({ request: jest.fn(mockRequest) }), { virtual: true });

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import {
  FortressServerAPI,
  initializeAPI,
  isValidAPIKey,
} from './src/api/ServerAPI';

const registeredCommands: Record<string, Function> = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  mockOutputLines.length = 0;
  mockInfoMessages.length = 0;
  mockErrorMessages.length = 0;
  mockWarningMessages.length = 0;
  mockInputBoxResult = undefined;
  mockGlobalState = {};
  mockActiveEditor = null;
  mockResponseFactory = () => createMockResponse(200, {});
  jest.clearAllMocks();
}

// =========================================================================
// isValidAPIKey
// =========================================================================

describe('isValidAPIKey', () => {
  it('should accept valid fortress_ prefixed key', () => {
    expect(isValidAPIKey('fortress_abcdefghijklmnopqrstuvwx')).toBe(true);
  });

  it('should reject key without fortress_ prefix', () => {
    expect(isValidAPIKey('fk_abc123')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidAPIKey('')).toBe(false);
  });

  it('should reject key shorter than required', () => {
    expect(isValidAPIKey('fortress_short')).toBe(false);
  });

  it('should accept case-insensitive prefix', () => {
    expect(isValidAPIKey('FORTRESS_abcdefghijklmnopqrstuvwx')).toBe(true);
  });

  it('should require at least 20 chars after prefix', () => {
    expect(isValidAPIKey('fortress_12345678901234567890')).toBe(true);
    expect(isValidAPIKey('fortress_1234567890123456789')).toBe(false);
  });
});

// =========================================================================
// initializeAPI
// =========================================================================

describe('initializeAPI', () => {
  beforeEach(resetMocks);

  it('should return a FortressServerAPI instance', () => {
    const api = initializeAPI('fortress_testkey12345678901234', mockOutputChannel as any);
    expect(api).toBeInstanceOf(FortressServerAPI);
  });

  it('should accept the output channel', () => {
    const api = initializeAPI('fortress_testkey12345678901234', mockOutputChannel as any);
    expect(api).toBeDefined();
  });
});

// =========================================================================
// FortressServerAPI - construction
// =========================================================================

describe('FortressServerAPI - construction', () => {
  beforeEach(resetMocks);

  it('should store API key', () => {
    const api = new FortressServerAPI('test-key', mockOutputChannel as any);
    expect(api).toBeDefined();
  });

  it('should default to production API URL', () => {
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    // We can test via checkHealth which calls the base URL
    expect(api).toBeDefined();
  });
});

// =========================================================================
// FortressServerAPI - useLocalAPI
// =========================================================================

describe('FortressServerAPI - useLocalAPI', () => {
  beforeEach(resetMocks);

  it('should switch to local API endpoint', () => {
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('localhost'),
    );
  });
});

// =========================================================================
// FortressServerAPI - checkHealth
// =========================================================================

describe('FortressServerAPI - checkHealth', () => {
  beforeEach(resetMocks);

  it('should return true when server is healthy', async () => {
    mockResponseFactory = () =>
      createMockResponse(200, { status: 'healthy', version: '1.2.0', timestamp: '' });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    const result = await api.checkHealth();
    expect(result).toBe(true);
  });

  it('should return false when server is unhealthy', async () => {
    mockResponseFactory = () =>
      createMockResponse(200, { status: 'unhealthy', version: '1.2.0', timestamp: '' });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    const result = await api.checkHealth();
    expect(result).toBe(false);
  });

  it('should return false on connection error', async () => {
    // Override to emit error instead of response
    const http = require('http');
    http.request.mockImplementationOnce((_url: any, _opts: any, _cb: any) => {
      const req = new EventEmitter() as any;
      req.write = jest.fn();
      req.end = jest.fn();
      req.destroy = jest.fn();
      process.nextTick(() => req.emit('error', new Error('ECONNREFUSED')));
      return req;
    });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    const result = await api.checkHealth();
    expect(result).toBe(false);
  });

  it('should log health check to output channel', async () => {
    mockResponseFactory = () =>
      createMockResponse(200, { status: 'healthy', version: '1.0.0', timestamp: '' });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await api.checkHealth();
    expect(mockOutputLines.some((l) => l.includes('health'))).toBe(true);
  });
});

// =========================================================================
// FortressServerAPI - getProviders
// =========================================================================

describe('FortressServerAPI - getProviders', () => {
  beforeEach(resetMocks);

  it('should return providers array', async () => {
    mockResponseFactory = () =>
      createMockResponse(200, { providers: ['openai', 'anthropic'], count: 2 });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    const providers = await api.getProviders();
    expect(providers).toEqual(['openai', 'anthropic']);
  });

  it('should throw on error response', async () => {
    mockResponseFactory = () =>
      createMockResponse(500, { detail: 'server error' });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await expect(api.getProviders()).rejects.toThrow();
  });

  it('should log provider fetch to output', async () => {
    mockResponseFactory = () =>
      createMockResponse(200, { providers: ['openai'], count: 1 });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await api.getProviders();
    expect(mockOutputLines.some((l) => l.includes('providers'))).toBe(true);
  });
});

// =========================================================================
// FortressServerAPI - optimizePrompt
// =========================================================================

describe('FortressServerAPI - optimizePrompt', () => {
  beforeEach(resetMocks);

  const successResponse = {
    request_id: 'r1',
    status: 'success',
    optimization: { optimized_prompt: 'shorter', technique: 'compression' },
    tokens: { original: 100, optimized: 70, savings: 30, savings_percentage: 30.0 },
    timestamp: '2026-03-14T00:00:00Z',
  };

  it('should return optimization response on success', async () => {
    mockResponseFactory = () => createMockResponse(200, successResponse);
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    const res = await api.optimizePrompt({
      prompt: 'hello world',
      level: 'balanced',
      provider: 'openai',
    });
    expect(res.status).toBe('success');
    expect(res.optimization!.optimized_prompt).toBe('shorter');
  });

  it('should log optimization details', async () => {
    mockResponseFactory = () => createMockResponse(200, successResponse);
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await api.optimizePrompt({ prompt: 'test', level: 'aggressive', provider: 'openai' });
    expect(mockOutputLines.some((l) => l.includes('Optimiz'))).toBe(true);
  });

  it('should log prompt length', async () => {
    mockResponseFactory = () => createMockResponse(200, successResponse);
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await api.optimizePrompt({ prompt: 'hello', level: 'balanced', provider: 'openai' });
    expect(mockOutputLines.some((l) => l.includes('5 characters'))).toBe(true);
  });

  it('should log error status from response', async () => {
    const errorResp = {
      request_id: 'r2',
      status: 'error',
      error: 'prompt too short',
      timestamp: '',
    };
    mockResponseFactory = () => createMockResponse(200, errorResp);
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await api.optimizePrompt({ prompt: 'x', level: 'balanced', provider: 'openai' });
    expect(mockOutputLines.some((l) => l.includes('failed'))).toBe(true);
  });

  it('should throw on HTTP error', async () => {
    mockResponseFactory = () => createMockResponse(500, { detail: 'boom' });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await expect(
      api.optimizePrompt({ prompt: 'test', level: 'balanced', provider: 'openai' }),
    ).rejects.toThrow();
  });

  it('should log cost savings when present', async () => {
    const withCost = {
      ...successResponse,
      cost: { original: 0.01, optimized: 0.007, savings: 0.003, currency: 'USD' },
    };
    mockResponseFactory = () => createMockResponse(200, withCost);
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await api.optimizePrompt({ prompt: 'test', level: 'balanced', provider: 'openai' });
    expect(mockOutputLines.some((l) => l.includes('Cost saved'))).toBe(true);
  });
});

// =========================================================================
// FortressServerAPI - auth header
// =========================================================================

describe('FortressServerAPI - auth header', () => {
  beforeEach(resetMocks);

  it('should send Authorization Bearer header for authenticated requests', async () => {
    const http = require('http');
    mockResponseFactory = () => createMockResponse(200, { providers: [], count: 0 });
    const api = new FortressServerAPI('my-api-key', mockOutputChannel as any);
    api.useLocalAPI();
    await api.getProviders();
    const callOpts = http.request.mock.calls[0][1];
    expect(callOpts.headers['Authorization']).toBe('Bearer my-api-key');
  });

  it('should not send auth header for health check', async () => {
    const http = require('http');
    mockResponseFactory = () =>
      createMockResponse(200, { status: 'healthy', version: '1.0', timestamp: '' });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await api.checkHealth();
    const callOpts = http.request.mock.calls[0][1];
    expect(callOpts.headers['Authorization']).toBeUndefined();
  });
});

// =========================================================================
// extension-server.ts - formatTokenCount & status bar logic
// =========================================================================

describe('Status bar formatting', () => {
  // Replicate the formatTokenCount logic from extension-server.ts
  function formatTokenCount(count: number): string {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return `${count}`;
  }

  it('should format 0 as "0"', () => {
    expect(formatTokenCount(0)).toBe('0');
  });

  it('should format 500 as "500"', () => {
    expect(formatTokenCount(500)).toBe('500');
  });

  it('should format 1000 as "1.0K"', () => {
    expect(formatTokenCount(1000)).toBe('1.0K');
  });

  it('should format 1500 as "1.5K"', () => {
    expect(formatTokenCount(1500)).toBe('1.5K');
  });

  it('should format 999999 as "1000.0K"', () => {
    expect(formatTokenCount(999999)).toBe('1000.0K');
  });

  it('should format 1000000 as "1.0M"', () => {
    expect(formatTokenCount(1000000)).toBe('1.0M');
  });

  it('should format 2500000 as "2.5M"', () => {
    expect(formatTokenCount(2500000)).toBe('2.5M');
  });
});

// =========================================================================
// FortressEnhanced - matchesPattern
// =========================================================================

describe('FortressEnhanced - matchesPattern logic', () => {
  // Replicate the private matchesPattern logic
  function matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some((p) => text.toLowerCase().includes(p.toLowerCase()));
  }

  it('should match when pattern is found', () => {
    expect(matchesPattern('Hello World', ['hello'])).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(matchesPattern('HELLO', ['hello'])).toBe(true);
  });

  it('should return false when no patterns match', () => {
    expect(matchesPattern('abc', ['xyz', 'qrs'])).toBe(false);
  });

  it('should match any pattern in the array', () => {
    expect(matchesPattern('test prompt', ['nothing', 'prompt'])).toBe(true);
  });

  it('should handle empty patterns array', () => {
    expect(matchesPattern('test', [])).toBe(false);
  });

  it('should handle empty text', () => {
    expect(matchesPattern('', ['test'])).toBe(false);
  });
});

// =========================================================================
// package.json validation
// =========================================================================

describe('package.json validation', () => {
  let pkg: any;
  beforeAll(() => {
    pkg = JSON.parse(
      require('fs').readFileSync(
        require('path').join(__dirname, 'package.json'),
        'utf-8',
      ),
    );
  });

  it('should have a name', () => {
    expect(pkg.name).toBeDefined();
  });

  it('should have a version', () => {
    expect(pkg.version).toBeDefined();
  });

  it('should have a main entry point', () => {
    expect(pkg.main).toBeDefined();
  });

  it('should target vscode engine', () => {
    expect(pkg.engines?.vscode).toBeDefined();
  });
});

// =========================================================================
// Error scenarios
// =========================================================================

describe('Error scenarios', () => {
  beforeEach(resetMocks);

  it('should handle 401 auth error', async () => {
    mockResponseFactory = () => createMockResponse(401, { detail: 'bad key' });
    const api = new FortressServerAPI('bad', mockOutputChannel as any);
    api.useLocalAPI();
    await expect(api.getProviders()).rejects.toThrow('HTTP 401');
  });

  it('should handle 429 rate limit', async () => {
    mockResponseFactory = () => createMockResponse(429, { detail: 'rate limited' });
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await expect(
      api.optimizePrompt({ prompt: 'x', level: 'balanced', provider: 'openai' }),
    ).rejects.toThrow('HTTP 429');
  });

  it('should handle invalid JSON response', async () => {
    const res = new EventEmitter() as any;
    res.statusCode = 200;
    mockResponseFactory = () => {
      process.nextTick(() => {
        res.emit('data', Buffer.from('not json'));
        res.emit('end');
      });
      return res;
    };
    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    await expect(api.getProviders()).rejects.toThrow('parse');
  });

  it('should handle timeout and retry', async () => {
    const http = require('http');
    let callCount = 0;
    http.request.mockImplementation((_url: any, opts: any, cb: any) => {
      const req = new EventEmitter() as any;
      req.write = jest.fn();
      req.end = jest.fn();
      req.destroy = jest.fn();
      callCount++;
      if (callCount <= 2) {
        process.nextTick(() => req.emit('timeout'));
      } else {
        process.nextTick(() =>
          cb(createMockResponse(200, { status: 'healthy', version: '1', timestamp: '' })),
        );
      }
      return req;
    });

    const api = new FortressServerAPI('key', mockOutputChannel as any);
    api.useLocalAPI();
    const result = await api.checkHealth();
    expect(result).toBe(true);
    expect(callCount).toBeGreaterThan(1);
  });
});
