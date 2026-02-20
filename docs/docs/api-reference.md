---
sidebar_position: 1
---

# API Reference

Complete API documentation for Fortress Token Optimizer.

## Base URL

```
https://api.fortress-optimizer.com/v1
```

## Authentication

All API requests require an API key in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.fortress-optimizer.com/v1/optimize
```

## Rate Limits

- **Free Plan**: 10K tokens/month
- **Pro Plan**: Unlimited

Response headers include rate limit info:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9950
X-RateLimit-Reset: 1640000000
```

## Endpoints

### Optimize Prompt

`POST /optimize`

Optimize a single prompt.

**Request**:

```bash
curl -X POST https://api.fortress-optimizer.com/v1/optimize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your prompt here",
    "model": "gpt-4"
  }'
```

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | Yes | The prompt to optimize |
| model | string | Yes | Target model: gpt-4, gpt-3.5, claude, etc. |
| language | string | No | Language code (default: en) |
| aggressive | boolean | No | Use aggressive optimization (default: false) |

**Response**:

```json
{
  "id": "opt_123abc",
  "optimized": "Optimized text here",
  "originalTokens": 23,
  "optimizedTokens": 5,
  "savings": {
    "tokens": 18,
    "percent": 78,
    "cost": "$0.00054"
  },
  "processingTime": 125
}
```

### Get Usage

`GET /usage`

Get your current usage and limits.

**Request**:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.fortress-optimizer.com/v1/usage
```

**Response**:

```json
{
  "plan": "pro",
  "tokensUsed": 1250000,
  "tokensLimit": null,
  "optimizationsCount": 15432,
  "totalSavings": {
    "tokens": 450000,
    "percent": 36,
    "cost": "$13.50"
  },
  "resetDate": "2026-03-19"
}
```

### Get History

`GET /history?limit=10&offset=0`

Get optimization history.

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| limit | number | No | Results per page (default: 10, max: 100) |
| offset | number | No | Pagination offset (default: 0) |
| dateFrom | string | No | ISO date filter (YYYY-MM-DD) |
| dateTo | string | No | ISO date filter (YYYY-MM-DD) |

**Response**:

```json
{
  "data": [
    {
      "id": "opt_123abc",
      "text": "Original prompt...",
      "optimized": "Optimized...",
      "savings": { "percent": 65 },
      "createdAt": "2026-02-19T10:30:00Z"
    }
  ],
  "total": 15432,
  "limit": 10,
  "offset": 0
}
```

## Error Handling

Errors return appropriate HTTP status codes:

```json
{
  "error": {
    "code": "INVALID_KEY",
    "message": "API key is invalid or expired",
    "status": 401
  }
}
```

**Common Error Codes**:

| Code | Status | Description |
|------|--------|-------------|
| INVALID_KEY | 401 | Invalid or expired API key |
| RATE_LIMIT | 429 | Rate limit exceeded |
| INVALID_PROMPT | 400 | Prompt is empty or invalid |
| INVALID_MODEL | 400 | Model not supported |
| SERVER_ERROR | 500 | Internal server error |

## Examples

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

async function optimize(prompt) {
  const response = await fetch('https://api.fortress-optimizer.com/v1/optimize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FORTRESS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: prompt,
      model: 'gpt-4'
    })
  });

  const result = await response.json();
  return result;
}
```

### Python

```python
import requests

def optimize(prompt):
    headers = {
        'Authorization': f"Bearer {os.environ['FORTRESS_API_KEY']}",
        'Content-Type': 'application/json'
    }
    
    data = {
        'text': prompt,
        'model': 'gpt-4'
    }
    
    response = requests.post(
        'https://api.fortress-optimizer.com/v1/optimize',
        headers=headers,
        json=data
    )
    
    return response.json()
```

### cURL

```bash
curl -X POST https://api.fortress-optimizer.com/v1/optimize \
  -H "Authorization: Bearer $FORTRESS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Can you write a function to filter even numbers?",
    "model": "gpt-4"
  }'
```

## Webhooks

Set up webhooks to receive optimization results:

Go to [Dashboard](https://www.fortress-optimizer.com/dashboard) → Settings → Webhooks

**Webhook Payload**:

```json
{
  "event": "optimization.complete",
  "data": {
    "id": "opt_123abc",
    "optimized": "Optimized text",
    "savings": { "percent": 78 }
  },
  "timestamp": "2026-02-19T10:30:00Z"
}
```

## Rate Limits

- **Free**: 10K tokens/month (no burst)
- **Pro**: Unlimited tokens (burst allowed)

Hitting limit returns `429 Too Many Requests`.

## Best Practices

1. **Cache Results** - Don't optimize same prompt twice
2. **Batch Requests** - Optimize multiple prompts at once
3. **Error Handling** - Always handle potential errors
4. **Timeout** - Set reasonable timeouts (10-15 seconds)
5. **Retry Logic** - Retry with exponential backoff on failures

## Support

- 📚 [Full docs](../)
- 🆘 [Troubleshooting](../guides/troubleshooting)
- 💬 [Support](https://www.fortress-optimizer.com/support)
