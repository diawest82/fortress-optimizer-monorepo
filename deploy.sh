#!/bin/bash
# Deploy Fortress website to Vercel

set -e

echo "🚀 Deploying Fortress Token Optimizer website to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Navigate to website directory
cd website

echo "🔨 Building production build..."
npm run build

echo ""
echo "✅ Build successful!"
echo ""
echo "Deploying to Vercel..."
echo ""

# Deploy to Vercel
vercel deploy --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Your site is now live at: fortress-optimizer.vercel.app"
echo ""
echo "Next steps:"
echo "1. Configure custom domain in Vercel Dashboard"
echo "2. Set environment variables in Project Settings"
echo "3. Monitor deployment in Vercel Analytics"
