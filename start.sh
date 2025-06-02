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

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🔨 Building the project...${NC}"
npm run build

echo -e "${BLUE}🎯 Starting the gRPC server...${NC}"
echo -e "${GREEN}✅ Server will start on port 50051${NC}"
echo -e "${YELLOW}💡 To test the API, run: npm run client${NC}"
echo -e "${YELLOW}💡 To run all tests, run: npm run test:all${NC}"
echo ""

npm start
