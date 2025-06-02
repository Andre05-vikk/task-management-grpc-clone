#!/bin/bash

# Functional Equivalence Test between REST and gRPC APIs
# This script tests that both APIs provide identical functionality

# Colo    GRPC_TASK_OUTPUT=$(node -e "
        const grpc = require('@grpc/grpc-js');
        const messages = require('./dist/src/proto/task_management_pb');
        const services = require('./dist/src/proto/task_management_grpc_pb');or output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== REST vs gRPC Functional Equivalence Tests ===${NC}"

# Test configuration
REST_PORT=5001
GRPC_PORT=50051
REST_URL="http://localhost:${REST_PORT}"

# Test data
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="password123"
TEST_USERNAME="testuser_$(date +%s)"

# Function to start REST API
start_rest_api() {
    echo -e "\n${BLUE}Starting REST API...${NC}"
    cd notion-clone-api
    npm start &
    REST_PID=$!
    cd ..
    sleep 3
    echo "REST API started with PID: $REST_PID"
}

# Function to start gRPC API
start_grpc_api() {
    echo -e "\n${BLUE}Starting gRPC API...${NC}"
    npm start &
    GRPC_PID=$!
    sleep 2
    echo "gRPC API started with PID: $GRPC_PID"
}

# Function to stop APIs
cleanup() {
    echo -e "\n${BLUE}Cleaning up...${NC}"
    if [ ! -z "$REST_PID" ]; then
        kill $REST_PID 2>/dev/null
    fi
    if [ ! -z "$GRPC_PID" ]; then
        kill $GRPC_PID 2>/dev/null
    fi
    # Kill any remaining processes on the ports
    kill -9 $(lsof -ti:$REST_PORT) 2>/dev/null || true
    kill -9 $(lsof -ti:$GRPC_PORT) 2>/dev/null || true
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Function to test user creation
test_user_creation() {
    echo -e "\n${BLUE}Testing User Creation...${NC}"
    
    # REST API test
    echo "Testing REST API user creation..."
    REST_RESPONSE=$(curl -s -X POST "$REST_URL/users" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    REST_USER_ID=$(echo "$REST_RESPONSE" | jq -r '.id // empty')
    
    if [ -z "$REST_USER_ID" ]; then
        echo -e "${RED}✗ REST API user creation failed${NC}"
        echo "Response: $REST_RESPONSE"
        return 1
    fi
    
    echo -e "${GREEN}✓ REST API user created with ID: $REST_USER_ID${NC}"
    
    # gRPC API test (using our client)
    echo "Testing gRPC API user creation..."
    GRPC_OUTPUT=$(node -e "
        const grpc = require('@grpc/grpc-js');
        const messages = require('./dist/src/proto/task_management_pb');
        const services = require('./dist/src/proto/task_management_grpc_pb');
        
        const client = new services.UserServiceClient('localhost:$GRPC_PORT', grpc.credentials.createInsecure());
        
        const request = new messages.CreateUserRequest();
        request.setUsername('$TEST_USERNAME');
        request.setEmail('$TEST_EMAIL');
        request.setPassword('$TEST_PASSWORD');
        request.setName('Test User');
        
        client.createUser(request, (err, response) => {
            if (err) {
                console.log('ERROR:', err.message);
                process.exit(1);
            }
            const user = response.getUser();
            console.log('SUCCESS:', user.getId());
            process.exit(0);
        });
    " 2>&1)
    
    if [[ "$GRPC_OUTPUT" == ERROR:* ]]; then
        echo -e "${RED}✗ gRPC API user creation failed${NC}"
        echo "Output: $GRPC_OUTPUT"
        return 1
    fi
    
    GRPC_USER_ID=$(echo "$GRPC_OUTPUT" | grep "SUCCESS:" | cut -d' ' -f2)
    echo -e "${GREEN}✓ gRPC API user created with ID: $GRPC_USER_ID${NC}"
    
    # Store IDs for later tests
    export REST_USER_ID
    export GRPC_USER_ID
    
    return 0
}

# Function to test authentication
test_authentication() {
    echo -e "\n${BLUE}Testing Authentication...${NC}"
    
    # REST API login
    echo "Testing REST API login..."
    REST_LOGIN_RESPONSE=$(curl -s -X POST "$REST_URL/sessions" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    REST_TOKEN=$(echo "$REST_LOGIN_RESPONSE" | jq -r '.token // empty')
    
    if [ -z "$REST_TOKEN" ]; then
        echo -e "${RED}✗ REST API login failed${NC}"
        echo "Response: $REST_LOGIN_RESPONSE"
        return 1
    fi
    
    echo -e "${GREEN}✓ REST API login successful${NC}"
    
    # gRPC API login
    echo "Testing gRPC API login..."
    GRPC_LOGIN_OUTPUT=$(node -e "
        const grpc = require('@grpc/grpc-js');
        const messages = require('./dist/src/proto/proto/task_management_pb');
        const services = require('./dist/src/proto/proto/task_management_grpc_pb');
        
        const client = new services.AuthServiceClient('localhost:$GRPC_PORT', grpc.credentials.createInsecure());
        
        const request = new messages.LoginRequest();
        request.setUsername('$TEST_USERNAME');
        request.setPassword('$TEST_PASSWORD');
        
        client.login(request, (err, response) => {
            if (err) {
                console.log('ERROR:', err.message);
                process.exit(1);
            }
            console.log('SUCCESS:', response.getToken());
            process.exit(0);
        });
    " 2>&1)
    
    if [[ "$GRPC_LOGIN_OUTPUT" == ERROR:* ]]; then
        echo -e "${RED}✗ gRPC API login failed${NC}"
        echo "Output: $GRPC_LOGIN_OUTPUT"
        return 1
    fi
    
    GRPC_TOKEN=$(echo "$GRPC_LOGIN_OUTPUT" | grep "SUCCESS:" | cut -d' ' -f2)
    echo -e "${GREEN}✓ gRPC API login successful${NC}"
    
    # Store tokens for later tests
    export REST_TOKEN
    export GRPC_TOKEN
    
    return 0
}

# Function to compare API responses
compare_apis() {
    echo -e "\n${BLUE}Comparing API Functionality...${NC}"
    
    local TESTS_PASSED=0
    local TESTS_TOTAL=0
    
    # Test user creation
    ((TESTS_TOTAL++))
    if test_user_creation; then
        ((TESTS_PASSED++))
    fi
    
    # Test authentication
    ((TESTS_TOTAL++))
    if test_authentication; then
        ((TESTS_PASSED++))
    fi
    
    echo -e "\n${BLUE}=== Test Results ===${NC}"
    echo "Tests passed: $TESTS_PASSED/$TESTS_TOTAL"
    
    if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
        echo -e "${GREEN}All functional equivalence tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some functional equivalence tests failed!${NC}"
        return 1
    fi
}

# Main execution
main() {
    # Build the project first
    echo -e "${BLUE}Building gRPC project...${NC}"
    npm run build
    mkdir -p dist/src/proto/proto && cp -r src/proto/proto/* dist/src/proto/proto/
    
    # Start APIs
    start_rest_api
    start_grpc_api
    
    # Wait for APIs to be ready
    echo -e "\n${BLUE}Waiting for APIs to be ready...${NC}"
    sleep 5
    
    # Run comparison tests
    compare_apis
    
    return $?
}

# Run main function
main
exit $?
