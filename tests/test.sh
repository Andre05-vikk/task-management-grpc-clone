#!/bin/bash

# Test script for gRPC Task Management API
# This script tests the gRPC API by running the client example
# and checking the output for expected results

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting gRPC API tests..."

# Start the server in the background
echo "Starting gRPC server..."
npm run start &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Run the client example
echo "Running client tests..."
OUTPUT=$(npm run client)

# Check for expected output
EXPECTED_PATTERNS=(
  "User created with ID:|Error creating user:"
  "Logged in with token:"
  "Retrieved [0-9]+ users"
  "Retrieved user: Test User|Error getting user:"
  "Task created with ID:|Error creating task:"
  "Retrieved [0-9]+ tasks|Error getting tasks:"
  "Updated task status: IN_PROGRESS|Error updating task:"
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
