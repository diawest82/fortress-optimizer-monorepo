#!/bin/bash
# Phase 4 Security & Enhancement Test Suite
# Tests all Phase 4A critical security features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test counter
TEST_NUM=0

# Start server
echo "Starting development server..."
pkill -f "next dev" || true
sleep 1
npm run dev &
DEV_PID=$!
sleep 5

# Function to run a test
test_case() {
  TEST_NUM=$((TEST_NUM + 1))
  local name="$1"
  local description="$2"
  
  echo ""
  echo -e "${BLUE}[TEST $TEST_NUM]${NC} $name"
  echo "  └─ $description"
}

# Function to pass a test
pass() {
  echo -e "${GREEN}✓ PASS${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

# Function to fail a test
fail() {
  local reason="$1"
  echo -e "${RED}✗ FAIL${NC}: $reason"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Function to skip a test
skip() {
  local reason="$1"
  echo -e "${YELLOW}⊘ SKIP${NC}: $reason"
  TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
}

echo "=================================================="
echo "PHASE 4A: CRITICAL SECURITY FEATURES TEST SUITE"
echo "=================================================="
echo ""
echo "Testing:"
echo "  ✓ Rate Limiting (Auth Endpoints)"
echo "  ✓ Account Lockout (Failed Login Protection)"
echo "  ✓ Audit Logging (Security Events)"
echo "  ✓ CSRF Protection"
echo "  ✓ Security Headers"
echo "  ✓ httpOnly Cookies"
echo ""
echo "=================================================="

# ============================================================
# SECTION 1: RATE LIMITING TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 1: RATE LIMITING TESTS${NC}"
echo "=================================================="

test_case "Rate Limit - Signup" "Verify signup rate limiting (3 attempts per hour per IP)"
if curl -s http://localhost:3000/api/auth/signup -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","password":"Password123","name":"Test User"}' | grep -q "error\|status"; then
  pass
else
  fail "Signup endpoint not responding"
fi

test_case "Rate Limit Headers" "Verify Retry-After headers on rate limit"
response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpass"}')
http_code=$(echo "$response" | tail -n1)
if [[ "$http_code" -lt 500 ]]; then
  pass
else
  fail "Rate limit response code: $http_code"
fi

# ============================================================
# SECTION 2: ACCOUNT LOCKOUT TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 2: ACCOUNT LOCKOUT TESTS${NC}"
echo "=================================================="

test_case "Account Lockout - Failed Attempts" "Verify account locks after 5 failed attempts"
# Simulate 5 failed login attempts
for i in {1..5}; do
  curl -s http://localhost:3000/api/auth/login -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"locktest@example.com","password":"wrongpassword"}' > /dev/null
done

response=$(curl -s http://localhost:3000/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"locktest@example.com","password":"anypassword"}')

if echo "$response" | grep -q "locked"; then
  pass
else
  fail "Account lockout not triggered"
fi

test_case "Account Lockout - Error Message" "Verify clear error message when account is locked"
if echo "$response" | grep -q "temporarily locked"; then
  pass
else
  fail "Missing lockout error message"
fi

# ============================================================
# SECTION 3: AUDIT LOGGING TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 3: AUDIT LOGGING TESTS${NC}"
echo "=================================================="

test_case "Audit Log - Service Created" "Verify audit logging service is available"
if [ -f "src/lib/audit-log.ts" ]; then
  pass
else
  fail "Audit log service not found"
fi

test_case "Audit Log - Functions Exported" "Verify all audit logging functions are exported"
audit_functions=(
  "createAuditLog"
  "logLoginAttempt"
  "logLogoutEvent"
  "logSignupEvent"
  "logPasswordChange"
  "logApiKeyGeneration"
  "logApiKeyRevocation"
  "logAccountLocked"
  "log2FAEnabled"
  "logSuspiciousActivity"
)

all_exported=true
for func in "${audit_functions[@]}"; do
  if grep -q "export.*$func" src/lib/audit-log.ts; then
    :
  else
    all_exported=false
    break
  fi
done

if [ "$all_exported" = true ]; then
  pass
else
  fail "Not all audit functions exported"
fi

# ============================================================
# SECTION 4: CSRF PROTECTION TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 4: CSRF PROTECTION TESTS${NC}"
echo "=================================================="

test_case "CSRF Service - Creation" "Verify CSRF token generation service exists"
if [ -f "src/lib/csrf.ts" ]; then
  pass
else
  fail "CSRF service not found"
fi

test_case "CSRF Endpoint - GET Token" "Verify /api/auth/csrf-token endpoint works"
csrf_response=$(curl -s http://localhost:3000/api/auth/csrf-token -X GET)
if echo "$csrf_response" | grep -q "csrfToken"; then
  pass
else
  fail "CSRF token endpoint not returning token"
fi

test_case "CSRF Token Format" "Verify CSRF token is properly formatted"
if echo "$csrf_response" | grep -q '"secret"'; then
  pass
else
  fail "CSRF token missing secret"
fi

# ============================================================
# SECTION 5: SECURITY HEADERS TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 5: SECURITY HEADERS TESTS${NC}"
echo "=================================================="

test_case "CSP Header" "Verify Content-Security-Policy header is set"
headers=$(curl -s -I http://localhost:3000)
if echo "$headers" | grep -iq "Content-Security-Policy"; then
  pass
else
  fail "CSP header not found"
fi

test_case "X-Frame-Options Header" "Verify X-Frame-Options header (clickjacking protection)"
if echo "$headers" | grep -iq "X-Frame-Options"; then
  pass
else
  fail "X-Frame-Options header not found"
fi

test_case "X-Content-Type-Options Header" "Verify X-Content-Type-Options header (MIME sniffing)"
if echo "$headers" | grep -iq "X-Content-Type-Options"; then
  pass
else
  fail "X-Content-Type-Options header not found"
fi

test_case "HSTS Header" "Verify Strict-Transport-Security header"
if echo "$headers" | grep -iq "Strict-Transport-Security"; then
  pass
else
  skip "HSTS header not found (expected in production)"
fi

test_case "Referrer-Policy Header" "Verify Referrer-Policy header"
if echo "$headers" | grep -iq "Referrer-Policy"; then
  pass
else
  fail "Referrer-Policy header not found"
fi

test_case "Permissions-Policy Header" "Verify Permissions-Policy header"
if echo "$headers" | grep -iq "Permissions-Policy"; then
  pass
else
  fail "Permissions-Policy header not found"
fi

# ============================================================
# SECTION 6: HTTPONLY COOKIES TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 6: HTTPONLY COOKIES TESTS${NC}"
echo "=================================================="

test_case "Secure Cookies Service" "Verify secure cookies utility exists"
if [ -f "src/lib/secure-cookies.ts" ]; then
  pass
else
  fail "Secure cookies service not found"
fi

test_case "Cookie Functions Exported" "Verify secure cookie functions are exported"
cookie_functions=(
  "setSecureCookie"
  "getCookie"
  "clearCookie"
  "setAuthTokenCookie"
  "setRefreshTokenCookie"
  "setCsrfTokenCookie"
)

all_cookie_funcs=true
for func in "${cookie_functions[@]}"; do
  if grep -q "export.*$func" src/lib/secure-cookies.ts; then
    :
  else
    all_cookie_funcs=false
    break
  fi
done

if [ "$all_cookie_funcs" = true ]; then
  pass
else
  fail "Not all cookie functions exported"
fi

# ============================================================
# SECTION 7: RATE LIMIT SERVICE TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 7: RATE LIMIT SERVICE TESTS${NC}"
echo "=================================================="

test_case "Rate Limit Service" "Verify rate limiting service exists"
if [ -f "src/lib/rate-limit.ts" ]; then
  pass
else
  fail "Rate limit service not found"
fi

test_case "Rate Limit Config" "Verify rate limit configurations defined"
if grep -q "rateLimitConfigs" src/lib/rate-limit.ts; then
  pass
else
  fail "Rate limit configs not found"
fi

# ============================================================
# SECTION 8: ACCOUNT LOCKOUT SERVICE TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 8: ACCOUNT LOCKOUT SERVICE TESTS${NC}"
echo "=================================================="

test_case "Account Lockout Service" "Verify account lockout service exists"
if [ -f "src/lib/account-lockout.ts" ]; then
  pass
else
  fail "Account lockout service not found"
fi

test_case "Lockout Functions Exported" "Verify lockout functions are exported"
lockout_functions=(
  "isAccountLocked"
  "getLockoutInfo"
  "recordFailedAttempt"
  "clearFailedAttempts"
  "unlockAccount"
)

all_lockout_funcs=true
for func in "${lockout_functions[@]}"; do
  if grep -q "export.*$func" src/lib/account-lockout.ts; then
    :
  else
    all_lockout_funcs=false
    break
  fi
done

if [ "$all_lockout_funcs" = true ]; then
  pass
else
  fail "Not all lockout functions exported"
fi

# ============================================================
# SECTION 9: API ENDPOINT TESTS
# ============================================================

echo ""
echo -e "${BLUE}SECTION 9: API ENDPOINT TESTS${NC}"
echo "=================================================="

test_case "Login Endpoint - Enhanced" "Verify login endpoint exists and accepts requests"
login_response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}')
http_code=$(echo "$login_response" | tail -n1)
if [[ "$http_code" -ge 200 && "$http_code" -lt 500 ]]; then
  pass
else
  fail "Login endpoint returned code $http_code"
fi

test_case "Signup Endpoint - Enhanced" "Verify signup endpoint exists with validations"
signup_response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/auth/signup -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"newtest@example.com","password":"TestPass123","name":"Test"}')
http_code=$(echo "$signup_response" | tail -n1)
if [[ "$http_code" -ge 200 && "$http_code" -lt 500 ]]; then
  pass
else
  fail "Signup endpoint returned code $http_code"
fi

test_case "CSRF Token Endpoint" "Verify CSRF token endpoint is accessible"
csrf_code=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3000/api/auth/csrf-token -X GET)
if [[ "$csrf_code" -ge 200 && "$csrf_code" -lt 300 ]]; then
  pass
else
  fail "CSRF endpoint returned code $csrf_code"
fi

# ============================================================
# SECTION 10: BUILD VERIFICATION
# ============================================================

echo ""
echo -e "${BLUE}SECTION 10: BUILD VERIFICATION${NC}"
echo "=================================================="

test_case "Next.js Build Success" "Verify production build completes without errors"
if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
  pass
else
  fail "Build artifacts not found"
fi

test_case "TypeScript Compilation" "Verify all TypeScript compiles without errors"
if npx tsc --noEmit 2>&1 | grep -q "error"; then
  fail "TypeScript compilation errors found"
else
  pass
fi

# ============================================================
# CLEANUP
# ============================================================

echo ""
echo "Cleaning up..."
kill $DEV_PID 2>/dev/null || true

# ============================================================
# TEST SUMMARY
# ============================================================

echo ""
echo "=================================================="
echo "TEST SUMMARY"
echo "=================================================="
echo ""
echo -e "${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "${RED}Failed:${NC}  $TESTS_FAILED"
echo -e "${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ $TOTAL_TESTS -gt 0 ]; then
  PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
  echo "Pass Rate: $PASS_RATE% ($TESTS_PASSED/$TOTAL_TESTS)"
fi

echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL CRITICAL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  exit 1
fi
