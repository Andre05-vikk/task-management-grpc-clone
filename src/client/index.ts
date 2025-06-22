import * as grpc from '@grpc/grpc-js';
import path from 'path';
import * as messages from '../proto/task_management_pb';
import * as services from '../proto/task_management_grpc_pb';

const HOST = process.env.HOST || 'localhost:50051';

// Create clients
const authClient = new services.AuthServiceClient(
  HOST,
  grpc.credentials.createInsecure()
);

const userClient = new services.UserServiceClient(
  HOST,
  grpc.credentials.createInsecure()
);

const taskClient = new services.TaskServiceClient(
  HOST,
  grpc.credentials.createInsecure()
);

// Example user data
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'password123',
  name: 'Test User'
};

let authToken: string;
let userId: string;
let taskId: string;

// Run examples
async function runExamples() {
  try {
    console.log('=== Running gRPC Client Examples ===');

    // 1. Create a user
    console.log('\n1. Creating a user...');
    try {
      const createUserResponse = await createUser(testUser);
      const userObj = createUserResponse.getUser();
      userId = userObj ? userObj.getId() : '';
      console.log(`User created with ID: ${userId}`);
    } catch (error) {
      console.log(`Error creating user: ${error.message}`);
      // Try to login instead
      console.log('Trying to login with existing user...');
    }

    // 2. Login
    console.log('\n2. Logging in...');
    const loginResponse = await login(testUser.email, testUser.password);
    authToken = loginResponse.getToken() || '';
    console.log(`Logged in with token: ${authToken.substring(0, 15)}...`);

    // 3. Get all users
    console.log('\n3. Getting all users...');
    const usersResponse = await getUsers();
    console.log(`Retrieved ${usersResponse.getUsersList()?.length} users`);

    // 4. Get user by ID
    console.log('\n4. Getting user by ID...');
    try {
      const userResponse = await getUser(userId);
      const user = userResponse.getUser();
      console.log(`Retrieved user: ${user ? user.getName() : 'unknown'}`);
    } catch (error) {
      console.log(`Error getting user: ${error.message}`);
    }

    // 5. Create a task
    console.log('\n5. Creating a task...');
    try {
      const createTaskResponse = await createTask({
        title: 'Test Task',
        description: 'This is a test task',
        status: 'pending',
        userId
      });
      taskId = createTaskResponse.getTaskid(); // Use getTaskid() instead of getTask().getId()
      console.log(`Task created with ID: ${taskId}`);
    } catch (error) {
      console.log(`Error creating task: ${error.message}`);
    }

    // 6. Get all tasks
    console.log('\n6. Getting all tasks...');
    try {
      const tasksResponse = await getTasks();
      console.log(`Retrieved ${tasksResponse.getTasksList()?.length} tasks`);
    } catch (error) {
      console.log(`Error getting tasks: ${error.message}`);
    }

    // 7. Update a task
    console.log('\n7. Updating a task...');
    try {
      const updateTaskResponse = await updateTask({
        taskId,
        status: 'in_progress'
      });
      const updatedTask = updateTaskResponse.getTask();
      console.log(`Updated task status: ${updatedTask ? updatedTask.getStatus() : 'unknown'}`);
    } catch (error) {
      console.log(`Error updating task: ${error.message}`);
    }

    // 8. Update a user
    console.log('\n8. Updating a user...');
    try {
      const updateUserResponse = await updateUser({
        userId,
        password: 'newpassword123' // Use valid password instead of name
      });
      const updatedUser = updateUserResponse.getUser();
      console.log(`Updated user password: ${updatedUser ? 'successful' : 'unknown'}`);
    } catch (error) {
      console.log(`Error updating user: ${error.message}`);
    }

    // 9. Delete a task
    console.log('\n9. Deleting a task...');
    try {
      const deleteTaskResponse = await deleteTask(taskId);
      const taskStatus = deleteTaskResponse.getStatus();
      console.log(`Task deleted: ${taskStatus ? taskStatus.getMessage() : 'unknown'}`);
    } catch (error) {
      console.log(`Error deleting task: ${error.message}`);
    }

    // 10. Logout
    console.log('\n10. Logging out...');
    try {
      const logoutResponse = await logout(authToken);
      console.log('Logout: successful'); // LogoutResponse is empty, so just confirm success
    } catch (error) {
      console.log(`Error logging out: ${error.message}`);
    }

    // 11. Delete a user
    console.log('\n11. Deleting a user...');
    try {
      const deleteUserResponse = await deleteUser(userId);
      const userStatus = deleteUserResponse.getStatus();
      console.log(`User deleted: ${userStatus ? userStatus.getMessage() : 'unknown'}`);
    } catch (error) {
      console.log(`Error deleting user: ${error.message}`);
    }

    console.log('\n=== All examples completed successfully ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Helper functions for each RPC
function createUser(user: typeof testUser): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.CreateUserRequest();
    request.setUsername(user.username);
    request.setEmail(user.email);
    request.setPassword(user.password);
    request.setName(user.name);

    userClient.createUser(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function login(username: string, password: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.LoginRequest();
    request.setUsername(username);
    request.setPassword(password);

    authClient.login(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function logout(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.LogoutRequest();
    request.setToken(token);

    authClient.logout(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function getUsers(): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.GetUsersRequest();

    userClient.getUsers(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function getUser(userId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.GetUserRequest();
    request.setUserid(userId);

    userClient.getUser(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function updateUser(data: { userId: string, name?: string, password?: string }): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.UpdateUserRequest();
    request.setUserid(data.userId);
    if (data.name) request.setName(data.name);
    if (data.password) request.setPassword(data.password);

    userClient.updateUser(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function deleteUser(userId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.DeleteUserRequest();
    request.setUserid(userId);

    userClient.deleteUser(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function createTask(task: { title: string, description: string, status: string, userId: string }): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.CreateTaskRequest();
    request.setTitle(task.title);
    request.setDescription(task.description);
    request.setStatus(task.status);
    request.setUserid(task.userId);

    taskClient.createTask(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function getTasks(): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.GetTasksRequest();

    taskClient.getTasks(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function updateTask(data: { taskId: string, status?: string }): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.UpdateTaskRequest();
    request.setTaskid(data.taskId);
    if (data.status) request.setStatus(data.status);

    taskClient.updateTask(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function deleteTask(taskId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new messages.DeleteTaskRequest();
    request.setTaskid(taskId);

    taskClient.deleteTask(request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

// Run the examples
runExamples();
