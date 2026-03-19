/**
 * Validation tests for the Fortress Token Optimizer Microsoft Copilot plugin.
 *
 * Run with: npx ts-node test_plugin.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = __dirname;
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function loadJson(filePath: string): any {
  const raw = fs.readFileSync(path.join(ROOT, filePath), "utf-8");
  return JSON.parse(raw);
}

function loadYaml(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), "utf-8");
}

// ---------------------------------------------------------------------------
// 1. ai-plugin.json — Manifest structure
// ---------------------------------------------------------------------------
console.log("\n=== ai-plugin.json ===");

const manifest = loadJson("ai-plugin.json");

assert(manifest.schema_version === "v1", "schema_version is v1");
assert(manifest.name_for_human === "Fortress Token Optimizer", "name_for_human is correct");
assert(manifest.name_for_model === "fortress_optimizer", "name_for_model is correct");
assert(typeof manifest.description_for_human === "string" && manifest.description_for_human.length > 0, "description_for_human is non-empty");
assert(typeof manifest.description_for_model === "string" && manifest.description_for_model.length > 0, "description_for_model is non-empty");
assert(manifest.description_for_model.length <= 8000, "description_for_model is within 8000 char limit");
assert(manifest.auth?.type === "user_http", "auth type is user_http");
assert(manifest.auth?.authorization_type === "bearer", "auth authorization_type is bearer");
assert(manifest.api?.type === "openapi", "api type is openapi");
assert(typeof manifest.api?.url === "string" && manifest.api.url.endsWith(".yaml"), "api url points to YAML spec");
assert(typeof manifest.logo_url === "string" && manifest.logo_url.startsWith("https://"), "logo_url is HTTPS");
assert(typeof manifest.contact_email === "string" && manifest.contact_email.includes("@"), "contact_email is present");
assert(typeof manifest.legal_info_url === "string" && manifest.legal_info_url.startsWith("https://"), "legal_info_url is HTTPS");

// ---------------------------------------------------------------------------
// 2. openapi.yaml — OpenAPI spec structure
// ---------------------------------------------------------------------------
console.log("\n=== openapi.yaml ===");

const spec = loadYaml("openapi.yaml");

assert(spec.includes("openapi: 3.0.1"), "OpenAPI version is 3.0.1");
assert(spec.includes("Fortress Token Optimizer API"), "title is present");
assert(spec.includes("https://api.fortress-optimizer.com"), "server URL is correct");

// Verify all 6 endpoints are defined
const expectedPaths = [
  "/api/optimize:",
  "/api/usage:",
  "/api/pricing:",
  "/api/keys/register:",
  "/health:",
];
for (const ep of expectedPaths) {
  assert(spec.includes(ep), `endpoint ${ep.replace(":", "")} is defined`);
}

// Verify expected operationIds
const expectedOps = [
  "optimizePrompt",
  "getUsageStats",
  "getPricingTiers",
  "registerApiKey",
  "healthCheck",
];
for (const op of expectedOps) {
  assert(spec.includes(op), `operationId ${op} is present`);
}

// Verify security scheme
assert(spec.includes("BearerAuth"), "BearerAuth security scheme is defined");
assert(spec.includes("scheme: bearer"), "bearer scheme is declared");

// Verify request/response schemas exist
const expectedSchemas = [
  "OptimizeRequest",
  "OptimizeResponse",
  "UsageResponse",
  "PricingResponse",
  "RegisterRequest",
  "RegisterResponse",
  "HealthResponse",
  "ErrorResponse",
];
for (const schema of expectedSchemas) {
  assert(spec.includes(schema), `schema ${schema} is defined`);
}

// Verify HTTP methods
assert(spec.includes("post:") && spec.includes("get:"), "both POST and GET methods are used");

// ---------------------------------------------------------------------------
// 3. Adaptive Card — optimize-result.json
// ---------------------------------------------------------------------------
console.log("\n=== adaptive-cards/optimize-result.json ===");

const optimizeCard = loadJson("adaptive-cards/optimize-result.json");

assert(optimizeCard.type === "AdaptiveCard", "type is AdaptiveCard");
assert(optimizeCard.version === "1.5", "version is 1.5");
assert(optimizeCard.$schema === "http://adaptivecards.io/schemas/adaptive-card.json", "$schema is correct");
assert(Array.isArray(optimizeCard.body) && optimizeCard.body.length > 0, "body is a non-empty array");
assert(Array.isArray(optimizeCard.actions) && optimizeCard.actions.length > 0, "actions are defined");

// Check for expected data bindings
const optimizeCardStr = JSON.stringify(optimizeCard);
assert(optimizeCardStr.includes("${optimization.technique}"), "binds optimization.technique");
assert(optimizeCardStr.includes("${tokens.original}"), "binds tokens.original");
assert(optimizeCardStr.includes("${tokens.optimized}"), "binds tokens.optimized");
assert(optimizeCardStr.includes("${tokens.savings}"), "binds tokens.savings");
assert(optimizeCardStr.includes("${tokens.savings_percentage}"), "binds tokens.savings_percentage");
assert(optimizeCardStr.includes("${optimization.optimized_prompt}"), "binds optimization.optimized_prompt");
assert(optimizeCardStr.includes("${request_id}"), "binds request_id");

// Verify card contains both original and optimized sections
assert(optimizeCardStr.includes("Original Prompt"), "shows original prompt section");
assert(optimizeCardStr.includes("Optimized Prompt"), "shows optimized prompt section");

// ---------------------------------------------------------------------------
// 4. Adaptive Card — usage-stats.json
// ---------------------------------------------------------------------------
console.log("\n=== adaptive-cards/usage-stats.json ===");

const usageCard = loadJson("adaptive-cards/usage-stats.json");

assert(usageCard.type === "AdaptiveCard", "type is AdaptiveCard");
assert(usageCard.version === "1.5", "version is 1.5");
assert(usageCard.$schema === "http://adaptivecards.io/schemas/adaptive-card.json", "$schema is correct");
assert(Array.isArray(usageCard.body) && usageCard.body.length > 0, "body is a non-empty array");
assert(Array.isArray(usageCard.actions) && usageCard.actions.length > 0, "actions are defined");

// Check for expected data bindings
const usageCardStr = JSON.stringify(usageCard);
assert(usageCardStr.includes("${total_requests}"), "binds total_requests");
assert(usageCardStr.includes("${total_tokens_saved}"), "binds total_tokens_saved");
assert(usageCardStr.includes("${total_cost_saved_usd}"), "binds total_cost_saved_usd");
assert(usageCardStr.includes("${current_tier}"), "binds current_tier");
assert(usageCardStr.includes("${period_start}"), "binds period_start");
assert(usageCardStr.includes("${period_end}"), "binds period_end");
assert(usageCardStr.includes("${daily_breakdown}"), "binds daily_breakdown for repeating rows");

// Verify daily breakdown columns
assert(usageCardStr.includes("${date}"), "daily row binds date");
assert(usageCardStr.includes("${requests}"), "daily row binds requests");
assert(usageCardStr.includes("${tokens_saved}"), "daily row binds tokens_saved");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All validations passed.");
  process.exit(0);
}
