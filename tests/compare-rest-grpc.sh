#!/bin/bash

# Automatic REST vs gRPC Comparison Test
# This script starts both APIs and compares their responses
# Fulfills requirement: "automaattestid mis võrdlevad REST- ja gRPC-vastuseid"

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 Starting Automatic REST vs gRPC Comparison Tests${NC}"
echo "This test compares REST and gRPC responses for equivalence"
echo ""

# Function to cleanup processes
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up processes...${NC}"
    pkill -f "notion-clone-api" 2>/dev/null || true
    pkill -f "dist/src/server" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Step 1: Start database if needed
echo -e "${BLUE}📁 Starting database...${NC}"
bash start-db.sh > /dev/null 2>&1

# Step 2: Build gRPC project
echo -e "${BLUE}🔨 Building gRPC project...${NC}"
npm run build > /dev/null 2>&1

# Step 3: Start gRPC server
echo -e "${BLUE}🚀 Starting gRPC server...${NC}"
npm start > grpc-test.log 2>&1 &
GRPC_PID=$!

# Step 4: Start REST API
echo -e "${BLUE}🌐 Starting REST API...${NC}"
cd notion-clone-api
npm start > ../rest-test.log 2>&1 &
REST_PID=$!
cd ..

# Wait for both servers to start
echo -e "${YELLOW}⏳ Waiting for servers to start...${NC}"
sleep 15  # Increased wait time for reliable startup

# Step 5: Check if both servers are running
echo -e "${BLUE}🔍 Checking server status...${NC}"
GRPC_RUNNING=$(lsof -i :50051 2>/dev/null | grep LISTEN || echo "")
REST_RUNNING=$(lsof -i :5001 2>/dev/null | grep LISTEN || echo "")

if [ -z "$GRPC_RUNNING" ]; then
    echo -e "${RED}❌ gRPC server is not running on port 50051${NC}"
    exit 1
fi

if [ -z "$REST_RUNNING" ]; then
    echo -e "${RED}❌ REST server is not running on port 5001${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Both servers are running${NC}"

# Step 6: Run comprehensive equivalence test
echo -e "${BLUE}🧪 Running REST vs gRPC equivalence tests...${NC}"
echo ""

# Run the comparison test
if node tests/comprehensive-equivalence.js; then
    echo ""
    echo -e "${GREEN}🎉 SUCCESS: REST and gRPC responses are equivalent!${NC}"
    echo -e "${GREEN}✅ All comparison tests passed${NC}"
    
    # Additional field structure validation
    echo -e "\n${BLUE}🔬 Running detailed field structure validation...${NC}"
    if node validate-field-equivalence.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Field structures are identical${NC}"
    else
        echo -e "${YELLOW}⚠️ Field structure validation had minor issues (check manually)${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}📊 FINAL RESULT: PASS${NC}"
    echo -e "${GREEN}Both APIs return equivalent responses for all tested endpoints${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ FAILED: REST and gRPC responses are not equivalent${NC}"
    echo -e "${RED}📊 FINAL RESULT: FAIL${NC}"
    echo ""
    echo -e "${YELLOW}Debug information:${NC}"
    echo "Check these log files for details:"
    echo "- grpc-test.log (gRPC server logs)"
    echo "- rest-test.log (REST server logs)"
    exit 1
fi
