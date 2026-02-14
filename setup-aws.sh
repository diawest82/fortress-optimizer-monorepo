#!/bin/bash
# Install AWS CLI and dependencies for deployment

echo "📦 Installing AWS deployment tools..."
echo ""

# Install AWS CLI v2
echo "1️⃣  Installing AWS CLI..."
if command -v aws &> /dev/null; then
  echo "   ✅ AWS CLI already installed: $(aws --version)"
else
  # For macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    curl "https://awscli.amazonaws.com/awscli-exe-macos.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
  fi
  # For Linux
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
  fi
fi

# Verify Docker
echo "2️⃣  Checking Docker..."
if ! command -v docker &> /dev/null; then
  echo "   ❌ Docker not found. Install from: https://www.docker.com/products/docker-desktop"
  exit 1
else
  echo "   ✅ Docker available: $(docker --version)"
fi

# Configure AWS credentials
echo ""
echo "3️⃣  Configuring AWS credentials..."
echo "   Run: aws configure"
echo "   Enter:"
echo "   - AWS Access Key ID"
echo "   - AWS Secret Access Key"
echo "   - Default region: us-east-1"
echo "   - Default output: json"
echo ""
aws configure

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify credentials: aws sts get-caller-identity"
echo "2. Run deployment: bash aws-deploy.sh"
