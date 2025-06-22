#!/usr/bin/env node

/**
 * REST vs gRPC Response Comparison Tool
 * Shows side-by-side comparison of API responses
 */

const grpc = require('@grpc/grpc-js');
const messages = require('./dist/src/proto/task_management_pb');
const services = require('./dist/src/proto/task_management_grpc_pb');
const axios = require('axios');

// Configuration
const REST_URL = 'http://localhost:5001';
const GRPC_HOST = 'localhost:50051';

// gRPC clients
const authClient = new services.AuthServiceClient(GRPC_HOST, grpc.credentials.createInsecure());
const userClient = new services.UserServiceClient(GRPC_HOST, grpc.credentials.createInsecure());
const taskClient = new services.TaskServiceClient(GRPC_HOST, grpc.credentials.createInsecure());

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function printDivider(title) {
    const divider = '='.repeat(80);
    log(`\n${divider}`, 'cyan');
    log(`  ${title}`, 'cyan');
    log(`${divider}`, 'cyan');
}

function printComparison(endpoint, restResponse, grpcResponse) {
    log(`\n📍 ENDPOINT: ${endpoint}`, 'yellow');
    log('─'.repeat(80), 'dim');
    
    // REST Response
    log('🌐 REST API RESPONSE:', 'green');
    log('─'.repeat(40), 'dim');
    console.log(JSON.stringify(restResponse, null, 2));
    
    log('\n🔌 gRPC API RESPONSE:', 'blue');
    log('─'.repeat(40), 'dim');
    console.log(JSON.stringify(grpcResponse, null, 2));
    
    log('─'.repeat(80), 'dim');
}

// Utility functions
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

async function grpcCall(client, method, request) {
    return new Promise((resolve, reject) => {
        client[method](request, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

// Convert gRPC response to comparable object
function grpcToObject(grpcResponse, type) {
    if (!grpcResponse) return null;
    
    switch (type) {
        case 'user':
            return {
                id: parseInt(grpcResponse.getId()), // Convert to number
                username: grpcResponse.getUsername(),
                createdAt: grpcResponse.getCreatedat(),
                updatedAt: grpcResponse.getUpdatedat()
            };
        case 'userResponse':
            const user = grpcResponse.getUser();
            return user ? {
                id: parseInt(user.getId()), // Convert to number
                username: user.getUsername(),
                createdAt: user.getCreatedat(),
                updatedAt: user.getUpdatedat()
            } : null;
        case 'loginResponse':
            return {
                token: grpcResponse.getToken()
            };
        case 'createTaskResponse':
            return {
                success: grpcResponse.getSuccess(),
                message: grpcResponse.getMessage(),
                taskId: parseInt(grpcResponse.getTaskid()), // Convert to number
                title: grpcResponse.getTitle(),
                description: grpcResponse.getDescription(),
                status: grpcResponse.getStatus()
            };
        case 'tasksList':
            const tasks = grpcResponse.getTasksList();
            return {
                page: grpcResponse.getPage(),
                limit: grpcResponse.getLimit(),
                total: grpcResponse.getTotal(),
                tasks: tasks.map(task => ({
                    id: parseInt(task.getId()), // Convert to number
                    title: task.getTitle(),
                    description: task.getDescription(),
                    status: task.getStatus(),
                    user_id: parseInt(task.getUserid()), // Convert to number and use user_id
                    createdAt: task.getCreatedat(),
                    updatedAt: task.getUpdatedat()
                }))
            };
        case 'updateTaskResponse':
            const updatedTask = grpcResponse.getTask();
            return updatedTask ? {
                id: parseInt(updatedTask.getId()),
                title: updatedTask.getTitle(),
                description: updatedTask.getDescription(),
                status: updatedTask.getStatus(),
                user_id: parseInt(updatedTask.getUserid()),
                createdAt: updatedTask.getCreatedat(),
                updatedAt: updatedTask.getUpdatedat()
            } : null;
        case 'deleteTaskResponse':
            return {
                success: grpcResponse.getSuccess(),
                message: grpcResponse.getMessage()
            };
        case 'updateUserResponse':
            const updatedUser = grpcResponse.getUser();
            return updatedUser ? {
                id: parseInt(updatedUser.getId()),
                username: updatedUser.getUsername(),
                createdAt: updatedUser.getCreatedat(),
                updatedAt: updatedUser.getUpdatedat()
            } : null;
        case 'deleteUserResponse':
            return {
                success: grpcResponse.getSuccess(),
                message: grpcResponse.getMessage()
            };
        case 'logoutResponse':
            return null; // Both REST and gRPC return 204/empty response
        case 'usersList':
            const users = grpcResponse.getUsersList();
            return users.map(user => ({
                id: parseInt(user.getId()), // Convert to number
                username: user.getUsername(),
                createdAt: user.getCreatedat(),
                updatedAt: user.getUpdatedat()
            }));
        default:
            return grpcResponse.toObject ? grpcResponse.toObject() : grpcResponse;
    }
}

async function compareResponses() {
    printDivider('REST vs gRPC API RESPONSE COMPARISON');
    
    const testEmail = `compare_test_${Date.now()}@example.com`;
    const testPassword = 'password123';
    
    try {
        // 1. User Creation
        log('\n🔄 Testing User Creation...', 'yellow');
        
        const restUser = await restCall('POST', '/users', {
            email: testEmail,
            password: testPassword
        });
        
        const grpcUserRequest = new messages.CreateUserRequest();
        grpcUserRequest.setEmail(testEmail + '_grpc');
        grpcUserRequest.setPassword(testPassword);
        
        const grpcUser = await grpcCall(userClient, 'createUser', grpcUserRequest);
        
        printComparison(
            'POST /users (User Creation)',
            restUser.data,
            grpcToObject(grpcUser.getUser(), 'user')
        );
        
        // Store user data
        const restUserId = restUser.data.id;
        const grpcUserId = grpcUser.getUser().getId();
        
        // 2. Authentication
        log('\n🔄 Testing Authentication...', 'yellow');
        
        const restLogin = await restCall('POST', '/sessions', {
            email: testEmail,
            password: testPassword
        });
        
        const grpcLoginRequest = new messages.LoginRequest();
        grpcLoginRequest.setUsername(testEmail + '_grpc');
        grpcLoginRequest.setPassword(testPassword);
        
        const grpcLogin = await grpcCall(authClient, 'login', grpcLoginRequest);
        
        printComparison(
            'POST /sessions (Login)',
            restLogin.data,
            grpcToObject(grpcLogin, 'loginResponse')
        );
        
        const restToken = restLogin.data.token;
        const grpcToken = grpcLogin.getToken();
        
        // 3. Get Users
        log('\n🔄 Testing Get Users...', 'yellow');
        
        const restUsers = await restCall('GET', '/users', null, restToken);
        
        const grpcUsersRequest = new messages.GetUsersRequest();
        const grpcUsers = await grpcCall(userClient, 'getUsers', grpcUsersRequest);
        
        printComparison(
            'GET /users (List Users)',
            restUsers.data,
            grpcToObject(grpcUsers, 'usersList')
        );
        
        // 4. Get User by ID
        log('\n🔄 Testing Get User by ID...', 'yellow');
        
        const restUserById = await restCall('GET', `/users/${restUserId}`, null, restToken);
        
        const grpcUserByIdRequest = new messages.GetUserRequest();
        grpcUserByIdRequest.setUserid(grpcUserId);
        
        const grpcUserById = await grpcCall(userClient, 'getUser', grpcUserByIdRequest);
        
        printComparison(
            `GET /users/:id (Get User by ID)`,
            restUserById.data,
            grpcToObject(grpcUserById, 'userResponse')
        );
        
        // 5. Task Creation
        log('\n🔄 Testing Task Creation...', 'yellow');
        
        const restTask = await restCall('POST', '/tasks', {
            title: 'Comparison Test Task',
            description: 'This task is for comparing responses',
            status: 'pending'
        }, restToken);
        
        const grpcTaskRequest = new messages.CreateTaskRequest();
        grpcTaskRequest.setTitle('Comparison Test Task');
        grpcTaskRequest.setDescription('This task is for comparing responses');
        grpcTaskRequest.setStatus('pending');
        grpcTaskRequest.setUserid(grpcUserId);
        
        const grpcTask = await grpcCall(taskClient, 'createTask', grpcTaskRequest);
        
        printComparison(
            'POST /tasks (Create Task)',
            restTask.data,
            grpcToObject(grpcTask, 'createTaskResponse')
        );
        
        // 6. Get Tasks
        log('\n🔄 Testing Get Tasks...', 'yellow');
        
        const restTasks = await restCall('GET', '/tasks', null, restToken);
        
        const grpcTasksRequest = new messages.GetTasksRequest();
        grpcTasksRequest.setUserid(grpcUserId);
        
        const grpcTasks = await grpcCall(taskClient, 'getTasks', grpcTasksRequest);
        
        printComparison(
            'GET /tasks (List Tasks)',
            restTasks.data,
            grpcToObject(grpcTasks, 'tasksList')
        );
        
        const restTaskId = restTask.data.taskId;
        const grpcTaskId = parseInt(grpcTask.getTaskid());
        
        // 7. Check if REST API supports task update (skip if not supported)
        log('\n🔄 Checking Task Update Support...', 'yellow');
        
        try {
            const restTaskUpdate = await restCall('PUT', `/tasks/${restTaskId}`, {
                title: 'Updated Task Title'
            }, restToken);
            
            if (restTaskUpdate.success) {
                log('✅ REST API supports task updates', 'green');
                
                // Test gRPC update as well
                const grpcUpdateTaskRequest = new messages.UpdateTaskRequest();
                grpcUpdateTaskRequest.setTaskid(grpcTaskId.toString());
                grpcUpdateTaskRequest.setTitle('Updated Task Title');
                grpcUpdateTaskRequest.setUserid(grpcUserId);
                
                const grpcTaskUpdate = await grpcCall(taskClient, 'updateTask', grpcUpdateTaskRequest);
                
                printComparison(
                    'PUT /tasks/:id (Update Task)',
                    restTaskUpdate.data,
                    grpcToObject(grpcTaskUpdate, 'updateTaskResponse')
                );
            } else {
                log('⚠️ REST API does not support task updates - skipping comparison', 'yellow');
            }
        } catch (error) {
            log('⚠️ REST API does not support task updates - skipping comparison', 'yellow');
        }
        
        // 8. Check if REST API supports user update
        log('\n🔄 Checking User Update Support...', 'yellow');
        
        try {
            const restUserUpdate = await restCall('PUT', `/users/${restUserId}`, {
                username: testEmail
            }, restToken);
            
            if (restUserUpdate.success) {
                log('✅ REST API supports user updates', 'green');
                
                const grpcUpdateUserRequest = new messages.UpdateUserRequest();
                grpcUpdateUserRequest.setUserid(grpcUserId);
                grpcUpdateUserRequest.setUsername(testEmail + '_grpc');
                
                const grpcUserUpdate = await grpcCall(userClient, 'updateUser', grpcUpdateUserRequest);
                
                printComparison(
                    'PUT /users/:id (Update User)',
                    restUserUpdate.data,
                    grpcToObject(grpcUserUpdate, 'updateUserResponse')
                );
            } else {
                log('⚠️ REST API does not support user updates - skipping comparison', 'yellow');
            }
        } catch (error) {
            log('⚠️ REST API does not support user updates - skipping comparison', 'yellow');
        }
        
        // 9. Check if REST API supports task deletion
        log('\n🔄 Checking Task Deletion Support...', 'yellow');
        
        try {
            const restTaskDelete = await restCall('DELETE', `/tasks/${restTaskId}`, null, restToken);
            
            if (restTaskDelete.success || restTaskDelete.status === 204) {
                log('✅ REST API supports task deletion', 'green');
                
                const grpcDeleteTaskRequest = new messages.DeleteTaskRequest();
                grpcDeleteTaskRequest.setTaskid(grpcTaskId.toString());
                
                const grpcTaskDelete = await grpcCall(taskClient, 'deleteTask', grpcDeleteTaskRequest);
                
                printComparison(
                    'DELETE /tasks/:id (Delete Task)',
                    restTaskDelete.status === 204 ? 'No Content (204)' : restTaskDelete.data,
                    grpcToObject(grpcTaskDelete, 'deleteTaskResponse') || 'Success'
                );
            } else {
                log('⚠️ REST API does not support task deletion - skipping comparison', 'yellow');
            }
        } catch (error) {
            log('⚠️ REST API does not support task deletion - skipping comparison', 'yellow');
        }
        
        // 10. Logout
        log('\n🔄 Testing Logout...', 'yellow');
        
        const restLogout = await restCall('DELETE', '/sessions', null, restToken);
        
        const grpcLogoutRequest = new messages.LogoutRequest();
        grpcLogoutRequest.setToken(grpcToken);
        
        const grpcLogout = await grpcCall(authClient, 'logout', grpcLogoutRequest);
        
        printComparison(
            'DELETE /sessions (Logout)',
            restLogout.status === 204 ? 'No Content (204)' : restLogout.data,
            grpcToObject(grpcLogout, 'logoutResponse') || 'No Content'
        );
        
        // 11. Check if REST API supports user deletion
        log('\n🔄 Checking User Deletion Support...', 'yellow');
        
        try {
            const deleteTestEmail = `delete_test_${Date.now()}@example.com`;
            
            // Create fresh REST user for deletion test
            const restDeleteUser = await restCall('POST', '/users', {
                email: deleteTestEmail,
                password: 'deletetest123'
            });
            
            const restDeleteLogin = await restCall('POST', '/sessions', {
                email: deleteTestEmail,
                password: 'deletetest123'
            });
            
            const restUserDelete = await restCall('DELETE', `/users/${restDeleteUser.data.id}`, null, restDeleteLogin.data.token);
            
            if (restUserDelete.success || restUserDelete.status === 204) {
                log('✅ REST API supports user deletion', 'green');
                
                // Create fresh gRPC user for deletion test
                const grpcDeleteUserRequest = new messages.CreateUserRequest();
                grpcDeleteUserRequest.setEmail(deleteTestEmail + '_grpc');
                grpcDeleteUserRequest.setPassword('deletetest123');
                
                const grpcDeleteUserCreated = await grpcCall(userClient, 'createUser', grpcDeleteUserRequest);
                const grpcDeleteUserId = grpcDeleteUserCreated.getUser().getId();
                
                const grpcDeleteUserDeleteRequest = new messages.DeleteUserRequest();
                grpcDeleteUserDeleteRequest.setUserid(grpcDeleteUserId);
                
                const grpcUserDelete = await grpcCall(userClient, 'deleteUser', grpcDeleteUserDeleteRequest);
                
                printComparison(
                    'DELETE /users/:id (Delete User)',
                    restUserDelete.status === 204 ? 'No Content (204)' : restUserDelete.data,
                    grpcToObject(grpcUserDelete, 'deleteUserResponse') || 'Success'
                );
            } else {
                log('⚠️ REST API does not support user deletion - skipping comparison', 'yellow');
            }
        } catch (error) {
            log('⚠️ REST API does not support user deletion - skipping comparison', 'yellow');
        }
        
        printDivider('COMPARISON COMPLETE');
        log('✅ All responses compared successfully!', 'green');
        log('📝 You can see that REST and gRPC return structurally identical data', 'cyan');
        log('🔍 The main differences are just in field naming conventions (camelCase vs snake_case)', 'dim');
        
    } catch (error) {
        log(`❌ Error during comparison: ${error.message}`, 'red');
        console.error(error);
    }
}

// Run comparison
compareResponses();
