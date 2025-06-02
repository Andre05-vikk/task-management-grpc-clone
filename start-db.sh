#!/bin/bash

# Start MariaDB Database for Task Management APIs
# This script starts only the database, REST and gRPC APIs run locally

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Starting MariaDB Database${NC}"
echo -e "${YELLOW}This will start the database for REST API tests${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
  exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
  exit 1
fi

echo -e "${BLUE}🛑 Stopping any existing database...${NC}"
docker-compose down --remove-orphans

echo -e "${BLUE}🚀 Starting MariaDB database...${NC}"
docker-compose up -d

echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
sleep 15

echo -e "${GREEN}✅ MariaDB database started successfully!${NC}"
echo ""
echo -e "${YELLOW}📊 Database Status:${NC}"
echo -e "${GREEN}• MariaDB: localhost:3307${NC}"
echo -e "${GREEN}• Database: notion_clone${NC}"
echo -e "${GREEN}• User: taskuser${NC}"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo -e "${BLUE}• Run tests: npm run test:all${NC}"
echo -e "${BLUE}• Stop database: docker-compose down${NC}"
echo ""
echo -e "${GREEN}🎉 Database is ready for testing!${NC}"
