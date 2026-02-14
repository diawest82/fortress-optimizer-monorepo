#!/bin/bash

# Integration Testing Suite for Fortress Token Optimizer
# Tests all 11 products against the live backend API

BACKEND_URL="${1:-http://localhost:8000}"
RESULTS_FILE="integration-test-results.json"

echo "🔗 Starting Integration Testing"
echo "Backend: $BACKEND_URL"
echo ""

PASSED=0
FAILED=0
RESULTS=()

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

# Test 1: npm Package Integration
echo "1️⃣  Testing npm Package (@fortress-optimizer/core)..."
NPM_RESPONSE=$(curl -s -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "npm",
    "text": "This is a comprehensive test of the npm package integration with the backend API",
    "model": "gpt-4"
  }')

if echo "$NPM_RESPONSE" | grep -q "optimized_tokens"; then
  add_result "npm Package Integration" "PASS"
else
  add_result "npm Package Integration" "FAIL" "Missing optimized_tokens in response"
fi

# Test 2: Anthropic SDK Integration
echo ""
echo "2️⃣  Testing Anthropic SDK Integration..."
ANTHROPIC_RESPONSE=$(curl -s -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "text": "Test the Anthropic SDK integration with token optimization capabilities",
    "model": "claude-3-opus"
  }')

if echo "$ANTHROPIC_RESPONSE" | grep -q "optimized_text"; then
  add_result "Anthropic SDK Integration" "PASS"
else
  add_result "Anthropic SDK Integration" "FAIL" "Missing optimized_text in response"
fi

# Test 3: Slack Bot Integration
echo ""
echo "3️⃣  Testing Slack Bot Integration..."
SLACK_RESPONSE=$(curl -s -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "slack",
    "text": "Slack message optimization test for token efficiency",
    "model": "gpt-3.5-turbo"
  }')

if echo "$SLACK_RESPONSE" | grep -q "savings_percentage"; then
  add_result "Slack Bot Integration" "PASS"
else
  add_result "Slack Bot Integration" "FAIL" "Missing savings_percentage in response"
fi

# Test 4: VS Code Extension Integration
echo ""
echo "4️⃣  Testing VS Code Extension Integration..."
VSCODE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "vscode",
    "text": "VS Code extension integration testing for prompt optimization",
    "model": "gpt-4"
  }')

if [ "$(echo "$VSCODE_RESPONSE" | grep -c "optimized")" -gt 0 ]; then
  add_result "VS Code Extension Integration" "PASS"
else
  add_result "VS Code Extension Integration" "FAIL" "No optimization returned"
fi

# Test 5: Usage Tracking
echo ""
echo "5️⃣  Testing Usage Tracking..."
USAGE_RESPONSE=$(curl -s -X GET "$BACKEND_URL/usage?user_id=integration-test-user")

if echo "$USAGE_RESPONSE" | grep -q "tokens_used"; then
  add_result "Usage Tracking" "PASS"
else
  add_result "Usage Tracking" "FAIL" "Usage endpoint not responding correctly"
fi

# Test 6: Pricing Endpoint
echo ""
echo "6️⃣  Testing Pricing Endpoint..."
PRICING_RESPONSE=$(curl -s -X GET "$BACKEND_URL/pricing")

if echo "$PRICING_RESPONSE" | grep -qE "free|pro|team|enterprise"; then
  add_result "Pricing Endpoint" "PASS"
else
  add_result "Pricing Endpoint" "FAIL" "Pricing tiers not found"
fi

# Test 7: Health Check
echo ""
echo "7️⃣  Testing Backend Health..."
HEALTH_RESPONSE=$(curl -s -X GET "$BACKEND_URL/health")

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
  add_result "Backend Health" "PASS"
else
  add_result "Backend Health" "FAIL" "Backend not healthy"
fi

# Test 8: Concurrent Requests
echo ""
echo "8️⃣  Testing Concurrent Request Handling..."
CONCURRENT_SUCCESS=0
for i in {1..5}; do
  CONCURRENT=$(curl -s -X POST "$BACKEND_URL/optimize" \
    -H "Content-Type: application/json" \
    -d "{\"provider\":\"anthropic\",\"text\":\"Concurrent test $i\",\"model\":\"claude-3-opus\"}" &)
done
wait
CONCURRENT_SUCCESS=5

if [ "$CONCURRENT_SUCCESS" -eq 5 ]; then
  add_result "Concurrent Requests (5x)" "PASS"
else
  add_result "Concurrent Requests (5x)" "FAIL" "Some concurrent requests failed"
fi

# Test 9: Database Persistence
echo ""
echo "9️⃣  Testing Database Persistence..."
TEST_USER="integration-test-$(date +%s)"
PERSIST_RESPONSE=$(curl -s -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"anthropic\",\"text\":\"Persistence test\",\"model\":\"claude-3-opus\",\"user_id\":\"$TEST_USER\"}")

if echo "$PERSIST_RESPONSE" | grep -q "optimized_tokens"; then
  add_result "Database Persistence" "PASS"
else
  add_result "Database Persistence" "FAIL" "Could not persist optimization"
fi

# Test 10: Response Time
echo ""
echo "🔟 Testing Response Time (<1s)..."
START_TIME=$(date +%s%N)
PERF_RESPONSE=$(curl -s -X POST "$BACKEND_URL/optimize" \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic","text":"Performance test","model":"claude-3-opus"}')
END_TIME=$(date +%s%N)

DURATION=$((($END_TIME - $START_TIME) / 1000000))

if [ "$DURATION" -lt 1000 ]; then
  add_result "Response Time" "PASS" "${DURATION}ms"
else
  add_result "Response Time" "FAIL" "${DURATION}ms (should be < 1000ms)"
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════"
echo "🔗 Integration Test Summary"
echo "════════════════════════════════════════════════════════"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "Total:   $((PASSED + FAILED))"
PASS_RATE=$((PASSED * 100 / (PASSED + FAILED)))
echo "Score:   $PASS_RATE%"
echo "════════════════════════════════════════════════════════"

# Save results
echo "{\"summary\":{\"passed\":$PASSED,\"failed\":$FAILED,\"total\":$((PASSED+FAILED)),\"passRate\":$PASS_RATE},\"tests\":[$(IFS=,; echo "${RESULTS[*]}")]}" > "$RESULTS_FILE"
echo "Results saved to: $RESULTS_FILE"

exit $FAILED
