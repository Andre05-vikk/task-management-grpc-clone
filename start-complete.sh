#!/bin/bash

# Complete startup script for gRPC Task Management API
# This script starts the database, builds the project, and starts both REST and gRPC servers

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    if [ ! -z "$REST_PID" ]; then
        kill $REST_PID 2>/dev/null || true
        echo -e "${GREEN}✅ REST API stopped${NC}"
    fi
    echo -e "${GREEN}✅ gRPC server stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup INT TERM

echo -e "${BLUE}🚀 Starting Complete Task Management API System${NC}"
echo -e "${YELLOW}This will start: Database + REST API + gRPC Server${NC}"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

# Check if ports are available
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 5001 is already in use. Stopping the process...${NC}"
    lsof -ti:5001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :50051 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 50051 is already in use. Stopping the process...${NC}"
    lsof -ti:50051 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Step 1: Start database
echo -e "${BLUE}Step 1: Starting database...${NC}"
bash start-db.sh

# Step 2: Install dependencies
echo -e "${BLUE}Step 2: Installing dependencies...${NC}"
npm install

# Step 3: Build project
echo -e "${BLUE}Step 3: Building project...${NC}"
npm run build

# Step 4: Install REST API dependencies
echo -e "${BLUE}Step 4: Installing REST API dependencies...${NC}"
cd notion-clone-api
npm install
cd ..

# Step 5: Start REST API in background
echo -e "${BLUE}Step 5: Starting REST API server...${NC}"
echo -e "${YELLOW}REST API will start on port 5001${NC}"
cd notion-clone-api
npm start &
REST_PID=$!
cd ..
sleep 3

# Wait for REST API to be ready
echo -e "${YELLOW}Waiting for REST API to be ready...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:5001/users >/dev/null 2>&1; then
        echo -e "${GREEN}✅ REST API is ready on port 5001${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}❌ REST API failed to start after 15 seconds${NC}"
        cleanup
        exit 1
    fi
    echo -e "${YELLOW}  Waiting... (attempt $i/15)${NC}"
    sleep 1
done

# Step 6: Start gRPC server
echo -e "${BLUE}Step 6: Starting gRPC server...${NC}"
echo -e "${YELLOW}gRPC Server will start on port 50051${NC}"
echo ""
echo -e "${GREEN}🎉 Both servers are now running:${NC}"
echo -e "${GREEN}  - REST API: http://localhost:5001${NC}"
echo -e "${GREEN}  - gRPC API: localhost:50051${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo -e "${YELLOW}You can now run tests with: npm run test:equivalence${NC}"
echo ""

# Start gRPC server (this will block)
npm start
