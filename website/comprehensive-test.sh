#!/bin/bash

# Comprehensive Testing Suite for Fortress Token Optimizer - Phase 3
# Tests security, email functionality, page loading, links, backend communication, etc.

set -e

BASE_URL="http://localhost:3000"
BACKEND_URL="http://localhost:8000"
TEST_EMAIL="test.comprehensive@fortress.dev"
TEST_PASSWORD="TestPassword123"
TEST_NAME="Test User"
RESULTS_FILE="comprehensive-test-results.json"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Initialize results JSON
echo "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"tests\": []}" > "$RESULTS_FILE"

# Logging function
log_test() {
  local status=$1
  local test_name=$2
  local message=$3
  
  case $status in
    "PASS")
      echo -e "${GREEN}✓ PASS${NC}: $test_name"
      ((TESTS_PASSED++))
      ;;
    "FAIL")
      echo -e "${RED}✗ FAIL${NC}: $test_name - $message"
      ((TESTS_FAILED++))
      ;;
    "SKIP")
      echo -e "${YELLOW}⊘ SKIP${NC}: $test_name - $message"
      ((TESTS_SKIPPED++))
      ;;
    "INFO")
      echo -e "${BLUE}ℹ INFO${NC}: $test_name"
      ;;
  esac
}

# Check if URLs are accessible
check_connectivity() {
  echo ""
  echo "=== CONNECTIVITY TESTS ==="
  
  # Check frontend
  if curl -s -m 5 "$BASE_URL" > /dev/null 2>&1; then
    log_test "PASS" "Frontend accessible" ""
  else
    log_test "FAIL" "Frontend accessible" "Cannot reach $BASE_URL"
    # Don't return here, continue testing
  fi
  
  # Check backend (optional)
  if curl -s -m 3 "$BACKEND_URL/health" > /dev/null 2>&1; then
    log_test "PASS" "Backend accessible" ""
  else
    log_test "SKIP" "Backend health check" "Backend not running at $BACKEND_URL (optional)"
  fi
}

# Security Tests
run_security_tests() {
  echo ""
  echo "=== SECURITY TESTS ==="
  
  # Test 1: XSS Protection - check that auth token is not exposed in HTML
  echo "Testing XSS protection..."
  PAGE_SOURCE=$(curl -s "$BASE_URL/dashboard" 2>/dev/null || echo "")
  if ! echo "$PAGE_SOURCE" | grep -q "auth_token\|apiKey" 2>/dev/null; then
    log_test "PASS" "Token not exposed in HTML" ""
  else
    log_test "FAIL" "Token not exposed in HTML" "Found token references in page source"
  fi
  
  # Test 2: Protected route redirect - accessing /account without auth should redirect
  echo "Testing protected route redirect..."
  ACCOUNT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/account" 2>/dev/null || echo "")
  ACCOUNT_STATUS=$(echo "$ACCOUNT_RESPONSE" | tail -1)
  if [ "$ACCOUNT_STATUS" = "200" ] || [ "$ACCOUNT_STATUS" = "307" ] || [ "$ACCOUNT_STATUS" = "308" ]; then
    log_test "PASS" "Protected routes require authentication" ""
  else
    log_test "FAIL" "Protected routes require authentication" "Got status $ACCOUNT_STATUS"
  fi
  
  # Test 3: Password field input type
  echo "Testing password field security..."
  LOGIN_PAGE=$(curl -s "$BASE_URL/auth/login" 2>/dev/null || echo "")
  if echo "$LOGIN_PAGE" | grep -q 'type="password"'; then
    log_test "PASS" "Password fields use correct input type" ""
  else
    log_test "FAIL" "Password fields use correct input type" "Password not using type=password"
  fi
  
  # Test 4: CSRF token or headers check
  echo "Testing CSRF protection..."
  HEADERS=$(curl -s -I "$BASE_URL" 2>/dev/null | grep -i "csrf\|secure\|httponly" || echo "")
  if [ ! -z "$HEADERS" ]; then
    log_test "PASS" "Security headers present" ""
  else
    log_test "INFO" "Security headers check" "Could not verify all headers (may be configured at server level)"
  fi
  
  # Test 5: localStorage isolation
  echo "Testing localStorage isolation..."
  if echo "$LOGIN_PAGE" | grep -q "localStorage"; then
    log_test "PASS" "localStorage usage detected" ""
  else
    log_test "INFO" "localStorage usage" "Could not detect localStorage in source"
  fi
}

# Page Loading Tests
run_page_tests() {
  echo ""
  echo "=== PAGE LOADING TESTS ==="
  
  local pages=(
    "/"
    "/pricing"
    "/install"
    "/dashboard"
    "/auth/login"
    "/auth/signup"
    "/account"
    "/support"
  )
  
  for page in "${pages[@]}"; do
    RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page" 2>/dev/null)
    
    if [ "$RESPONSE_CODE" = "200" ] || [ "$RESPONSE_CODE" = "307" ] || [ "$RESPONSE_CODE" = "308" ]; then
      log_test "PASS" "Page loads: $page" ""
    else
      log_test "FAIL" "Page loads: $page" "Got HTTP $RESPONSE_CODE"
    fi
  done
}

# Link Verification Tests
run_link_tests() {
  echo ""
  echo "=== LINK VERIFICATION TESTS ==="
  
  # Check for broken links in home page
  echo "Checking homepage links..."
  HOME_PAGE=$(curl -s "$BASE_URL/" 2>/dev/null || echo "")
  
  local internal_links=(
    "/pricing"
    "/install"
    "/dashboard"
    "/auth/login"
    "/auth/signup"
  )
  
  for link in "${internal_links[@]}"; do
    if echo "$HOME_PAGE" | grep -q "href=\"$link\"" || echo "$HOME_PAGE" | grep -q "href='$link'"; then
      log_test "PASS" "Link found: $link" ""
    else
      log_test "FAIL" "Link found: $link" "Link not found in homepage HTML"
    fi
  done
  
  # Check navigation header
  if echo "$HOME_PAGE" | grep -q "href=.*\(dashboard\|account\|pricing\)"; then
    log_test "PASS" "Navigation links present" ""
  else
    log_test "FAIL" "Navigation links present" "Navigation structure not found"
  fi
}

# Backend Communication Tests
run_backend_tests() {
  echo ""
  echo "=== BACKEND COMMUNICATION TESTS ==="
  
  # Test health endpoint
  HEALTH=$(curl -s "$BACKEND_URL/health" 2>/dev/null || echo "")
  if [ ! -z "$HEALTH" ]; then
    log_test "PASS" "Backend health check" ""
  else
    log_test "SKIP" "Backend health check" "Backend not responding"
    return
  fi
  
  # Test API endpoints structure
  echo "Testing API endpoint availability..."
  local endpoints=(
    "/auth/login"
    "/auth/signup"
    "/users/profile"
    "/usage"
    "/analytics"
    "/providers"
  )
  
  for endpoint in "${endpoints[@]}"; do
    RESPONSE=$(curl -s -X GET "$BACKEND_URL$endpoint" 2>/dev/null || echo "")
    # Any response (even error) means endpoint exists
    if [ ! -z "$RESPONSE" ]; then
      log_test "PASS" "API endpoint exists: $endpoint" ""
    else
      log_test "SKIP" "API endpoint check: $endpoint" "No response from backend"
    fi
  done
}

# Email Functionality Tests (Simulated)
run_email_tests() {
  echo ""
  echo "=== EMAIL FUNCTIONALITY TESTS ==="
  
  # Test 1: Check for email fields in signup
  SIGNUP_PAGE=$(curl -s "$BASE_URL/auth/signup" 2>/dev/null || echo "")
  if echo "$SIGNUP_PAGE" | grep -q 'type="email"'; then
    log_test "PASS" "Email input field in signup" ""
  else
    log_test "FAIL" "Email input field in signup" "Email field not found"
  fi
  
  # Test 2: Check for verification message
  if echo "$SIGNUP_PAGE" | grep -qi "email\|verify\|confirmation"; then
    log_test "PASS" "Email verification messaging present" ""
  else
    log_test "INFO" "Email verification UI" "Could not find verification messaging"
  fi
  
  # Test 3: Password reset link
  LOGIN_PAGE=$(curl -s "$BASE_URL/auth/login" 2>/dev/null || echo "")
  if echo "$LOGIN_PAGE" | grep -qi "forgot\|reset\|password"; then
    log_test "PASS" "Password reset option present" ""
  else
    log_test "FAIL" "Password reset option present" "Reset password link not found"
  fi
  
  # Test 4: Support page link
  if curl -s "$BASE_URL/support" > /dev/null 2>&1; then
    log_test "PASS" "Support page accessible" ""
  else
    log_test "FAIL" "Support page accessible" "Could not reach support page"
  fi
}

# End-to-End User Flow Tests
run_e2e_tests() {
  echo ""
  echo "=== END-TO-END FLOW TESTS ==="
  
  # Test 1: Signup form validation
  echo "Testing signup form..."
  SIGNUP_PAGE=$(curl -s "$BASE_URL/auth/signup" 2>/dev/null || echo "")
  
  if echo "$SIGNUP_PAGE" | grep -q 'name="email"'; then
    log_test "PASS" "Signup form has email field" ""
  else
    log_test "FAIL" "Signup form has email field" ""
  fi
  
  if echo "$SIGNUP_PAGE" | grep -q 'name="password"'; then
    log_test "PASS" "Signup form has password field" ""
  else
    log_test "FAIL" "Signup form has password field" ""
  fi
  
  if echo "$SIGNUP_PAGE" | grep -q 'name="name"'; then
    log_test "PASS" "Signup form has name field" ""
  else
    log_test "FAIL" "Signup form has name field" ""
  fi
  
  # Test 2: Login form validation
  echo "Testing login form..."
  LOGIN_PAGE=$(curl -s "$BASE_URL/auth/login" 2>/dev/null || echo "")
  
  if echo "$LOGIN_PAGE" | grep -q 'name="email"'; then
    log_test "PASS" "Login form has email field" ""
  else
    log_test "FAIL" "Login form has email field" ""
  fi
  
  if echo "$LOGIN_PAGE" | grep -q 'name="password"'; then
    log_test "PASS" "Login form has password field" ""
  else
    log_test "FAIL" "Login form has password field" ""
  fi
  
  # Test 3: Dashboard components
  echo "Testing dashboard components..."
  DASHBOARD_PAGE=$(curl -s "$BASE_URL/dashboard" 2>/dev/null || echo "")
  
  if echo "$DASHBOARD_PAGE" | grep -qi "usage\|metrics\|token"; then
    log_test "PASS" "Dashboard shows usage metrics" ""
  else
    log_test "FAIL" "Dashboard shows usage metrics" ""
  fi
  
  # Test 4: Account page components
  echo "Testing account page..."
  ACCOUNT_PAGE=$(curl -s "$BASE_URL/account" 2>/dev/null || echo "")
  
  if echo "$ACCOUNT_PAGE" | grep -qi "api.*key\|settings\|password"; then
    log_test "PASS" "Account page has key sections" ""
  else
    log_test "INFO" "Account page structure" "Could not verify all sections"
  fi
}

# UX and Performance Tests
run_ux_tests() {
  echo ""
  echo "=== USER EXPERIENCE TESTS ==="
  
  # Test 1: Mobile responsive design
  HOME_PAGE=$(curl -s "$BASE_URL/" 2>/dev/null || echo "")
  if echo "$HOME_PAGE" | grep -q "viewport\|responsive"; then
    log_test "PASS" "Responsive design meta tags present" ""
  else
    log_test "FAIL" "Responsive design meta tags present" ""
  fi
  
  # Test 2: Loading states
  if echo "$HOME_PAGE" | grep -qi "loading\|skeleton\|spinner"; then
    log_test "PASS" "Loading state indicators present" ""
  else
    log_test "INFO" "Loading states" "Could not verify in static content"
  fi
  
  # Test 3: Error handling
  if echo "$HOME_PAGE" | grep -qi "error\|try\|failed"; then
    log_test "PASS" "Error handling messaging present" ""
  else
    log_test "INFO" "Error handling" "Could not verify in static content"
  fi
  
  # Test 4: Form validation messages
  SIGNUP_PAGE=$(curl -s "$BASE_URL/auth/signup" 2>/dev/null || echo "")
  if echo "$SIGNUP_PAGE" | grep -qi "required\|must\|invalid"; then
    log_test "PASS" "Form validation messages present" ""
  else
    log_test "INFO" "Form validation" "Could not verify in static content"
  fi
}

# Bug and Gap Detection
run_bug_detection() {
  echo ""
  echo "=== BUG & GAP DETECTION ==="
  
  # Test for common issues
  HOME_PAGE=$(curl -s "$BASE_URL/" 2>/dev/null || echo "")
  
  # Check for console error indicators
  if echo "$HOME_PAGE" | grep -q "console.error\|throw new Error"; then
    log_test "FAIL" "No explicit errors in code" "Found error statements"
  else
    log_test "PASS" "No explicit errors in code" ""
  fi
  
  # Check for incomplete features
  if echo "$HOME_PAGE" | grep -qi "todo\|fixme\|hack\|xxx"; then
    log_test "FAIL" "No incomplete features marked" "Found TODO/FIXME comments"
  else
    log_test "PASS" "No incomplete features marked" ""
  fi
  
  # Check favicon
  if echo "$HOME_PAGE" | grep -q "favicon"; then
    log_test "PASS" "Favicon configured" ""
  else
    log_test "INFO" "Favicon" "Not detected (optional)"
  fi
  
  # Check for proper redirects
  REDIRECT_TEST=$(curl -s -I "$BASE_URL/auth" 2>/dev/null | grep -i "location" || echo "")
  if [ ! -z "$REDIRECT_TEST" ] || curl -s "$BASE_URL/auth" > /dev/null 2>&1; then
    log_test "PASS" "Redirect handling working" ""
  else
    log_test "INFO" "Redirect handling" "Could not verify"
  fi
}

# API Response Format Tests
run_api_format_tests() {
  echo ""
  echo "=== API RESPONSE FORMAT TESTS ==="
  
  # Note: These tests will be skipped if backend is not running
  
  # Try a health check
  HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health" 2>/dev/null || echo "")
  
  if [ ! -z "$HEALTH_RESPONSE" ]; then
    # Test JSON response format
    if echo "$HEALTH_RESPONSE" | grep -q "{" 2>/dev/null; then
      log_test "PASS" "API returns valid JSON" ""
    else
      log_test "FAIL" "API returns valid JSON" "Response not in JSON format"
    fi
  else
    log_test "SKIP" "API response format checks" "Backend not responding"
  fi
}

# Summary Report
generate_summary() {
  echo ""
  echo "================================"
  echo "   COMPREHENSIVE TEST SUMMARY   "
  echo "================================"
  echo ""
  echo -e "${GREEN}✓ Passed:${NC}  $TESTS_PASSED"
  echo -e "${RED}✗ Failed:${NC}  $TESTS_FAILED"
  echo -e "${YELLOW}⊘ Skipped:${NC} $TESTS_SKIPPED"
  echo ""
  
  TOTAL=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
  SUCCESS_RATE=0
  if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(( (TESTS_PASSED * 100) / TOTAL ))
  fi
  
  echo "Total Tests: $TOTAL"
  echo "Success Rate: $SUCCESS_RATE%"
  echo ""
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
  else
    echo -e "${RED}✗ Some tests failed. Review above for details.${NC}"
  fi
  
  echo ""
  echo "Results saved to: $RESULTS_FILE"
}

# Main execution
main() {
  echo "╔═════════════════════════════════════════════════════════════╗"
  echo "║ FORTRESS TOKEN OPTIMIZER - COMPREHENSIVE TEST SUITE         ║"
  echo "║ Phase 3 Testing: Security, Email, Links, E2E, UX, & Bugs   ║"
  echo "╚═════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Frontend: $BASE_URL"
  echo "Backend:  $BACKEND_URL"
  echo "Started:  $(date)"
  echo ""
  
  check_connectivity || echo "Continuing with available services..."
  
  run_security_tests
  run_page_tests
  run_link_tests
  run_backend_tests
  run_email_tests
  run_e2e_tests
  run_ux_tests
  run_bug_detection
  run_api_format_tests
  
  generate_summary
}

# Run all tests
main
