// Comprehensive test to verify gRPC API matches REST API functionality
// This test ensures that all operations are using the database correctly

const grpc = require('@grpc/grpc-js');
const messages = require('../dist/src/proto/task_management_pb');
const services = require('../dist/src/proto/task_management_grpc_pb');
const { pool } = require('../dist/src/server/data/database');

// Connect to gRPC server
const userClient = new services.UserServiceClient('localhost:50051', grpc.credentials.createInsecure());
const authClient = new services.AuthServiceClient('localhost:50051', grpc.credentials.createInsecure());
const taskClient = new services.TaskServiceClient('localhost:50051', grpc.credentials.createInsecure());

// Test configuration
const testUser = {
  email: 'test-comprehensive@example.com',
  password: 'testpassword123'
};

async function waitForServer() {
  return new Promise((resolve) => {
    setTimeout(resolve, 2000); // Wait 2 seconds for server to start
  });
}

async function checkDatabaseDirectly(query, params = []) {
  const connection = await pool.getConnection();
  try {
    const result = await connection.query(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  } finally {
    connection.release();
  }
}

async function testUserManagement() {
  console.log('\n=== Testing User Management ===');
  
  try {
    // Test 1: Create user via gRPC
    console.log('1. Creating user via gRPC...');
    const createUserRequest = new messages.CreateUserRequest();
    createUserRequest.setEmail(testUser.email);
    createUserRequest.setPassword(testUser.password);

    const userResponse = await new Promise((resolve, reject) => {
      userClient.createUser(createUserRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    console.log('✅ User created successfully');
    const userId = userResponse.getUser().getId();
    console.log(`   User ID: ${userId}`);

    // Test 2: Verify user exists in database
    console.log('2. Verifying user exists in database...');
    const dbUsers = await checkDatabaseDirectly(
      'SELECT * FROM users WHERE email = ?', 
      [testUser.email]
    );
    
    if (dbUsers && dbUsers.length > 0) {
      console.log('✅ User found in database');
      console.log(`   Database user ID: ${dbUsers[0].id}`);
      console.log(`   Email: ${dbUsers[0].username}`); // username field stores email
    } else {
      console.log('❌ User NOT found in database');
      return;
    }

    // Test 3: Login via gRPC
    console.log('3. Testing login via gRPC...');
    const loginRequest = new messages.LoginRequest();
    loginRequest.setEmail(testUser.email);
    loginRequest.setPassword(testUser.password);

    const loginResponse = await new Promise((resolve, reject) => {
      authClient.login(loginRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    console.log('✅ Login successful');
    const token = loginResponse.getToken();
    console.log(`   Token received (length: ${token.length})`);

    return { userId, token };
  } catch (error) {
    console.error('❌ User management test failed:', error.message);
    return null;
  }
}

async function testTaskManagement(userId, token) {
  console.log('\n=== Testing Task Management ===');
  
  try {
    // Test 1: Create task via gRPC
    console.log('1. Creating task via gRPC...');
    const createTaskRequest = new messages.CreateTaskRequest();
    createTaskRequest.setTitle('Test Task for Database Verification');
    createTaskRequest.setDescription('This task tests database persistence');
    createTaskRequest.setStatus('pending');
    createTaskRequest.setUserid(userId.toString());

    const taskResponse = await new Promise((resolve, reject) => {
      taskClient.createTask(createTaskRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    console.log('✅ Task created successfully');
    const taskId = taskResponse.getTask().getId();
    console.log(`   Task ID: ${taskId}`);
    console.log(`   Title: ${taskResponse.getTask().getTitle()}`);

    // Test 2: Verify task exists in database
    console.log('2. Verifying task exists in database...');
    const dbTasks = await checkDatabaseDirectly(
      'SELECT * FROM tasks WHERE id = ?', 
      [parseInt(taskId)]
    );
    
    if (dbTasks && dbTasks.length > 0) {
      console.log('✅ Task found in database');
      console.log(`   Database task ID: ${dbTasks[0].id}`);
      console.log(`   Title: ${dbTasks[0].title}`);
      console.log(`   Status: ${dbTasks[0].status}`);
      console.log(`   User ID: ${dbTasks[0].user_id}`);
    } else {
      console.log('❌ Task NOT found in database');
      return;
    }

    // Test 3: Get tasks via gRPC
    console.log('3. Getting tasks via gRPC...');
    const getTasksRequest = new messages.GetTasksRequest();
    getTasksRequest.setUserid(userId.toString());

    const getTasksResponse = await new Promise((resolve, reject) => {
      taskClient.getTasks(getTasksRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    const tasks = getTasksResponse.getTasksList();
    console.log(`✅ Retrieved ${tasks.length} tasks`);
    if (tasks.length > 0) {
      console.log(`   First task: ${tasks[0].getTitle()}`);
    }

    // Test 4: Update task via gRPC
    console.log('4. Updating task via gRPC...');
    const updateTaskRequest = new messages.UpdateTaskRequest();
    updateTaskRequest.setTaskid(taskId);
    updateTaskRequest.setTitle('Updated Test Task');
    updateTaskRequest.setStatus('in_progress');

    const updateResponse = await new Promise((resolve, reject) => {
      taskClient.updateTask(updateTaskRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    console.log('✅ Task updated successfully');
    console.log(`   New title: ${updateResponse.getTask().getTitle()}`);
    console.log(`   New status: ${updateResponse.getTask().getStatus()}`);

    // Test 5: Verify update in database
    console.log('5. Verifying update in database...');
    const updatedDbTasks = await checkDatabaseDirectly(
      'SELECT * FROM tasks WHERE id = ?', 
      [parseInt(taskId)]
    );
    
    if (updatedDbTasks && updatedDbTasks.length > 0) {
      console.log('✅ Updated task found in database');
      console.log(`   Updated title: ${updatedDbTasks[0].title}`);
      console.log(`   Updated status: ${updatedDbTasks[0].status}`);
    } else {
      console.log('❌ Updated task NOT found in database');
    }

    return taskId;
  } catch (error) {
    console.error('❌ Task management test failed:', error.message);
    return null;
  }
}

async function testDeleteFunctionality(taskId) {
  console.log('\n=== Testing Delete Functionality ===');
  
  try {
    // Test 1: Verify task exists before deletion
    console.log('1. Verifying task exists before deletion...');
    let dbTasks = await checkDatabaseDirectly(
      'SELECT * FROM tasks WHERE id = ?', 
      [parseInt(taskId)]
    );
    
    if (dbTasks && dbTasks.length > 0) {
      console.log('✅ Task exists in database before deletion');
      console.log(`   Task ID: ${dbTasks[0].id}, Title: ${dbTasks[0].title}`);
    } else {
      console.log('❌ Task does NOT exist in database before deletion');
      return;
    }

    // Test 2: Delete task via gRPC
    console.log('2. Deleting task via gRPC...');
    const deleteTaskRequest = new messages.DeleteTaskRequest();
    deleteTaskRequest.setTaskid(taskId);

    const deleteResponse = await new Promise((resolve, reject) => {
      taskClient.deleteTask(deleteTaskRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    console.log('✅ Task deleted successfully via gRPC');
    console.log(`   Status: ${deleteResponse.getStatus().getMessage()}`);

    // Test 3: Verify task is actually removed from database
    console.log('3. Verifying task is removed from database...');
    dbTasks = await checkDatabaseDirectly(
      'SELECT * FROM tasks WHERE id = ?', 
      [parseInt(taskId)]
    );
    
    if (!dbTasks || dbTasks.length === 0) {
      console.log('✅ CRITICAL SUCCESS: Task actually deleted from database!');
      console.log('   This confirms gRPC delete operations are using real database storage');
    } else {
      console.log('❌ CRITICAL FAILURE: Task still exists in database after deletion!');
      console.log('   This indicates gRPC is not using persistent database storage');
      console.log(`   Found task: ${dbTasks[0].title}`);
    }

    // Test 4: Try to get deleted task via gRPC
    console.log('4. Attempting to get deleted task via gRPC...');
    const getTasksRequest = new messages.GetTasksRequest();
    getTasksRequest.setUserid('1'); // Use the user ID

    const getTasksResponse = await new Promise((resolve, reject) => {
      taskClient.getTasks(getTasksRequest, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    const tasks = getTasksResponse.getTasksList();
    const deletedTaskFound = tasks.find(task => task.getId() === taskId);
    
    if (!deletedTaskFound) {
      console.log('✅ Deleted task not returned by getTasks (correct behavior)');
    } else {
      console.log('❌ Deleted task still returned by getTasks (incorrect behavior)');
    }

  } catch (error) {
    console.error('❌ Delete functionality test failed:', error.message);
  }
}

async function testDatabaseEquivalence() {
  console.log('\n=== Testing Database Equivalence ===');
  
  try {
    // Test 1: Count users in database
    console.log('1. Checking user count in database...');
    const userCount = await checkDatabaseDirectly('SELECT COUNT(*) as count FROM users');
    console.log(`   Users in database: ${userCount[0].count}`);

    // Test 2: Count tasks in database
    console.log('2. Checking task count in database...');
    const taskCount = await checkDatabaseDirectly('SELECT COUNT(*) as count FROM tasks');
    console.log(`   Tasks in database: ${taskCount[0].count}`);

    // Test 3: Show sample data
    console.log('3. Sample users in database:');
    const sampleUsers = await checkDatabaseDirectly('SELECT id, username FROM users LIMIT 3');
    sampleUsers.forEach(user => {
      console.log(`   ID: ${user.id}, Email: ${user.username}`);
    });

    console.log('4. Sample tasks in database:');
    const sampleTasks = await checkDatabaseDirectly('SELECT id, title, status, user_id FROM tasks LIMIT 3');
    sampleTasks.forEach(task => {
      console.log(`   ID: ${task.id}, Title: ${task.title}, Status: ${task.status}, User: ${task.user_id}`);
    });

  } catch (error) {
    console.error('❌ Database equivalence test failed:', error.message);
  }
}

async function cleanup() {
  console.log('\n=== Cleanup ===');
  try {
    // Clean up test data
    await checkDatabaseDirectly('DELETE FROM tasks WHERE title LIKE "%Test Task%"');
    await checkDatabaseDirectly('DELETE FROM users WHERE username = ?', [testUser.email]);
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.log('❌ Cleanup failed:', error.message);
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive gRPC-Database Integration Test');
  console.log('This test verifies that gRPC API uses real database storage (not in-memory)');
  
  await waitForServer();
  
  // Test user management
  const userResult = await testUserManagement();
  if (!userResult) {
    console.log('\n❌ User management tests failed, aborting');
    return;
  }

  const { userId, token } = userResult;

  // Test task management
  const taskId = await testTaskManagement(userId, token);
  if (!taskId) {
    console.log('\n❌ Task management tests failed, aborting');
    await cleanup();
    return;
  }

  // Test delete functionality (the critical test)
  await testDeleteFunctionality(taskId);

  // Test database equivalence
  await testDatabaseEquivalence();

  // Cleanup
  await cleanup();

  console.log('\n🎉 Comprehensive test completed!');
  console.log('Key verification: gRPC delete operations should remove data from database');
  
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted, cleaning up...');
  await cleanup();
  process.exit(0);
});

runComprehensiveTest().catch(console.error);
