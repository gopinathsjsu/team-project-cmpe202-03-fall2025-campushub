#!/bin/bash

# CampusHub - Stop All Services Script

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping CampusHub Services...${NC}\n"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Stop Frontend
if [ -f /tmp/campushub-frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/campushub-frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}🛑 Stopping Frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        rm /tmp/campushub-frontend.pid
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
fi

# Stop WebSocket Server
if [ -f /tmp/campushub-ws.pid ]; then
    WS_PID=$(cat /tmp/campushub-ws.pid)
    if ps -p $WS_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}🛑 Stopping WebSocket Server (PID: $WS_PID)...${NC}"
        kill $WS_PID 2>/dev/null || true
        rm /tmp/campushub-ws.pid
        echo -e "${GREEN}✅ WebSocket Server stopped${NC}"
    fi
fi

# Stop API Server
if [ -f /tmp/campushub-api.pid ]; then
    API_PID=$(cat /tmp/campushub-api.pid)
    if ps -p $API_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}🛑 Stopping API Server (PID: $API_PID)...${NC}"
        kill $API_PID 2>/dev/null || true
        rm /tmp/campushub-api.pid
        echo -e "${GREEN}✅ API Server stopped${NC}"
    fi
fi

# Stop Docker services (optional - uncomment if you want to stop Docker too)
# echo -e "\n${YELLOW}🐳 Stopping Docker services...${NC}"
# cd "$BACKEND_DIR/build"
# docker compose -f docker-compose.dev.yml down
# echo -e "${GREEN}✅ Docker services stopped${NC}"

echo -e "\n${GREEN}✅ All services stopped!${NC}"
echo -e "${YELLOW}💡 Note: Docker services (PostgreSQL & MinIO) are still running.${NC}"
echo -e "${YELLOW}   To stop them, run: cd backend/build && docker compose -f docker-compose.dev.yml down${NC}\n"

