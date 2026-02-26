#!/bin/bash

###############################################################################
# Stop Fortress Development Stack
#
# Stops the hub service and Next.js dev server that were started with
# start-dev.sh
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE_HUB="$SCRIPT_DIR/.dev-hub.pid"
PID_FILE_APP="$SCRIPT_DIR/.dev-app.pid"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}Stopping Fortress Development Stack...${NC}"
echo ""

# Stop hub service
if [ -f "$PID_FILE_HUB" ]; then
  HUB_PID=$(cat "$PID_FILE_HUB")
  if kill -0 "$HUB_PID" 2>/dev/null; then
    echo -e "${YELLOW}[HUB]${NC} Stopping hub service (PID: $HUB_PID)..."
    kill "$HUB_PID"
    sleep 1
    echo -e "${GREEN}✓${NC} Hub service stopped"
  fi
  rm -f "$PID_FILE_HUB"
fi

# Stop Next.js app
if [ -f "$PID_FILE_APP" ]; then
  APP_PID=$(cat "$PID_FILE_APP")
  if kill -0 "$APP_PID" 2>/dev/null; then
    echo -e "${YELLOW}[APP]${NC} Stopping Next.js app (PID: $APP_PID)..."
    kill "$APP_PID"
    sleep 1
    echo -e "${GREEN}✓${NC} Next.js app stopped"
  fi
  rm -f "$PID_FILE_APP"
fi

# Kill any remaining processes on ports
echo -e "${YELLOW}[CLEANUP]${NC} Cleaning up remaining processes..."
lsof -i :3333 -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null || true
lsof -i :3000 -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Development stack stopped${NC}"
echo ""
