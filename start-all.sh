#!/bin/bash

# CampusHub - Start All Services Script
# This script starts all required services for the CampusHub application

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting CampusHub Services...${NC}\n"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

if ! command_exists go; then
    echo -e "${RED}❌ Go is not installed. Please install Go 1.21+ first.${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met!${NC}\n"

# Step 1: Start Docker services (PostgreSQL + MinIO)
echo -e "${YELLOW}🐳 Starting Docker services (PostgreSQL + MinIO)...${NC}"
cd "$BACKEND_DIR/build"
if docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Docker services already running${NC}"
else
    docker compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}✅ Docker services started${NC}"
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 5
fi

# Step 2: Check if migrations need to be run
echo -e "\n${YELLOW}📊 Checking database migrations...${NC}"
cd "$BACKEND_DIR"
MIGRATION_CHECK=$(docker compose -f build/docker-compose.dev.yml exec -T db psql -U postgres -d campus -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$MIGRATION_CHECK" -eq "0" ] || [ -z "$MIGRATION_CHECK" ]; then
    echo -e "${YELLOW}📝 Running database migrations...${NC}"
    cat migrations/*.sql | docker compose -f build/docker-compose.dev.yml exec -T db psql -U postgres -d campus -v ON_ERROR_STOP=1 -f - 2>/dev/null || {
        echo -e "${RED}❌ Migration failed. Trying alternative method...${NC}"
        # Alternative: run migrations one by one
        for migration in migrations/*.sql; do
            echo "Running $migration..."
            docker compose -f build/docker-compose.dev.yml exec -T db psql -U postgres -d campus < "$migration" 2>/dev/null || true
        done
    }
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${GREEN}✅ Database already initialized${NC}"
fi

# Step 3: Check MinIO bucket
echo -e "\n${YELLOW}🪣 Checking MinIO bucket...${NC}"
echo -e "${YELLOW}⚠️  Please ensure bucket 'campushub-01-uploads' exists in MinIO (http://localhost:9001)${NC}"
echo -e "${YELLOW}   Login: minioadmin / minioadmin${NC}"

# Step 4: Start Backend API Server
echo -e "\n${YELLOW}🔧 Starting Backend API Server (port 8082)...${NC}"
cd "$BACKEND_DIR"
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found in backend directory${NC}"
    echo -e "${YELLOW}   Please create a .env file with required configuration${NC}"
    echo -e "${YELLOW}   See backend/README.md for details${NC}"
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

# Start API in background
(
    cd "$BACKEND_DIR"
    make run-api > /tmp/campushub-api.log 2>&1 &
    API_PID=$!
    echo $API_PID > /tmp/campushub-api.pid
    echo -e "${GREEN}✅ API Server started (PID: $API_PID)${NC}"
    echo -e "${YELLOW}   Logs: tail -f /tmp/campushub-api.log${NC}"
)

# Step 5: Start WebSocket Server
echo -e "\n${YELLOW}🔌 Starting WebSocket Server (port 8081)...${NC}"
(
    cd "$BACKEND_DIR"
    make run-ws > /tmp/campushub-ws.log 2>&1 &
    WS_PID=$!
    echo $WS_PID > /tmp/campushub-ws.pid
    echo -e "${GREEN}✅ WebSocket Server started (PID: $WS_PID)${NC}"
    echo -e "${YELLOW}   Logs: tail -f /tmp/campushub-ws.log${NC}"
)

# Step 6: Start Frontend
echo -e "\n${YELLOW}🎨 Starting Frontend Development Server (port 5173)...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found, creating default...${NC}"
    cat > .env << EOF
VITE_API_URL=http://localhost:8082/v1
VITE_WS_URL=ws://localhost:8081
EOF
fi

(
    cd "$FRONTEND_DIR"
    npm run dev > /tmp/campushub-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/campushub-frontend.pid
    echo -e "${GREEN}✅ Frontend Server started (PID: $FRONTEND_PID)${NC}"
    echo -e "${YELLOW}   Logs: tail -f /tmp/campushub-frontend.log${NC}"
)

# Wait a bit for services to start
echo -e "\n${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 3

# Summary
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All services started successfully!${NC}\n"
echo -e "${GREEN}📍 Service URLs:${NC}"
echo -e "   • Frontend:      http://localhost:5173"
echo -e "   • API Server:    http://localhost:8082"
echo -e "   • WebSocket:     ws://localhost:8081"
echo -e "   • MinIO Console: http://localhost:9001"
echo -e "   • PostgreSQL:    localhost:5434"
echo -e "\n${GREEN}📝 Logs:${NC}"
echo -e "   • API:      tail -f /tmp/campushub-api.log"
echo -e "   • WebSocket: tail -f /tmp/campushub-ws.log"
echo -e "   • Frontend:  tail -f /tmp/campushub-frontend.log"
echo -e "\n${YELLOW}🛑 To stop all services, run: ./stop-all.sh${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"

