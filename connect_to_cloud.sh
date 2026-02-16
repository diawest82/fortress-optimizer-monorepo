#!/bin/bash
# Auto-generated cloud connector for fortress-optimizer-monorepo
# Connects to Phase 2 cloud system

WORKSPACE="fortress-optimizer-monorepo"
SSH_KEY="/Users/diawest/projects/PATENT_FILINGS/option-c-key.pem"
CLOUD_IP="100.30.228.129"
CLOUD_USER="ubuntu"
CLOUD_APP="/opt/PATENT_FILINGS"

echo "🚀 Connecting workspace '$WORKSPACE' to cloud..."
echo "   Instance: $CLOUD_IP"
echo "   App: $CLOUD_APP"
echo ""

# Verify SSH key
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

chmod 400 "$SSH_KEY"

# SSH to cloud instance
ssh -i "$SSH_KEY" $CLOUD_USER@$CLOUD_IP "cd $CLOUD_APP && python3 -m core.mcp_tools.option_c_integration"
