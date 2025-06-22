#!/usr/bin/env node

const grpc = require('@grpc/grpc-js');
const messages = require('./dist/src/proto/task_management_pb');
const services = require('./dist/src/proto/task_management_grpc_pb');

// gRPC clients
const authClient = new services.AuthServiceClient('localhost:50051', grpc.credentials.createInsecure());
const userClient = new services.UserServiceClient('localhost:50051', grpc.credentials.createInsecure());
const taskClient = new services.TaskServiceClient('localhost:50051', grpc.credentials.createInsecure());

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

async function testTaskCreation() {
    try {
        console.log('🔧 Testing gRPC task creation...');
        
        // First create a user and get auth token
        console.log('1. Creating user...');
        const createUserRequest = new messages.CreateUserRequest();
        const testEmail = `tasktest_${Date.now()}@example.com`;
        createUserRequest.setEmail(testEmail);
        createUserRequest.setPassword('password123');
        
        const userResult = await grpcCall(userClient, 'createUser', createUserRequest);
        console.log('✅ User created:', {
            id: userResult.getUser().getId(),
            email: userResult.getUser().getEmail()
        });
        
        // Login
        console.log('2. Logging in...');
        const loginRequest = new messages.LoginRequest();
        loginRequest.setUsername(testEmail);
        loginRequest.setPassword('password123');
        
        const loginResult = await grpcCall(authClient, 'login', loginRequest);
        const token = loginResult.getToken();
        console.log('✅ Login successful, token received');
        
        // Create task
        console.log('3. Creating task...');
        const createTaskRequest = new messages.CreateTaskRequest();
        createTaskRequest.setTitle('Test Task via gRPC');
        createTaskRequest.setDescription('This is a test task created via gRPC');
        createTaskRequest.setStatus('pending');
        createTaskRequest.setUserid(userResult.getUser().getId()); // Use actual user ID
        
        console.log('📤 Sending task creation request with data:', {
            title: createTaskRequest.getTitle(),
            description: createTaskRequest.getDescription(),
            status: createTaskRequest.getStatus(),
            userId: createTaskRequest.getUserid()
        });
        
        const taskResult = await grpcCall(taskClient, 'createTask', createTaskRequest);
        console.log('✅ Task created successfully:', {
            id: taskResult.getTaskid(),
            title: taskResult.getTitle(),
            status: taskResult.getStatus(),
            success: taskResult.getSuccess()
        });
        
    } catch (error) {
        console.error('❌ Error during task creation test:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details
        });
    }
}

testTaskCreation();
