#!/bin/bash

###############################################################################
# Fortress Development Stack Launcher
#
# Starts both the Hub Service and Next.js dev server for local development
# with full hub connectivity.
#
# Usage:
#   bash start-dev.sh              # Start both services
#   bash start-dev.sh --hub-only   # Start only hub service
#   bash start-dev.sh --app-only   # Start only Next.js app
#
# Services will run in background. View output with:
#   cat .dev-hub.log              # Hub service output
#   cat .dev-app.log              # Next.js app output
#
# Stop services with:
#   bash stop-dev.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HUB_LOG="$SCRIPT_DIR/.dev-hub.log"
APP_LOG="$SCRIPT_DIR/.dev-app.log"
PID_FILE_HUB="$SCRIPT_DIR/.dev-hub.pid"
PID_FILE_APP="$SCRIPT_DIR/.dev-app.pid"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
START_HUB=true
START_APP=true

case "${1:-}" in
  --hub-only)
    START_APP=false
    ;;
  --app-only)
    START_HUB=false
    ;;
  --help)
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --hub-only   Start only the hub service"
    echo "  --app-only   Start only the Next.js app"
    echo "  --help       Show this help message"
    exit 0
    ;;
esac

# Function to start hub service
start_hub() {
  echo -e "${BLUE}[HUB]${NC} Starting hub service on http://127.0.0.1:3333..."
  
  # Kill any existing hub process
  if [ -f "$PID_FILE_HUB" ]; then
    PID=$(cat "$PID_FILE_HUB")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" 2>/dev/null || true
      sleep 1
    fi
  fi
  
  # Start hub in background
  python3 "$SCRIPT_DIR/hub_service.py" > "$HUB_LOG" 2>&1 &
  HUB_PID=$!
  echo $HUB_PID > "$PID_FILE_HUB"
  
  # Wait for hub to start
  sleep 2
  
  # Check if hub is responding
  if curl -s http://127.0.0.1:3333/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Hub service is running (PID: $HUB_PID)"
  else
    echo -e "${RED}✗${NC} Hub service failed to start"
    echo "Check log: cat $HUB_LOG"
    return 1
  fi
}

# Function to start Next.js app
start_app() {
  echo -e "${BLUE}[APP]${NC} Starting Next.js dev server on http://localhost:3000..."
  
  # Kill any existing app process
  if [ -f "$PID_FILE_APP" ]; then
    PID=$(cat "$PID_FILE_APP")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" 2>/dev/null || true
      sleep 1
    fi
  fi
  
  # Start app in background
  cd "$SCRIPT_DIR"
  npm run dev > "$APP_LOG" 2>&1 &
  APP_PID=$!
  echo $APP_PID > "$PID_FILE_APP"
  
  # Wait for app to start
  sleep 3
  
  # Check if app is responding
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Next.js app is running (PID: $APP_PID)"
  else
    echo -e "${YELLOW}⚠${NC} Next.js app starting... (PID: $APP_PID)"
  fi
}

# Main
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Fortress Development Stack Launcher${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Start services
if [ "$START_HUB" = true ]; then
  start_hub || exit 1
  echo ""
fi

if [ "$START_APP" = true ]; then
  start_app || exit 1
  echo ""
fi

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Development Stack is Ready${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$START_HUB" = true ] && [ "$START_APP" = true ]; then
  echo -e "${GREEN}✓${NC} Hub Service:  ${BLUE}http://127.0.0.1:3333${NC}"
  echo -e "${GREEN}✓${NC} Next.js App:  ${BLUE}http://localhost:3000${NC}"
  echo ""
  echo "View logs:"
  echo "  Hub:  tail -f $HUB_LOG"
  echo "  App:  tail -f $APP_LOG"
  echo ""
  echo "Stop services:"
  echo "  bash stop-dev.sh"
  echo ""
elif [ "$START_HUB" = true ]; then
  echo -e "${GREEN}✓${NC} Hub Service is running on ${BLUE}http://127.0.0.1:3333${NC}"
  echo ""
  echo "View logs: tail -f $HUB_LOG"
elif [ "$START_APP" = true ]; then
  echo -e "${GREEN}✓${NC} Next.js App is running on ${BLUE}http://localhost:3000${NC}"
  echo ""
  echo "View logs: tail -f $APP_LOG"
fi

echo ""
