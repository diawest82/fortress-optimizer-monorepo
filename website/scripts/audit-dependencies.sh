#!/bin/bash
# npm Dependency Vulnerability Scanner
# Scans for known vulnerabilities in npm dependencies

echo "🔍 Running npm audit..."
echo ""

# Run npm audit and capture output
npm audit --json > /tmp/audit.json 2>&1
AUDIT_EXIT_CODE=$?

# Parse the JSON output
VULNERABILITIES=$(grep -o '"vulnerabilities":{[^}]*}' /tmp/audit.json | head -1)
CRITICAL=$(grep -o '"critical":[0-9]*' /tmp/audit.json | grep -o '[0-9]*' | head -1)
HIGH=$(grep -o '"high":[0-9]*' /tmp/audit.json | grep -o '[0-9]*' | head -2 | tail -1)
MODERATE=$(grep -o '"moderate":[0-9]*' /tmp/audit.json | grep -o '[0-9]*' | head -3 | tail -1)
LOW=$(grep -o '"low":[0-9]*' /tmp/audit.json | grep -o '[0-9]*' | head -4 | tail -1)

echo "📊 Vulnerability Summary:"
echo "  🔴 Critical: ${CRITICAL:-0}"
echo "  🟠 High:     ${HIGH:-0}"
echo "  🟡 Moderate: ${MODERATE:-0}"
echo "  🔵 Low:      ${LOW:-0}"
echo ""

# Show detailed vulnerabilities
if [ $AUDIT_EXIT_CODE -ne 0 ]; then
    echo "⚠️  Vulnerabilities found!"
    echo ""
    echo "Run 'npm audit' for detailed information"
    echo "Run 'npm audit fix' to automatically fix vulnerabilities"
    echo ""
    
    # Show critical and high vulns only
    npm audit | grep -A 5 "critical\|high" || true
else
    echo "✅ No vulnerabilities found!"
fi

exit $AUDIT_EXIT_CODE
