#!/bin/bash

# Test script for gRPC Task Management API
# This script tests the gRPC API by running the client example
# and checking the output for expected results

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting gRPC API tests..."

# Check if port 50051 is already in use and kill the process if needed
PORT_PID=$(lsof -ti :50051)
if [ ! -z "$PORT_PID" ]; then
  echo "Port 50051 is in use, stopping existing process..."
  kill -9 $PORT_PID 2>/dev/null
  sleep 1
fi

# Start the server in the background
echo "Starting gRPC server..."
npm run start > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Run the client example
echo "Running client tests..."
OUTPUT=$(npm run client 2>&1)

# Check for expected output
EXPECTED_PATTERNS=(
  "User created with ID:|Error creating user:"
  "Logged in with token:"
  "Retrieved [0-9]+ users"
  "Retrieved user: .*@.*|Error getting user:"
  "Task created with ID:|Error creating task:"
  "Retrieved [0-9]+ tasks|Error getting tasks:"
  "Updated task status: .*|Error updating task:"
  "Updated user name: Updated Test User|Error updating user:"
  "Task deleted:|Error deleting task:"
  "Logout:|Error logging out:"
  "User deleted:|Error deleting user:"
  "All examples completed successfully|Error running examples:"
)

FAILED=0

for pattern in "${EXPECTED_PATTERNS[@]}"; do
  if echo "$OUTPUT" | grep -q -E "$pattern"; then
    echo -e "${GREEN}✓${NC} Found expected output: $pattern"
  else
    echo -e "${RED}✗${NC} Missing expected output: $pattern"
    FAILED=1
  fi
done

# Kill the server
kill $SERVER_PID

# Report results
if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}Some tests failed!${NC}"
  exit 1
fi
