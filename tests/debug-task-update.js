#!/usr/bin/env node

const grpc = require('@grpc/grpc-js');
const messages = require('../dist/src/proto/task_management_pb');
const services = require('../dist/src/proto/task_management_grpc_pb');

const userClient = new services.UserServiceClient('localhost:50051', grpc.credentials.createInsecure());
const taskClient = new services.TaskServiceClient('localhost:50051', grpc.credentials.createInsecure());
const authClient = new services.AuthServiceClient('localhost:50051', grpc.credentials.createInsecure());

function grpcCall(client, method, request) {
    return new Promise((resolve, reject) => {
        client[method](request, (err, response) => {
            if (err) reject(err);
            else resolve(response);
        });
    });
}

async function debugTaskUpdate() {
    console.log('🔍 DEBUG: Task Update Test');
    
    try {
        console.log('Testing gRPC connection...');
        
        // Test connection first
        const testReq = new messages.GetUsersRequest();
        try {
            await grpcCall(userClient, 'getUsers', testReq);
            console.log('✅ gRPC connection successful');
        } catch (connErr) {
            console.error('❌ gRPC connection failed:', connErr.message);
            return;
        }
        // 1. Create a user
        const userRequest = new messages.CreateUserRequest();
        userRequest.setEmail(`debug_${Date.now()}@example.com`);
        userRequest.setPassword('password123');
        
        const userResult = await grpcCall(userClient, 'createUser', userRequest);
        const userId = userResult.getUser().getId();
        console.log('✅ User created with ID:', userId);
        
        // 2. Create a task
        const taskRequest = new messages.CreateTaskRequest();
        taskRequest.setTitle('Debug Task');
        taskRequest.setDescription('Debug description');
        taskRequest.setStatus('pending');
        taskRequest.setUserid(userId);
        
        const taskResult = await grpcCall(taskClient, 'createTask', taskRequest);
        const taskId = taskResult.getTask().getId();
        console.log('✅ Task created with ID:', taskId);
        console.log('Task details:', {
            id: taskResult.getTask().getId(),
            title: taskResult.getTask().getTitle(),
            userId: taskResult.getTask().getUserid()
        });
        
        // 3. Try to update the task
        console.log('\n🔧 Attempting task update...');
        const updateRequest = new messages.UpdateTaskRequest();
        updateRequest.setTaskid(taskId);
        updateRequest.setTitle('Updated Debug Task');
        
        console.log('Update request details:', {
            taskId: updateRequest.getTaskid(),
            title: updateRequest.getTitle()
        });
        
        const updateResult = await grpcCall(taskClient, 'updateTask', updateRequest);
        console.log('✅ Task update succeeded!');
        console.log('Updated task details:', {
            id: updateResult.getTask().getId(),
            title: updateResult.getTask().getTitle(),
            status: updateResult.getTask().getStatus()
        });
        
    } catch (error) {
        console.error('❌ Error during debug test:', error.message);
        console.error('Error details:', error);
    }
}

debugTaskUpdate();
