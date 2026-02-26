#!/bin/bash

# Fortress Token Optimizer - Deployment Verification Script
# Usage: npm run verify-deployment [project-name]

PROJECT_NAME="${1:-fortress-website}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="deployment-verification-${TIMESTAMP// /_}.txt"

echo "=================================================="
echo "Fortress Token Optimizer - Deployment Verification"
echo "=================================================="
echo ""
echo "Project: $PROJECT_NAME"
echo "Timestamp: $TIMESTAMP"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Function to print status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $2"
    ((FAILED++))
  fi
}

# 1. Verify build succeeds
echo -e "${BLUE}[1/5]${NC} Verifying build..."
if npm run build > /dev/null 2>&1; then
  print_status 0 "Build completed successfully"
else
  print_status 1 "Build failed"
fi
echo ""

# 2. Verify TypeScript compilation
echo -e "${BLUE}[2/5]${NC} Checking TypeScript..."
if npx tsc --noEmit > /dev/null 2>&1; then
  print_status 0 "TypeScript compilation successful (no errors)"
else
  print_status 1 "TypeScript compilation has errors"
fi
echo ""

# 3. Verify production files exist
echo -e "${BLUE}[3/5]${NC} Checking production build output..."
if [ -d ".next/server" ] && [ -d ".next/static" ]; then
  FILE_COUNT=$(find .next -type f | wc -l)
  print_status 0 "Production files generated ($FILE_COUNT files)"
else
  print_status 1 "Production build output incomplete"
fi
echo ""

# 4. Verify key files exist
echo -e "${BLUE}[4/5]${NC} Verifying source files..."
KEY_FILES=(
  "src/app/page.tsx"
  "src/app/layout.tsx"
  "src/context/AuthContext.tsx"
  "src/components/ProtectedRoute.tsx"
  "package.json"
  "next.config.ts"
)

FILES_OK=0
for file in "${KEY_FILES[@]}"; do
  if [ -f "$file" ]; then
    ((FILES_OK++))
  fi
done

if [ $FILES_OK -eq ${#KEY_FILES[@]} ]; then
  print_status 0 "All critical source files present ($FILES_OK/${#KEY_FILES[@]})"
else
  print_status 1 "Missing critical source files ($FILES_OK/${#KEY_FILES[@]})"
fi
echo ""

# 5. Verify git status
echo -e "${BLUE}[5/5]${NC} Checking Git status..."
UNCOMMITTED=$(git status --short | wc -l)
if [ $UNCOMMITTED -eq 0 ]; then
  print_status 0 "All changes committed (clean working directory)"
else
  print_status 1 "Uncommitted changes present ($UNCOMMITTED files)"
fi
echo ""

# Sync to hub
echo -e "${BLUE}[SYNC]${NC} Syncing to hub..."
if python3 sync_to_hub.py > /dev/null 2>&1; then
  print_status 0 "Hub sync completed"
else
  print_status 1 "Hub sync failed"
fi
echo ""

# Get deployment info
echo -e "${BLUE}[INFO]${NC} Deployment Information"
echo "---"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Next.js version: $(grep '\"next\"' package.json | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
echo "React version: $(grep '\"react\"' package.json | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
echo ""

# Summary
echo "=================================================="
echo -e "Summary: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}"
echo "=================================================="
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ Deployment verification PASSED${NC}"
  echo "Your website is ready for production!"
  echo ""
  echo "Next steps:"
  echo "  • Run: npm run dev (to test locally)"
  echo "  • Deploy to your hosting platform"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Deployment verification FAILED${NC}"
  echo "Please fix the errors above before deploying."
  echo ""
  exit 1
fi
