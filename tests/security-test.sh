#!/bin/bash

# OWASP Security Testing Suite for Fortress Token Optimizer Backend
# Tests: Authentication, Input Validation, SQL Injection, XSS, Rate Limiting, etc.

BACKEND_URL="${1:-http://localhost:8000}"
RESULTS_FILE="security-test-results.json"

echo "🔒 Starting OWASP Security Testing for Fortress Backend"
echo "Target: $BACKEND_URL"
echo ""

# Initialize results
PASSED=0
FAILED=0
RESULTS=()

# Helper function to add test result
add_result() {
  local test_name="$1"
  local status="$2"
  local details="$3"
  
  if [ "$status" = "PASS" ]; then
    ((PASSED++))
    echo "✅ $test_name"
  else
    ((FAILED++))
    echo "❌ $test_name: $details"
  fi
  
  RESULTS+=("{\"test\":\"$test_name\",\"status\":\"$status\",\"details\":\"$details\"}")
}

# Test 1: Health endpoint accessibility
echo "1️⃣  Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n1)
if [ "$HEALTH_STATUS" = "200" ]; then
  add_result "Health Endpoint" "PASS"
else
  add_result "Health Endpoint" "FAIL" "Expected 200, got $HEALTH_STATUS"
fi

echo ""
echo "2️⃣  Testing Input Validation..."

# Test 2: Empty payload rejection
EMPTY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d '{}')
EMPTY_STATUS=$(echo "$EMPTY_RESPONSE" | tail -n1)
if [ "$EMPTY_STATUS" != "200" ] && [ "$EMPTY_STATUS" != "400" ]; then
  add_result "Empty Payload Handling" "PASS" "Request properly rejected"
else
  add_result "Empty Payload Handling" "FAIL" "Should validate required fields"
fi

# Test 3: SQL Injection attempt
echo ""
echo "3️⃣  Testing SQL Injection Prevention..."
SQL_INJECTION="'; DROP TABLE users; --"
SQL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"$SQL_INJECTION\",\"text\":\"test\",\"model\":\"claude-3-opus\"}")
SQL_STATUS=$(echo "$SQL_RESPONSE" | tail -n1)
if [ "$SQL_STATUS" != "200" ]; then
  add_result "SQL Injection Prevention" "PASS" "Malicious input rejected"
else
  add_result "SQL Injection Prevention" "FAIL" "Should reject SQL injection attempts"
fi

# Test 4: XSS Prevention
echo ""
echo "4️⃣  Testing XSS Prevention..."
XSS_PAYLOAD="<script>alert('xss')</script>"
XSS_RESPONSE=$(curl -s -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"anthropic\",\"text\":\"$XSS_PAYLOAD\",\"model\":\"claude-3-opus\"}")
if ! echo "$XSS_RESPONSE" | grep -q "<script>"; then
  add_result "XSS Prevention" "PASS" "Script tags properly escaped"
else
  add_result "XSS Prevention" "FAIL" "XSS payload not escaped"
fi

# Test 5: Invalid JSON handling
echo ""
echo "5️⃣  Testing Malformed JSON Handling..."
MALFORMED_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d '{invalid json}')
MALFORMED_STATUS=$(echo "$MALFORMED_RESPONSE" | tail -n1)
if [ "$MALFORMED_STATUS" != "200" ]; then
  add_result "Malformed JSON Handling" "PASS" "Invalid JSON rejected"
else
  add_result "Malformed JSON Handling" "FAIL" "Should reject invalid JSON"
fi

# Test 6: Rate limiting (10 rapid requests)
echo ""
echo "6️⃣  Testing Rate Limiting..."
RATE_LIMITED=0
for i in {1..10}; do
  RATE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/optimize" \
    -H "Content-Type: application/json" \
    -d '{"provider":"anthropic","text":"test","model":"claude-3-opus"}' -o /dev/null)
  if [ "$RATE_RESPONSE" = "429" ]; then
    ((RATE_LIMITED++))
  fi
done
if [ "$RATE_LIMITED" -gt 0 ]; then
  add_result "Rate Limiting" "PASS" "$RATE_LIMITED requests rate limited"
else
  add_result "Rate Limiting" "FAIL" "Should implement rate limiting"
fi

# Test 7: HTTPS/TLS enforcement (if applicable)
echo ""
echo "7️⃣  Testing HTTPS Requirements..."
if [[ "$BACKEND_URL" == https://* ]]; then
  add_result "HTTPS Enforcement" "PASS" "Using secure connection"
else
  add_result "HTTPS Enforcement" "WARN" "Not using HTTPS (acceptable for dev/testing)"
fi

# Test 8: CORS headers
echo ""
echo "8️⃣  Testing CORS Headers..."
CORS_RESPONSE=$(curl -s -I "$BACKEND_URL/health" | grep -i "access-control")
if [ ! -z "$CORS_RESPONSE" ]; then
  add_result "CORS Headers" "PASS" "CORS headers present"
else
  add_result "CORS Headers" "FAIL" "CORS headers not found"
fi

# Test 9: Authorization (missing token should fail optimization)
echo ""
echo "9️⃣  Testing Authorization..."
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{"provider":"anthropic","text":"test","model":"claude-3-opus"}')
AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -n1)
if [ "$AUTH_STATUS" = "401" ] || [ "$AUTH_STATUS" = "403" ]; then
  add_result "Authorization Check" "PASS" "Invalid token rejected (status: $AUTH_STATUS)"
else
  add_result "Authorization Check" "INFO" "Token validation may be optional (status: $AUTH_STATUS)"
fi

# Test 10: Response header security
echo ""
echo "🔟 Testing Response Security Headers..."
HEADERS=$(curl -s -I "$BACKEND_URL/health")
SECURITY_HEADERS=0
if echo "$HEADERS" | grep -qi "x-content-type-options"; then ((SECURITY_HEADERS++)); fi
if echo "$HEADERS" | grep -qi "x-frame-options"; then ((SECURITY_HEADERS++)); fi
if echo "$HEADERS" | grep -qi "x-xss-protection"; then ((SECURITY_HEADERS++)); fi

if [ "$SECURITY_HEADERS" -gt 0 ]; then
  add_result "Security Headers" "PASS" "$SECURITY_HEADERS security headers found"
else
  add_result "Security Headers" "FAIL" "Missing security headers"
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════"
echo "🔒 Security Test Summary"
echo "════════════════════════════════════════════════════════"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "Total:   $((PASSED + FAILED))"
PASS_RATE=$((PASSED * 100 / (PASSED + FAILED)))
echo "Score:   $PASS_RATE%"
echo "════════════════════════════════════════════════════════"

# Save results to JSON
echo "{\"summary\":{\"passed\":$PASSED,\"failed\":$FAILED,\"total\":$((PASSED+FAILED)),\"passRate\":$PASS_RATE},\"tests\":[$(IFS=,; echo "${RESULTS[*]}")]}" > "$RESULTS_FILE"
echo "Results saved to: $RESULTS_FILE"

exit $FAILED
