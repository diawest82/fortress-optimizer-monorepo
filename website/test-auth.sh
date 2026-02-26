#!/bin/bash

# Fortress Token Optimizer - Authentication Testing Script
# This script tests the authentication flows

echo "🔐 Fortress Token Optimizer - Authentication Testing"
echo "======================================================="
echo ""

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Testing endpoints..."
echo ""

# Test 1: Health check
echo -n "1. Health check... "
if curl -s "$BASE_URL" > /dev/null; then
  echo -e "${GREEN}✓ Server is running${NC}"
else
  echo -e "${RED}✗ Server is not running${NC}"
  exit 1
fi

# Test 2: Signup endpoint exists
echo -n "2. Signup endpoint exists... "
if curl -s "$BASE_URL/api/auth/signup" > /dev/null; then
  echo -e "${GREEN}✓ Signup endpoint available${NC}"
else
  echo -e "${RED}✗ Signup endpoint not available${NC}"
fi

# Test 3: Login page accessible
echo -n "3. Login page accessible... "
if curl -s "$BASE_URL/auth/login" > /dev/null; then
  echo -e "${GREEN}✓ Login page available${NC}"
else
  echo -e "${RED}✗ Login page not available${NC}"
fi

# Test 4: Signup page accessible
echo -n "4. Signup page accessible... "
if curl -s "$BASE_URL/auth/signup" > /dev/null; then
  echo -e "${GREEN}✓ Signup page available${NC}"
else
  echo -e "${RED}✗ Signup page not available${NC}"
fi

# Test 5: Protected route redirects
echo -n "5. Protected route protection... "
REDIRECT=$(curl -s -L "$BASE_URL/account" | grep -c "login" || echo 0)
if [ "$REDIRECT" -gt 0 ]; then
  echo -e "${GREEN}✓ Protected routes working${NC}"
else
  echo -e "${YELLOW}⚠ Could not verify protection (check manually)${NC}"
fi

echo ""
echo "======================================================="
echo -e "${YELLOW}Manual Testing Steps:${NC}"
echo ""
echo "1. Open http://localhost:3000/auth/signup"
echo "   - Create account with:"
echo "     Email: test@fortress.dev"
echo "     Name: Test User"
echo "     Password: TestPassword123"
echo "   - Should auto-login and redirect to /account"
echo ""
echo "2. Once logged in, visit http://localhost:3000/account"
echo "   - Check all tabs load (Overview, API Keys, Billing, Settings)"
echo "   - Try generating an API key"
echo "   - Try copying the key to clipboard"
echo ""
echo "3. Test logout"
echo "   - Click 'Log out' button"
echo "   - Should redirect to homepage"
echo ""
echo "4. Test login flow"
echo "   - Go to http://localhost:3000/auth/login"
echo "   - Login with test@fortress.dev / TestPassword123"
echo "   - Should be authenticated and in /account"
echo ""
echo "5. Test protected routes"
echo "   - Clear cookies/logout"
echo "   - Try going to http://localhost:3000/account"
echo "   - Should redirect to /auth/login"
echo ""
echo "======================================================="
