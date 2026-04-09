# Fortress Token Optimizer — Microsoft Copilot Plugin

Microsoft Copilot plugin for the Fortress Token Optimizer, using the OpenAI plugin manifest format.

## Directory Structure

```
bing-copilot/
  ai-plugin.json              # Plugin manifest (OpenAI plugin spec)
  openapi.yaml                # OpenAPI 3.0.1 specification
  adaptive-cards/
    optimize-result.json      # Card template for optimization results
    usage-stats.json          # Card template for usage statistics
  test_plugin.ts              # Validation tests
  README.md
```

## Prerequisites

- An active Fortress Token Optimizer API deployment at `https://api.fortress-optimizer.com`
- A logo file hosted at `https://api.fortress-optimizer.com/.well-known/logo.png` (square, minimum 128x128 px, PNG format)
- The OpenAPI spec served at `https://api.fortress-optimizer.com/.well-known/openapi.yaml`
- The plugin manifest served at `https://api.fortress-optimizer.com/.well-known/ai-plugin.json`

## Hosting the Manifest

Your API server must serve the plugin manifest and OpenAPI spec from the `.well-known` path. For example, in an Express server:

```javascript
app.use('/.well-known', express.static('products/bing-copilot'));
```

Or configure your CDN / reverse proxy to map:

| Request Path | File |
|---|---|
| `/.well-known/ai-plugin.json` | `ai-plugin.json` |
| `/.well-known/openapi.yaml` | `openapi.yaml` |
| `/.well-known/logo.png` | your logo file |

## Submitting to Microsoft Copilot (Partner Center)

1. **Create a Microsoft Partner Center account** at https://partner.microsoft.com if you do not already have one.

2. **Register a new plugin**:
   - Navigate to Marketplace Offers > Copilot Plugins.
   - Select "New offer" > "Copilot plugin (OpenAI format)".
   - Enter the plugin manifest URL: `https://api.fortress-optimizer.com/.well-known/ai-plugin.json`

3. **Configure authentication**:
   - Auth type: User-level HTTP Bearer.
   - Microsoft Copilot will prompt end users to enter their Fortress API key the first time they invoke the plugin.

4. **Upload Adaptive Cards** (optional but recommended):
   - Attach `adaptive-cards/optimize-result.json` as the response renderer for the `optimizePrompt` operation.
   - Attach `adaptive-cards/usage-stats.json` as the response renderer for the `getUsageStats` operation.

5. **Submit for review**:
   - Fill in the listing details (description, screenshots, categories).
   - Select "AI / Developer Tools" as the primary category.
   - Submit for Microsoft's certification review. Typical review time is 3-5 business days.

6. **Post-approval**:
   - The plugin will appear in the Copilot plugin store.
   - Users enable it from Copilot settings and authenticate with their Bearer token.

## Testing Locally

Install dependencies and run the validation tests:

```bash
npm install typescript ts-node @types/node --save-dev
npx ts-node test_plugin.ts
```

## Adaptive Cards

The two Adaptive Card templates use the [Adaptive Cards Templating](https://learn.microsoft.com/en-us/adaptive-cards/templating/) syntax with `${...}` data binding expressions. They are designed for Adaptive Cards schema version 1.5.

Preview your cards at https://adaptivecards.io/designer/ by pasting the JSON and providing sample data.

## Troubleshooting

| Issue | Resolution |
|---|---|
| Manifest not found during submission | Verify `/.well-known/ai-plugin.json` returns HTTP 200 with `Content-Type: application/json` |
| OpenAPI spec validation failure | Run `npx @redocly/cli lint openapi.yaml` to identify issues |
| Adaptive Cards not rendering | Confirm schema version is 1.5 and all `${...}` bindings match your API response shape |
| Auth failures in Copilot | Ensure your API accepts `Authorization: Bearer <token>` headers and returns 401 with a JSON body on invalid tokens |
