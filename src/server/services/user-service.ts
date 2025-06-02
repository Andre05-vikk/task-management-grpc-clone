import * as grpc from '@grpc/grpc-js';
import * as messages from '../../proto/task_management_pb';
import * as services from '../../proto/task_management_grpc_pb';
import { users, getNextUserId } from '../data/store';
import { verifyToken } from '../utils/auth';

export const userServiceHandlers = {
  createUser: (call: any, callback: any) => {
    const email = call.request.getEmail();
    const password = call.request.getPassword();

    // Validate required fields (match REST API validation exactly)
    if (!email || !password) {
      const error = new Error('Email and password are required');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    // Check if email already exists (match REST API check)
    if (users.some(u => u.username === email)) {
      const error = new Error('Email already exists');
      (error as any).code = grpc.status.ALREADY_EXISTS;
      return callback(error);
    }

    // Create new user (matching REST API structure exactly)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL format
    const newUser = {
      id: getNextUserId(),
      username: email, // REST API stores email as username
      password: password, // In a real app, this would be hashed with bcrypt
      createdAt: now,
      updatedAt: now
    };

    users.push(newUser);

    // Return user without password (match REST API response exactly)
    const userProto = new messages.User();
    userProto.setId(newUser.id.toString());
    userProto.setUsername(newUser.username);
    userProto.setEmail(newUser.username); // Email is same as username
    userProto.setName(newUser.username); // Default name is username/email

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('User created successfully');

    const response = new messages.UserResponse();
    response.setUser(userProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  getUsers: (call: any, callback: any) => {
    // Return users without passwords (match REST API exactly)
    const usersProto = users.map(user => {
      const userProto = new messages.User();
      userProto.setId(user.id.toString());
      userProto.setUsername(user.username);
      userProto.setEmail(user.username); // Email is same as username
      userProto.setName(user.username); // Default name is username/email
      return userProto;
    });

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Users fetched successfully');

    const response = new messages.GetUsersResponse();
    response.setUsersList(usersProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  getUser: (call: any, callback: any) => {
    const userId = parseInt(call.request.getUserid());
    const user = users.find(u => u.id === userId);

    if (!user) {
      const error = new Error('User not found');
      (error as any).code = grpc.status.NOT_FOUND;
      return callback(error);
    }

    // Return user without password (match REST API)
    const userProto = new messages.User();
    userProto.setId(user.id.toString());
    userProto.setUsername(user.username);
    userProto.setEmail(user.username); // Email is same as username
    userProto.setName(user.username); // Default name is username/email

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('User fetched successfully');

    const response = new messages.UserResponse();
    response.setUser(userProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  updateUser: (call: any, callback: any) => {
    const userId = parseInt(call.request.getUserid());
    const password = call.request.getPassword();

    // Match REST API validation - only password can be updated
    if (!password || password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      const error = new Error('User not found');
      (error as any).code = grpc.status.NOT_FOUND;
      return callback(error);
    }

    // Update user password (match REST API behavior)
    users[userIndex].password = password; // In real app, hash with bcrypt
    users[userIndex].updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Return user without password (match REST API response)
    const userProto = new messages.User();
    userProto.setId(users[userIndex].id.toString());
    userProto.setUsername(users[userIndex].username);
    userProto.setEmail(users[userIndex].username); // Email is same as username
    userProto.setName(users[userIndex].username); // Default name is username/email

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('User updated successfully');

    const response = new messages.UserResponse();
    response.setUser(userProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  deleteUser: (call: any, callback: any) => {
    const userId = parseInt(call.request.getUserid());
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      const error = new Error('User not found');
      (error as any).code = grpc.status.NOT_FOUND;
      return callback(error);
    }

    users.splice(userIndex, 1);

    // REST API returns 204 No Content for DELETE, but gRPC needs a response
    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('User deleted successfully');

    const response = new messages.DeleteUserResponse();
    response.setStatus(statusProto);

    callback(null, response);
  }
};