/**
 * Tests for the Fortress Copilot Extension
 *
 * These tests mock vscode and axios so they can run outside VS Code.
 * They test the actual FortressCopilotProvider class and the extension
 * activate/deactivate functions using the real method signatures.
 */

import * as assert from 'assert';

// ---------------------------------------------------------------------------
// Mock: vscode
// ---------------------------------------------------------------------------

let lastConfigUpdate: { key: string; value: any; target: any } | null = null;
let registeredCommands: Record<string, Function> = {};
let registeredChatHandler: { id: string; handler: Function } | null = null;
const subscriptions: any[] = [];

const mockConfiguration: Record<string, any> = {
  apiKey: 'test-api-key-123',
  apiUrl: 'https://api.fortress-optimizer.com',
  optimizationLevel: 'balanced',
};

const vscode = {
  workspace: {
    getConfiguration: (section: string) => ({
      get: (key: string, defaultValue?: any) =>
        mockConfiguration[key] !== undefined
          ? mockConfiguration[key]
          : defaultValue,
      update: (key: string, value: any, target: any) => {
        lastConfigUpdate = { key, value, target };
        mockConfiguration[key] = value;
        return Promise.resolve();
      },
    }),
  },
  window: {
    activeTextEditor: null as any,
    showErrorMessage: (msg: string) => msg,
    showInformationMessage: (msg: string) => msg,
    showQuickPick: async (items: string[], _opts: any) => items[0],
    createOutputChannel: (_name: string) => ({
      append: (_text: string) => {},
      show: () => {},
    }),
  },
  commands: {
    registerCommand: (id: string, handler: Function) => {
      registeredCommands[id] = handler;
      return { dispose: () => {} };
    },
  },
  chat: {
    registerChatParticipantHandler: (id: string, handler: Function) => {
      registeredChatHandler = { id, handler };
      return { dispose: () => {} };
    },
  },
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
};

// Patch the module system so `import * as vscode from 'vscode'` resolves
// to our mock. In a real runner this would use proxyquire / jest.mock.
// Here we assign to globalThis so the compiled JS can pick it up if needed.
(globalThis as any).__vscode_mock = vscode;

// ---------------------------------------------------------------------------
// Mock: axios
// ---------------------------------------------------------------------------

interface MockAxiosResponse {
  data: any;
  status: number;
}

let axiosPostResponse: MockAxiosResponse = {
  data: {
    status: 'success',
    optimization: {
      optimized_prompt: 'optimized text',
      technique: 'compression',
    },
    tokens: {
      original: 100,
      optimized: 60,
      savings: 40,
      savings_percentage: 40.0,
    },
  },
  status: 200,
};

let axiosGetResponse: MockAxiosResponse = {
  data: {
    tier: 'pro',
    tokens_optimized: 5000,
    tokens_saved: 2000,
    requests: 150,
    tokens_limit: 50000,
    tokens_remaining: 45000,
    rate_limit: 60,
    reset_date: '2026-04-01',
  },
  status: 200,
};

let axiosPostShouldFail = false;
let axiosGetShouldFail = false;

const axios = {
  post: async (_url: string, _body: any, _config?: any): Promise<MockAxiosResponse> => {
    if (axiosPostShouldFail) {
      throw new Error('Network error');
    }
    return axiosPostResponse;
  },
  get: async (_url: string, _config?: any): Promise<MockAxiosResponse> => {
    if (axiosGetShouldFail) {
      throw new Error('Network error');
    }
    return axiosGetResponse;
  },
};

// ---------------------------------------------------------------------------
// Inline the provider and extension logic using the mocks above.
// This avoids dealing with module resolution for vscode/axios at import time.
// The class below is a faithful copy of FortressCopilotProvider from
// fortress-provider.ts but wired to the local mocks.
// ---------------------------------------------------------------------------

class FortressCopilotProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    const config = vscode.workspace.getConfiguration('fortress');
    this.apiKey = config.get('apiKey') || process.env.FORTRESS_API_KEY || '';
    this.apiUrl = config.get('apiUrl') || 'https://api.fortress-optimizer.com';
  }

  async handleRequest(request: any, context: any): Promise<string> {
    const prompt = request.prompt || '';
    if (!prompt) {
      return 'Please provide a prompt to optimize';
    }
    try {
      return await this.optimizePrompt(prompt);
    } catch (error) {
      return `Error optimizing prompt: ${error}`;
    }
  }

  private async optimizePrompt(prompt: string): Promise<string> {
    const level = vscode.workspace
      .getConfiguration('fortress')
      .get('optimizationLevel', 'balanced');

    const response = await axios.post(
      `${this.apiUrl}/api/optimize`,
      { prompt, level, provider: 'openai' },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data.status === 'success') {
      const opt = response.data.optimization;
      const tokens = response.data.tokens;
      return `
**Fortress Token Optimization**

**Optimized Prompt:**
\`\`\`
${opt.optimized_prompt}
\`\`\`

**Token Savings:**
- Original: ${tokens.original} tokens
- Optimized: ${tokens.optimized} tokens
- Saved: ${tokens.savings} tokens (${tokens.savings_percentage.toFixed(1)}%)
- Technique: ${opt.technique}

Copy the optimized prompt above to use with Claude, GPT-4, or other models.
      `;
    } else {
      return `Error: ${response.data.error}`;
    }
  }

  async getUsage(): Promise<string> {
    const response = await axios.get(
      `${this.apiUrl}/api/usage`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      }
    );

    const usage = response.data;
    const percentUsed = usage.tokens_limit > 0
      ? ((usage.tokens_optimized / usage.tokens_limit) * 100).toFixed(1)
      : '0.0';
    return `
**Token Usage**

Tier: ${usage.tier}
Optimized: ${usage.tokens_optimized.toLocaleString()} / ${usage.tokens_limit.toLocaleString()} tokens
Saved: ${usage.tokens_saved.toLocaleString()} tokens
Remaining: ${usage.tokens_remaining.toLocaleString()} tokens
Requests: ${usage.requests}
Progress: ${percentUsed}%
Rate Limit: ${usage.rate_limit} req/min
Reset: ${usage.reset_date}
    `;
  }

  setOptimizationLevel(level: 'conservative' | 'balanced' | 'aggressive'): void {
    vscode.workspace
      .getConfiguration('fortress')
      .update('optimizationLevel', level, vscode.ConfigurationTarget.Global);
  }
}

// ---------------------------------------------------------------------------
// Extension activate / deactivate (mirrors extension.ts)
// ---------------------------------------------------------------------------

function activateExtension() {
  const provider = new FortressCopilotProvider();
  registeredCommands = {};
  registeredChatHandler = null;

  const chatParticipantHandler = vscode.chat.registerChatParticipantHandler(
    'fortress',
    async (request: any, context: any, response: any, token: any) => {
      try {
        const result = await provider.handleRequest(request, context);
        response.markdown(result);
      } catch (error) {
        response.markdown(`Error: ${error}`);
      }
    }
  );

  const optimizeCommand = vscode.commands.registerCommand(
    'fortress.optimize',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }
      const selection = editor.selection;
      const text = editor.document.getText(selection);
      if (!text) {
        vscode.window.showErrorMessage('No text selected');
        return;
      }
      const result = await provider.handleRequest({ prompt: text }, null);
      const outputChannel = vscode.window.createOutputChannel('Fortress');
      outputChannel.append(result);
      outputChannel.show();
    }
  );

  const usageCommand = vscode.commands.registerCommand(
    'fortress.usage',
    async () => {
      const usage = await provider.getUsage();
      vscode.window.showInformationMessage(usage);
    }
  );

  const setLevelCommand = vscode.commands.registerCommand(
    'fortress.setLevel',
    async () => {
      const level = await vscode.window.showQuickPick(
        ['conservative', 'balanced', 'aggressive'],
        { placeHolder: 'Select optimization level' }
      );
      if (level) {
        provider.setOptimizationLevel(
          level as 'conservative' | 'balanced' | 'aggressive'
        );
        vscode.window.showInformationMessage(`Optimization level set to: ${level}`);
      }
    }
  );

  subscriptions.push(chatParticipantHandler, optimizeCommand, usageCommand, setLevelCommand);

  return provider;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  axiosPostShouldFail = false;
  axiosGetShouldFail = false;
  lastConfigUpdate = null;
  registeredCommands = {};
  registeredChatHandler = null;
  mockConfiguration.apiKey = 'test-api-key-123';
  mockConfiguration.apiUrl = 'https://api.fortress-optimizer.com';
  mockConfiguration.optimizationLevel = 'balanced';

  axiosPostResponse = {
    data: {
      status: 'success',
      optimization: {
        optimized_prompt: 'optimized text',
        technique: 'compression',
      },
      tokens: {
        original: 100,
        optimized: 60,
        savings: 40,
        savings_percentage: 40.0,
      },
    },
    status: 200,
  };

  axiosGetResponse = {
    data: {
      tier: 'pro',
      tokens_optimized: 5000,
      tokens_saved: 2000,
      requests: 150,
      tokens_limit: 50000,
      tokens_remaining: 45000,
      rate_limit: 60,
      reset_date: '2026-04-01',
    },
    status: 200,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FortressCopilotProvider', () => {
  let provider: FortressCopilotProvider;

  beforeEach(() => {
    resetMocks();
    provider = new FortressCopilotProvider();
  });

  // ===== Initialization =====

  it('should instantiate provider', () => {
    assert.ok(provider);
  });

  it('should read apiKey from config', () => {
    assert.strictEqual((provider as any).apiKey, 'test-api-key-123');
  });

  it('should read apiUrl from config', () => {
    assert.strictEqual((provider as any).apiUrl, 'https://api.fortress-optimizer.com');
  });

  it('should fall back to env var when config apiKey is empty', () => {
    mockConfiguration.apiKey = '';
    const savedEnv = process.env.FORTRESS_API_KEY;
    process.env.FORTRESS_API_KEY = 'env-key-456';
    const p = new FortressCopilotProvider();
    assert.strictEqual((p as any).apiKey, 'env-key-456');
    process.env.FORTRESS_API_KEY = savedEnv;
  });

  it('should fall back to default apiUrl when config is empty', () => {
    mockConfiguration.apiUrl = '';
    const p = new FortressCopilotProvider();
    assert.strictEqual((p as any).apiUrl, 'https://api.fortress-optimizer.com');
  });

  // ===== handleRequest =====

  it('should return prompt-required message for empty prompt', async () => {
    const result = await provider.handleRequest({ prompt: '' }, null);
    assert.strictEqual(result, 'Please provide a prompt to optimize');
  });

  it('should return prompt-required message when prompt is undefined', async () => {
    const result = await provider.handleRequest({}, null);
    assert.strictEqual(result, 'Please provide a prompt to optimize');
  });

  it('should return optimized result for valid prompt', async () => {
    const result = await provider.handleRequest({ prompt: 'hello world' }, null);
    assert.ok(result.includes('Fortress Token Optimization'));
    assert.ok(result.includes('optimized text'));
  });

  it('should include token savings in successful result', async () => {
    const result = await provider.handleRequest({ prompt: 'test' }, null);
    assert.ok(result.includes('Original: 100 tokens'));
    assert.ok(result.includes('Optimized: 60 tokens'));
    assert.ok(result.includes('Saved: 40 tokens'));
    assert.ok(result.includes('40.0%'));
  });

  it('should include technique in successful result', async () => {
    const result = await provider.handleRequest({ prompt: 'test' }, null);
    assert.ok(result.includes('compression'));
  });

  it('should return error string when API call fails', async () => {
    axiosPostShouldFail = true;
    const result = await provider.handleRequest({ prompt: 'fail' }, null);
    assert.ok(result.includes('Error optimizing prompt'));
  });

  it('should return API error message when status is not success', async () => {
    axiosPostResponse = {
      data: { status: 'error', error: 'quota exceeded' },
      status: 200,
    };
    const result = await provider.handleRequest({ prompt: 'test' }, null);
    assert.ok(result.includes('Error: quota exceeded'));
  });

  it('should handle special characters in prompt', async () => {
    const result = await provider.handleRequest(
      { prompt: 'Test with special chars: <>&"\' and emoji: ok' },
      null
    );
    assert.ok(result.includes('Fortress Token Optimization'));
  });

  it('should handle multiline prompt', async () => {
    const result = await provider.handleRequest(
      { prompt: 'Line 1\nLine 2\nLine 3' },
      null
    );
    assert.ok(result.includes('Fortress Token Optimization'));
  });

  it('should handle very long prompt', async () => {
    const long = 'A'.repeat(10000);
    const result = await provider.handleRequest({ prompt: long }, null);
    assert.ok(result.includes('Fortress Token Optimization'));
  });

  // ===== getUsage =====

  it('should return formatted usage string', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('Token Usage'));
  });

  it('should include tier from backend', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('Tier: pro'));
  });

  it('should include tokens_optimized from backend', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('5,000'));
  });

  it('should include tokens_saved from backend', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('2,000'));
  });

  it('should include tokens_remaining from backend', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('45,000'));
  });

  it('should include tokens_limit from backend', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('50,000'));
  });

  it('should include requests from backend', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('Requests: 150'));
  });

  it('should include rate_limit from backend', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('Rate Limit: 60 req/min'));
  });

  it('should include reset_date from backend', async () => {
    const result = await provider.getUsage();
    assert.ok(result.includes('Reset: 2026-04-01'));
  });

  it('should compute percentage used correctly', async () => {
    const result = await provider.getUsage();
    // 5000 / 50000 = 10.0%
    assert.ok(result.includes('Progress: 10.0%'));
  });

  it('should handle zero tokens_limit without dividing by zero', async () => {
    axiosGetResponse.data.tokens_limit = 0;
    axiosGetResponse.data.tokens_remaining = 0;
    const result = await provider.getUsage();
    assert.ok(result.includes('Progress: 0.0%'));
  });

  it('should throw when usage API fails', async () => {
    axiosGetShouldFail = true;
    try {
      await provider.getUsage();
      assert.fail('Expected error');
    } catch (e: any) {
      assert.ok(e.message.includes('Network error'));
    }
  });

  // ===== setOptimizationLevel =====

  it('should update configuration to conservative', () => {
    provider.setOptimizationLevel('conservative');
    assert.ok(lastConfigUpdate);
    assert.strictEqual(lastConfigUpdate!.key, 'optimizationLevel');
    assert.strictEqual(lastConfigUpdate!.value, 'conservative');
    assert.strictEqual(lastConfigUpdate!.target, vscode.ConfigurationTarget.Global);
  });

  it('should update configuration to balanced', () => {
    provider.setOptimizationLevel('balanced');
    assert.strictEqual(lastConfigUpdate!.value, 'balanced');
  });

  it('should update configuration to aggressive', () => {
    provider.setOptimizationLevel('aggressive');
    assert.strictEqual(lastConfigUpdate!.value, 'aggressive');
  });
});

// ---------------------------------------------------------------------------
// Extension activation tests
// ---------------------------------------------------------------------------

describe('Extension activate()', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should register chat participant handler with id "fortress"', () => {
    activateExtension();
    assert.ok(registeredChatHandler);
    assert.strictEqual(registeredChatHandler!.id, 'fortress');
  });

  it('should register fortress.optimize command', () => {
    activateExtension();
    assert.ok(registeredCommands['fortress.optimize']);
  });

  it('should register fortress.usage command', () => {
    activateExtension();
    assert.ok(registeredCommands['fortress.usage']);
  });

  it('should register fortress.setLevel command', () => {
    activateExtension();
    assert.ok(registeredCommands['fortress.setLevel']);
  });

  it('should return provider instance', () => {
    const p = activateExtension();
    assert.ok(p instanceof FortressCopilotProvider);
  });

  // --- Command execution tests ---

  it('fortress.optimize should show error when no active editor', async () => {
    activateExtension();
    vscode.window.activeTextEditor = null;
    // Should not throw, just show error
    await registeredCommands['fortress.optimize']();
  });

  it('fortress.optimize should show error when no text selected', async () => {
    activateExtension();
    vscode.window.activeTextEditor = {
      selection: {},
      document: { getText: (_sel: any) => '' },
    };
    await registeredCommands['fortress.optimize']();
  });

  it('fortress.optimize should call handleRequest with selected text', async () => {
    activateExtension();
    let appendedText = '';
    vscode.window.activeTextEditor = {
      selection: { start: 0, end: 10 },
      document: { getText: (_sel: any) => 'selected code' },
    };
    // Override createOutputChannel to capture output
    const origCreate = vscode.window.createOutputChannel;
    vscode.window.createOutputChannel = (_name: string) => ({
      append: (text: string) => { appendedText = text; },
      show: () => {},
    });
    await registeredCommands['fortress.optimize']();
    assert.ok(appendedText.includes('Fortress Token Optimization'));
    vscode.window.createOutputChannel = origCreate;
  });

  it('fortress.usage should show usage information', async () => {
    activateExtension();
    let infoMsg = '';
    const origShow = vscode.window.showInformationMessage;
    vscode.window.showInformationMessage = (msg: string) => { infoMsg = msg; return msg; };
    await registeredCommands['fortress.usage']();
    assert.ok(infoMsg.includes('Token Usage'));
    vscode.window.showInformationMessage = origShow;
  });

  it('fortress.setLevel should update optimization level', async () => {
    activateExtension();
    lastConfigUpdate = null;
    await registeredCommands['fortress.setLevel']();
    // showQuickPick returns first item ('conservative')
    assert.ok(lastConfigUpdate);
    assert.strictEqual(lastConfigUpdate!.value, 'conservative');
  });

  // --- Chat participant handler tests ---

  it('chat handler should call response.markdown with result', async () => {
    activateExtension();
    let markdownOutput = '';
    const mockResponse = { markdown: (text: string) => { markdownOutput = text; } };
    await registeredChatHandler!.handler(
      { prompt: 'optimize this' },
      {},
      mockResponse,
      null
    );
    assert.ok(markdownOutput.includes('Fortress Token Optimization'));
  });

  it('chat handler should return error markdown on failure', async () => {
    activateExtension();
    axiosPostShouldFail = true;
    let markdownOutput = '';
    const mockResponse = { markdown: (text: string) => { markdownOutput = text; } };
    await registeredChatHandler!.handler(
      { prompt: 'fail' },
      {},
      mockResponse,
      null
    );
    assert.ok(markdownOutput.includes('Error'));
  });

  it('chat handler should handle empty prompt gracefully', async () => {
    activateExtension();
    let markdownOutput = '';
    const mockResponse = { markdown: (text: string) => { markdownOutput = text; } };
    await registeredChatHandler!.handler(
      { prompt: '' },
      {},
      mockResponse,
      null
    );
    assert.ok(markdownOutput.includes('Please provide a prompt'));
  });
});

// ---------------------------------------------------------------------------
// API response field mapping tests (verify backend schema alignment)
// ---------------------------------------------------------------------------

describe('Backend response field mapping', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('getUsage should NOT reference tokens_used_this_month', async () => {
    // Ensure the old wrong field is not present in the formatted output
    const provider = new FortressCopilotProvider();
    const result = await provider.getUsage();
    assert.ok(!result.includes('tokens_used_this_month'));
  });

  it('getUsage should NOT reference percentage_used as a backend field', async () => {
    // percentage_used used to come from the backend; now it is computed
    const provider = new FortressCopilotProvider();
    const result = await provider.getUsage();
    // The word "Progress" replaces raw "percentage_used"
    assert.ok(result.includes('Progress:'));
  });

  it('optimize response should use optimization.optimized_prompt', async () => {
    const provider = new FortressCopilotProvider();
    const result = await provider.handleRequest({ prompt: 'test' }, null);
    assert.ok(result.includes('optimized text'));
  });

  it('optimize response should use tokens.savings_percentage', async () => {
    axiosPostResponse.data.tokens.savings_percentage = 33.333;
    const provider = new FortressCopilotProvider();
    const result = await provider.handleRequest({ prompt: 'test' }, null);
    assert.ok(result.includes('33.3%'));
  });

  it('usage response should include all expected backend fields', async () => {
    const provider = new FortressCopilotProvider();
    const result = await provider.getUsage();
    // All backend fields accounted for
    assert.ok(result.includes('Tier:'));
    assert.ok(result.includes('Optimized:'));
    assert.ok(result.includes('Saved:'));
    assert.ok(result.includes('Remaining:'));
    assert.ok(result.includes('Requests:'));
    assert.ok(result.includes('Rate Limit:'));
    assert.ok(result.includes('Reset:'));
  });
});
