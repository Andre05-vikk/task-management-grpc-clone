#!/usr/bin/env node

/**
 * Comprehensive REST vs gRPC Equivalence Test
 * Tests ALL endpoints and compares responses in detail
 */

const grpc = require('@grpc/grpc-js');
const messages = require('../dist/src/proto/task_management_pb');
const services = require('../dist/src/proto/task_management_grpc_pb');
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
        return { 
            success: true, 
            data: response.data, 
            status: response.status 
        };
    } catch (error) {
        // Handle 204 No Content as success (for DELETE operations)
        if (error.response && error.response.status === 204) {
            return { 
                success: true, 
                data: null, 
                status: 204 
            };
        }
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
    grpcRequest.setEmail(TEST_USER.email + '_grpc'); // Different email for gRPC to avoid conflicts
    grpcRequest.setPassword(TEST_USER.password);
    
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
        const restUserData = restResult.data;
            const grpcUser = grpcResult.getUser();

            // REST API returns: {id, username, createdAt, updatedAt}
            assert(typeof restUserData.id !== 'undefined', 'REST returns user ID');
            assert(grpcUser && grpcUser.getId(), 'gRPC returns user ID');
            assert(restUserData.username === TEST_USER.email, 'REST user has correct username (email)');
            assert(grpcUser && grpcUser.getEmail() === TEST_USER.email + '_grpc', 'gRPC user has correct email');

            // Store for later tests
            global.restUserId = restUserData.id;
            global.grpcUserId = grpcUser ? grpcUser.getId() : null;
            global.restUserEmail = restUserData.username; // username field contains email
            global.grpcUserEmail = grpcUser ? grpcUser.getEmail() : null;
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
        // REST API returns: {success, message, taskId, title, description, status}
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

async function testUpdateUser() {
    log('\n=== Testing Update User ===');
    
    const updatedPassword = 'newpassword123';
    
    // REST API - only password updates are supported
    const restUpdate = await restCall('PATCH', `/users/${global.restUserId}`, {
        password: updatedPassword
    }, global.restToken);
    
    // gRPC API
    const grpcRequest = new messages.UpdateUserRequest();
    grpcRequest.setUserid(global.grpcUserId);
    grpcRequest.setPassword(updatedPassword);
    
    let grpcUpdate;
    try {
        grpcUpdate = await grpcCall(userClient, 'updateUser', grpcRequest);
    } catch (error) {
        grpcUpdate = { error: error.message };
    }
    
    assert(restUpdate.success, 'REST user update succeeded');
    assert(grpcUpdate && !grpcUpdate.error, 'gRPC user update succeeded');
    
    if (restUpdate.success && grpcUpdate && !grpcUpdate.error) {
        // Verify the user still has the same ID and email
        assert(restUpdate.data.id == global.restUserId, 'REST user maintains ID');
        assert(grpcUpdate.getUser().getId() === global.grpcUserId, 'gRPC user maintains ID');
    }
}

async function testListTasks() {
    log('\n=== Testing List Tasks ===');
    
    // REST API
    const restTasks = await restCall('GET', '/tasks', null, global.restToken);
    
    // gRPC API - need to set user ID for filtering
    const grpcRequest = new messages.GetTasksRequest();
    grpcRequest.setUserid(global.grpcUserId);
    
    let grpcTasks;
    try {
        grpcTasks = await grpcCall(taskClient, 'getTasks', grpcRequest);
    } catch (error) {
        grpcTasks = { error: error.message };
    }
    
    assert(restTasks.success, 'REST get tasks succeeded');
    assert(grpcTasks && !grpcTasks.error, 'gRPC get tasks succeeded');
    
    if (restTasks.success && grpcTasks && !grpcTasks.error) {
        // REST API returns: {page, limit, total, tasks: [...]}
        assert(restTasks.data.tasks && Array.isArray(restTasks.data.tasks), 'REST returns tasks array in data.tasks');
        assert(grpcTasks.getTasksList(), 'gRPC returns list of tasks');
    }
}

async function testUpdateTask() {
    log('\n=== Testing Update Task ===');
    
    const updatedTitle = 'Updated Test Task';
    
    // REST API
    const restUpdate = await restCall('PATCH', `/tasks/${global.restTaskId}`, {
        title: updatedTitle
    }, global.restToken);
    
    // gRPC API
    const grpcRequest = new messages.UpdateTaskRequest();
    grpcRequest.setTaskid(global.grpcTaskId);
    grpcRequest.setTitle(updatedTitle);
    
    let grpcUpdate;
    try {
        grpcUpdate = await grpcCall(taskClient, 'updateTask', grpcRequest);
    } catch (error) {
        grpcUpdate = { error: error.message };
    }
    
    assert(restUpdate.success, 'REST task update succeeded');
    assert(grpcUpdate && !grpcUpdate.error, 'gRPC task update succeeded');
    
    if (restUpdate.success && grpcUpdate && !grpcUpdate.error) {
        // REST API returns: {success: true, message: 'Task updated successfully'}
        // gRPC returns the updated task object
        assert(restUpdate.data.success === true, 'REST task update returns success');
        assert(grpcUpdate.getTask().getTitle() === updatedTitle, 'gRPC task has updated title');
    }
}

async function testDeleteTask() {
    log('\n=== Testing Delete Task ===');
    
    // REST API
    const restDelete = await restCall('DELETE', `/tasks/${global.restTaskId}`, null, global.restToken);
    
    // gRPC API
    const grpcRequest = new messages.DeleteTaskRequest();
    grpcRequest.setTaskid(global.grpcTaskId);
    
    let grpcDelete;
    try {
        grpcDelete = await grpcCall(taskClient, 'deleteTask', grpcRequest);
    } catch (error) {
        grpcDelete = { error: error.message };
    }
    
    // REST API returns 204 status for DELETE operations
    assert(restDelete.status === 204 || restDelete.success, 'REST task deletion succeeded');
    assert(grpcDelete && !grpcDelete.error, 'gRPC task deletion succeeded');
}

async function testLogout() {
    log('\n=== Testing Logout ===');
    
    // REST API
    const restLogout = await restCall('DELETE', '/sessions', null, global.restToken);
    
    // gRPC API
    const grpcRequest = new messages.LogoutRequest();
    grpcRequest.setToken(global.grpcToken);
    
    let grpcLogout;
    try {
        grpcLogout = await grpcCall(authClient, 'logout', grpcRequest);
    } catch (error) {
        grpcLogout = { error: error.message };
    }
    
    // REST API returns 204 status for logout
    assert(restLogout.status === 204 || restLogout.success, 'REST logout succeeded');
    assert(grpcLogout && !grpcLogout.error, 'gRPC logout succeeded');
}

async function testDeleteUser() {
    log('\n=== Testing Delete User ===');
    
    // First check if the user still exists by trying to get all users
    const checkUsers = await restCall('GET', '/users', null, global.restToken);
    log(`Current users before deletion: ${JSON.stringify(checkUsers)}`, 'warning');
    
    // Create a completely fresh user for deletion test to avoid conflicts
    const deleteTestUser = {
        email: `delete_test_${Date.now()}@example.com`,
        password: 'password123'
    };
    
    // Create a fresh user for REST deletion test
    const restUserCreate = await restCall('POST', '/users', {
        email: deleteTestUser.email,
        password: deleteTestUser.password
    });
    
    log(`Fresh REST user created: ${JSON.stringify(restUserCreate)}`, 'warning');
    
    // Login with the fresh user
    const restLogin = await restCall('POST', '/sessions', {
        email: deleteTestUser.email,
        password: deleteTestUser.password
    });
    
    log(`Fresh REST Login Result: ${JSON.stringify(restLogin)}`, 'warning');
    
    const restToken = restLogin.success ? restLogin.data.token : null;
    const restUserId = restUserCreate.success ? restUserCreate.data.id : null;
    
    // REST API - delete user using their own token
    const restDelete = await restCall('DELETE', `/users/${restUserId}`, null, restToken);
    
    // Debug logging
    log(`REST Delete Result: ${JSON.stringify(restDelete)}`, 'warning');
    
    // gRPC API - create a fresh token for the gRPC user to delete themselves
    const grpcUserCreate = new messages.CreateUserRequest();
    grpcUserCreate.setEmail(`delete_test_grpc_${Date.now()}@example.com`);
    grpcUserCreate.setPassword(deleteTestUser.password);
    
    let grpcUserResult;
    try {
        grpcUserResult = await grpcCall(userClient, 'createUser', grpcUserCreate);
    } catch (error) {
        grpcUserResult = { error: error.message };
    }
    
    const grpcUserId = grpcUserResult && grpcUserResult.getUser() ? grpcUserResult.getUser().getId() : null;
    
    // gRPC API - delete user
    const grpcRequest = new messages.DeleteUserRequest();
    grpcRequest.setUserid(grpcUserId);
    
    let grpcDelete;
    try {
        grpcDelete = await grpcCall(userClient, 'deleteUser', grpcRequest);
    } catch (error) {
        grpcDelete = { error: error.message };
    }
    
    // REST API returns 204 status for DELETE operations
    assert(restDelete.status === 204 || restDelete.success, 'REST user deletion succeeded');
    assert(grpcDelete && !grpcDelete.error, 'gRPC user deletion succeeded');
}

async function runAllTests() {
    log('🚀 Starting Comprehensive REST vs gRPC Equivalence Tests', 'info');
    
    try {
        await testUserCreation();
        await testAuthentication();
        await testGetUsers();
        await testGetUserById();
        await testUpdateUser();
        await testTaskOperations();
        await testListTasks();
        await testUpdateTask();
        await testDeleteTask();
        await testLogout();
        await testDeleteUser();
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
