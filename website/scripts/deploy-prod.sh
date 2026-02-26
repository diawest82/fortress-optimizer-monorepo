#!/bin/bash

# Production Deployment Script
# Usage: ./scripts/deploy-prod.sh [vercel|docker|server]

set -e

PLATFORM=${1:-vercel}
ENVIRONMENT="production"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="deployment_${TIMESTAMP}.log"

echo "🚀 Starting Production Deployment" | tee -a "$LOG_FILE"
echo "Platform: $PLATFORM" | tee -a "$LOG_FILE"
echo "Environment: $ENVIRONMENT" | tee -a "$LOG_FILE"
echo "Timestamp: $TIMESTAMP" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"

# Pre-deployment checks
echo "📋 Running pre-deployment checks..." | tee -a "$LOG_FILE"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ ERROR: .env.local not found!" | tee -a "$LOG_FILE"
    echo "Please create .env.local from .env.example" | tee -a "$LOG_FILE"
    exit 1
fi

# Check required dependencies
echo "✅ Checking dependencies..." | tee -a "$LOG_FILE"
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

# Check environment variables
echo "✅ Validating environment variables..." | tee -a "$LOG_FILE"
required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXT_PUBLIC_SENTRY_DSN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "⚠️  WARNING: $var is not set in .env.local" | tee -a "$LOG_FILE"
    else
        echo "✅ $var is configured" | tee -a "$LOG_FILE"
    fi
done

# Install dependencies
echo "📦 Installing dependencies..." | tee -a "$LOG_FILE"
npm ci --production 2>&1 | tee -a "$LOG_FILE"

# Run tests
echo "🧪 Running tests..." | tee -a "$LOG_FILE"
npm run test:all 2>&1 | tee -a "$LOG_FILE" || {
    echo "❌ Tests failed!" | tee -a "$LOG_FILE"
    exit 1
}

# Type checking
echo "🔍 Running type check..." | tee -a "$LOG_FILE"
npm run type-check 2>&1 | tee -a "$LOG_FILE" || {
    echo "⚠️  Type checking failed (but continuing)" | tee -a "$LOG_FILE"
}

# Build
echo "🔨 Building application..." | tee -a "$LOG_FILE"
npm run build 2>&1 | tee -a "$LOG_FILE" || {
    echo "❌ Build failed!" | tee -a "$LOG_FILE"
    exit 1
}

# Deploy based on platform
case $PLATFORM in
    vercel)
        echo "🌐 Deploying to Vercel..." | tee -a "$LOG_FILE"
        command -v vercel >/dev/null 2>&1 || {
            echo "📥 Installing Vercel CLI..." | tee -a "$LOG_FILE"
            npm install -g vercel
        }
        vercel --prod 2>&1 | tee -a "$LOG_FILE"
        echo "✅ Vercel deployment complete!" | tee -a "$LOG_FILE"
        ;;
    
    docker)
        echo "🐳 Building Docker image..." | tee -a "$LOG_FILE"
        docker build -t fortress-optimizer:${TIMESTAMP} . 2>&1 | tee -a "$LOG_FILE"
        echo "✅ Docker image built successfully!" | tee -a "$LOG_FILE"
        echo "Run: docker run -p 3000:3000 fortress-optimizer:${TIMESTAMP}" | tee -a "$LOG_FILE"
        ;;
    
    server)
        echo "🖥️  Preparing for server deployment..." | tee -a "$LOG_FILE"
        echo "Build artifacts ready in .next/" | tee -a "$LOG_FILE"
        echo "Next steps:" | tee -a "$LOG_FILE"
        echo "1. Copy .next/ and package.json to server" | tee -a "$LOG_FILE"
        echo "2. Run: npm ci --production" | tee -a "$LOG_FILE"
        echo "3. Run: npm start" | tee -a "$LOG_FILE"
        echo "4. Or use PM2: pm2 start npm --name fortress -- start" | tee -a "$LOG_FILE"
        ;;
    
    *)
        echo "❌ Unknown platform: $PLATFORM" | tee -a "$LOG_FILE"
        echo "Usage: ./scripts/deploy-prod.sh [vercel|docker|server]" | tee -a "$LOG_FILE"
        exit 1
        ;;
esac

# Backup
echo "💾 Creating database backup..." | tee -a "$LOG_FILE"
npm run backup:full 2>&1 | tee -a "$LOG_FILE" || {
    echo "⚠️  Backup creation failed (continuing)" | tee -a "$LOG_FILE"
}

# Summary
echo "================================" | tee -a "$LOG_FILE"
echo "✅ Deployment process complete!" | tee -a "$LOG_FILE"
echo "📝 Log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"

# Post-deployment checks (after deployment is live)
echo "⏳ Waiting 30 seconds for deployment to stabilize..." | tee -a "$LOG_FILE"
sleep 30

echo "🔍 Running post-deployment checks..." | tee -a "$LOG_FILE"

# These checks would need the production URL
if [ -n "$PRODUCTION_URL" ]; then
    echo "Testing health endpoint..." | tee -a "$LOG_FILE"
    curl -s "${PRODUCTION_URL}/api/health" | tee -a "$LOG_FILE" || {
        echo "⚠️  Health check failed" | tee -a "$LOG_FILE"
    }
fi

echo "✨ Deployment completed successfully!" | tee -a "$LOG_FILE"
