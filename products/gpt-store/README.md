# Fortress Token Optimizer - GPT Store

Custom GPT for OpenAI's GPT Store that optimizes prompts via the Fortress API.

## Files

| File | Purpose |
|------|---------|
| `system-prompt.md` | Instructions pasted into the GPT's "Instructions" field |
| `openapi-actions.json` | OpenAPI 3.1.0 schema imported as GPT Actions |
| `gpt-config.json` | Metadata and configuration reference |

## Submitting to GPT Store (Step-by-Step)

### 1. Open ChatGPT Builder

Go to [https://chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor) (requires ChatGPT Plus or Team).

### 2. Configure the GPT

In the **Create** tab:
- **Name:** Fortress Token Optimizer
- **Description:** Optimize your LLM prompts to save tokens and reduce costs. Paste any prompt and get an optimized version with clear before/after token savings.
- **Instructions:** Copy the entire contents of `system-prompt.md` and paste it into the Instructions field.

### 3. Set Conversation Starters

Add these:
- "Optimize this prompt for me"
- "What are the pricing tiers?"
- "Show my usage stats"
- "What providers do you support?"

### 4. Add Actions (API Integration)

1. Scroll down to **Actions** and click **Create new action**.
2. Click **Import from URL** or paste the schema directly:
   - If importing: host `openapi-actions.json` at a public URL and enter it.
   - If pasting: copy the full contents of `openapi-actions.json` into the schema editor.
3. The builder will parse the schema and show 6 endpoints:
   - `POST /api/optimize` (optimizePrompt)
   - `GET /api/usage` (getUsageStats)
   - `GET /api/providers` (listProviders)
   - `GET /api/pricing` (getPricing)
   - `GET /health` (healthCheck)
   - `POST /api/keys/register` (registerApiKey)
4. Verify all 6 actions appear with green checkmarks.

### 5. Configure Authentication

1. In the Actions panel, click **Authentication**.
2. Select **API Key**.
3. Set Auth Type to **Bearer**.
4. Enter your Fortress API key (starts with `fk_`). This is the default key the GPT will use when users haven't provided their own.
5. Click **Save**.

### 6. Disable Unnecessary Capabilities

Under **Capabilities**, uncheck:
- Web Browsing
- DALL-E Image Generation
- Code Interpreter

These are not needed and disabling them keeps the GPT focused.

### 7. Set Privacy Policy

Enter: `https://fortress-optimizer.com/privacy`

### 8. Test the GPT

Use the **Preview** panel on the right side of the builder:
1. Type "Optimize this: Can you please help me write a really detailed and comprehensive guide about machine learning with lots of examples and explanations?"
2. Verify the GPT calls the `optimizePrompt` action.
3. Verify it displays the before/after comparison with token savings.
4. Test "What are the pricing tiers?" -- should call `getPricing`.
5. Test "Show my usage" -- should call `getUsageStats`.

### 9. Publish

1. Click **Save** in the top right.
2. Select publishing visibility:
   - **Only me** for initial testing
   - **Anyone with the link** for beta testers
   - **Everyone** for GPT Store listing (requires review)
3. Click **Confirm**.

### 10. Submit for GPT Store Review

Once published as "Everyone":
- OpenAI reviews the GPT (typically 1-3 business days).
- Ensure the privacy policy URL is live and accessible.
- The GPT will appear in GPT Store search after approval.

## Updating the GPT

To push changes after initial publication:
1. Go to [https://chatgpt.com/gpts/mine](https://chatgpt.com/gpts/mine).
2. Click the Fortress Token Optimizer GPT.
3. Click **Edit**.
4. Update Instructions or Actions schema as needed.
5. Click **Save** and re-publish.

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/optimize` | POST | Yes | Optimize a prompt |
| `/api/usage` | GET | Yes | User usage stats |
| `/api/providers` | GET | Yes | List supported providers |
| `/api/pricing` | GET | No | Pricing tier info |
| `/health` | GET | No | API health check |
| `/api/keys/register` | POST | No | Register new API key |

## Support

- Website: https://fortress-optimizer.com
- Docs: https://docs.fortress-optimizer.com
- Email: support@fortress-optimizer.com
