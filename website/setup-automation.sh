#!/bin/bash
# Automation Suite Quick Start Setup Script
# Run this to initialize the automation suite

set -e

echo "🚀 Fortress Automation Suite - Quick Start Setup"
echo "================================================"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

echo "1️⃣  Installing dependencies..."
npm install

echo "2️⃣  Generating Prisma client..."
npx prisma generate

echo "3️⃣  Creating database migration..."
# Note: This will create the migration but you may need to apply it manually
# DATABASE_URL="$DATABASE_URL" npx prisma migrate dev --name "automation_suite"

echo "4️⃣  Creating .env.local if it doesn't exist..."
if [ ! -f .env.local ]; then
    cat > .env.local << 'EOF'
# Existing
DATABASE_URL="postgres://..."
PRISMA_DATABASE_URL="prisma+postgres://..."

# Analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=true

# Email Service (choose one)
SENDGRID_API_KEY=""
RESEND_API_KEY=""

# Slack Integration
SLACK_WEBHOOK_URL=""

# Cron Security
CRON_SECRET="your-secure-cron-secret-here"

# Add your other environment variables here
EOF
    echo "✅ Created .env.local - Please add your API keys"
else
    echo "⏭️  .env.local already exists"
fi

echo ""
echo "5️⃣  Seeding initial email sequences..."
# This would run a seed script - for now just log
echo "⏭️  Email sequences can be created via API or database directly"

echo ""
echo "✅ Automation Suite Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env.local with API keys (SendGrid, Slack, etc.)"
echo "2. Apply database migrations: DATABASE_URL=... npx prisma migrate deploy"
echo "3. Create email sequences in the database"
echo "4. Set up cron jobs (see AUTOMATION_SUITE_GUIDE.md)"
echo "5. Test tracking with: curl -X POST http://localhost:3000/api/analytics/track"
echo ""
echo "For detailed setup instructions, see AUTOMATION_SUITE_GUIDE.md"
