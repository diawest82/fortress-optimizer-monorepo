#!/bin/bash

# Fortress Optimizer - Backend Server Startup
# Start the FastAPI backend server with production settings

echo "🚀 Starting Fortress Optimizer Backend Server..."
echo ""

# Set environment
export PYTHONPATH=/Users/diawest/projects/fortress-optimizer-monorepo:$PYTHONPATH
cd /Users/diawest/projects/fortress-optimizer-monorepo

# Start server
echo "✅ Starting uvicorn server on http://0.0.0.0:8000"
echo ""
echo "📚 API Documentation:"
echo "   - Swagger UI: http://localhost:8000/docs"
echo "   - ReDoc: http://localhost:8000/redoc"
echo ""
echo "🧪 Test endpoints:"
echo "   - Health: curl http://localhost:8000/health"
echo "   - Signup: curl -X POST http://localhost:8000/api/auth/signup -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"Test1234!\"}'"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

python3 -m uvicorn backend.mock_app_v2_full_auth:app --host 0.0.0.0 --port 8000 --reload
