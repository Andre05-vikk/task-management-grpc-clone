#!/bin/bash

# Run script for gRPC Task Management API
# This script installs dependencies, builds the project, and starts the server

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Task Management gRPC API ===${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Node.js is not installed. Please install Node.js to run this application."
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "npm is not installed. Please install npm to run this application."
  exit 1
fi

# Install dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
npm install

# Build the project
echo -e "\n${BLUE}Building the project...${NC}"
npm run build

# Start the server
echo -e "\n${BLUE}Starting the gRPC server...${NC}"
npm start

echo -e "\n${GREEN}Server is running on port 50051${NC}"
