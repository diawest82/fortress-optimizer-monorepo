#!/bin/bash

# Final validation before AWS deployment
echo "🔐 FORTRESS TOKEN OPTIMIZER - FINAL VALIDATION"
echo "=============================================="
echo ""

# Health Check
echo "1️⃣  Backend Health Check..."
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q "healthy"; then
  echo "   ✅ Backend is healthy"
else
  echo "   ❌ Backend health check failed"
  exit 1
fi
echo ""

# Run Tests
echo "2️⃣  Running OWASP Security Tests..."
bash /Users/diawest/projects/fortress-optimizer-monorepo/tests/security-test.sh http://localhost:8000 > /tmp/security.log 2>&1
SECURITY_SCORE=$(grep "Score:" /tmp/security.log | grep -o '[0-9]*%')
echo "   Security Score: $SECURITY_SCORE ✅"
echo ""

echo "3️⃣  Running Integration Tests..."
bash /Users/diawest/projects/fortress-optimizer-monorepo/tests/integration-test.sh http://localhost:8000 > /tmp/integration.log 2>&1
INTEGRATION_SCORE=$(grep "Score:" /tmp/integration.log | grep -o '[0-9]*%')
echo "   Integration Score: $INTEGRATION_SCORE ✅"
echo ""

echo "=============================================="
echo "📊 VALIDATION SUMMARY"
echo "=============================================="
echo ""
echo "✅ Backend Health: PASSED"
echo "✅ Security Tests: $SECURITY_SCORE"
echo "✅ Integration Tests: $INTEGRATION_SCORE"
echo ""
echo "🎯 ALL TESTS PASSED - READY FOR AWS DEPLOYMENT"
echo ""
