# Fortress Optimizer

Production-grade token optimization platform with intuitive web interface, robust backend API, and seamless integrations.

## 🌐 Website & Platform

**Fortress Optimizer** is a modern SaaS platform that helps developers optimize token usage across AI models. The platform provides real-time cost analysis, usage tracking, and actionable optimization insights.

### Key Features

- **Token Analysis**: Real-time token counting and cost estimation
- **Cost Tracking**: Monitor spending across all AI model providers
- **Optimization Reports**: Data-driven recommendations to reduce token waste
- **Multi-Model Support**: Works with Claude, GPT, and other major AI models
- **Team Collaboration**: Manage team members and usage quotas
- **API Access**: Programmatic access to all platform features
- **Flexible Billing**: Pay-as-you-go with volume discounts available

## 📦 Repository Structure

```
fortress-optimizer-monorepo/
├── website/              # Next.js production web application
│   ├── src/app/         # Pages and components
│   ├── public/          # Static assets
│   └── next.config.js   # Next.js configuration
├── backend/             # Python FastAPI backend
│   ├── api/             # API endpoints
│   ├── db/              # Database models
│   └── Dockerfile       # Container configuration
├── docs/                # Documentation (Docusaurus)
├── tests/               # Test suites and automation
└── package.json         # Root dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (for website)
- Python 3.11+ (for backend)
- Docker (for containerization)
- PostgreSQL (for data persistence)

### Website Development

```bash
cd website
npm install
npm run dev
# Open http://localhost:3000
```

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## 🔐 Security & Privacy

- Enterprise-grade encryption for all data in transit and at rest
- Secure user authentication with industry-standard protocols
- Regular security audits and penetration testing
- GDPR compliant data handling
- No third-party tracking or data sharing

## 💳 Pricing Plans

- **Free**: 50,000 tokens/month
- **Individual**: $9.99/month - Unlimited tokens
- **Teams**: $99/month - Collaboration features + admin controls
- **Enterprise**: Custom pricing - Dedicated support and SLAs

## 📚 Documentation

Full documentation available at [docs/](docs/) directory, including:
- API reference
- Integration guides
- Authentication details
- Best practices

## 🧪 Testing

The test suite has two main surfaces. See the per-section commands below.

```bash
# Backend pytest (requires backend/requirements.txt installed)
python3 -m pytest tests/ backend/ -v

# Website Playwright suite (qa-system + e2e)
cd website && npx playwright test --project=qa-system

# Website Jest unit tests
cd website && npm test
```

The legacy Puppeteer-based scripts that used to live in `tests/*.js` were
moved to `tests/_archived/` on 2026-04-08 — see the README in that
directory for context. The modern Playwright-based equivalents live under
`website/qa-system/specs/`.

## 🛠️ Tech Stack

**Frontend:**
- Next.js 16+ with React
- TypeScript for type safety
- Tailwind CSS for styling
- NextAuth for authentication

**Backend:**
- Python FastAPI
- PostgreSQL with Prisma ORM
- Docker for containerization

**Payments:**
- Stripe integration for subscription management
- Webhook support for payment events

**Deployment:**
- Vercel for website hosting
- AWS ECS Fargate for backend
- AWS RDS PostgreSQL managed database
- AWS ALB with HTTPS (ACM certificate)

## 🚀 Deployment

### Website (Vercel)

Push to `main` triggers auto-deploy:
```bash
git push origin main
# Vercel auto-deploys from website/ directory
# Domain: www.fortress-optimizer.com
```

### Backend (AWS ECS)

**IMPORTANT: Build for linux/amd64.** If you're on Apple Silicon (M1/M2/M3),
Docker defaults to ARM which will cause `exec format error` on Fargate.

```bash
# 1. Build for the correct architecture
docker buildx build --platform linux/amd64 \
  -t fortress-optimizer-backend:production \
  -f backend/Dockerfile .

# 2. Authenticate with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  673895432464.dkr.ecr.us-east-1.amazonaws.com

# 3. Tag and push
docker tag fortress-optimizer-backend:production \
  673895432464.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:production
docker push \
  673895432464.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:production

# 4. Force new ECS deployment (rolling, zero-downtime)
aws ecs update-service \
  --cluster fortress-optimizer-cluster \
  --service fortress-backend-service \
  --force-new-deployment \
  --region us-east-1

# 5. Verify deployment
aws ecs describe-services \
  --cluster fortress-optimizer-cluster \
  --services fortress-backend-service \
  --region us-east-1 \
  --query "services[0].deployments[*].{status:status,desired:desiredCount,running:runningCount}"

# 6. Verify API
curl -s https://api.fortress-optimizer.com/health
```

### Infrastructure Details

| Resource | Details |
|----------|---------|
| **ECS Cluster** | `fortress-optimizer-cluster` |
| **ECS Service** | `fortress-backend-service` (Fargate, 0.25 vCPU / 512MB) |
| **Auto-Scaling** | Min 2, Max 10 tasks (CPU 70%, Memory 80%) |
| **ECR Repo** | `673895432464.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend` |
| **ALB** | `myp-zwp-lb-598798440.us-east-1.elb.amazonaws.com` |
| **HTTPS** | ACM cert for `*.fortress-optimizer.com`, TLS 1.2+ |
| **RDS** | `database-1.cmnnhksj3tmt.us-east-1.rds.amazonaws.com` (db.t3.micro) |
| **API Domain** | `https://api.fortress-optimizer.com` |
| **Website Domain** | `https://www.fortress-optimizer.com` (Vercel) |
| **Region** | us-east-1 |

### HTTPS Setup

If the ACM certificate needs renewal or the domain changes, see
`infrastructure/setup-https.sh`. The domain uses Vercel DNS — all DNS
records (CNAME, CAA) must be managed in the Vercel dashboard.

A CAA record for `0 issue "amazon.com"` is required for ACM cert issuance.

## 💳 Pricing Plans

- **Free**: 50,000 tokens/month, 1 seat
- **Pro**: $9.99/month — Unlimited tokens, 1 seat
- **Teams**: Sliding scale (2-500 seats) — $9.80-$4.00/seat with volume discounts up to 59%
- **Enterprise**: Custom pricing (500+ seats) — Dedicated support, SLAs, on-premise option

## 🧪 Testing

```bash
# Backend unit tests (60 tests)
cd backend && python3 -m pytest test_api.py -v

# Tier enforcement tests (12 tests)
cd backend && python3 -m pytest ../tests/test_tier_enforcement.py -v

# Security tests against production (36 tests)
FORTRESS_TEST_URL=https://api.fortress-optimizer.com \
  pytest tests/test_security.py -v

# Load tests against production (5 tests)
FORTRESS_TEST_URL=https://api.fortress-optimizer.com \
  pytest tests/test_load.py -v
```

## 📄 License

Proprietary software. All rights reserved.

---

**Visit**: https://www.fortress-optimizer.com
**API**: https://api.fortress-optimizer.com
**Status**: Production ready
