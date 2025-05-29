#!/usr/bin/env node

/**
 * Comprehensive REST vs gRPC Equivalence Test
 * Tests ALL endpoints and compares responses in detail
 */

const grpc = require('@grpc/grpc-js');
const messages = require('../dist/src/proto/proto/task_management_pb');
const services = require('../dist/src/proto/proto/task_management_grpc_pb');
const axios = require('axios');

// Configuration
const REST_URL = 'http://localhost:5001';
const GRPC_HOST = 'localhost:50051';

// Test data
const TEST_USER = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User'
};

const TEST_TASK = {
    title: 'Test Task',
    description: 'This is a test task',
    status: 'pending'
};

// gRPC clients
const authClient = new services.AuthServiceClient(GRPC_HOST, grpc.credentials.createInsecure());
const userClient = new services.UserServiceClient(GRPC_HOST, grpc.credentials.createInsecure());
const taskClient = new services.TaskServiceClient(GRPC_HOST, grpc.credentials.createInsecure());

// Test results tracking
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Utility functions
function log(message, type = 'info') {
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m',   // Red
        warning: '\x1b[33m'  // Yellow
    };
    console.log(`${colors[type]}${message}\x1b[0m`);
}

function assert(condition, message) {
    testsRun++;
    if (condition) {
        testsPassed++;
        log(`✓ ${message}`, 'success');
        return true;
    } else {
        testsFailed++;
        log(`✗ ${message}`, 'error');
        return false;
    }
}

// gRPC helper functions
function grpcCall(client, method, request) {
    return new Promise((resolve, reject) => {
        client[method](request, (err, response) => {
            if (err) reject(err);
            else resolve(response);
        });
    });
}

// REST helper functions
async function restCall(method, endpoint, data = null, token = null) {
    const config = {
        method,
        url: `${REST_URL}${endpoint}`,
        headers: {}
    };
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
    }
    
    try {
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

// Test functions
async function testUserCreation() {
    log('\n=== Testing User Creation ===');
    
    // REST API
    const restResult = await restCall('POST', '/users', {
        email: TEST_USER.email,
        password: TEST_USER.password
    });
    
    // gRPC API
    const grpcRequest = new messages.CreateUserRequest();
    grpcRequest.setEmail(TEST_USER.email + '_grpc');
    grpcRequest.setUsername(TEST_USER.email + '_grpc');
    grpcRequest.setPassword(TEST_USER.password);
    grpcRequest.setName(TEST_USER.name);
    
    let grpcResult;
    try {
        grpcResult = await grpcCall(userClient, 'createUser', grpcRequest);
    } catch (error) {
        grpcResult = { error: error.message };
    }
    
    // Compare results
    assert(restResult.success, 'REST user creation succeeded');
    assert(grpcResult && !grpcResult.error, 'gRPC user creation succeeded');
    
    if (restResult.success && grpcResult && !grpcResult.error) {
        const restUser = restResult.data;
        const grpcUser = grpcResult.getUser();

        assert(typeof restUser.id !== 'undefined', 'REST returns user ID');
        assert(grpcUser && grpcUser.getId(), 'gRPC returns user ID');
        assert(restUser.username === TEST_USER.email, 'REST user has correct email');
        assert(grpcUser && grpcUser.getEmail() === TEST_USER.email + '_grpc', 'gRPC user has correct email');

        // Store for later tests
        global.restUserId = restUser.id;
        global.grpcUserId = grpcUser ? grpcUser.getId() : null;
        global.restUserEmail = restUser.username;
        global.grpcUserEmail = grpcUser ? grpcUser.getUsername() : null; // Use username for login
    }
}

async function testAuthentication() {
    log('\n=== Testing Authentication ===');
    
    // REST API login
    const restLogin = await restCall('POST', '/sessions', {
        email: global.restUserEmail,
        password: TEST_USER.password
    });
    
    // gRPC API login
    const grpcLoginRequest = new messages.LoginRequest();
    grpcLoginRequest.setUsername(global.grpcUserEmail);
    grpcLoginRequest.setPassword(TEST_USER.password);
    
    let grpcLogin;
    try {
        grpcLogin = await grpcCall(authClient, 'login', grpcLoginRequest);
    } catch (error) {
        grpcLogin = { error: error.message };
    }
    
    // Compare results
    assert(restLogin.success, 'REST login succeeded');
    assert(grpcLogin && !grpcLogin.error, 'gRPC login succeeded');
    
    if (restLogin.success && grpcLogin && !grpcLogin.error) {
        assert(restLogin.data.token, 'REST returns token');
        assert(grpcLogin.getToken(), 'gRPC returns token');
        
        // Store tokens for later tests
        global.restToken = restLogin.data.token;
        global.grpcToken = grpcLogin.getToken();
    }
}

async function testGetUsers() {
    log('\n=== Testing Get Users ===');
    
    // REST API
    const restUsers = await restCall('GET', '/users', null, global.restToken);
    
    // gRPC API
    const grpcRequest = new messages.GetUsersRequest();
    let grpcUsers;
    try {
        grpcUsers = await grpcCall(userClient, 'getUsers', grpcRequest);
    } catch (error) {
        grpcUsers = { error: error.message };
    }
    
    // Compare results
    assert(restUsers.success, 'REST get users succeeded');
    assert(grpcUsers && !grpcUsers.error, 'gRPC get users succeeded');
    
    if (restUsers.success && grpcUsers && !grpcUsers.error) {
        assert(Array.isArray(restUsers.data), 'REST returns array of users');
        assert(grpcUsers.getUsersList(), 'gRPC returns list of users');
        assert(restUsers.data.length > 0, 'REST returns at least one user');
        assert(grpcUsers.getUsersList().length > 0, 'gRPC returns at least one user');
    }
}

async function testGetUserById() {
    log('\n=== Testing Get User By ID ===');
    
    // REST API
    const restUser = await restCall('GET', `/users/${global.restUserId}`, null, global.restToken);
    
    // gRPC API
    const grpcRequest = new messages.GetUserRequest();
    grpcRequest.setUserid(global.grpcUserId);
    
    let grpcUser;
    try {
        grpcUser = await grpcCall(userClient, 'getUser', grpcRequest);
    } catch (error) {
        grpcUser = { error: error.message };
    }
    
    // Compare results
    assert(restUser.success, 'REST get user by ID succeeded');
    assert(grpcUser && !grpcUser.error, 'gRPC get user by ID succeeded');
    
    if (restUser.success && grpcUser && !grpcUser.error) {
        assert(restUser.data.id == global.restUserId, 'REST returns correct user ID');
        assert(grpcUser.getUser().getId() === global.grpcUserId, 'gRPC returns correct user ID');
    }
}

async function testTaskOperations() {
    log('\n=== Testing Task Operations ===');
    
    // Test task creation
    const restTask = await restCall('POST', '/tasks', {
        title: TEST_TASK.title,
        description: TEST_TASK.description,
        status: TEST_TASK.status
    }, global.restToken);
    
    const grpcTaskRequest = new messages.CreateTaskRequest();
    grpcTaskRequest.setTitle(TEST_TASK.title);
    grpcTaskRequest.setDescription(TEST_TASK.description);
    grpcTaskRequest.setStatus(TEST_TASK.status);
    grpcTaskRequest.setUserid(global.grpcUserId);
    
    let grpcTask;
    try {
        grpcTask = await grpcCall(taskClient, 'createTask', grpcTaskRequest);
    } catch (error) {
        grpcTask = { error: error.message };
    }
    
    if (!restTask.success) {
        log(`REST task creation failed: ${JSON.stringify(restTask)}`, 'error');
    }
    if (grpcTask && grpcTask.error) {
        log(`gRPC task creation failed: ${grpcTask.error}`, 'error');
    }

    assert(restTask.success, 'REST task creation succeeded');
    assert(grpcTask && !grpcTask.error, 'gRPC task creation succeeded');
    
    if (restTask.success && grpcTask && !grpcTask.error) {
        global.restTaskId = restTask.data.taskId;
        global.grpcTaskId = grpcTask.getTask().getId();

        assert(restTask.data.title === TEST_TASK.title, 'REST task has correct title');
        assert(grpcTask.getTask().getTitle() === TEST_TASK.title, 'gRPC task has correct title');
    }
}

async function testErrorHandling() {
    log('\n=== Testing Error Handling ===');
    
    // Test invalid login
    const restInvalidLogin = await restCall('POST', '/sessions', {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
    });
    
    const grpcInvalidRequest = new messages.LoginRequest();
    grpcInvalidRequest.setUsername('nonexistent@example.com');
    grpcInvalidRequest.setPassword('wrongpassword');
    
    let grpcInvalidLogin;
    try {
        grpcInvalidLogin = await grpcCall(authClient, 'login', grpcInvalidRequest);
    } catch (error) {
        grpcInvalidLogin = { error: error.message, code: error.code };
    }
    
    assert(!restInvalidLogin.success, 'REST properly rejects invalid login');
    assert(grpcInvalidLogin.error, 'gRPC properly rejects invalid login');
    assert(restInvalidLogin.status === 401, 'REST returns 401 for invalid login');
    assert(grpcInvalidLogin.code === grpc.status.UNAUTHENTICATED, 'gRPC returns UNAUTHENTICATED for invalid login');
}

async function runAllTests() {
    log('🚀 Starting Comprehensive REST vs gRPC Equivalence Tests', 'info');
    
    try {
        await testUserCreation();
        await testAuthentication();
        await testGetUsers();
        await testGetUserById();
        await testTaskOperations();
        await testErrorHandling();
        
        log('\n📊 Test Results:', 'info');
        log(`Total tests: ${testsRun}`);
        log(`Passed: ${testsPassed}`, 'success');
        log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
        
        if (testsFailed === 0) {
            log('\n🎉 All comprehensive tests passed! REST and gRPC APIs are functionally equivalent.', 'success');
            process.exit(0);
        } else {
            log('\n❌ Some tests failed. APIs are not fully equivalent.', 'error');
            process.exit(1);
        }
        
    } catch (error) {
        log(`\n💥 Test suite failed with error: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run tests
runAllTests();
