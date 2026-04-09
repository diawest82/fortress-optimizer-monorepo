# Fortress Token Optimizer — Make.com & Zapier Integration

Automation platform modules that expose the Fortress Token Optimizer API to
Make.com (formerly Integromat) and Zapier workflows.

## Repository Contents

| File | Purpose |
|---|---|
| `zapier-app.json` | Zapier app definition (auth, actions, fields) |
| `make-module.json` | Make.com custom module definition |
| `test_integration.ts` | Schema and contract tests for both configs |
| `README.md` | This file |

## API Contract

Both configs target the same backend:

- **Base URL:** `https://api.fortress-optimizer.com`
- **Auth:** Bearer token via `Authorization: Bearer <api_key>`

### POST /api/optimize

**Request body:**

```json
{
  "prompt": "Your text to optimize",
  "level": "balanced",
  "provider": "openai"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `prompt` | string | yes | Any text |
| `level` | string | no | `conservative`, `balanced` (default), `aggressive` |
| `provider` | string | no | `openai` (default), `anthropic`, `azure`, `gemini`, `groq`, `ollama` |

**Response:**

```json
{
  "request_id": "req_abc123",
  "status": "success",
  "optimization": {
    "optimized_prompt": "Summarize document key points",
    "technique": "semantic_compression"
  },
  "tokens": {
    "original": 150,
    "optimized": 120,
    "savings": 30,
    "savings_percentage": 20.0
  },
  "timestamp": "2026-03-08T12:00:00Z"
}
```

### GET /api/usage

Returns current-month token usage for the authenticated API key.

**Response:**

```json
{
  "tokens_used_this_month": 45200,
  "tokens_limit": 500000,
  "tokens_remaining": 454800,
  "percentage_used": 9.04,
  "reset_date": "2026-04-01"
}
```

## Zapier Deployment

### Prerequisites

- Node.js 18+
- Zapier CLI: `npm install -g zapier-platform-cli`
- A Zapier developer account: https://developer.zapier.com

### Steps

1. **Authenticate with Zapier CLI:**

   ```bash
   zapier login
   ```

2. **Initialize or link the app:**

   If this is a brand-new app:

   ```bash
   zapier register "Fortress Token Optimizer"
   ```

   If the app already exists on Zapier:

   ```bash
   zapier link
   ```

3. **Validate the app definition:**

   ```bash
   zapier validate
   ```

4. **Push to Zapier:**

   ```bash
   zapier push
   ```

5. **Promote to public (when ready):**

   ```bash
   zapier promote <version>
   ```

6. **Invite beta testers:**

   ```bash
   zapier users:add user@example.com --version=1.0.0
   ```

### Auth Testing

After pushing, create a test Zap and verify:

- The connection dialog prompts for an API Key.
- Entering a valid key succeeds (the test request hits `GET /api/usage`).
- Entering an invalid key returns an auth error.

## Make.com Deployment

### Prerequisites

- A Make.com developer account: https://www.make.com/en/developer
- Access to the Custom Apps section in your Make.com organization.

### Steps

1. **Create a new custom app** in the Make.com developer console.

2. **Import the module definition:**
   - Go to your app's Modules tab.
   - Create a new module and paste the contents of `make-module.json`.
   - Alternatively, use the Make.com API to import:

     ```bash
     curl -X POST https://api.make.com/v2/apps/<app-id>/modules \
       -H "Authorization: Token <make-api-token>" \
       -H "Content-Type: application/json" \
       -d @make-module.json
     ```

3. **Configure authentication:**
   - In the Connections tab, set up an API Key connection type.
   - Map the `api_key` field to the `Authorization: Bearer` header.

4. **Test the module:**
   - Create a new scenario with the Fortress module.
   - Add the "Optimize Prompt" action.
   - Enter a test prompt and verify the response fields populate correctly.

5. **Publish:**
   - Submit the app for review via Make.com's app review process.
   - Once approved, the module becomes available in the Make.com marketplace.

## Running Tests

The test suite validates JSON schemas, field mappings, and cross-config
consistency without hitting the live API.

```bash
# Install dependencies (if not already present)
npm install --save-dev jest ts-jest @types/jest typescript

# Run tests
npx jest test_integration.ts --verbose
```

### What the tests verify

- Top-level schema fields (version, name, description, platform config)
- Authentication configuration (Bearer token, test endpoint)
- Input field definitions (types, required flags, choices, defaults)
- Output/response field mappings match the actual API response structure
- Optimization levels: `conservative`, `balanced`, `aggressive`
- Provider list: `openai`, `anthropic`, `azure`, `gemini`, `groq`, `ollama`
- API URLs use HTTPS and point to `api.fortress-optimizer.com`
- Endpoint paths are `/api/optimize` and `/api/usage`
- Cross-config consistency (Zapier and Make share identical values)
- Edge cases: no duplicate keys, no empty labels, no malformed URLs

## Workflow Examples

### Slack to Fortress to Google Sheets (Zapier)

1. **Trigger:** New message in a Slack channel
2. **Action:** Fortress — Optimize Prompt (input: message text)
3. **Action:** Google Sheets — Create Row (input: original text, optimized text, savings)

### Webhook to Fortress to Email (Make.com)

1. **Trigger:** Custom Webhook receives a prompt
2. **Action:** Fortress — Optimize Prompt
3. **Action:** Send an email with the optimized result and savings report

### Form Submission to Fortress (Zapier)

1. **Trigger:** New Google Form response
2. **Action:** Fortress — Optimize Prompt (input: form field)
3. **Action:** Airtable — Create Record with optimization results
