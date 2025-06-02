#!/bin/bash

# Quick Start Script for gRPC Task Management API
# This script installs dependencies, builds the project, and starts the server

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 gRPC Task Management API - Quick Start${NC}"
echo -e "${YELLOW}This will install dependencies, build the project, and start the server${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
  exit 1
fi

echo -e "${BLUE}📦 Installing gRPC dependencies...${NC}"
npm install

echo -e "${BLUE}📦 Installing REST API dependencies...${NC}"
cd notion-clone-api
npm install
cd ..

echo -e "${BLUE}🔨 Building the gRPC project...${NC}"
npm run build

echo -e "${BLUE}🎯 Starting both servers...${NC}"
echo -e "${GREEN}✅ gRPC Server will start on port 50051${NC}"
echo -e "${GREEN}✅ REST API Server will start on port 5001${NC}"
echo -e "${YELLOW}💡 To test the gRPC API, run: npm run client${NC}"
echo -e "${YELLOW}💡 To run all tests, run: npm run test:all${NC}"
echo ""

# Start REST API in background
echo -e "${BLUE}🚀 Starting REST API server...${NC}"
cd notion-clone-api
npm start > ../rest-api.log 2>&1 &
REST_API_PID=$!
cd ..

# Wait a moment for REST API to start
sleep 3

# Start gRPC server
echo -e "${BLUE}🚀 Starting gRPC server...${NC}"
npm start &
GRPC_PID=$!

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    kill $REST_API_PID 2>/dev/null || true
    kill $GRPC_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}✅ Both servers are running!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait for the gRPC server to finish (or until interrupted)
wait $GRPC_PID
