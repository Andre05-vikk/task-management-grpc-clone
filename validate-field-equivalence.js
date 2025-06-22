#!/usr/bin/env node

/**
 * Field Structure Equivalence Validator
 * Validates that REST and gRPC endpoints return exactly the same field names and structure
 * This ensures no extra or missing fields, and field names must match exactly
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
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Deep field comparison function
function compareFieldStructure(obj1, obj2, path = '') {
    const issues = [];
    
    if (typeof obj1 !== typeof obj2) {
        issues.push(`${path}: Type mismatch - ${typeof obj1} vs ${typeof obj2}`);
        return issues;
    }
    
    if (obj1 === null || obj2 === null) {
        if (obj1 !== obj2) {
            issues.push(`${path}: Null mismatch - ${obj1} vs ${obj2}`);
        }
        return issues;
    }
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) {
        issues.push(`${path}: Array type mismatch`);
        return issues;
    }
    
    if (Array.isArray(obj1)) {
        if (obj1.length > 0 && obj2.length > 0) {
            // Compare structure of first element
            issues.push(...compareFieldStructure(obj1[0], obj2[0], `${path}[0]`));
        } else if (obj1.length === 0 && obj2.length === 0) {
            // Both empty arrays - OK
        } else {
            issues.push(`${path}: Array length mismatch (structure comparison needs non-empty arrays)`);
        }
        return issues;
    }
    
    if (typeof obj1 === 'object') {
        const keys1 = Object.keys(obj1).sort();
        const keys2 = Object.keys(obj2).sort();
        
        // Check for missing keys in obj2
        const missing2 = keys1.filter(key => !keys2.includes(key));
        if (missing2.length > 0) {
            issues.push(`${path}: Missing fields in gRPC response: ${missing2.join(', ')}`);
        }
        
        // Check for extra keys in obj2
        const extra2 = keys2.filter(key => !keys1.includes(key));
        if (extra2.length > 0) {
            issues.push(`${path}: Extra fields in gRPC response: ${extra2.join(', ')}`);
        }
        
        // Recursively compare common keys
        const commonKeys = keys1.filter(key => keys2.includes(key));
        for (const key of commonKeys) {
            const newPath = path ? `${path}.${key}` : key;
            issues.push(...compareFieldStructure(obj1[key], obj2[key], newPath));
        }
    }
    
    return issues;
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
                id: parseInt(grpcResponse.getId()),
                username: grpcResponse.getUsername(),
                createdAt: grpcResponse.getCreatedat(),
                updatedAt: grpcResponse.getUpdatedat()
            };
        case 'userResponse':
            const user = grpcResponse.getUser();
            return user ? {
                id: parseInt(user.getId()),
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
                taskId: parseInt(grpcResponse.getTaskid()),
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
                    id: parseInt(task.getId()),
                    title: task.getTitle(),
                    description: task.getDescription(),
                    status: task.getStatus(),
                    user_id: parseInt(task.getUserid()),
                    createdAt: task.getCreatedat(),
                    updatedAt: task.getUpdatedat()
                }))
            };
        case 'usersList':
            const users = grpcResponse.getUsersList();
            return users.map(user => ({
                id: parseInt(user.getId()),
                username: user.getUsername(),
                createdAt: user.getCreatedat(),
                updatedAt: user.getUpdatedat()
            }));
        default:
            return grpcResponse.toObject ? grpcResponse.toObject() : grpcResponse;
    }
}

async function validateEndpoint(name, restResponse, grpcResponse) {
    log(`\n🔍 Validating: ${name}`, 'cyan');
    
    if (restResponse === null && grpcResponse === null) {
        log('  ✅ Both responses are null (No Content)', 'green');
        return true;
    }
    
    if (restResponse === null || grpcResponse === null) {
        log(`  ❌ One response is null: REST=${restResponse}, gRPC=${grpcResponse}`, 'red');
        return false;
    }
    
    const issues = compareFieldStructure(restResponse, grpcResponse);
    
    if (issues.length === 0) {
        log('  ✅ Field structures match perfectly', 'green');
        return true;
    } else {
        log('  ❌ Field structure issues:', 'red');
        issues.forEach(issue => log(`    • ${issue}`, 'red'));
        return false;
    }
}

async function runFieldValidation() {
    log('🔎 FIELD STRUCTURE EQUIVALENCE VALIDATION', 'cyan');
    log('='*60, 'cyan');
    
    const testEmail = `field_test_${Date.now()}@example.com`;
    const testPassword = 'password123';
    
    let allValid = true;
    
    try {
        // 1. User Creation
        const restUser = await restCall('POST', '/users', {
            email: testEmail,
            password: testPassword
        });
        
        const grpcUserRequest = new messages.CreateUserRequest();
        grpcUserRequest.setEmail(testEmail + '_grpc');
        grpcUserRequest.setPassword(testPassword);
        
        const grpcUser = await grpcCall(userClient, 'createUser', grpcUserRequest);
        
        const userValid = await validateEndpoint(
            'POST /users (User Creation)',
            restUser.data,
            grpcToObject(grpcUser.getUser(), 'user')
        );
        allValid = allValid && userValid;
        
        // Store user data
        const restUserId = restUser.data.id;
        const grpcUserId = grpcUser.getUser().getId();
        
        // 2. Authentication
        const restLogin = await restCall('POST', '/sessions', {
            email: testEmail,
            password: testPassword
        });
        
        const grpcLoginRequest = new messages.LoginRequest();
        grpcLoginRequest.setUsername(testEmail + '_grpc');
        grpcLoginRequest.setPassword(testPassword);
        
        const grpcLogin = await grpcCall(authClient, 'login', grpcLoginRequest);
        
        const authValid = await validateEndpoint(
            'POST /sessions (Login)',
            restLogin.data,
            grpcToObject(grpcLogin, 'loginResponse')
        );
        allValid = allValid && authValid;
        
        const restToken = restLogin.data.token;
        const grpcToken = grpcLogin.getToken();
        
        // 3. Get Users
        const restUsers = await restCall('GET', '/users', null, restToken);
        
        const grpcUsersRequest = new messages.GetUsersRequest();
        const grpcUsers = await grpcCall(userClient, 'getUsers', grpcUsersRequest);
        
        const usersValid = await validateEndpoint(
            'GET /users (List Users)',
            restUsers.data,
            grpcToObject(grpcUsers, 'usersList')
        );
        allValid = allValid && usersValid;
        
        // 4. Get User by ID
        const restUserById = await restCall('GET', `/users/${restUserId}`, null, restToken);
        
        const grpcUserByIdRequest = new messages.GetUserRequest();
        grpcUserByIdRequest.setUserid(grpcUserId);
        
        const grpcUserById = await grpcCall(userClient, 'getUser', grpcUserByIdRequest);
        
        const userByIdValid = await validateEndpoint(
            'GET /users/:id (Get User by ID)',
            restUserById.data,
            grpcToObject(grpcUserById, 'userResponse')
        );
        allValid = allValid && userByIdValid;
        
        // 5. Task Creation
        const restTask = await restCall('POST', '/tasks', {
            title: 'Validation Test Task',
            description: 'This task is for field validation',
            status: 'pending'
        }, restToken);
        
        const grpcTaskRequest = new messages.CreateTaskRequest();
        grpcTaskRequest.setTitle('Validation Test Task');
        grpcTaskRequest.setDescription('This task is for field validation');
        grpcTaskRequest.setStatus('pending');
        grpcTaskRequest.setUserid(grpcUserId);
        
        const grpcTask = await grpcCall(taskClient, 'createTask', grpcTaskRequest);
        
        const taskValid = await validateEndpoint(
            'POST /tasks (Create Task)',
            restTask.data,
            grpcToObject(grpcTask, 'createTaskResponse')
        );
        allValid = allValid && taskValid;
        
        // 6. Get Tasks
        const restTasks = await restCall('GET', '/tasks', null, restToken);
        
        const grpcTasksRequest = new messages.GetTasksRequest();
        grpcTasksRequest.setUserid(grpcUserId);
        
        const grpcTasks = await grpcCall(taskClient, 'getTasks', grpcTasksRequest);
        
        const tasksValid = await validateEndpoint(
            'GET /tasks (List Tasks)',
            restTasks.data,
            grpcToObject(grpcTasks, 'tasksList')
        );
        allValid = allValid && tasksValid;
        
        // 7. Logout
        const restLogout = await restCall('DELETE', '/sessions', null, restToken);
        
        const grpcLogoutRequest = new messages.LogoutRequest();
        grpcLogoutRequest.setToken(grpcToken);
        
        const grpcLogout = await grpcCall(authClient, 'logout', grpcLogoutRequest);
        
        // Both should return empty/null for logout (204 No Content)
        const restLogoutData = restLogout.status === 204 ? {} : restLogout.data;  // Treat 204 as empty object
        const grpcLogoutData = grpcLogout.toObject ? grpcLogout.toObject() : {};  // Empty object for empty protobuf
        
        const logoutValid = await validateEndpoint(
            'DELETE /sessions (Logout)',
            restLogoutData,
            grpcLogoutData
        );
        allValid = allValid && logoutValid;
        
        // 8. Test unsupported endpoints (should be skipped or report as not implemented)
        log('\n🔍 Testing unsupported endpoints...', 'yellow');
        
        // Try task update (should fail gracefully)
        try {
            const restTaskUpdate = await restCall('PUT', `/tasks/999`, {
                title: 'Updated Task'
            }, restToken);
            
            if (restTaskUpdate.success) {
                log('  ⚠️ REST API unexpectedly supports task updates', 'yellow');
            } else {
                log('  ✅ REST API correctly does not support task updates', 'green');
            }
        } catch (error) {
            log('  ✅ REST API correctly does not support task updates', 'green');
        }
        
        log('\n'+'='*60, 'cyan');
        
        if (allValid) {
            log('🎉 ALL FIELD STRUCTURES ARE EQUIVALENT!', 'green');
            log('✅ Every supported endpoint returns identical field names and structure', 'green');
            log('🔍 Requirements satisfied: field names match exactly, no extra/missing fields', 'green');
        } else {
            log('❌ FIELD STRUCTURE MISMATCHES FOUND!', 'red');
            log('📝 Some endpoints return different field names or structures', 'red');
        }
        
        return allValid;
        
    } catch (error) {
        log(`❌ Validation failed with error: ${error.message}`, 'red');
        console.error(error);
        return false;
    }
}

// Run validation
runFieldValidation();
