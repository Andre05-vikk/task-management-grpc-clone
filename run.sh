#!/bin/bash

# Run script for gRPC Task Management API
# This script compiles protos, builds the project, and starts the server

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== gRPC Task Management API - Run Script ===${NC}"

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

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
  npm install
fi

# Build the project (includes proto compilation)
echo -e "\n${BLUE}🔨 Building the project...${NC}"
npm run build

# Start the server
echo -e "\n${GREEN}🚀 Starting gRPC server...${NC}"
echo -e "${YELLOW}Server will be available at localhost:50051${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""
npm start
