#!/bin/bash

# Simple Extension Unit Test Runner
# Tests core extension functionality without full VS Code environment

set -e

echo "========================================="
echo "Extension Unit Tests"
echo "========================================="
echo ""

TEST_PASSED=0
TEST_FAILED=0

# Test 1: Check extension.ts compiles
echo "Testing: Extension compilation"
if [ -f "out/extension.js" ]; then
    echo "✓ Extension compiles successfully"
    ((TEST_PASSED++))
else
    echo "✗ Extension failed to compile"
    ((TEST_FAILED++))
fi

# Test 2: Check configuration schema
echo "Testing: Configuration schema"
if grep -q '"stealthOptimizer.enabled"' package.json && \
   grep -q '"stealthOptimizer.optimizationLevel"' package.json; then
    echo "✓ Configuration schema is defined"
    ((TEST_PASSED++))
else
    echo "✗ Configuration schema incomplete"
    ((TEST_FAILED++))
fi

# Test 3: Check commands are defined
echo "Testing: Command definitions"
COMMAND_COUNT=$(grep -c '"command":' package.json)
if [ $COMMAND_COUNT -ge 8 ]; then
    echo "✓ All commands defined ($COMMAND_COUNT found)"
    ((TEST_PASSED++))
else
    echo "✗ Commands incomplete ($COMMAND_COUNT found, expected 8+)"
    ((TEST_FAILED++))
fi

# Test 4: Check metricsStore file exists
echo "Testing: Metrics store module"
if [ -f "out/metricsStore.js" ]; then
    echo "✓ Metrics store module exists"
    ((TEST_PASSED++))
else
    echo "✗ Metrics store module missing"
    ((TEST_FAILED++))
fi

# Test 5: Check optimizer file exists
echo "Testing: Optimizer module"
if [ -f "out/optimizer.js" ]; then
    echo "✓ Optimizer module exists"
    ((TEST_PASSED++))
else
    echo "✗ Optimizer module missing"
    ((TEST_FAILED++))
fi

# Test 6: Check dashboard file exists
echo "Testing: Dashboard module"
if [ -f "out/webview/dashboard.js" ]; then
    echo "✓ Dashboard module exists"
    ((TEST_PASSED++))
else
    echo "✗ Dashboard module missing"
    ((TEST_FAILED++))
fi

# Test 7: Check no TypeScript errors
echo "Testing: TypeScript compilation"
if npm run compile 2>&1 | grep -q "error TS"; then
    echo "✗ TypeScript compilation errors found"
    ((TEST_FAILED++))
else
    echo "✓ No TypeScript compilation errors"
    ((TEST_PASSED++))
fi

# Test 8: Check package.json is valid JSON
echo "Testing: package.json validity"
if node -e "require('./package.json')" 2>/dev/null; then
    echo "✓ package.json is valid JSON"
    ((TEST_PASSED++))
else
    echo "✗ package.json is invalid"
    ((TEST_FAILED++))
fi

# Test 9: Check VS Code engine requirement
echo "Testing: VS Code version requirement"
if grep -q 'vscode.*1.85' package.json; then
    echo "✓ VS Code version requirement specified"
    ((TEST_PASSED++))
else
    echo "✗ VS Code version requirement missing"
    ((TEST_FAILED++))
fi

# Test 10: Check entry points
echo "Testing: Extension entry points"
if grep -q '"main": "./out/extension.js"' package.json && \
   grep -q '"activationEvents"' package.json; then
    echo "✓ Entry points configured"
    ((TEST_PASSED++))
else
    echo "✗ Entry points not configured"
    ((TEST_FAILED++))
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Passed: $TEST_PASSED"
echo "Failed: $TEST_FAILED"
echo "Total:  $((TEST_PASSED + TEST_FAILED))"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
    echo "✓ All extension tests PASSED"
    exit 0
else
    echo "✗ Some tests FAILED"
    exit 1
fi
