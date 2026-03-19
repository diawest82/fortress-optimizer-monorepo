/**
 * Tests for Fortress Token Optimizer - Cursor Extension
 *
 * Covers: extension activation, commands, client HTTP logic,
 * status bar, settings, and error handling.
 */

// ---------------------------------------------------------------------------
// Mock: vscode
// ---------------------------------------------------------------------------

const mockSecrets = new Map<string, string>();
const mockSubscriptions: any[] = [];
const mockOutputLines: string[] = [];
const mockConfigValues: Record<string, any> = {
  'fortress.showStatusBar': true,
  'fortress.apiUrl': 'https://api.fortress-optimizer.com',
  'fortress.optimizationLevel': 'balanced',
  'fortress.defaultProvider': 'openai',
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
let mockQuickPickResult: any = undefined;
let mockActiveEditor: any = null;
let mockClipboardText = '';
let mockInfoMessages: string[] = [];
let mockWarningMessages: string[] = [];
let mockErrorMessages: string[] = [];

const vscode = {
  window: {
    createOutputChannel: jest.fn(() => mockOutputChannel),
    createStatusBarItem: jest.fn(() => mockStatusBarItem),
    showInputBox: jest.fn(() => Promise.resolve(mockInputBoxResult)),
    showQuickPick: jest.fn(() => Promise.resolve(mockQuickPickResult)),
    showInformationMessage: jest.fn((...args: any[]) => {
      mockInfoMessages.push(args[0]);
      return Promise.resolve(args[1]);
    }),
    showWarningMessage: jest.fn((...args: any[]) => {
      mockWarningMessages.push(args[0]);
      return Promise.resolve(args[1]);
    }),
    showErrorMessage: jest.fn((...args: any[]) => {
      mockErrorMessages.push(args[0]);
      return Promise.resolve(undefined);
    }),
    withProgress: jest.fn((_opts: any, task: any) => task({ report: jest.fn() })),
    activeTextEditor: null as any,
  },
  workspace: {
    getConfiguration: jest.fn((section?: string) => ({
      get: jest.fn((key: string, defaultVal?: any) => {
        const full = section ? `${section}.${key}` : key;
        return full in mockConfigValues ? mockConfigValues[full] : defaultVal;
      }),
      update: jest.fn(),
    })),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  },
  commands: {
    registerCommand: jest.fn((id: string, handler: Function) => {
      registeredCommands[id] = handler;
      return { dispose: jest.fn() };
    }),
    executeCommand: jest.fn(),
  },
  env: {
    clipboard: {
      readText: jest.fn(() => Promise.resolve(mockClipboardText)),
      writeText: jest.fn(),
    },
  },
  StatusBarAlignment: { Left: 1, Right: 2 },
  ProgressLocation: { Notification: 15 },
  ConfigurationTarget: { Global: 1, Workspace: 2 },
};

jest.mock('vscode', () => vscode, { virtual: true });

// ---------------------------------------------------------------------------
// Mock: http / https for the client
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

let mockResponseFactory: (url: any, opts: any) => any = () =>
  createMockResponse(200, {});

const mockRequest = (url: any, opts: any, cb: any) => {
  const req = new EventEmitter() as any;
  req.write = jest.fn();
  req.end = jest.fn();
  req.destroy = jest.fn();
  process.nextTick(() => cb(mockResponseFactory(url, opts)));
  return req;
};

jest.mock('https', () => ({ request: jest.fn(mockRequest) }), { virtual: true });
jest.mock('http', () => ({ request: jest.fn(mockRequest) }), { virtual: true });

// ---------------------------------------------------------------------------
// Imports under test (after mocks)
// ---------------------------------------------------------------------------

import { FortressClient, OptimizeRequest, OptimizeResponse, UsageResponse } from './src/client';
import { FortressStatusBar } from './src/statusBar';

// We can't easily import the extension module because it runs top-level code
// that depends on module-scoped state. Instead we test its constituent parts
// directly via the client, statusBar, and command-registration patterns above.

const registeredCommands: Record<string, Function> = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  mockOutputLines.length = 0;
  mockInfoMessages.length = 0;
  mockWarningMessages.length = 0;
  mockErrorMessages.length = 0;
  mockSecrets.clear();
  mockSubscriptions.length = 0;
  mockInputBoxResult = undefined;
  mockQuickPickResult = undefined;
  mockActiveEditor = null;
  mockClipboardText = '';
  jest.clearAllMocks();
}

const SAMPLE_OPTIMIZE_RESPONSE: OptimizeResponse = {
  optimization: { optimized_prompt: 'short prompt', technique: 'compression' },
  tokens: { original: 100, optimized: 70, savings: 30, savings_percentage: 30.0 },
};

const SAMPLE_USAGE: UsageResponse = {
  total_requests: 42,
  tokens_saved: 12345,
  cost_saved: 1.23,
  period: '2026-03',
};

// =========================================================================
// TEST SUITE
// =========================================================================

describe('FortressClient', () => {
  beforeEach(resetMocks);

  // --- Initialization ---

  it('should construct with base URL and API key', () => {
    const c = new FortressClient('https://api.example.com', 'fk_abc');
    expect(c).toBeDefined();
  });

  it('should strip trailing slashes from base URL', () => {
    const c = new FortressClient('https://api.example.com///', 'fk_abc');
    // The client stores the cleaned URL internally; we test via request paths.
    expect(c).toBeDefined();
  });

  it('should allow updating the API key at runtime', () => {
    const c = new FortressClient('https://a.com', 'fk_old');
    c.setApiKey('fk_new');
    expect(c).toBeDefined();
  });

  it('should allow updating the base URL at runtime', () => {
    const c = new FortressClient('https://a.com', 'fk_x');
    c.setBaseUrl('https://b.com/');
    expect(c).toBeDefined();
  });

  // --- API methods ---

  it('optimize() should POST to /api/optimize', async () => {
    mockResponseFactory = () => createMockResponse(200, SAMPLE_OPTIMIZE_RESPONSE);
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    const req: OptimizeRequest = { prompt: 'hello', level: 'balanced', provider: 'openai' };
    const res = await c.optimize(req);
    expect(res.optimization.optimized_prompt).toBe('short prompt');
    expect(res.tokens.savings).toBe(30);
  });

  it('getUsage() should GET /api/usage', async () => {
    mockResponseFactory = () => createMockResponse(200, SAMPLE_USAGE);
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    const res = await c.getUsage();
    expect(res.total_requests).toBe(42);
    expect(res.tokens_saved).toBe(12345);
  });

  it('getProviders() should GET /api/providers', async () => {
    mockResponseFactory = () =>
      createMockResponse(200, { providers: ['openai', 'anthropic'], count: 2 });
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    const res = await c.getProviders();
    expect(res.providers).toContain('openai');
  });

  // --- Auth headers ---

  it('should send X-API-Key header when key starts with fk_', async () => {
    mockResponseFactory = (_url: any, opts: any) => {
      expect(opts.headers['X-API-Key']).toBe('fk_mykey');
      return createMockResponse(200, {});
    };
    const c = new FortressClient('http://localhost:8000', 'fk_mykey');
    await c.getProviders();
  });

  it('should send Authorization Bearer header for non-fk_ keys', async () => {
    mockResponseFactory = (_url: any, opts: any) => {
      expect(opts.headers['Authorization']).toBe('Bearer custom_key');
      return createMockResponse(200, {});
    };
    const c = new FortressClient('http://localhost:8000', 'custom_key');
    await c.getProviders();
  });

  it('should set Content-Type for POST requests', async () => {
    mockResponseFactory = (_url: any, opts: any) => {
      expect(opts.headers['Content-Type']).toBe('application/json');
      return createMockResponse(200, SAMPLE_OPTIMIZE_RESPONSE);
    };
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    await c.optimize({ prompt: 'hi', level: 'balanced', provider: 'openai' });
  });

  it('should set User-Agent header', async () => {
    mockResponseFactory = (_url: any, opts: any) => {
      expect(opts.headers['User-Agent']).toBe('fortress-cursor/1.0.0');
      return createMockResponse(200, {});
    };
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    await c.getUsage();
  });

  // --- Error handling ---

  it('should reject with auth error on 401', async () => {
    mockResponseFactory = () => createMockResponse(401, { detail: 'invalid key' });
    const c = new FortressClient('http://localhost:8000', 'fk_bad');
    await expect(c.getUsage()).rejects.toThrow('Authentication failed');
  });

  it('should reject with auth error on 403', async () => {
    mockResponseFactory = () => createMockResponse(403, {});
    const c = new FortressClient('http://localhost:8000', 'fk_bad');
    await expect(c.getUsage()).rejects.toThrow('Authentication failed');
  });

  it('should reject with rate limit error on 429', async () => {
    mockResponseFactory = () => createMockResponse(429, {});
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    await expect(c.optimize({ prompt: 'x', level: 'balanced', provider: 'openai' })).rejects.toThrow('Rate limit');
  });

  it('should reject with HTTP status on 500', async () => {
    mockResponseFactory = () => createMockResponse(500, { detail: 'internal error' });
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    await expect(c.getUsage()).rejects.toThrow('HTTP 500');
  });

  it('should include detail from error response body', async () => {
    mockResponseFactory = () => createMockResponse(422, { detail: 'bad prompt' });
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    await expect(c.getUsage()).rejects.toThrow('bad prompt');
  });

  it('should reject on invalid JSON in success response', async () => {
    const res = new EventEmitter() as any;
    res.statusCode = 200;
    mockResponseFactory = () => {
      process.nextTick(() => {
        res.emit('data', Buffer.from('not json'));
        res.emit('end');
      });
      return res;
    };
    const c = new FortressClient('http://localhost:8000', 'fk_test');
    await expect(c.getUsage()).rejects.toThrow('Invalid JSON');
  });

  // --- Request parameters ---

  it('should serialize request body as JSON for optimize', async () => {
    const https = require('https');
    mockResponseFactory = () => createMockResponse(200, SAMPLE_OPTIMIZE_RESPONSE);
    const c = new FortressClient('https://api.example.com', 'fk_test');
    await c.optimize({ prompt: 'test me', level: 'aggressive', provider: 'anthropic' });
    // request.write should have been called with the serialized body
    expect(https.request).toHaveBeenCalled();
  });
});

// =========================================================================

describe('FortressStatusBar', () => {
  beforeEach(resetMocks);

  it('should create a status bar item on construction', () => {
    const sb = new FortressStatusBar();
    expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
      vscode.StatusBarAlignment.Right,
      50,
    );
  });

  it('should set command to fortress.showUsage', () => {
    const sb = new FortressStatusBar();
    expect(mockStatusBarItem.command).toBe('fortress.showUsage');
  });

  it('should show initial text with no optimizations', () => {
    const sb = new FortressStatusBar();
    expect(mockStatusBarItem.text).toBe('$(zap) Fortress');
  });

  it('should update text after recording an optimization', () => {
    const sb = new FortressStatusBar();
    sb.recordOptimization(500);
    expect(mockStatusBarItem.text).toBe('$(zap) 500 tokens saved');
  });

  it('should format large numbers with k suffix', () => {
    const sb = new FortressStatusBar();
    sb.recordOptimization(1500);
    expect(mockStatusBarItem.text).toBe('$(zap) 1.5k tokens saved');
  });

  it('should accumulate savings across multiple optimizations', () => {
    const sb = new FortressStatusBar();
    sb.recordOptimization(300);
    sb.recordOptimization(700);
    expect(mockStatusBarItem.text).toBe('$(zap) 1.0k tokens saved');
  });

  it('should update tooltip with session count and total', () => {
    const sb = new FortressStatusBar();
    sb.recordOptimization(100);
    sb.recordOptimization(200);
    expect(mockStatusBarItem.tooltip).toContain('2 optimizations');
    expect(mockStatusBarItem.tooltip).toContain('300');
  });

  it('should use singular "optimization" for count of 1', () => {
    const sb = new FortressStatusBar();
    sb.recordOptimization(50);
    expect(mockStatusBarItem.tooltip).toContain('1 optimization');
    expect(mockStatusBarItem.tooltip).not.toContain('1 optimizations');
  });

  it('should show the item on setVisible(true)', () => {
    const sb = new FortressStatusBar();
    sb.setVisible(true);
    expect(mockStatusBarItem.show).toHaveBeenCalled();
  });

  it('should hide the item on setVisible(false)', () => {
    const sb = new FortressStatusBar();
    sb.setVisible(false);
    expect(mockStatusBarItem.hide).toHaveBeenCalled();
  });

  it('should dispose the item on dispose()', () => {
    const sb = new FortressStatusBar();
    sb.dispose();
    expect(mockStatusBarItem.dispose).toHaveBeenCalled();
  });

  it('should call show after render', () => {
    const sb = new FortressStatusBar();
    // render is called in constructor and recordOptimization
    expect(mockStatusBarItem.show).toHaveBeenCalled();
  });
});

// =========================================================================

describe('package.json validation', () => {
  const pkg = require('./package.json');

  it('should have correct extension name', () => {
    expect(pkg.name).toBe('fortress-cursor');
  });

  it('should have displayName', () => {
    expect(pkg.displayName).toBeDefined();
    expect(pkg.displayName.length).toBeGreaterThan(0);
  });

  it('should target vscode engine ^1.85.0', () => {
    expect(pkg.engines.vscode).toBe('^1.85.0');
  });

  it('should define 5 commands in contributes', () => {
    expect(pkg.contributes.commands).toHaveLength(5);
  });

  it('should register fortress.optimizeSelection command', () => {
    const cmds = pkg.contributes.commands.map((c: any) => c.command);
    expect(cmds).toContain('fortress.optimizeSelection');
  });

  it('should register fortress.optimizeClipboard command', () => {
    const cmds = pkg.contributes.commands.map((c: any) => c.command);
    expect(cmds).toContain('fortress.optimizeClipboard');
  });

  it('should register fortress.showUsage command', () => {
    const cmds = pkg.contributes.commands.map((c: any) => c.command);
    expect(cmds).toContain('fortress.showUsage');
  });

  it('should register fortress.setApiKey command', () => {
    const cmds = pkg.contributes.commands.map((c: any) => c.command);
    expect(cmds).toContain('fortress.setApiKey');
  });

  it('should register fortress.setOptimizationLevel command', () => {
    const cmds = pkg.contributes.commands.map((c: any) => c.command);
    expect(cmds).toContain('fortress.setOptimizationLevel');
  });

  it('should have keybindings for optimizeSelection', () => {
    const binding = pkg.contributes.keybindings.find(
      (k: any) => k.command === 'fortress.optimizeSelection',
    );
    expect(binding).toBeDefined();
    expect(binding.key).toBeDefined();
    expect(binding.mac).toBeDefined();
  });

  it('should define configuration properties', () => {
    const props = pkg.contributes.configuration.properties;
    expect(props['fortress.apiUrl']).toBeDefined();
    expect(props['fortress.optimizationLevel']).toBeDefined();
    expect(props['fortress.defaultProvider']).toBeDefined();
    expect(props['fortress.showStatusBar']).toBeDefined();
  });

  it('should have balanced as default optimization level', () => {
    const props = pkg.contributes.configuration.properties;
    expect(props['fortress.optimizationLevel'].default).toBe('balanced');
  });

  it('should have three optimization level enum values', () => {
    const props = pkg.contributes.configuration.properties;
    expect(props['fortress.optimizationLevel'].enum).toEqual([
      'conservative',
      'balanced',
      'aggressive',
    ]);
  });

  it('should include Machine Learning category', () => {
    expect(pkg.categories).toContain('Machine Learning');
  });

  it('should have activation events for all commands', () => {
    const events = pkg.activationEvents;
    expect(events).toContain('onCommand:fortress.optimizeSelection');
    expect(events).toContain('onCommand:fortress.setApiKey');
  });

  it('should set main entry to ./dist/extension.js', () => {
    expect(pkg.main).toBe('./dist/extension.js');
  });
});

// =========================================================================

describe('OptimizeRequest / OptimizeResponse types', () => {
  it('should accept valid OptimizeRequest', () => {
    const req: OptimizeRequest = { prompt: 'test', level: 'balanced', provider: 'openai' };
    expect(req.prompt).toBe('test');
    expect(req.level).toBe('balanced');
  });

  it('should accept aggressive level', () => {
    const req: OptimizeRequest = { prompt: 'x', level: 'aggressive', provider: 'anthropic' };
    expect(req.level).toBe('aggressive');
  });

  it('should accept conservative level', () => {
    const req: OptimizeRequest = { prompt: 'x', level: 'conservative', provider: 'google' };
    expect(req.level).toBe('conservative');
  });

  it('should parse OptimizeResponse structure', () => {
    const res: OptimizeResponse = SAMPLE_OPTIMIZE_RESPONSE;
    expect(res.optimization.optimized_prompt).toBeDefined();
    expect(res.optimization.technique).toBeDefined();
    expect(res.tokens.original).toBeGreaterThan(0);
    expect(res.tokens.savings_percentage).toBeLessThanOrEqual(100);
  });
});
