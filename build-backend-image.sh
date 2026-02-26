#!/usr/bin/env bash
set -euo pipefail

# Build backend image with correct build context (repo root)
# Usage: ./build-backend-image.sh [tag]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAG="${1:-673895432464.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:latest}"

cd "$ROOT_DIR"

docker buildx build \
  --platform linux/amd64 \
  --tag "$TAG" \
  --file backend/Dockerfile \
  --push \
  .
