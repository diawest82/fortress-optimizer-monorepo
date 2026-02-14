# Fortress Token Optimizer - Testing & Deployment Guide

## Testing Overview

Three comprehensive testing suites are ready to run against the deployed backend:

### 1. Load Testing (K6)
**File:** `tests/load-test.js`

Tests the backend under sustained load with realistic user patterns.

```bash
# Install k6 (if not already installed)
brew install k6

# Run load test
k6 run --vus 100 tests/load-test.js --environment BACKEND_URL=http://your-backend-url

# Or with Docker
docker run -i grafana/k6 run - < tests/load-test.js --environment BACKEND_URL=http://your-backend-url
```

**What it tests:**
- Health endpoint (baseline)
- Token optimization endpoint (primary workload)
- Usage tracking
- Pricing information
- Ramps up from 100 → 500 → 1000 concurrent users
- Validates < 500ms P95 latency, < 1s P99 latency

**Success criteria:**
- ✅ 95th percentile response time < 500ms
- ✅ 99th percentile response time < 1s
- ✅ Error rate < 10%
- ✅ All health checks pass

---

### 2. Security Testing (OWASP)
**File:** `tests/security-test.sh`

Tests for common security vulnerabilities and best practices.

```bash
# Make script executable
chmod +x tests/security-test.sh

# Run security tests
./tests/security-test.sh http://your-backend-url

# Results saved to: security-test-results.json
```

**What it tests:**
- ✅ Health endpoint accessibility
- ✅ Input validation (empty payloads)
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Malformed JSON handling
- ✅ Rate limiting (429 responses)
- ✅ HTTPS/TLS enforcement
- ✅ CORS headers
- ✅ Authorization (token validation)
- ✅ Security response headers

**Success criteria:**
- All 10 tests pass
- Proper rejection of malicious input
- Rate limiting enforced
- Security headers present

---

### 3. Integration Testing (All Products)
**File:** `tests/integration-test.sh`

Tests all 11 products against the live backend API.

```bash
# Make script executable
chmod +x tests/integration-test.sh

# Run integration tests
./tests/integration-test.sh http://your-backend-url

# Results saved to: integration-test-results.json
```

**What it tests:**
1. npm Package Integration
2. Anthropic SDK Integration
3. Slack Bot Integration
4. VS Code Extension Integration
5. Usage Tracking
6. Pricing Endpoint
7. Backend Health
8. Concurrent Request Handling
9. Database Persistence
10. Response Time

**Success criteria:**
- ✅ All 10 products respond correctly
- ✅ Response time < 1 second
- ✅ Concurrent requests handled (5x parallel)
- ✅ Data persists in database
- ✅ All endpoints accessible

---

## Running All Tests

Once the backend is deployed and you have the backend URL:

```bash
# 1. Check backend is healthy
curl http://your-backend-url/health

# 2. Run security tests
./tests/security-test.sh http://your-backend-url

# 3. Run integration tests
./tests/integration-test.sh http://your-backend-url

# 4. Run load test (in background or separate terminal)
k6 run tests/load-test.js --environment BACKEND_URL=http://your-backend-url
```

---

## Website API Integration

Updated home page component with live optimization demo:

**File:** `website/src/app/page-with-api.tsx`

Features:
- Live text input for optimization
- Real-time API calls to backend
- Display of token savings
- Error handling
- Loading states

To use:
```bash
# Replace the original home page
mv website/src/app/page.tsx website/src/app/page-original.tsx
mv website/src/app/page-with-api.tsx website/src/app/page.tsx

# Set backend URL in .env.local
echo "NEXT_PUBLIC_API_URL=http://your-backend-url" >> website/.env.local

# Deploy to Vercel (auto-deploys on git push)
git add -A
git commit -m "feat: Add live API integration to home page"
git push origin main
```

---

## Expected Response Format

All endpoints return standardized JSON:

### `/optimize` (POST)
```json
{
  "optimized_text": "compressed version of input",
  "original_tokens": 150,
  "optimized_tokens": 120,
  "savings_percentage": 20.0
}
```

### `/usage` (GET)
```json
{
  "user_id": "user-123",
  "tokens_used": 45000,
  "tokens_remaining": 5000,
  "plan": "pro"
}
```

### `/pricing` (GET)
```json
{
  "plans": [
    {
      "name": "free",
      "tokens_per_month": 50000,
      "price": 0
    },
    {
      "name": "pro",
      "tokens_per_month": "unlimited",
      "price": 9.99
    }
  ]
}
```

### `/health` (GET)
```json
{
  "status": "healthy",
  "timestamp": "2026-02-14T14:50:00Z"
}
```

---

## Performance Targets

| Metric | Target | Acceptable | Warning |
|--------|--------|------------|---------|
| P95 Latency | < 500ms | < 800ms | > 800ms |
| P99 Latency | < 1s | < 1.5s | > 1.5s |
| Error Rate | < 1% | < 5% | > 5% |
| Throughput | > 500 req/s | > 300 req/s | < 300 req/s |
| Availability | 99.9% | 99% | < 99% |

---

## Results Files

After running tests, check these JSON files for detailed results:

```bash
# Security test results
cat security-test-results.json | jq '.summary'

# Integration test results
cat integration-test-results.json | jq '.summary'

# k6 load test results (generates HTML report)
# Check k6-results.html
```

---

## Deployment Checklist

Before Feb 17 launch:

- [ ] Backend deployed to AWS ECS
- [ ] All 3 test suites passing
- [ ] Load test: 1000+ req/s with < 500ms P95
- [ ] Security test: 100% pass rate
- [ ] Integration test: All 10 products responding
- [ ] Website connected to live backend
- [ ] DNS configured (fortress-optimizer.com)
- [ ] Monitoring/alerts set up in CloudWatch
- [ ] GitHub repo synced

---

## Next Steps

1. **Get backend URL** from AWS deployment (ALB DNS name)
2. **Run security tests** first (fastest feedback)
3. **Run integration tests** (validate all products)
4. **Run load tests** (validate performance under load)
5. **Update website** with backend URL
6. **Monitor CloudWatch** during tests
7. **Fix any failures** and retest
8. **Commit results** to git
9. **Launch on Feb 17**

Good luck! 🚀
