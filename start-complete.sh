#!/bin/bash

# Complete startup script for gRPC Task Management API
# This script starts the database, builds the project, and starts the gRPC server

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting gRPC Task Management API${NC}"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
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

# Step 4: Start gRPC server
echo -e "${BLUE}Step 4: Starting gRPC server...${NC}"
echo -e "${YELLOW}Server will start on port 50051${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

npm start
