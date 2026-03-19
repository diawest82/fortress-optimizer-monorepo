/**
 * Tests for Fortress Token Optimizer - GPT Store Configuration
 *
 * Validates OpenAPI schema, GPT config, system prompt, auth setup,
 * and endpoint definitions.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Load files
// ---------------------------------------------------------------------------

const BASE = path.resolve(__dirname);

const openApiRaw = fs.readFileSync(path.join(BASE, 'openapi-actions.json'), 'utf-8');
const openApi = JSON.parse(openApiRaw);

const gptConfigRaw = fs.readFileSync(path.join(BASE, 'gpt-config.json'), 'utf-8');
const gptConfig = JSON.parse(gptConfigRaw);

const systemPrompt = fs.readFileSync(path.join(BASE, 'system-prompt.md'), 'utf-8');

// =========================================================================
// OpenAPI Schema Structure
// =========================================================================

describe('OpenAPI schema - top-level', () => {
  it('should use OpenAPI 3.1.0', () => {
    expect(openApi.openapi).toBe('3.1.0');
  });

  it('should have info object with title', () => {
    expect(openApi.info.title).toBe('Fortress Token Optimizer API');
  });

  it('should have version 1.0.0', () => {
    expect(openApi.info.version).toBe('1.0.0');
  });

  it('should include contact information', () => {
    expect(openApi.info.contact).toBeDefined();
    expect(openApi.info.contact.email).toBe('support@fortress-optimizer.com');
    expect(openApi.info.contact.url).toBe('https://fortress-optimizer.com');
  });

  it('should have a production server defined', () => {
    expect(openApi.servers).toHaveLength(1);
    expect(openApi.servers[0].url).toBe('https://api.fortress-optimizer.com');
    expect(openApi.servers[0].description).toBe('Production API');
  });

  it('should define BearerAuth security scheme', () => {
    const scheme = openApi.components.securitySchemes.BearerAuth;
    expect(scheme).toBeDefined();
    expect(scheme.type).toBe('http');
    expect(scheme.scheme).toBe('bearer');
  });
});

// =========================================================================
// OpenAPI Paths - /api/optimize
// =========================================================================

describe('OpenAPI - /api/optimize', () => {
  const endpoint = openApi.paths['/api/optimize'];

  it('should exist as a POST endpoint', () => {
    expect(endpoint).toBeDefined();
    expect(endpoint.post).toBeDefined();
  });

  it('should have operationId optimizePrompt', () => {
    expect(endpoint.post.operationId).toBe('optimizePrompt');
  });

  it('should require BearerAuth security', () => {
    expect(endpoint.post.security).toEqual([{ BearerAuth: [] }]);
  });

  it('should require a request body', () => {
    expect(endpoint.post.requestBody.required).toBe(true);
  });

  it('should require prompt field in request body', () => {
    const schema = endpoint.post.requestBody.content['application/json'].schema;
    expect(schema.required).toContain('prompt');
  });

  it('should define prompt as string type', () => {
    const props = endpoint.post.requestBody.content['application/json'].schema.properties;
    expect(props.prompt.type).toBe('string');
  });

  it('should define level with enum values', () => {
    const props = endpoint.post.requestBody.content['application/json'].schema.properties;
    expect(props.level.enum).toEqual(['conservative', 'balanced', 'aggressive']);
  });

  it('should default level to balanced', () => {
    const props = endpoint.post.requestBody.content['application/json'].schema.properties;
    expect(props.level.default).toBe('balanced');
  });

  it('should define provider with enum values', () => {
    const props = endpoint.post.requestBody.content['application/json'].schema.properties;
    expect(props.provider.enum).toEqual(['openai', 'anthropic', 'google']);
  });

  it('should default provider to openai', () => {
    const props = endpoint.post.requestBody.content['application/json'].schema.properties;
    expect(props.provider.default).toBe('openai');
  });

  it('should define 200 response with optimization object', () => {
    const resp = endpoint.post.responses['200'];
    expect(resp).toBeDefined();
    const schema = resp.content['application/json'].schema;
    expect(schema.properties.optimization).toBeDefined();
    expect(schema.properties.tokens).toBeDefined();
  });

  it('should define 401 and 429 error responses', () => {
    expect(endpoint.post.responses['401']).toBeDefined();
    expect(endpoint.post.responses['429']).toBeDefined();
  });

  it('should include optimized_prompt in optimization response', () => {
    const optProps =
      endpoint.post.responses['200'].content['application/json'].schema.properties
        .optimization.properties;
    expect(optProps.optimized_prompt).toBeDefined();
    expect(optProps.optimized_prompt.type).toBe('string');
  });

  it('should include savings_percentage in tokens response', () => {
    const tokenProps =
      endpoint.post.responses['200'].content['application/json'].schema.properties
        .tokens.properties;
    expect(tokenProps.savings_percentage).toBeDefined();
    expect(tokenProps.savings_percentage.type).toBe('number');
  });
});

// =========================================================================
// OpenAPI Paths - /api/usage
// =========================================================================

describe('OpenAPI - /api/usage', () => {
  const endpoint = openApi.paths['/api/usage'];

  it('should exist as a GET endpoint', () => {
    expect(endpoint).toBeDefined();
    expect(endpoint.get).toBeDefined();
  });

  it('should have operationId getUsageStats', () => {
    expect(endpoint.get.operationId).toBe('getUsageStats');
  });

  it('should require BearerAuth security', () => {
    expect(endpoint.get.security).toEqual([{ BearerAuth: [] }]);
  });

  it('should define 200 response with usage fields', () => {
    const props =
      endpoint.get.responses['200'].content['application/json'].schema.properties;
    expect(props.total_requests).toBeDefined();
    expect(props.total_tokens_saved).toBeDefined();
  });
});

// =========================================================================
// OpenAPI Paths - /api/providers
// =========================================================================

describe('OpenAPI - /api/providers', () => {
  const endpoint = openApi.paths['/api/providers'];

  it('should exist as a GET endpoint', () => {
    expect(endpoint.get).toBeDefined();
  });

  it('should have operationId listProviders', () => {
    expect(endpoint.get.operationId).toBe('listProviders');
  });

  it('should return providers array in response', () => {
    const props =
      endpoint.get.responses['200'].content['application/json'].schema.properties;
    expect(props.providers.type).toBe('array');
  });
});

// =========================================================================
// OpenAPI Paths - /api/pricing
// =========================================================================

describe('OpenAPI - /api/pricing', () => {
  const endpoint = openApi.paths['/api/pricing'];

  it('should exist as a GET endpoint', () => {
    expect(endpoint.get).toBeDefined();
  });

  it('should have operationId getPricing', () => {
    expect(endpoint.get.operationId).toBe('getPricing');
  });

  it('should NOT require security (public endpoint)', () => {
    expect(endpoint.get.security).toBeUndefined();
  });

  it('should return tiers array', () => {
    const props =
      endpoint.get.responses['200'].content['application/json'].schema.properties;
    expect(props.tiers.type).toBe('array');
  });
});

// =========================================================================
// OpenAPI Paths - /health
// =========================================================================

describe('OpenAPI - /health', () => {
  const endpoint = openApi.paths['/health'];

  it('should exist as a GET endpoint', () => {
    expect(endpoint.get).toBeDefined();
  });

  it('should have operationId healthCheck', () => {
    expect(endpoint.get.operationId).toBe('healthCheck');
  });

  it('should NOT require security', () => {
    expect(endpoint.get.security).toBeUndefined();
  });

  it('should return status field', () => {
    const props =
      endpoint.get.responses['200'].content['application/json'].schema.properties;
    expect(props.status).toBeDefined();
    expect(props.status.enum).toContain('healthy');
  });
});

// =========================================================================
// OpenAPI Paths - /api/keys/register
// =========================================================================

describe('OpenAPI - /api/keys/register', () => {
  const endpoint = openApi.paths['/api/keys/register'];

  it('should exist as a POST endpoint', () => {
    expect(endpoint.post).toBeDefined();
  });

  it('should have operationId registerApiKey', () => {
    expect(endpoint.post.operationId).toBe('registerApiKey');
  });

  it('should NOT require security (self-registration)', () => {
    expect(endpoint.post.security).toBeUndefined();
  });

  it('should require name field in request body', () => {
    const schema = endpoint.post.requestBody.content['application/json'].schema;
    expect(schema.required).toContain('name');
  });

  it('should define tier with enum values', () => {
    const props = endpoint.post.requestBody.content['application/json'].schema.properties;
    expect(props.tier.enum).toEqual(['free', 'pro', 'enterprise']);
  });

  it('should return api_key in response', () => {
    const props =
      endpoint.post.responses['200'].content['application/json'].schema.properties;
    expect(props.api_key).toBeDefined();
    expect(props.api_key.type).toBe('string');
  });
});

// =========================================================================
// OpenAPI completeness
// =========================================================================

describe('OpenAPI - completeness', () => {
  const pathKeys = Object.keys(openApi.paths);

  it('should define exactly 6 paths', () => {
    expect(pathKeys).toHaveLength(6);
  });

  it('should include all expected paths', () => {
    expect(pathKeys).toContain('/api/optimize');
    expect(pathKeys).toContain('/api/usage');
    expect(pathKeys).toContain('/api/providers');
    expect(pathKeys).toContain('/api/pricing');
    expect(pathKeys).toContain('/health');
    expect(pathKeys).toContain('/api/keys/register');
  });

  it('every endpoint should have a summary', () => {
    for (const p of pathKeys) {
      const methods = openApi.paths[p];
      for (const method of Object.keys(methods)) {
        expect(methods[method].summary).toBeDefined();
        expect(methods[method].summary.length).toBeGreaterThan(0);
      }
    }
  });

  it('every endpoint should have a description', () => {
    for (const p of pathKeys) {
      const methods = openApi.paths[p];
      for (const method of Object.keys(methods)) {
        expect(methods[method].description).toBeDefined();
      }
    }
  });

  it('every endpoint should have an operationId', () => {
    for (const p of pathKeys) {
      const methods = openApi.paths[p];
      for (const method of Object.keys(methods)) {
        expect(methods[method].operationId).toBeDefined();
      }
    }
  });
});

// =========================================================================
// GPT Config
// =========================================================================

describe('GPT Config (gpt-config.json)', () => {
  it('should have schema_version 1.0', () => {
    expect(gptConfig.schema_version).toBe('1.0');
  });

  it('should have namespace fortress', () => {
    expect(gptConfig.namespace).toBe('fortress');
  });

  it('should have display_name', () => {
    expect(gptConfig.display_name).toBe('Fortress Token Optimizer');
  });

  it('should have a description', () => {
    expect(gptConfig.description).toBeDefined();
    expect(gptConfig.description.length).toBeGreaterThan(20);
  });

  it('should reference openapi-actions.json as actions schema', () => {
    expect(gptConfig.actions_schema_file).toBe('openapi-actions.json');
  });

  it('should reference system-prompt.md as instructions', () => {
    expect(gptConfig.instructions_file).toBe('system-prompt.md');
  });

  it('should configure auth as api_key with bearer type', () => {
    expect(gptConfig.auth.type).toBe('api_key');
    expect(gptConfig.auth.auth_type).toBe('bearer');
  });

  it('should set Authorization as custom auth header', () => {
    expect(gptConfig.auth.custom_auth_header).toBe('Authorization');
  });

  it('should have contact email', () => {
    expect(gptConfig.contact_email).toBe('support@fortress-optimizer.com');
  });

  it('should have privacy policy URL', () => {
    expect(gptConfig.privacy_policy_url).toContain('fortress-optimizer.com');
  });

  it('should include productivity category', () => {
    expect(gptConfig.categories).toContain('productivity');
  });

  it('should include developer-tools category', () => {
    expect(gptConfig.categories).toContain('developer-tools');
  });

  it('should disable web_browsing capability', () => {
    expect(gptConfig.capabilities.web_browsing).toBe(false);
  });

  it('should disable dall_e capability', () => {
    expect(gptConfig.capabilities.dall_e).toBe(false);
  });

  it('should disable code_interpreter capability', () => {
    expect(gptConfig.capabilities.code_interpreter).toBe(false);
  });

  it('should have conversation starters', () => {
    expect(gptConfig.conversation_starters).toBeDefined();
    expect(gptConfig.conversation_starters.length).toBeGreaterThan(0);
  });

  it('should have logo_url pointing to fortress-optimizer.com', () => {
    expect(gptConfig.logo_url).toContain('fortress-optimizer.com');
  });

  it('should have legal_info_url', () => {
    expect(gptConfig.legal_info_url).toBeDefined();
  });
});

// =========================================================================
// System Prompt
// =========================================================================

describe('System Prompt (system-prompt.md)', () => {
  it('should not be empty', () => {
    expect(systemPrompt.trim().length).toBeGreaterThan(100);
  });

  it('should mention Fortress Token Optimizer', () => {
    expect(systemPrompt).toContain('Fortress Token Optimizer');
  });

  it('should reference optimizePrompt action', () => {
    expect(systemPrompt).toContain('optimizePrompt');
  });

  it('should reference getUsageStats action', () => {
    expect(systemPrompt).toContain('getUsageStats');
  });

  it('should reference getPricing action', () => {
    expect(systemPrompt).toContain('getPricing');
  });

  it('should reference listProviders action', () => {
    expect(systemPrompt).toContain('listProviders');
  });

  it('should reference registerApiKey action', () => {
    expect(systemPrompt).toContain('registerApiKey');
  });

  it('should reference healthCheck action', () => {
    expect(systemPrompt).toContain('healthCheck');
  });

  it('should mention the three optimization levels', () => {
    expect(systemPrompt).toContain('Conservative');
    expect(systemPrompt).toContain('Balanced');
    expect(systemPrompt).toContain('Aggressive');
  });

  it('should default to balanced level', () => {
    expect(systemPrompt).toContain('Default to balanced');
  });

  it('should instruct to always use the API', () => {
    expect(systemPrompt).toContain('Always use the API');
  });

  it('should mention supported providers (Claude, Gemini)', () => {
    expect(systemPrompt).toContain('Claude');
    expect(systemPrompt).toContain('Gemini');
  });

  it('should include result presentation format', () => {
    expect(systemPrompt).toContain('Original Prompt');
    expect(systemPrompt).toContain('Optimized Prompt');
    expect(systemPrompt).toContain('Token Savings');
  });

  it('should mention the website URL', () => {
    expect(systemPrompt).toContain('https://fortress-optimizer.com');
  });

  it('should describe getting started flow for new users', () => {
    expect(systemPrompt).toContain('Getting Started');
  });
});
