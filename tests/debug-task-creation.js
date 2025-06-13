#!/usr/bin/env node

/**
 * Debug test to isolate the gRPC task creation issue
 */

const grpc = require('@grpc/grpc-js');
const messages = require('../dist/src/proto/task_management_pb');
const services = require('../dist/src/proto/task_management_grpc_pb');

// gRPC clients
const userClient = new services.UserServiceClient('localhost:50051', grpc.credentials.createInsecure());
const taskClient = new services.TaskServiceClient('localhost:50051', grpc.credentials.createInsecure());

async function testTaskCreation() {
  console.log('🧪 Testing gRPC Task Creation Debug...');
  
  try {
    // 1. Create a user first
    console.log('1. Creating user...');
    const createUserRequest = new messages.CreateUserRequest();
    createUserRequest.setEmail(`debug-${Date.now()}@example.com`);
    createUserRequest.setPassword('testpass123');

    const userResponse = await new Promise((resolve, reject) => {
      userClient.createUser(createUserRequest, (error, response) => {
        if (error) {
          console.error('User creation error details:', error);
          reject(error);
        } else {
          console.log('User response:', response);
          resolve(response);
        }
      });
    });

    const userId = userResponse.getUser().getId();
    console.log(`✅ User created with ID: ${userId}`);

    // 2. Try to create a task
    console.log('2. Creating task...');
    const createTaskRequest = new messages.CreateTaskRequest();
    createTaskRequest.setTitle('Debug Test Task');
    createTaskRequest.setDescription('This is a debug test task');
    createTaskRequest.setStatus('pending');
    createTaskRequest.setUserid(userId);

    console.log('Task request details:');
    console.log(`  Title: ${createTaskRequest.getTitle()}`);
    console.log(`  Description: ${createTaskRequest.getDescription()}`);
    console.log(`  Status: ${createTaskRequest.getStatus()}`);
    console.log(`  User ID: ${createTaskRequest.getUserid()}`);

    const taskResponse = await new Promise((resolve, reject) => {
      taskClient.createTask(createTaskRequest, (error, response) => {
        if (error) {
          console.error('Task creation error details:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          reject(error);
        } else {
          console.log('Task response:', response);
          resolve(response);
        }
      });
    });

    const taskId = taskResponse.getTask().getId();
    console.log(`✅ Task created with ID: ${taskId}`);

    // Cleanup
    await new Promise((resolve, reject) => {
      const deleteTaskRequest = new messages.DeleteTaskRequest();
      deleteTaskRequest.setTaskid(taskId);
      taskClient.deleteTask(deleteTaskRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    await new Promise((resolve, reject) => {
      const deleteUserRequest = new messages.DeleteUserRequest();
      deleteUserRequest.setUserid(userId);
      userClient.deleteUser(deleteUserRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    console.log('✅ Debug test completed successfully');

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testTaskCreation().catch(console.error);
