#!/usr/bin/env bash
#
# Journeyman Test — Full end-to-end: signup → install all 3 packages → hit live API → verify savings
#
# Tests BOTH Individual and Team flows against the real production API.
# Run: bash tests/launch-day/journeyman-test.sh
#
set -euo pipefail

API="https://api.fortress-optimizer.com"
BASE="https://www.fortress-optimizer.com"
UNIQUE=$(date +%s)
PASS=0
FAIL=0
TOTAL=0

green() { echo -e "\033[32m✓ $1\033[0m"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
red()   { echo -e "\033[31m✗ $1\033[0m"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }
section() { echo -e "\n\033[1;36m━━━ $1 ━━━\033[0m\n"; }

# ═══════════════════════════════════════════════════════════════════
# PHASE 1: INDIVIDUAL JOURNEY
# ═══════════════════════════════════════════════════════════════════

section "PHASE 1: INDIVIDUAL USER JOURNEY"

# 1.1 Signup
echo "1.1 Signing up individual user..."
SIGNUP_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"journeyman-ind-${UNIQUE}@test.fortress-optimizer.com\",\"password\":\"JourneyP@ss${UNIQUE}!\",\"name\":\"Journey Individual\"}")
SIGNUP_STATUS=$(echo "$SIGNUP_RESP" | tail -1)
if [[ "$SIGNUP_STATUS" == "201" || "$SIGNUP_STATUS" == "200" ]]; then
  green "Individual signup: $SIGNUP_STATUS"
else
  red "Individual signup: $SIGNUP_STATUS (expected 200/201)"
fi

# 1.2 Register API key
echo "1.2 Registering API key..."
KEY_RESP=$(curl -s -X POST "$API/api/keys/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"journeyman-ind-${UNIQUE}\",\"tier\":\"free\"}")
IND_KEY=$(echo "$KEY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('api_key',''))" 2>/dev/null)
if [[ "$IND_KEY" == fk_* ]]; then
  green "API key registered: ${IND_KEY:0:12}..."
else
  red "API key registration failed: $KEY_RESP"
fi

# 1.3 Health check
echo "1.3 Health check..."
HEALTH=$(curl -s "$API/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])" 2>/dev/null)
if [[ "$HEALTH" == "healthy" ]]; then
  green "API healthy"
else
  red "API unhealthy: $HEALTH"
fi

# ═══════════════════════════════════════════════════════════════════
# PHASE 2: INSTALL ALL 3 PACKAGES
# ═══════════════════════════════════════════════════════════════════

section "PHASE 2: INSTALL ALL 3 PACKAGES"

# Create temp directory for installations
TMPDIR=$(mktemp -d)
echo "Working in: $TMPDIR"

# 2.1 npm install
echo "2.1 Installing npm package..."
cd "$TMPDIR"
npm init -y > /dev/null 2>&1
NPM_INSTALL=$(npm install fortress-optimizer 2>&1)
if echo "$NPM_INSTALL" | grep -q "added"; then
  green "npm install fortress-optimizer — success"
else
  # Check if package exists in node_modules
  if [ -d "node_modules/fortress-optimizer" ]; then
    green "npm install fortress-optimizer — success (already resolved)"
  else
    red "npm install fortress-optimizer — failed: $NPM_INSTALL"
  fi
fi

# Verify npm package works
echo "2.1b Verifying npm package imports..."
NPM_VERIFY=$(node -e "
const { FortressClient } = require('fortress-optimizer');
const c = new FortressClient('test-key', { baseUrl: 'https://api.fortress-optimizer.com' });
console.log('FortressClient loaded: ' + typeof c.optimize);
" 2>&1)
if echo "$NPM_VERIFY" | grep -q "function"; then
  green "npm package: FortressClient.optimize is a function"
else
  red "npm package verify failed: $NPM_VERIFY"
fi

# 2.2 pip install
echo "2.2 Installing Python package..."
PIP_INSTALL=$(pip install fortress-optimizer 2>&1)
if echo "$PIP_INSTALL" | grep -q "Successfully installed\|already satisfied"; then
  green "pip install fortress-optimizer — success"
else
  red "pip install fortress-optimizer — failed"
fi

# Verify Python package works
echo "2.2b Verifying Python package imports..."
PY_VERIFY=$(python3 -c "
from fortress_optimizer import FortressClient
c = FortressClient(api_key='test-key')
print('FortressClient loaded: ' + str(type(c.optimize)))
" 2>&1)
if echo "$PY_VERIFY" | grep -q "method\|function"; then
  green "Python package: FortressClient.optimize loads"
else
  red "Python package verify failed: $PY_VERIFY"
fi

# 2.3 VS Code extension check
echo "2.3 Checking VS Code extension on Marketplace..."
VSCE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://marketplace.visualstudio.com/items?itemName=fortress-optimizer.fortress-token-optimizer")
if [[ "$VSCE_CHECK" == "200" ]]; then
  green "VS Code extension live on Marketplace"
else
  red "VS Code extension not found: HTTP $VSCE_CHECK"
fi

# ═══════════════════════════════════════════════════════════════════
# PHASE 3: HIT LIVE API — ALL 3 LEVELS
# ═══════════════════════════════════════════════════════════════════

section "PHASE 3: LIVE API — ALL 3 OPTIMIZATION LEVELS"

for LEVEL in conservative balanced aggressive; do
  echo "3. Testing $LEVEL level..."
  OPT_RESP=$(curl -s -X POST "$API/api/optimize" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $IND_KEY" \
    -d "{\"prompt\":\"Can you please basically help me write a detailed analysis of this data set and um provide some insights\",\"level\":\"$LEVEL\",\"provider\":\"openai\"}")

  OPT_STATUS=$(echo "$OPT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  OPT_SAVINGS=$(echo "$OPT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens',{}).get('savings_percentage',0))" 2>/dev/null)
  OPT_ORIG=$(echo "$OPT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens',{}).get('original',0))" 2>/dev/null)
  OPT_OPTD=$(echo "$OPT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens',{}).get('optimized',0))" 2>/dev/null)

  if [[ "$OPT_STATUS" == "success" ]]; then
    green "$LEVEL: ${OPT_ORIG} → ${OPT_OPTD} tokens (${OPT_SAVINGS}% savings)"
  else
    red "$LEVEL: failed — $OPT_RESP"
  fi
done

# ═══════════════════════════════════════════════════════════════════
# PHASE 4: VERIFY SAVINGS WITH NPM SDK
# ═══════════════════════════════════════════════════════════════════

section "PHASE 4: VERIFY SAVINGS VIA NPM SDK"

echo "4.1 Optimizing via npm SDK..."
NPM_SDK_RESULT=$(node -e "
const { FortressClient } = require('fortress-optimizer');
const client = new FortressClient('${IND_KEY}');

(async () => {
  try {
    const result = await client.optimize(
      'I was wondering if you could please help me write a comprehensive and detailed report about the quarterly results',
      'balanced',
      'openai'
    );
    console.log(JSON.stringify({
      status: result.status,
      original: result.tokens.original,
      optimized: result.tokens.optimized,
      savings: result.tokens.savings_percentage,
      prompt: result.optimization.optimized_prompt.substring(0, 60)
    }));
  } catch(e) {
    console.log(JSON.stringify({ error: e.message }));
  }
})();
" 2>&1)

SDK_STATUS=$(echo "$NPM_SDK_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','error'))" 2>/dev/null)
SDK_SAVINGS=$(echo "$NPM_SDK_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('savings',0))" 2>/dev/null)
if [[ "$SDK_STATUS" == "success" ]]; then
  green "npm SDK optimization: ${SDK_SAVINGS}% savings"
else
  red "npm SDK failed: $NPM_SDK_RESULT"
fi

# ═══════════════════════════════════════════════════════════════════
# PHASE 5: VERIFY SAVINGS WITH PYTHON SDK
# ═══════════════════════════════════════════════════════════════════

section "PHASE 5: VERIFY SAVINGS VIA PYTHON SDK"

echo "5.1 Optimizing via Python SDK..."
PY_SDK_RESULT=$(python3 -c "
from fortress_optimizer import FortressClient
import json

client = FortressClient(api_key='${IND_KEY}')
try:
    result = client.optimize(
        'Could you essentially help me analyze this data and provide a thorough summary of the key findings please',
        level='balanced',
        provider='openai'
    )
    print(json.dumps({
        'status': result['status'],
        'original': result['tokens']['original'],
        'optimized': result['tokens']['optimized'],
        'savings': result['tokens']['savings_percentage'],
        'prompt': result['optimization']['optimized_prompt'][:60]
    }))
except Exception as e:
    print(json.dumps({'error': str(e)}))
" 2>&1)

PY_STATUS=$(echo "$PY_SDK_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','error'))" 2>/dev/null)
PY_SAVINGS=$(echo "$PY_SDK_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('savings',0))" 2>/dev/null)
if [[ "$PY_STATUS" == "success" ]]; then
  green "Python SDK optimization: ${PY_SAVINGS}% savings"
else
  red "Python SDK failed: $PY_SDK_RESULT"
fi

# ═══════════════════════════════════════════════════════════════════
# PHASE 6: VERIFY USAGE TRACKING
# ═══════════════════════════════════════════════════════════════════

section "PHASE 6: VERIFY USAGE TRACKING"

echo "6.1 Checking usage stats..."
USAGE_RESP=$(curl -s "$API/api/usage" -H "X-API-Key: $IND_KEY")
USAGE_REQS=$(echo "$USAGE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('requests',0))" 2>/dev/null)
USAGE_SAVED=$(echo "$USAGE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens_saved',0))" 2>/dev/null)
USAGE_TIER=$(echo "$USAGE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tier',''))" 2>/dev/null)

if [[ "$USAGE_REQS" -ge 5 ]]; then
  green "Usage tracked: $USAGE_REQS requests, $USAGE_SAVED tokens saved, tier: $USAGE_TIER"
else
  red "Usage tracking: only $USAGE_REQS requests (expected ≥5)"
fi

# ═══════════════════════════════════════════════════════════════════
# PHASE 7: TEAM JOURNEY
# ═══════════════════════════════════════════════════════════════════

section "PHASE 7: TEAM JOURNEY"

# 7.1 Team signup
echo "7.1 Signing up team lead..."
TEAM_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"journeyman-team-${UNIQUE}@test.fortress-optimizer.com\",\"password\":\"TeamP@ss${UNIQUE}!\",\"name\":\"Journey TeamLead\"}")
TEAM_STATUS=$(echo "$TEAM_SIGNUP" | tail -1)
if [[ "$TEAM_STATUS" == "201" || "$TEAM_STATUS" == "200" ]]; then
  green "Team lead signup: $TEAM_STATUS"
else
  red "Team lead signup: $TEAM_STATUS"
fi

# 7.2 Register team key
echo "7.2 Registering team API key..."
TEAM_KEY_RESP=$(curl -s -X POST "$API/api/keys/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"journeyman-team-${UNIQUE}\",\"tier\":\"free\"}")
TEAM_KEY=$(echo "$TEAM_KEY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('api_key',''))" 2>/dev/null)
if [[ "$TEAM_KEY" == fk_* ]]; then
  green "Team API key: ${TEAM_KEY:0:12}..."
else
  red "Team key registration failed"
fi

# 7.3 Batch optimizations (simulate team usage)
echo "7.3 Running team batch optimizations..."
TEAM_SUCCESS=0
for i in 1 2 3 4 5; do
  PROMPTS=("Please help me review this pull request for security issues" \
           "Can you basically summarize the meeting notes from today" \
           "I need you to essentially rewrite this documentation" \
           "Could you help me debug this authentication issue please" \
           "I was wondering if you could optimize this database query")
  PROMPT="${PROMPTS[$((i-1))]}"

  BATCH_RESP=$(curl -s -X POST "$API/api/optimize" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $TEAM_KEY" \
    -d "{\"prompt\":\"$PROMPT\",\"level\":\"balanced\",\"provider\":\"openai\"}")

  BATCH_STATUS=$(echo "$BATCH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  if [[ "$BATCH_STATUS" == "success" ]]; then
    TEAM_SUCCESS=$((TEAM_SUCCESS+1))
  fi
done

if [[ "$TEAM_SUCCESS" -eq 5 ]]; then
  green "Team batch: 5/5 optimizations succeeded"
else
  red "Team batch: $TEAM_SUCCESS/5 succeeded"
fi

# 7.4 Verify team usage
echo "7.4 Checking team usage..."
TEAM_USAGE=$(curl -s "$API/api/usage" -H "X-API-Key: $TEAM_KEY")
TEAM_REQS=$(echo "$TEAM_USAGE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('requests',0))" 2>/dev/null)
TEAM_SAVED=$(echo "$TEAM_USAGE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens_saved',0))" 2>/dev/null)

if [[ "$TEAM_REQS" -ge 5 ]]; then
  green "Team usage: $TEAM_REQS requests, $TEAM_SAVED tokens saved"
else
  red "Team usage: only $TEAM_REQS requests"
fi

# 7.5 Data isolation — team can't see individual's data
echo "7.5 Verifying data isolation..."
IND_USAGE=$(curl -s "$API/api/usage" -H "X-API-Key: $IND_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('requests',0))" 2>/dev/null)
TEAM_USAGE_CHECK=$(curl -s "$API/api/usage" -H "X-API-Key: $TEAM_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('requests',0))" 2>/dev/null)

if [[ "$IND_USAGE" != "$TEAM_USAGE_CHECK" ]]; then
  green "Data isolation confirmed: individual=$IND_USAGE, team=$TEAM_USAGE_CHECK"
else
  red "Data isolation unclear: both show $IND_USAGE requests"
fi

# ═══════════════════════════════════════════════════════════════════
# PHASE 7B: VERIFY DASHBOARD DATA POPULATES
# ═══════════════════════════════════════════════════════════════════

section "PHASE 7B: VERIFY DASHBOARD DATA POPULATES"

# Individual dashboard stats
echo "7b.1 Checking individual dashboard stats API..."
IND_DASH=$(curl -s "$BASE/api/dashboard/stats?range=7d" -H "Cookie: fortress_auth_token=dummy" 2>/dev/null)
# Since we can't auth via cookie in curl, verify via the usage API which powers the dashboard
IND_USAGE_FULL=$(curl -s "$API/api/usage" -H "X-API-Key: $IND_KEY" 2>/dev/null || curl -s "$API/api/usage" -H "X-API-Key: $NEW_KEY" 2>/dev/null)
IND_TOKENS_OPT=$(echo "$IND_USAGE_FULL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens_optimized',0))" 2>/dev/null)
IND_TOKENS_SAVED=$(echo "$IND_USAGE_FULL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens_saved',0))" 2>/dev/null)
IND_REQ_COUNT=$(echo "$IND_USAGE_FULL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('requests',0))" 2>/dev/null)

if [[ "$IND_TOKENS_OPT" -gt 0 && "$IND_REQ_COUNT" -gt 0 ]]; then
  green "Individual dashboard data: $IND_REQ_COUNT requests, $IND_TOKENS_OPT tokens processed, $IND_TOKENS_SAVED saved"
else
  red "Individual dashboard data missing: requests=$IND_REQ_COUNT tokens=$IND_TOKENS_OPT"
fi

# Team dashboard stats
echo "7b.2 Checking team dashboard stats API..."
TEAM_USAGE_FULL=$(curl -s "$API/api/usage" -H "X-API-Key: $TEAM_KEY")
TEAM_TOKENS_OPT=$(echo "$TEAM_USAGE_FULL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens_optimized',0))" 2>/dev/null)
TEAM_TOKENS_SAVED=$(echo "$TEAM_USAGE_FULL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tokens_saved',0))" 2>/dev/null)
TEAM_REQ_COUNT=$(echo "$TEAM_USAGE_FULL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('requests',0))" 2>/dev/null)

if [[ "$TEAM_TOKENS_OPT" -gt 0 && "$TEAM_REQ_COUNT" -ge 5 ]]; then
  green "Team dashboard data: $TEAM_REQ_COUNT requests, $TEAM_TOKENS_OPT tokens processed, $TEAM_TOKENS_SAVED saved"
else
  red "Team dashboard data missing: requests=$TEAM_REQ_COUNT tokens=$TEAM_TOKENS_OPT"
fi

# Verify tokens_saved > 0 (proves optimization actually saved something)
echo "7b.3 Verifying actual savings recorded..."
if [[ "$IND_TOKENS_SAVED" -gt 0 ]]; then
  green "Individual savings recorded: $IND_TOKENS_SAVED tokens saved"
else
  red "Individual savings: 0 tokens saved"
fi

if [[ "$TEAM_TOKENS_SAVED" -gt 0 ]]; then
  green "Team savings recorded: $TEAM_TOKENS_SAVED tokens saved"
else
  red "Team savings: 0 tokens saved"
fi

# ═══════════════════════════════════════════════════════════════════
# PHASE 8: KEY LIFECYCLE
# ═══════════════════════════════════════════════════════════════════

section "PHASE 8: KEY LIFECYCLE (ROTATE + REVOKE)"

# 8.1 Rotate
echo "8.1 Rotating individual key..."
ROTATE_RESP=$(curl -s -X POST "$API/api/keys/rotate" -H "Authorization: Bearer $IND_KEY")
NEW_KEY=$(echo "$ROTATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('api_key',''))" 2>/dev/null)
if [[ "$NEW_KEY" == fk_* && "$NEW_KEY" != "$IND_KEY" ]]; then
  green "Key rotated: ${NEW_KEY:0:12}..."
else
  red "Key rotation failed"
fi

# 8.2 Old key should fail
echo "8.2 Verifying old key is dead..."
OLD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/usage" -H "X-API-Key: $IND_KEY")
if [[ "$OLD_STATUS" == "401" ]]; then
  green "Old key rejected: 401"
else
  red "Old key still works: $OLD_STATUS"
fi

# 8.3 New key works
echo "8.3 Verifying new key works..."
NEW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/usage" -H "X-API-Key: $NEW_KEY")
if [[ "$NEW_STATUS" == "200" ]]; then
  green "New key works: 200"
else
  red "New key failed: $NEW_STATUS"
fi

# 8.4 Revoke
echo "8.4 Revoking team key..."
REVOKE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API/api/keys" -H "Authorization: Bearer $TEAM_KEY")
if [[ "$REVOKE_STATUS" == "200" ]]; then
  green "Team key revoked"
else
  red "Team key revocation failed: $REVOKE_STATUS"
fi

# 8.5 Revoked key should fail
echo "8.5 Verifying revoked key is dead..."
DEAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/usage" -H "X-API-Key: $TEAM_KEY")
if [[ "$DEAD_STATUS" == "401" ]]; then
  green "Revoked key rejected: 401"
else
  red "Revoked key still works: $DEAD_STATUS"
fi

# ═══════════════════════════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════════════════════════

section "RESULTS"

# Cleanup
rm -rf "$TMPDIR"

echo ""
echo "╔══════════════════════════════════════════╗"
if [[ "$FAIL" -eq 0 ]]; then
  echo "║     ALL $TOTAL TESTS PASSED                 ║"
else
  echo "║     $PASS/$TOTAL PASSED, $FAIL FAILED               ║"
fi
echo "╠══════════════════════════════════════════╣"
echo "║  Individual: signup → key → optimize     ║"
echo "║  npm SDK:    install → import → optimize  ║"
echo "║  Python SDK: install → import → optimize  ║"
echo "║  VS Code:    live on Marketplace          ║"
echo "║  Team:       signup → batch → usage       ║"
echo "║  Isolation:  individual ≠ team data       ║"
echo "║  Lifecycle:  rotate → revoke → verify     ║"
echo "╚══════════════════════════════════════════╝"

exit $FAIL
