#!/bin/bash

# Complete Test Suite - Runs both APIs and all tests
# This script starts both REST and gRPC APIs, then runs all tests

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Complete Test Suite for Task Management APIs ===${NC}"
echo -e "${YELLOW}This script will:${NC}"
echo -e "${YELLOW}1. Build the gRPC project${NC}"
echo -e "${YELLOW}2. Start both REST and gRPC APIs${NC}"
echo -e "${YELLOW}3. Run basic gRPC tests${NC}"
echo -e "${YELLOW}4. Run functional equivalence tests${NC}"
echo -e "${YELLOW}5. Clean up all processes${NC}"

# Configuration
REST_PORT=5001
GRPC_PORT=50051

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}Waiting for $service_name to be ready on port $port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        # Add a small delay before checking
        sleep 2
        
        if check_port $port; then
            echo -e "${GREEN}✓ $service_name is ready${NC}"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting..."
        ((attempt++))
    done
    
    echo -e "${RED}✗ $service_name failed to start within $max_attempts seconds${NC}"
    echo -e "${YELLOW}Debug: Checking what's on port $port${NC}"
    lsof -Pi :$port || echo "No process found on port $port"
    return 1
}

# Function to cleanup processes
cleanup() {
    echo -e "\n${BLUE}Cleaning up processes...${NC}"
    
    # Kill specific PIDs if they exist
    if [ ! -z "$REST_PID" ]; then
        kill $REST_PID 2>/dev/null
        echo "Stopped REST API (PID: $REST_PID)"
    fi
    
    if [ ! -z "$GRPC_PID" ]; then
        kill $GRPC_PID 2>/dev/null
        echo "Stopped gRPC API (PID: $GRPC_PID)"
    fi
    
    # Kill any remaining processes on the ports
    if check_port $REST_PORT; then
        echo "Killing remaining processes on port $REST_PORT..."
        kill -9 $(lsof -ti:$REST_PORT) 2>/dev/null || true
    fi
    
    if check_port $GRPC_PORT; then
        echo "Killing remaining processes on port $GRPC_PORT..."
        kill -9 $(lsof -ti:$GRPC_PORT) 2>/dev/null || true
    fi
    
    echo -e "${GREEN}Cleanup completed${NC}"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Function to start REST API
start_rest_api() {
    echo -e "\n${BLUE}Starting REST API...${NC}"
    
    if check_port $REST_PORT; then
        echo -e "${YELLOW}Port $REST_PORT is already in use. Stopping existing process...${NC}"
        kill -9 $(lsof -ti:$REST_PORT) 2>/dev/null || true
        sleep 2
    fi
    
    cd notion-clone-api
    npm start > ../rest-api.log 2>&1 &
    REST_PID=$!
    cd ..
    
    echo "REST API started with PID: $REST_PID"
    
    if wait_for_service $REST_PORT "REST API"; then
        return 0
    else
        echo -e "${RED}Failed to start REST API${NC}"
        return 1
    fi
}

# Function to start gRPC API
start_grpc_api() {
    echo -e "\n${BLUE}Starting gRPC API...${NC}"
    
    if check_port $GRPC_PORT; then
        echo -e "${YELLOW}Port $GRPC_PORT is already in use. Stopping existing process...${NC}"
        kill -9 $(lsof -ti:$GRPC_PORT) 2>/dev/null || true
        sleep 2
    fi
    
    npm start > grpc-api.log 2>&1 &
    GRPC_PID=$!
    
    echo "gRPC API started with PID: $GRPC_PID"
    
    if wait_for_service $GRPC_PORT "gRPC API"; then
        return 0
    else
        echo -e "${RED}Failed to start gRPC API${NC}"
        return 1
    fi
}

# Function to run basic gRPC tests
run_basic_tests() {
    echo -e "\n${BLUE}=== Running Basic gRPC Tests ===${NC}"

    # Run client tests directly since server is already running
    echo "Running client tests..."
    OUTPUT=$(npm run client 2>&1)

    # Check for SUCCESS patterns only (no error acceptance)
    SUCCESS_PATTERNS=(
      "User created with ID:"
      "Logged in with token:"
      "Retrieved [0-9]+ users"
      "All examples completed successfully"
    )

    # Check for ERROR patterns (these should NOT be present)
    ERROR_PATTERNS=(
      "Error creating user:"
      "Error logging in:"
      "Error getting users:"
      "Error running examples:"
    )

    FAILED=0

    # Check that all success patterns are present
    for pattern in "${SUCCESS_PATTERNS[@]}"; do
        if echo "$OUTPUT" | grep -qE "$pattern"; then
            echo -e "${GREEN}✓ Found success: $pattern${NC}"
        else
            echo -e "${RED}✗ Missing success: $pattern${NC}"
            FAILED=1
        fi
    done

    # Check that no error patterns are present
    for pattern in "${ERROR_PATTERNS[@]}"; do
        if echo "$OUTPUT" | grep -qE "$pattern"; then
            echo -e "${RED}✗ Found error: $pattern${NC}"
            FAILED=1
        else
            echo -e "${GREEN}✓ No error: $pattern${NC}"
        fi
    done

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ Basic gRPC tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Basic gRPC tests failed${NC}"
        return 1
    fi
}

# Function to run comprehensive equivalence tests
run_equivalence_tests() {
    echo -e "\n${BLUE}=== Running Comprehensive Equivalence Tests ===${NC}"

    if npm run test:comprehensive; then
        echo -e "${GREEN}✓ Comprehensive equivalence tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Comprehensive equivalence tests failed${NC}"
        return 1
    fi
}

# Main execution function
main() {
    local tests_passed=0
    local tests_total=5
    
    # Step 1: Build the project
    echo -e "\n${BLUE}=== Step 1: Building gRPC Project ===${NC}"
    if npm run build; then
        echo -e "${GREEN}✓ Build successful${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}✗ Build failed${NC}"
        return 1
    fi
    
    # Step 2: Start REST API
    echo -e "\n${BLUE}=== Step 2: Starting REST API ===${NC}"
    if start_rest_api; then
        echo -e "${GREEN}✓ REST API started successfully${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}✗ Failed to start REST API${NC}"
        return 1
    fi
    
    # Step 3: Start gRPC API
    echo -e "\n${BLUE}=== Step 3: Starting gRPC API ===${NC}"
    if start_grpc_api; then
        echo -e "${GREEN}✓ gRPC API started successfully${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}✗ Failed to start gRPC API${NC}"
        return 1
    fi
    
    # Step 4: Run basic tests
    if run_basic_tests; then
        ((tests_passed++))
    fi
    
    # Step 5: Run equivalence tests
    if run_equivalence_tests; then
        ((tests_passed++))
        echo -e "${GREEN}✓ All tests completed successfully${NC}"
    fi
    
    # Final results
    echo -e "\n${BLUE}=== Final Results ===${NC}"
    echo "Steps completed: $tests_passed/$tests_total"
    
    if [ $tests_passed -eq $tests_total ]; then
        echo -e "${GREEN}🎉 All tests passed! Both APIs are working correctly.${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed.${NC}"
        return 1
    fi
}

# Run main function
main
exit $?
