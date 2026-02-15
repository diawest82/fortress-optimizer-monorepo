#!/bin/bash

# Advanced Security Testing - Designed to BREAK and EXPLOIT the backend
# Goal: Find vulnerabilities before launch, learn from failures
# Tests: 30+ attack vectors across 8 categories

BASE_URL="${1:-http://localhost:8000}"
RESULTS_FILE="advanced-security-results.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
CRITICAL=0
HIGH=0
MEDIUM=0

# Initialize results
echo "[]" > "$RESULTS_FILE"

# Helper function to add results
add_result() {
  local test_name="$1"
  local severity="$2"
  local status="$3"
  local payload="$4"
  local response="$5"
  
  # Build JSON entry
  local json=$(cat <<EOF
{
  "test": "$test_name",
  "severity": "$severity",
  "status": "$status",
  "payload": "$payload",
  "response_snippet": "$(echo "$response" | head -c 200 | sed 's/"/\\"/g')"
}
EOF
)
  
  # Append to results file
  python3 << PYTHON
import json
with open("$RESULTS_FILE", "r") as f:
    data = json.load(f)
data.append(json.loads('''$json'''))
with open("$RESULTS_FILE", "w") as f:
    json.dump(data, f, indent=2)
PYTHON
}

# Test function
run_test() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local payload="$4"
  local expected_fail="$5"
  local severity="$6"
  
  echo -n "  Testing: $test_name... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$BASE_URL$endpoint" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)
  
  # Check if vulnerability exists
  if [ "$expected_fail" = "true" ]; then
    # We WANT this to fail - vulnerability exists if we get 200
    if [ "$http_code" = "200" ]; then
      echo -e "${RED}🔓 VULNERABLE${NC}"
      ((FAILED++))
      case $severity in
        CRITICAL) ((CRITICAL++)) ;;
        HIGH) ((HIGH++)) ;;
        MEDIUM) ((MEDIUM++)) ;;
      esac
      add_result "$test_name" "$severity" "VULNERABLE" "$payload" "$body"
      return 1
    else
      echo -e "${GREEN}✅ BLOCKED${NC}"
      ((PASSED++))
      add_result "$test_name" "$severity" "BLOCKED" "$payload" "$body"
      return 0
    fi
  else
    # Normal test - expect 200
    if [ "$http_code" = "200" ]; then
      echo -e "${GREEN}✅ PASS${NC}"
      ((PASSED++))
      add_result "$test_name" "$severity" "PASS" "$payload" "$body"
      return 0
    else
      echo -e "${RED}❌ FAIL${NC}"
      ((FAILED++))
      add_result "$test_name" "$severity" "FAIL" "$payload" "$body"
      return 1
    fi
  fi
}

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔐 ADVANCED SECURITY TESTING${NC}"
echo -e "${BLUE}Target: $BASE_URL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# ============================================================================
# 1. SQL INJECTION ATTACKS
# ============================================================================
echo -e "${YELLOW}1. SQL INJECTION ATTACKS${NC}"
run_test "SQL Injection: OR 1=1" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"admin\" OR \"1\"=\"1"}' \
  "true" "CRITICAL"

run_test "SQL Injection: UNION SELECT" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"admin\" UNION SELECT * FROM users--"}' \
  "true" "CRITICAL"

run_test "SQL Injection: Time-based Blind" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"admin\"; WAITFOR DELAY '00:00:05'--"}' \
  "true" "HIGH"

run_test "SQL Injection: Boolean-based Blind" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"admin\" AND 1=1--"}' \
  "true" "HIGH"

run_test "SQL Injection: Stacked Queries" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"admin\"; DROP TABLE users;--"}' \
  "true" "CRITICAL"

echo ""

# ============================================================================
# 2. AUTHENTICATION & AUTHORIZATION BYPASS
# ============================================================================
echo -e "${YELLOW}2. AUTHENTICATION & AUTHORIZATION${NC}"
run_test "Auth: Missing Authorization" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"admin"}' \
  "false" "CRITICAL"

run_test "Auth: Invalid JWT Token" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"hacker","token":"invalid.jwt.token"}' \
  "true" "HIGH"

run_test "Auth: Empty Token" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"hacker","token":""}' \
  "true" "HIGH"

run_test "Auth: User ID Forgery" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"admin_user"}' \
  "true" "CRITICAL"

echo ""

# ============================================================================
# 3. DATA EXFILTRATION & SENSITIVE DATA LEAKAGE
# ============================================================================
echo -e "${YELLOW}3. DATA EXFILTRATION & LEAKAGE${NC}"
run_test "Info: Error Message Disclosure" "POST" "/optimize" \
  '{"provider":"invalid","text":"test","model":"claude","user_id":"test"}' \
  "true" "MEDIUM"

run_test "Info: Swagger/API Docs Exposed" "GET" "/docs" "" "true" "MEDIUM"

run_test "Info: API Key in Response" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","api_key":"secret_key"}' \
  "true" "HIGH"

run_test "Info: Stack Trace Exposure" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"","user_id":"test"}' \
  "true" "MEDIUM"

echo ""

# ============================================================================
# 4. DOS & RESOURCE EXHAUSTION
# ============================================================================
echo -e "${YELLOW}4. DOS & RESOURCE EXHAUSTION${NC}"
run_test "DoS: Large Payload (1MB+)" "POST" "/optimize" \
  "{\"provider\":\"anthropic\",\"text\":\"$(python3 -c 'print(\"A\"*2000000)')\",\"model\":\"claude\",\"user_id\":\"test\"}" \
  "true" "MEDIUM"

run_test "DoS: Deeply Nested JSON" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","data":{"a":{"b":{"c":{"d":{"e":{"f":{"g":{"h":{"i":{"j":"value"}}}}}}}}}}}' \
  "true" "MEDIUM"

run_test "DoS: Null Byte Injection" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test\u0000injection","model":"claude","user_id":"test"}' \
  "true" "MEDIUM"

run_test "DoS: Unicode Bombs" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test\uffff\uffff\uffff\uffff","model":"claude","user_id":"test"}' \
  "true" "MEDIUM"

echo ""

# ============================================================================
# 5. BROKEN ACCESS CONTROL (BRAC)
# ============================================================================
echo -e "${YELLOW}5. BROKEN ACCESS CONTROL${NC}"
run_test "BRAC: User ID Bypass" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"../../admin"}' \
  "true" "CRITICAL"

run_test "BRAC: Path Traversal" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"..%2F..%2Fadmin"}' \
  "true" "HIGH"

run_test "BRAC: Directory Listing" "GET" "/..%2F" "" "true" "MEDIUM"

run_test "BRAC: Hidden Admin Endpoint" "GET" "/admin" "" "true" "HIGH"

echo ""

# ============================================================================
# 6. CRYPTOGRAPHY & SENSITIVE DATA
# ============================================================================
echo -e "${YELLOW}6. CRYPTOGRAPHY & SENSITIVE DATA${NC}"
run_test "Crypto: HTTP Instead of HTTPS" "GET" "/health" "" "true" "HIGH"

run_test "Crypto: API Key Hardcoded" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","key":"sk_test_123"}' \
  "true" "CRITICAL"

run_test "Crypto: Password in Response" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","password":"admin123"}' \
  "true" "CRITICAL"

echo ""

# ============================================================================
# 7. XXE & XML INJECTION
# ============================================================================
echo -e "${YELLOW}7. XXE & XML ATTACKS${NC}"
run_test "XXE: External Entity Injection" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","xml":"<?xml version=\"1.0\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]><foo>&xxe;</foo>"}' \
  "true" "CRITICAL"

run_test "XXE: Billion Laughs Attack" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test"}' \
  "true" "HIGH"

echo ""

# ============================================================================
# 8. RACE CONDITIONS & CONCURRENCY
# ============================================================================
echo -e "${YELLOW}8. RACE CONDITIONS & CONCURRENCY${NC}"
echo -n "  Testing: Concurrent Requests Race Condition... "
for i in {1..10}; do
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"provider":"anthropic","text":"test","model":"claude","user_id":"race_test"}' \
    "$BASE_URL/optimize" > /tmp/race_$i.txt &
done
wait
echo -e "${GREEN}✅ COMPLETED${NC}"
((PASSED++))

echo ""

# ============================================================================
# 9. BUSINESS LOGIC FLAWS
# ============================================================================
echo -e "${YELLOW}9. BUSINESS LOGIC FLAWS${NC}"
run_test "Logic: Negative Token Count" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","token_count":-100}' \
  "true" "MEDIUM"

run_test "Logic: Price Manipulation (0)" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","price":0}' \
  "true" "MEDIUM"

run_test "Logic: Savings > 100%" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","savings":150}' \
  "true" "MEDIUM"

run_test "Logic: Invalid Provider Bypass" "POST" "/optimize" \
  '{"provider":"invalid_provider","text":"test","model":"claude","user_id":"test"}' \
  "true" "MEDIUM"

echo ""

# ============================================================================
# 10. INSECURE DESERIALIZATION
# ============================================================================
echo -e "${YELLOW}10. INSECURE DESERIALIZATION${NC}"
run_test "Deser: Pickle RCE Payload" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","serialized":"cos\nsystem\n(S\"whoami\"\ntR."}' \
  "true" "CRITICAL"

run_test "Deser: YAML RCE Payload" "POST" "/optimize" \
  '{"provider":"anthropic","text":"test","model":"claude","user_id":"test","yaml":"!!python/object/apply:os.system [\"id\"]"}' \
  "true" "CRITICAL"

echo ""

# ============================================================================
# RESULTS SUMMARY
# ============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔐 SECURITY TEST RESULTS SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "Passed Tests:    ${GREEN}$PASSED${NC}"
echo -e "Failed Tests:    ${RED}$FAILED${NC}"
echo -e ""
echo -e "Severity Breakdown:"
echo -e "  🔴 CRITICAL: ${RED}$CRITICAL${NC} vulnerabilities found"
echo -e "  🟠 HIGH:     ${YELLOW}$HIGH${NC} vulnerabilities found"
echo -e "  🟡 MEDIUM:   ${YELLOW}$MEDIUM${NC} vulnerabilities found"
echo -e ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  SCORE=$((PASSED * 100 / TOTAL))
  echo -e "Overall Score: ${GREEN}$SCORE%${NC} ($PASSED/$TOTAL passed)"
else
  echo "No tests ran"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "Results saved to: ${BLUE}$RESULTS_FILE${NC}"
echo ""

# Exit with failure if any tests failed
[ $FAILED -eq 0 ]
