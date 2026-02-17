# Deployment Guide - Fortress Optimizer Website

**Build Status**: ✅ SUCCESSFUL  
**Date**: February 17, 2026  
**Version**: 0.1.0

---

## Quick Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Why Vercel?**
- Native Next.js support
- Automatic deployments from GitHub
- Zero-config deployments
- Built-in performance monitoring
- Edge functions support

**Steps**:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Configure environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SENTRY_DSN
# - SENTRY_DSN
# - DATABASE_URL
# - Next Auth Secret
# - All other environment variables from .env.local
```

**Benefits**:
- Automatic Git integration
- Preview deployments for PRs
- Serverless deployment
- Free tier available
- Analytics included

---

### Option 2: Docker + Cloud Run (Google Cloud)

**Dockerfile**:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build app
COPY . .
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

**Deploy**:

```bash
# Build Docker image
docker build -t fortress-optimizer:latest .

# Push to Google Container Registry
docker tag fortress-optimizer:latest gcr.io/PROJECT_ID/fortress-optimizer:latest
docker push gcr.io/PROJECT_ID/fortress-optimizer:latest

# Deploy to Cloud Run
gcloud run deploy fortress-optimizer \
  --image gcr.io/PROJECT_ID/fortress-optimizer:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=postgres://... \
  --allow-unauthenticated
```

---

### Option 3: Traditional Server (Ubuntu/CentOS)

**System Setup**:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <repository-url> /var/www/fortress-optimizer
cd /var/www/fortress-optimizer

# Install dependencies
npm ci

# Build
npm run build

# Start with PM2
pm2 start npm --name "fortress-optimizer" -- start
pm2 save
pm2 startup
```

**Nginx Configuration**:

```nginx
server {
    listen 80;
    server_name example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Option 4: AWS App Runner

```bash
# Create ECR repository
aws ecr create-repository --repository-name fortress-optimizer

# Build and push
docker build -t fortress-optimizer .
docker tag fortress-optimizer:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fortress-optimizer:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fortress-optimizer:latest

# Deploy via AWS Console or CLI
aws apprunner create-service \
  --service-name fortress-optimizer \
  --source-configuration ImageRepository='{...}' \
  --cpu 1 \
  --memory 2 \
  --port 3000
```

---

## Environment Variables Checklist

**Required for Production**:

```env
# Database
DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require

# Next Auth
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=https://yourdomain.com

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry-domain.ingest.sentry.io/project
SENTRY_DSN=https://key@sentry-domain.ingest.sentry.io/project
NEXT_PUBLIC_SENTRY_ENV=production
SENTRY_ENV=production

# Application
NEXT_PUBLIC_APP_VERSION=0.1.0
APP_VERSION=0.1.0

# Email (if using Sendgrid/Mailgun)
SENDGRID_API_KEY=<your-key>
MAILGUN_API_KEY=<your-key>
```

---

## Pre-Deployment Checklist

- [x] Build successful (`npm run build`)
- [x] Tests passing (`npm run test:all`)
- [x] Type checking (`npm run type-check`)
- [x] Linting (`npm run lint`)
- [ ] Environment variables configured
- [ ] Database backups configured
- [ ] Error tracking (Sentry) set up
- [ ] Performance monitoring enabled
- [ ] Security headers verified
- [ ] HTTPS/TLS certificate ready
- [ ] DNS records updated
- [ ] Analytics configured
- [ ] Email service ready
- [ ] File uploads configured (if needed)

---

## Post-Deployment Verification

### Health Check
```bash
curl https://yourdomain.com/api/health
# Should return: { "status": "ok" }
```

### Security Headers
```bash
curl -I https://yourdomain.com
# Verify these headers are present:
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
# - Content-Security-Policy
```

### Database Connection
```bash
curl https://yourdomain.com/api/db-check
# Should return: { "connected": true }
```

### Error Tracking
1. Go to Sentry dashboard
2. Verify recent deployments are recorded
3. Trigger test error: `https://yourdomain.com/api/test-error`

### Performance Monitoring
1. Check Web Vitals in monitoring dashboard
2. Verify Core Web Vitals are being tracked
3. Monitor API response times

---

## Rollback Plan

If something goes wrong:

```bash
# For Vercel:
vercel rollback

# For Docker/Cloud Run:
gcloud run deploy fortress-optimizer \
  --image gcr.io/PROJECT_ID/fortress-optimizer:previous-version

# For Traditional Server:
pm2 restart fortress-optimizer
# Or revert git commit and rebuild:
git revert <commit-hash>
npm run build
pm2 restart fortress-optimizer
```

---

## Monitoring & Logging

### Sentry
- All errors automatically reported
- Real-time alerts configured
- Performance monitoring enabled

### Application Logs
```bash
# Vercel
vercel logs

# Docker/Cloud Run
gcloud run logs read fortress-optimizer

# Traditional Server
pm2 logs fortress-optimizer

# File logs
tail -f /var/log/fortress-optimizer.log
```

### Database Monitoring
```bash
# Automated backups
npm run backup:list

# Verify backup
npm run backup:verify <backup-file>

# Check backup schedule with cron
crontab -l
```

---

## Continuous Deployment

### GitHub Actions (Already Configured)

Deployments automatically trigger on:
- Push to `main` branch → Production
- Push to `develop` branch → Staging
- Pull requests → Preview deployment

**Verify**:
1. Go to GitHub repository
2. Navigate to "Actions" tab
3. Check "CI/CD Pipeline" workflow
4. Confirm recent runs are successful

---

## Performance Optimization

After deployment, monitor and optimize:

1. **Core Web Vitals**
   - LCP (Largest Contentful Paint) - target: < 2.5s
   - FID (First Input Delay) - target: < 100ms
   - CLS (Cumulative Layout Shift) - target: < 0.1

2. **API Response Times**
   - Target: < 200ms average
   - P95: < 500ms
   - P99: < 1000ms

3. **Bundle Size**
   ```bash
   npm run build
   # Check .next/static directory size
   ```

4. **Database Queries**
   - Enable query logging
   - Monitor slow queries
   - Add indexes as needed

---

## Security Verification

1. **HTTPS/TLS**
   - Certificate valid and not expired
   - Use SSL Labs to verify: https://www.ssllabs.com/ssltest/

2. **Security Headers**
   - Run through: https://securityheaders.com/
   - Should get A+ rating

3. **OWASP Checks**
   - Run OWASP ZAP scan
   - Address vulnerabilities
   - Keep dependencies updated

4. **Database Security**
   - Connection uses SSL/TLS
   - Strong passwords configured
   - Regular backups verified

---

## Support & Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
```bash
# Test connection
npm run test:db-connection

# Check DATABASE_URL format
echo $DATABASE_URL
```

### Performance Issues
```bash
# Check metrics
curl https://yourdomain.com/api/metrics

# Monitor in real-time
npm run monitor:performance
```

### Error Tracking Not Working
1. Verify Sentry DSN is correct
2. Check SENTRY_ENABLED=true in production
3. Trigger test error: `curl https://yourdomain.com/api/test-error`

---

## Useful Commands

```bash
# Local development
npm run dev          # Start dev server

# Production build
npm run build        # Build for production
npm start            # Run production server

# Testing
npm run test:all     # Run all tests
npm run test:e2e     # Run E2E tests

# Database
npm run backup:full  # Create backup
npm run backup:list  # List backups

# Monitoring
npm run monitor:logs # View logs
```

---

## Next Steps

1. Choose deployment platform
2. Configure environment variables
3. Set up monitoring and alerts
4. Configure automated backups
5. Enable GitHub Actions
6. Monitor deployment
7. Optimize performance
8. Scale as needed

---

**Deployment Date**: February 17, 2026  
**Status**: Ready for Production  
**Support**: See SECURITY.md and IMPLEMENTATION_COMPLETE.md
