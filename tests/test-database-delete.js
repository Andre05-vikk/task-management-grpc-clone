#!/usr/bin/env node

/**
 * Focused test to verify that gRPC delete operations actually remove data from database
 * This addresses the main issue: ensuring gRPC uses real database storage, not in-memory
 */

const grpc = require('@grpc/grpc-js');
const messages = require('../dist/src/proto/task_management_pb');
const services = require('../dist/src/proto/task_management_grpc_pb');
const mariadb = require('mariadb');

// Database configuration (same as in database.ts)
const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'taskuser',
  password: 'taskpassword',
  database: 'notion_clone',  // Correct database name
  connectionLimit: 5,
  acquireTimeout: 30000,
  timeout: 30000
};

let pool;

// gRPC clients
const userClient = new services.UserServiceClient('localhost:50051', grpc.credentials.createInsecure());
const taskClient = new services.TaskServiceClient('localhost:50051', grpc.credentials.createInsecure());
const authClient = new services.AuthServiceClient('localhost:50051', grpc.credentials.createInsecure());

// Test data
const testUser = {
  email: `delete-test-${Date.now()}@example.com`,
  password: 'testpass123'
};

async function initDatabase() {
  console.log('🔌 Testing database connection...');
  try {
    // Test connection with a simple query
    await queryDatabase('SELECT 1');
    console.log('✅ Database connection working');
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    throw error;
  }
}

async function queryDatabase(sql, params = []) {
  // Use direct connection instead of pool to avoid connection conflicts
  const connection = await mariadb.createConnection(dbConfig);
  try {
    const result = await connection.query(sql, params);
    return result;
  } finally {
    await connection.end();
  }
}

async function waitForServer() {
  console.log('⏳ Waiting for gRPC server...');
  return new Promise(resolve => setTimeout(resolve, 3000));
}

async function testUserDeletion() {
  console.log('\n🧪 Testing User Deletion...');
  
  try {
    // 1. Create user via gRPC
    console.log('1️⃣ Creating user via gRPC...');
    const createUserRequest = new messages.CreateUserRequest();
    createUserRequest.setEmail(testUser.email);
    createUserRequest.setPassword(testUser.password);

    const userResponse = await new Promise((resolve, reject) => {
      userClient.createUser(createUserRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    const userId = userResponse.getUser().getId();
    console.log(`   ✅ User created with ID: ${userId}`);

    // 2. Verify user exists in database
    console.log('2️⃣ Verifying user exists in database...');
    const dbUsers = await queryDatabase('SELECT * FROM users WHERE id = ?', [parseInt(userId)]);
    
    if (dbUsers.length === 0) {
      console.log('   ❌ User NOT found in database after creation!');
      return false;
    }
    console.log(`   ✅ User found in database: ${dbUsers[0].username}`);

    // 3. Delete user via gRPC
    console.log('3️⃣ Deleting user via gRPC...');
    const deleteUserRequest = new messages.DeleteUserRequest();
    deleteUserRequest.setUserid(userId);

    await new Promise((resolve, reject) => {
      userClient.deleteUser(deleteUserRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
    console.log('   ✅ User deletion request completed');

    // 4. CRITICAL TEST: Verify user is actually deleted from database
    console.log('4️⃣ CRITICAL: Verifying user is deleted from database...');
    const deletedDbUsers = await queryDatabase('SELECT * FROM users WHERE id = ?', [parseInt(userId)]);
    
    if (deletedDbUsers.length === 0) {
      console.log('   🎉 SUCCESS: User actually deleted from database!');
      return true;
    } else {
      console.log('   ❌ FAILURE: User still exists in database after deletion!');
      console.log(`   Found user: ${deletedDbUsers[0].username}`);
      return false;
    }

  } catch (error) {
    console.log(`   ❌ User deletion test failed: ${error.message}`);
    return false;
  }
}

async function testTaskDeletion() {
  console.log('\n🧪 Testing Task Deletion...');
  
  try {
    // 1. Create user first (needed for task)
    console.log('1️⃣ Creating user for task test...');
    const createUserRequest = new messages.CreateUserRequest();
    createUserRequest.setEmail(`task-test-${Date.now()}@example.com`);
    createUserRequest.setPassword('testpass123');

    const userResponse = await new Promise((resolve, reject) => {
      userClient.createUser(createUserRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    const userId = userResponse.getUser().getId();
    console.log(`   ✅ User created with ID: ${userId}`);

    // 2. Create task via gRPC
    console.log('2️⃣ Creating task via gRPC...');
    const createTaskRequest = new messages.CreateTaskRequest();
    createTaskRequest.setTitle('Delete Test Task');
    createTaskRequest.setDescription('This task will be deleted');
    createTaskRequest.setStatus('pending');
    createTaskRequest.setUserid(userId);

    const taskResponse = await new Promise((resolve, reject) => {
      taskClient.createTask(createTaskRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    const taskId = taskResponse.getTask().getId();
    console.log(`   ✅ Task created with ID: ${taskId}`);

    // 3. Verify task exists in database
    console.log('3️⃣ Verifying task exists in database...');
    const dbTasks = await queryDatabase('SELECT * FROM tasks WHERE id = ?', [parseInt(taskId)]);
    
    if (dbTasks.length === 0) {
      console.log('   ❌ Task NOT found in database after creation!');
      return false;
    }
    console.log(`   ✅ Task found in database: "${dbTasks[0].title}"`);

    // 4. Delete task via gRPC
    console.log('4️⃣ Deleting task via gRPC...');
    const deleteTaskRequest = new messages.DeleteTaskRequest();
    deleteTaskRequest.setTaskid(taskId);

    await new Promise((resolve, reject) => {
      taskClient.deleteTask(deleteTaskRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
    console.log('   ✅ Task deletion request completed');

    // 5. CRITICAL TEST: Verify task is actually deleted from database
    console.log('5️⃣ CRITICAL: Verifying task is deleted from database...');
    const deletedDbTasks = await queryDatabase('SELECT * FROM tasks WHERE id = ?', [parseInt(taskId)]);
    
    if (deletedDbTasks.length === 0) {
      console.log('   🎉 SUCCESS: Task actually deleted from database!');
      
      // Cleanup: delete test user
      await queryDatabase('DELETE FROM users WHERE id = ?', [parseInt(userId)]);
      return true;
    } else {
      console.log('   ❌ FAILURE: Task still exists in database after deletion!');
      console.log(`   Found task: "${deletedDbTasks[0].title}"`);
      
      // Cleanup: delete test data
      await queryDatabase('DELETE FROM tasks WHERE id = ?', [parseInt(taskId)]);
      await queryDatabase('DELETE FROM users WHERE id = ?', [parseInt(userId)]);
      return false;
    }

  } catch (error) {
    console.log(`   ❌ Task deletion test failed: ${error.message}`);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  try {
    await queryDatabase('DELETE FROM tasks WHERE title LIKE "%Delete Test%"');
    await queryDatabase('DELETE FROM users WHERE username LIKE "%delete-test-%"');
    await queryDatabase('DELETE FROM users WHERE username LIKE "%task-test-%"');
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log(`❌ Cleanup failed: ${error.message}`);
  }
}

async function runFocusedTest() {
  console.log('🚀 DATABASE DELETE VERIFICATION TEST');
  console.log('====================================');
  console.log('This test verifies that gRPC delete operations actually remove data from the database.');
  console.log('Previously, delete operations only removed data from in-memory arrays.');
  console.log('');

  let allTestsPassed = true;

  try {
    await initDatabase();
    await waitForServer();

    // Test user deletion
    const userTestPassed = await testUserDeletion();
    if (!userTestPassed) allTestsPassed = false;

    // Test task deletion
    const taskTestPassed = await testTaskDeletion();
    if (!taskTestPassed) allTestsPassed = false;

    await cleanup();

    console.log('\n📊 TEST RESULTS');
    console.log('===============');
    console.log(`User Deletion: ${userTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Task Deletion: ${taskTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ gRPC API is using real database storage');
      console.log('✅ Delete operations remove data from database');
      console.log('✅ gRPC API now matches REST API functionality');
    } else {
      console.log('❌ SOME TESTS FAILED!');
      console.log('⚠️  gRPC API may still be using in-memory storage for some operations');
    }

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    allTestsPassed = false;
  } finally {
    // No pool to close anymore since we use direct connections
    console.log('🔌 Database connections closed');
  }

  process.exit(allTestsPassed ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted, cleaning up...');
  await cleanup(); 
  process.exit(0);
});

runFocusedTest().catch(console.error);
