#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Test Suite 3: Live Smoke Test Script
# Run after deployment to verify production endpoint health.
# Usage: bash tests/test_smoke_live.sh [base_url]
# ═══════════════════════════════════════════════════════════════════════════════

BASE_URL="${1:-http://myp-zwp-lb-598798440.us-east-1.elb.amazonaws.com}"
PASS=0
FAIL=0
TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

assert_status() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    TOTAL=$((TOTAL + 1))
    if [ "$actual" == "$expected" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (expected $expected, got $actual)"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local test_name="$1"
    local expected="$2"
    local body="$3"
    TOTAL=$((TOTAL + 1))
    if echo "$body" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (body missing '$expected')"
        FAIL=$((FAIL + 1))
    fi
}

echo "═══════════════════════════════════════════════════════"
echo " Fortress Live Smoke Test"
echo " Target: $BASE_URL"
echo " Time:   $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── Phase 1: Health Check ────────────────────────────────────────────────────
echo -e "${YELLOW}Phase 1: Health Check${NC}"

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" --connect-timeout 10)
assert_status "GET /health returns 200" "200" "$HEALTH_STATUS"

HEALTH_BODY=$(curl -s "$BASE_URL/health" --connect-timeout 10)
assert_contains "Health status is healthy" '"status":"healthy"' "$HEALTH_BODY"
assert_contains "Health has version" '"version"' "$HEALTH_BODY"
assert_contains "Health has database field" '"database"' "$HEALTH_BODY"
assert_contains "Database is connected" '"database":"connected"' "$HEALTH_BODY"

echo ""

# ─── Phase 2: Public Endpoints ────────────────────────────────────────────────
echo -e "${YELLOW}Phase 2: Public Endpoints${NC}"

PRICING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/pricing" --connect-timeout 10)
assert_status "GET /api/pricing returns 200" "200" "$PRICING_STATUS"

PRICING_BODY=$(curl -s "$BASE_URL/api/pricing" --connect-timeout 10)
assert_contains "Pricing has tiers" '"tiers"' "$PRICING_BODY"
assert_contains "Pricing has free tier" '"free"' "$PRICING_BODY"
assert_contains "Pricing has pro tier" '"pro"' "$PRICING_BODY"

echo ""

# ─── Phase 3: Key Registration ────────────────────────────────────────────────
echo -e "${YELLOW}Phase 3: API Key Registration${NC}"

REGISTER_RESP=$(curl -s -X POST "$BASE_URL/api/keys/register" \
    -H "Content-Type: application/json" \
    -d '{"name": "smoke-test-key", "tier": "free"}' \
    --connect-timeout 10)

assert_contains "Register returns api_key" '"api_key"' "$REGISTER_RESP"
assert_contains "Key starts with fk_" '"fk_' "$REGISTER_RESP"

# Extract the API key
API_KEY=$(echo "$REGISTER_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('api_key', ''))" 2>/dev/null)

if [ -z "$API_KEY" ]; then
    echo -e "${RED}✗ FATAL: Could not extract API key. Aborting remaining tests.${NC}"
    FAIL=$((FAIL + 1))
    TOTAL=$((TOTAL + 1))
else
    echo -e "${GREEN}  API Key: ${API_KEY:0:12}...${NC}"
    echo ""

    # ─── Phase 4: Authenticated Endpoints ─────────────────────────────────────
    echo -e "${YELLOW}Phase 4: Authenticated Endpoints${NC}"

    # Optimize
    OPT_RESP=$(curl -s -X POST "$BASE_URL/api/optimize" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d '{"prompt": "Please help me analyze this data in order to find insights if possible thank you", "level": "aggressive"}' \
        --connect-timeout 15)

    OPT_STATUS=$(echo "$OPT_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" 2>/dev/null)
    assert_status "POST /api/optimize returns success" "success" "$OPT_STATUS"
    assert_contains "Optimize has tokens" '"tokens"' "$OPT_RESP"
    assert_contains "Optimize has optimization" '"optimization"' "$OPT_RESP"
    assert_contains "Optimize has request_id" '"request_id"' "$OPT_RESP"

    # Check savings > 0 for aggressive with fillers
    SAVINGS=$(echo "$OPT_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tokens', {}).get('savings', 0))" 2>/dev/null)
    TOTAL=$((TOTAL + 1))
    if [ "$SAVINGS" -gt 0 ] 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}: Optimization produced savings ($SAVINGS tokens)"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: No savings produced (savings=$SAVINGS)"
        FAIL=$((FAIL + 1))
    fi

    # Usage
    USAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/usage" \
        -H "Authorization: Bearer $API_KEY" --connect-timeout 10)
    assert_status "GET /api/usage returns 200" "200" "$USAGE_STATUS"

    USAGE_BODY=$(curl -s "$BASE_URL/api/usage" -H "Authorization: Bearer $API_KEY" --connect-timeout 10)
    assert_contains "Usage has tier" '"tier"' "$USAGE_BODY"
    assert_contains "Usage has requests count" '"requests"' "$USAGE_BODY"

    # Verify usage was tracked
    REQ_COUNT=$(echo "$USAGE_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin).get('requests', 0))" 2>/dev/null)
    TOTAL=$((TOTAL + 1))
    if [ "$REQ_COUNT" -gt 0 ] 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}: Usage tracking works (requests=$REQ_COUNT)"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: Usage not tracked (requests=$REQ_COUNT)"
        FAIL=$((FAIL + 1))
    fi

    # Providers
    PROVIDERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/providers" \
        -H "Authorization: Bearer $API_KEY" --connect-timeout 10)
    assert_status "GET /api/providers returns 200" "200" "$PROVIDERS_STATUS"

    echo ""

    # ─── Phase 5: Auth Error Handling ─────────────────────────────────────────
    echo -e "${YELLOW}Phase 5: Authentication Errors${NC}"

    NO_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/optimize" \
        -H "Content-Type: application/json" \
        -d '{"prompt": "test"}' --connect-timeout 10)
    assert_status "Missing auth returns 401" "401" "$NO_AUTH_STATUS"

    BAD_KEY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/optimize" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer fk_invalidkey1234567890" \
        -d '{"prompt": "test"}' --connect-timeout 10)
    assert_status "Invalid key returns 401" "401" "$BAD_KEY_STATUS"

    WRONG_PREFIX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/optimize" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer sk_wrongprefix12345" \
        -d '{"prompt": "test"}' --connect-timeout 10)
    assert_status "Wrong prefix returns 401" "401" "$WRONG_PREFIX_STATUS"

    echo ""

    # ─── Phase 6: Optimization Levels ─────────────────────────────────────────
    echo -e "${YELLOW}Phase 6: All Optimization Levels${NC}"

    for LEVEL in conservative balanced aggressive; do
        LEVEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/optimize" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $API_KEY" \
            -d "{\"prompt\": \"Test prompt for level check\", \"level\": \"$LEVEL\"}" \
            --connect-timeout 10)
        assert_status "Optimize level=$LEVEL returns 200" "200" "$LEVEL_STATUS"
    done
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, $TOTAL total"
echo "═══════════════════════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
    exit 1
fi
exit 0
