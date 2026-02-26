#!/bin/bash

# Email System Test Suite
# Tests all email functionality end-to-end

BASE_URL="https://www.fortress-optimizer.com"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         EMAIL SYSTEM TEST SUITE - February 17, 2026          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=$5

  TESTS_RUN=$((TESTS_RUN + 1))
  
  echo -e "\n${YELLOW}Test $TESTS_RUN: $test_name${NC}"
  echo "  Method: $method"
  echo "  Endpoint: $endpoint"
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  echo "  Status: $status_code (expected: $expected_status)"
  
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "  ${GREEN}✅ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo "  Response: $(echo "$body" | head -c 100)..."
  else
    echo -e "  ${RED}❌ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Full Response: $body"
  fi
}

# ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}PHASE 1: Webhook Health Check${NC}"
# ─────────────────────────────────────────────────────────────────

test_endpoint "Webhook Health Check" "GET" "/api/webhook/email" "" "200"

# ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}PHASE 2: Email Receiving (Webhook)${NC}"
# ─────────────────────────────────────────────────────────────────

# Test valid email
EMAIL_PAYLOAD='{
  "from": "support@acme.com",
  "to": "fortress@example.com",
  "subject": "Token Optimization Question",
  "text": "We are interested in reducing our token costs by 20%. Can you help?"
}'

test_endpoint "Receive Valid Email" "POST" "/api/webhook/email" "$EMAIL_PAYLOAD" "201"

# Test email with HTML
EMAIL_HTML_PAYLOAD='{
  "from": "sales@company.com",
  "to": "fortress@example.com",
  "subject": "Enterprise Integration Request",
  "text": "We are a 500+ person company looking to integrate your platform.",
  "html": "<p>We are a 500+ person company looking to integrate your platform.</p>"
}'

test_endpoint "Receive Email with HTML" "POST" "/api/webhook/email" "$EMAIL_HTML_PAYLOAD" "201"

# Test missing fields (should fail)
INVALID_EMAIL='{
  "from": "test@example.com",
  "subject": "Missing fields"
}'

test_endpoint "Reject Email with Missing Fields" "POST" "/api/webhook/email" "$INVALID_EMAIL" "400"

# ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}PHASE 3: Email Retrieval (GET)${NC}"
# ─────────────────────────────────────────────────────────────────

test_endpoint "Get All Emails" "GET" "/api/emails" "" "200"

test_endpoint "Get Emails with Status Filter" "GET" "/api/emails?status=unread" "" "200"

test_endpoint "Get Enterprise Emails Only" "GET" "/api/emails?isEnterprise=true" "" "200"

test_endpoint "Get Emails with Limit" "GET" "/api/emails?limit=10&offset=0" "" "200"

# ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}PHASE 4: Email Statistics${NC}"
# ─────────────────────────────────────────────────────────────────

test_endpoint "Get Email Stats" "GET" "/api/emails/stats/unread" "" "200"

test_endpoint "Get Enterprise Stats" "GET" "/api/emails/enterprise" "" "200"

# ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}PHASE 5: Email Replies${NC}"
# ─────────────────────────────────────────────────────────────────

# Get first email ID to test replies
EMAILS_RESPONSE=$(curl -s "$BASE_URL/api/emails?limit=1")
FIRST_EMAIL_ID=$(echo "$EMAILS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')

if [ -n "$FIRST_EMAIL_ID" ]; then
  # Create a draft reply for the first email
  REPLY_PAYLOAD='{
    "to": "sender@example.com",
    "subject": "Re: Test Email",
    "body": "Thank you for your interest. We are excited to work with you.",
    "status": "draft"
  }'

  test_endpoint "Create Email Reply (Draft)" "POST" "/api/emails/$FIRST_EMAIL_ID/replies" "$REPLY_PAYLOAD" "201"

  test_endpoint "Get Email Replies" "GET" "/api/emails/$FIRST_EMAIL_ID/replies" "" "200"
else
  echo -e "\n${YELLOW}Test 11: Create Email Reply (Draft)${NC}"
  echo "  Method: POST"
  echo "  Endpoint: /api/emails/[id]/replies"
  echo "  Status: SKIPPED (no emails in database)"
  echo -e "  ${YELLOW}⚠️  SKIPPED${NC}"

  echo -e "\n${YELLOW}Test 12: Get Email Replies${NC}"
  echo "  Method: GET"
  echo "  Endpoint: /api/emails/[id]/replies"
  echo "  Status: SKIPPED (no emails in database)"
  echo -e "  ${YELLOW}⚠️  SKIPPED${NC}"
fi

# ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}SUMMARY${NC}"
# ─────────────────────────────────────────────────────────────────

echo -e "\nTotal Tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

PASS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))
echo -e "\nPass Rate: ${GREEN}$PASS_RATE%${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo "Email system is working correctly."
  exit 0
else
  echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
  echo "Please check the errors above."
  exit 1
fi
