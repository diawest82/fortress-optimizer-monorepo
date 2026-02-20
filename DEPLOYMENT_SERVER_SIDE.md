# Server-Side Fortress Deployment Guide

## Overview

This guide walks through deploying the server-side only Fortress Token Optimizer:

1. **Backend** - FastAPI server with optimization rules
2. **VSCode Extension** - Client that calls backend API
3. **Infrastructure** - Docker, AWS ECS, or Kubernetes

---

## Quick Start (Local Testing)

### 1. Start Backend Locally

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
# Server runs at http://localhost:8000
```

**Test the endpoint**:
```bash
curl -X POST http://localhost:8000/api/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fortress_test_key" \
  -d '{
    "prompt": "You are helpful. You are kind. You are honest.",
    "level": "balanced",
    "provider": "openai"
  }'
```

**Expected Response**:
```json
{
  "request_id": "opt_1708432645.123456",
  "status": "success",
  "optimization": {
    "optimized_prompt": "You are helpful, kind, and honest.",
    "technique": "ConsolidateAdjectives"
  },
  "tokens": {
    "original": 15,
    "optimized": 11,
    "savings": 4,
    "savings_percentage": 26.67
  },
  "timestamp": "2025-02-20T10:30:45.123456Z"
}
```

### 2. Configure VSCode Extension Locally

In VSCode settings:
```json
{
  "fortress.apiUrl": "http://localhost:8000",
  "fortress.apiKey": "fortress_test_key"
}
```

Or through command palette:
```
Fortress: Configure API Key
→ fortress_test_key
```

Then test:
```
Fortress: Check Server Health
→ ✅ Fortress server is healthy
```

---

## Production Deployment

### Option A: AWS ECS (Recommended)

#### 1. Build Docker Image

```bash
# From monorepo root
docker build -t fortress-api:latest backend/

# Tag for ECR
aws ecr create-repository --repository-name fortress-api
docker tag fortress-api:latest $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/fortress-api:latest
docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/fortress-api:latest
```

#### 2. Update ECS Task Definition

**File**: `infra/aws/ecs-task-definition.json`

```json
{
  "family": "fortress-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "fortress-api",
      "image": "$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/fortress-api:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "FORTRESS_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgres://user:pass@db.fortress.internal:5432/fortress"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://cache.fortress.internal:6379"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fortress-api",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 3. Deploy Service

```bash
# Create ECS service
aws ecs create-service \
  --cluster fortress-production \
  --service-name fortress-api \
  --task-definition fortress-api:1 \
  --desired-count 3 \
  --load-balancers targetGroupArn=arn:aws:...,containerName=fortress-api,containerPort=8000 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}"

# Monitor deployment
aws ecs describe-services --cluster fortress-production --services fortress-api
```

### Option B: Docker Compose (Development/Staging)

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  fortress-api:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - FORTRESS_ENV=development
      - DATABASE_URL=postgres://fortress:password@postgres:5432/fortress
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=fortress
      - POSTGRES_USER=fortress
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Start with:
```bash
docker-compose up -d
```

### Option C: Kubernetes

**File**: `infra/k8s/fortress-api.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fortress-api
  namespace: fortress
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fortress-api
  template:
    metadata:
      labels:
        app: fortress-api
    spec:
      containers:
      - name: fortress-api
        image: fortress-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: FORTRESS_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: fortress-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: fortress-api
  namespace: fortress
spec:
  selector:
    app: fortress-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f infra/k8s/fortress-api.yaml
kubectl get service fortress-api -n fortress
```

---

## Environment Variables

Set these in production:

```bash
# Server configuration
FORTRESS_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgres://user:password@db.fortress.com:5432/fortress
DATABASE_POOL_SIZE=20
DATABASE_ECHO=false

# Redis (for rate limiting and caching)
REDIS_URL=redis://cache.fortress.com:6379
REDIS_PASSWORD=...

# Security
SECRET_KEY=... (for JWT/auth)
API_KEY_PREFIX=fortress_

# CORS
ALLOWED_ORIGINS=https://fortress-optimizer.com,https://api.fortress-optimizer.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=...

# Features
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_SECOND=10
RATE_LIMIT_REQUESTS_PER_DAY=10000
```

---

## Monitoring & Health

### Health Check Endpoint

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-02-20T10:30:45.123456Z"
}
```

### Metrics Endpoint

```
GET /metrics
```

Returns Prometheus metrics:
```
# HELP fortress_optimizations_total Total optimizations
# TYPE fortress_optimizations_total counter
fortress_optimizations_total 1542

# HELP fortress_optimization_latency_ms Optimization latency
# TYPE fortress_optimization_latency_ms histogram
fortress_optimization_latency_ms_bucket{le="50"} 1200
fortress_optimization_latency_ms_bucket{le="100"} 1450
fortress_optimization_latency_ms_bucket{le="500"} 1540
```

### Logging

Monitor logs:
```bash
# Docker
docker logs fortress-api

# AWS CloudWatch
aws logs tail /ecs/fortress-api --follow

# Kubernetes
kubectl logs -n fortress deployment/fortress-api -f
```

### Alert Rules

**Prometheus rules** (`infra/monitoring/alerts.yml`):

```yaml
groups:
- name: fortress-api
  rules:
  - alert: HighErrorRate
    expr: |
      rate(fortress_errors_total[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate in Fortress API"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(fortress_optimization_latency_ms_bucket[5m])) > 1000
    for: 5m
    annotations:
      summary: "API latency above 1 second"

  - alert: RateLimitExceeded
    expr: |
      rate(fortress_rate_limit_exceeded_total[5m]) > 0.1
    for: 1m
    annotations:
      summary: "Rate limit being exceeded"
```

---

## VSCode Extension Distribution

### Option A: VSCode Marketplace (Recommended)

```bash
# Install vsce tool
npm install -g vsce

# In extension directory
cd products/vscode-enhanced
npm install
npm run build

# Create publisher (one-time)
# https://marketplace.visualstudio.com/manage

# Publish
vsce publish
```

### Option B: Private Distribution

For enterprise customers, use direct download:

1. Build extension:
```bash
vsce package
# Creates: fortress-token-optimizer-1.0.0.vsix
```

2. Host on internal marketplace or share directly

3. Install locally:
```
VSCode → Extensions → Install from VSIX
```

---

## Configuration for Users

### Via Settings UI

VSCode → Settings → Fortress Optimizer:
- API Key
- API URL
- Optimization Level (conservative/balanced/aggressive)
- Provider (openai/claude/gemini/azure/groq)

### Via settings.json

```json
{
  "fortress.apiKey": "fortress_sk_live_...",
  "fortress.apiUrl": "https://api.fortress-optimizer.com",
  "fortress.optimizationLevel": "balanced",
  "fortress.provider": "openai",
  "fortress.autoFormat": true,
  "fortress.showMetrics": true
}
```

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Health endpoint returns 200
- [ ] API accepts valid API key
- [ ] API rejects invalid API key (401)
- [ ] Optimization endpoint returns optimized prompt
- [ ] Token counting is accurate
- [ ] Rate limiting works
- [ ] Extension connects to local server
- [ ] Extension displays optimization results
- [ ] Error handling works gracefully
- [ ] Metrics are collected
- [ ] Load test with 100 req/s
- [ ] Database connections are pooled properly
- [ ] Redis caching works
- [ ] Monitoring alerts trigger correctly

---

## Troubleshooting

### Backend won't start

```bash
# Check Python version (needs 3.9+)
python --version

# Check dependencies
pip install -r backend/requirements.txt

# Run with debug
FORTRESS_ENV=development python backend/main.py
```

### API key validation failing

```bash
# Check API key format
# Should be: fortress_[32+ characters]

# Test directly
curl -X GET http://localhost:8000/api/providers \
  -H "Authorization: Bearer fortress_test_key"
```

### Extension can't connect to API

1. Check server is running: `curl http://localhost:8000/health`
2. Check API URL in settings: `fortress.apiUrl`
3. Check API key: `fortress.apiKey`
4. View logs: VSCode → Output → Fortress Optimizer

### Slow optimization

- Check database query performance
- Verify Redis is working
- Check network latency to server
- Review Prometheus metrics

---

## Next Steps

1. ✅ Deploy backend to production
2. ✅ Publish extension to VSCode Marketplace
3. ⏳ Set up monitoring and alerting
4. ⏳ Create user documentation
5. ⏳ Establish SLAs (99.9% uptime)
6. ⏳ Plan scaling strategy (1K → 1M users)

