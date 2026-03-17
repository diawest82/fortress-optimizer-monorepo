# Fortress Optimizer — Pre-Launch Checklist

## 1. Environment Variables

### Website (Vercel / Next.js)

| Variable | Required | Status | Notes |
|----------|----------|--------|-------|
| `DATABASE_URL` | Yes | [ ] | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | [ ] | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | [ ] | `https://fortress-optimizer.com` |
| `NEXT_PUBLIC_API_URL` | Yes | [ ] | Backend API URL (NOT localhost) |
| `NEXT_PUBLIC_APP_URL` | Yes | [ ] | `https://fortress-optimizer.com` |
| `STRIPE_SECRET_KEY` | Yes | [ ] | Live key, not test |
| `STRIPE_PUBLISHABLE_KEY` | Yes | [ ] | Live publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | [ ] | From Stripe webhook dashboard |
| `STRIPE_PRODUCT_ID_INDIVIDUAL` | Yes | [ ] | Create in Stripe dashboard |
| `STRIPE_PRODUCT_ID_TEAMS` | Yes | [ ] | Create in Stripe dashboard |
| `STRIPE_PRODUCT_ID_ENTERPRISE` | Yes | [ ] | Create in Stripe dashboard |
| `STRIPE_PRICE_PRO` | Yes | [ ] | Price ID for pro tier |
| `STRIPE_PRICE_TEAM` | Yes | [ ] | Price ID for team tier |
| `STRIPE_PRICE_ENTERPRISE` | Yes | [ ] | Price ID for enterprise tier |
| `RESEND_API_KEY` | Yes | [ ] | For transactional emails |
| `FROM_EMAIL` | Yes | [ ] | Verified sender domain |
| `JWT_SECRET` | Yes | [ ] | Strong random value |
| `ENCRYPTION_KEY` | Yes | [ ] | For audit log encryption |
| `GOOGLE_CLIENT_ID` | Optional | [ ] | OAuth login |
| `GOOGLE_CLIENT_SECRET` | Optional | [ ] | OAuth login |
| `GITHUB_ID` | Optional | [ ] | OAuth login |
| `GITHUB_SECRET` | Optional | [ ] | OAuth login |
| `NEXT_PUBLIC_GA_ID` | Optional | [ ] | Google Analytics |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | [ ] | PostHog analytics |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional | [ ] | Facebook Pixel |
| `CRON_SECRET` | Optional | [ ] | Cron job auth |

### Backend (AWS ECS / Docker)

| Variable | Required | Status | Notes |
|----------|----------|--------|-------|
| `FORTRESS_ENV` | Yes | [ ] | Must be `production` |
| `DATABASE_URL` | Yes | [ ] | PostgreSQL (same DB or separate) |
| `API_KEY_SECRET` | Yes | [ ] | NOT the dev default — `openssl rand -hex 32` |
| `ADMIN_SECRET` | Yes | [ ] | For `/api/admin/cleanup` |
| `REDIS_URL` | Recommended | [ ] | Enables persistent rate limiting |
| `SENTRY_DSN` | Recommended | [ ] | Error monitoring |

---

## 2. Stripe Setup

| Task | Status | Notes |
|------|--------|-------|
| Create Stripe account (live mode) | [ ] | |
| Create Product: Individual ($9.99/mo) | [ ] | Copy product ID → `STRIPE_PRODUCT_ID_INDIVIDUAL` |
| Create Product: Teams ($99/mo) | [ ] | Copy product ID → `STRIPE_PRODUCT_ID_TEAMS` |
| Create Product: Enterprise (custom) | [ ] | Copy product ID → `STRIPE_PRODUCT_ID_ENTERPRISE` |
| Create Prices for each product | [ ] | Copy price IDs → `STRIPE_PRICE_*` vars |
| Configure webhook endpoint | [ ] | URL: `https://fortress-optimizer.com/api/webhook/stripe` |
| Enable webhook events | [ ] | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded` |
| Test webhook with Stripe CLI | [ ] | `stripe listen --forward-to localhost:3000/api/webhook/stripe` |

---

## 3. Database

| Task | Status | Notes |
|------|--------|-------|
| Provision PostgreSQL (RDS or similar) | [ ] | Minimum: db.t3.micro for launch |
| Run Prisma migrations | [ ] | `npx prisma migrate deploy` |
| Verify all 31 models created | [ ] | `npx prisma db pull` to confirm |
| Backend tables created on startup | [ ] | `api_keys` + `optimization_logs` via SQLAlchemy |
| Enable automated backups | [ ] | Daily snapshots, 7-day retention |
| Connection pooling configured | [ ] | Backend: pool_size=10, overflow=20 |

---

## 4. Email (Resend)

| Task | Status | Notes |
|------|--------|-------|
| Create Resend account | [ ] | |
| Add and verify sending domain | [ ] | `fortress-optimizer.com` |
| Set DNS records (SPF, DKIM, DMARC) | [ ] | Resend provides these |
| Test welcome email sends | [ ] | Signup → check inbox |
| Test password reset email | [ ] | Forgot password flow |
| Test team invite email | [ ] | Invite member from team tab |
| Test support ticket confirmation | [ ] | Create ticket → check inbox |
| Test upgrade confirmation email | [ ] | Complete Stripe checkout |
| Test payment failed email | [ ] | Use Stripe test card `4000000000000341` |

---

## 5. DNS & SSL

| Task | Status | Notes |
|------|--------|-------|
| `fortress-optimizer.com` → Vercel | [ ] | A/CNAME records |
| `www.fortress-optimizer.com` → redirect | [ ] | Vercel redirect rule |
| `app.fortress-optimizer.com` → if needed | [ ] | Or use same domain |
| SSL certificate active | [ ] | Auto via Vercel |
| HSTS header verified | [ ] | Already in next.config.js |
| Backend domain configured | [ ] | ALB/CloudFront → ECS |

---

## 6. QA — User Journeys to Test

### Individual Path
| Step | Status | Notes |
|------|--------|-------|
| Visit homepage → CTA → signup page | [ ] | |
| Create account (email + password) | [ ] | |
| Receive welcome email | [ ] | |
| Redirected to dashboard | [ ] | |
| Generate first API key | [ ] | |
| Copy key and test with curl | [ ] | `curl -H "X-API-Key: fk_..." POST /api/optimize` |
| View usage stats on dashboard | [ ] | |
| Upgrade to Pro via pricing page | [ ] | |
| Complete Stripe checkout | [ ] | |
| Receive upgrade confirmation email | [ ] | |
| Verify tier changed in account | [ ] | |
| Rotate API key | [ ] | |
| Revoke API key | [ ] | |
| Change password | [ ] | |
| Forgot password → reset email → new password | [ ] | |
| Enable MFA (Security tab) | [ ] | |
| Create support ticket | [ ] | |
| View ticket in "Your Tickets" | [ ] | |
| Cancel subscription | [ ] | |
| Verify downgraded to free | [ ] | |

### Team Path
| Step | Status | Notes |
|------|--------|-------|
| Upgrade to Teams tier | [ ] | |
| Team Management tab unlocks | [ ] | |
| Invite member by email | [ ] | |
| Invited member receives email | [ ] | |
| Invited member accepts & joins | [ ] | |
| Verify member appears in list | [ ] | |
| Change member role (admin/member) | [ ] | |
| Remove member | [ ] | |
| Verify seat count updates | [ ] | |
| Team usage aggregation visible | [ ] | |
| Downgrade from Teams → verify members notified | [ ] | |

### Billing Path
| Step | Status | Notes |
|------|--------|-------|
| View current plan in Subscription tab | [ ] | |
| View billing history (real Stripe invoices) | [ ] | |
| Click "View" on invoice → opens Stripe hosted page | [ ] | |
| Upgrade plan → new price reflected | [ ] | |
| Downgrade plan → change at period end | [ ] | |
| Failed payment → user gets email + status = suspended | [ ] | |
| Update payment method → status restored | [ ] | |

---

## 7. Security Hardening

| Task | Status | Notes |
|------|--------|-------|
| CSP: Remove `unsafe-inline` / `unsafe-eval` | [ ] | In next.config.js — use nonces instead |
| Verify no API keys in client-side code | [ ] | Only `NEXT_PUBLIC_*` vars exposed |
| Rate limiting active on backend | [ ] | 100 req/min, 10K/day per key |
| Key registration rate limited | [ ] | 5/hour per IP (just added) |
| Swagger/OpenAPI disabled in production | [ ] | Already in main.py |
| Admin endpoints require ADMIN_SECRET | [ ] | |
| Test pages blocked in production | [ ] | middleware.ts redirects to `/` |
| No dev defaults in production | [ ] | API_KEY_SECRET validation on startup |
| CORS locked to production domains only | [ ] | |
| SQL injection tests pass | [ ] | Covered in test_security.py |

---

## 8. Monitoring & Observability

| Task | Status | Notes |
|------|--------|-------|
| Sentry configured (backend) | [ ] | Set `SENTRY_DSN` |
| Vercel analytics enabled (website) | [ ] | Free tier included |
| Health check endpoint responding | [ ] | `GET /health` on backend |
| Uptime monitoring configured | [ ] | e.g., UptimeRobot, Better Uptime |
| Log aggregation configured | [ ] | CloudWatch / Vercel logs |
| Alert on 5xx spike | [ ] | Sentry or CloudWatch alarm |
| Alert on rate limit spikes | [ ] | Custom metric |

---

## 9. CI/CD Verification

| Task | Status | Notes |
|------|--------|-------|
| `backend-ci.yml` passes on main | [ ] | pytest + 80% coverage |
| `deploy-vercel.yml` deploys cleanly | [ ] | Build + test + deploy |
| `backend-deploy.yml` pushes to ECR | [ ] | Docker build + ECS update |
| `buildspec.yml` works in CodeBuild | [ ] | |
| Prisma migrations run in CI | [ ] | `prisma migrate deploy` step |
| E2E tests pass against staging | [ ] | Playwright |

---

## 10. Final Pre-Launch

| Task | Status | Notes |
|------|--------|-------|
| Run full test suite locally | [ ] | `cd backend && pytest` + `cd website && npm test` |
| Run E2E tests against staging | [ ] | `npm run test:e2e` |
| Load test against staging | [ ] | 50 concurrent users minimum |
| Review all TODO comments (7 remaining) | [ ] | See section below |
| Create first admin account | [ ] | |
| Seed production database if needed | [ ] | |
| Verify backup/restore works | [ ] | Test with a snapshot |
| Domain live and SSL green | [ ] | |
| Announce to beta users | [ ] | |

---

## Remaining TODOs in Codebase

All 7 blockers have been resolved:

1. ~~`lib/automation/reporting.ts` — Email reporting~~ **DONE** — wired to Resend via `sendEmail()`
2. ~~`lib/automation/reporting.ts` — Slack webhook~~ **DONE** — native `fetch()` to webhook URL
3. ~~`lib/automation/cron.ts` — SEO sitemap~~ **DONE** — writes to `public/sitemap.xml`
4. ~~`lib/token-rate-limit.ts` — Analytics record~~ **DONE** — creates `Event` via Prisma
5. ~~`lib/api-client.ts` — User Profile API~~ **DONE** — route already existed, removed TODO label
6. ~~`lib/api-client.ts` — Pricing API~~ **DONE** — wired to `GET /api/pricing`
7. ~~Website Dockerfile runs as root~~ **DONE** — multi-stage build, non-root `fortress` user (UID 1001)
8. ~~CSP unsafe-inline/unsafe-eval~~ **DONE** — removed `unsafe-eval`, scoped Stripe domains
