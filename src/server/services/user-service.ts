import * as grpc from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';
import * as messages from '../../proto/proto/task_management_pb';
import * as services from '../../proto/proto/task_management_grpc_pb';
import { users } from '../data/store';
import { verifyToken } from '../utils/auth';

export const userServiceHandlers = {
  createUser: (call, callback) => {
    const username = call.request.getUsername();
    const email = call.request.getEmail();
    const password = call.request.getPassword();
    const name = call.request.getName();

    // Validate required fields
    if (!email || !password) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Email and password are required'
      });
    }

    // To match REST API behavior, we use email as username
    const userEmail = email || username;

    // Check if email already exists (REST API checks email)
    if (users.some(u => u.username === userEmail)) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'Email already exists'
      });
    }

    // Create new user (matching REST API structure)
    const newUser = {
      id: uuidv4(),
      username: userEmail, // Store email as username to match REST API
      email: userEmail,
      name: name || 'User',
      password // In a real app, this would be hashed
    };

    users.push(newUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    // Create response using proto messages
    const userProto = new messages.User();
    userProto.setId(userWithoutPassword.id);
    userProto.setUsername(userWithoutPassword.username);
    userProto.setEmail(userWithoutPassword.email);
    userProto.setName(userWithoutPassword.name);

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('User created successfully');

    const response = new messages.UserResponse();
    response.setUser(userProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  getUsers: (call, callback) => {
    // In a real app, you would implement pagination here
    const page = call.request.getPage() || 1;
    const limit = call.request.getLimit() || 10;

    // Return users without passwords
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    // Create response using proto messages
    const usersProto = usersWithoutPasswords.map(user => {
      const userProto = new messages.User();
      userProto.setId(user.id);
      userProto.setUsername(user.username);
      userProto.setEmail(user.email);
      userProto.setName(user.name);
      return userProto;
    });

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Users retrieved successfully');

    const response = new messages.GetUsersResponse();
    response.setUsersList(usersProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  getUser: (call, callback) => {
    const userId = call.request.getUserid();

    const user = users.find(u => u.id === userId);

    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'User not found'
      });
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    // Create response using proto messages
    const userProto = new messages.User();
    userProto.setId(userWithoutPassword.id);
    userProto.setUsername(userWithoutPassword.username);
    userProto.setEmail(userWithoutPassword.email);
    userProto.setName(userWithoutPassword.name);

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('User retrieved successfully');

    const response = new messages.UserResponse();
    response.setUser(userProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  deleteUser: (call, callback) => {
    const userId = call.request.getUserid();

    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'User not found'
      });
    }

    // Remove user
    users.splice(userIndex, 1);

    // Create response using proto messages
    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('User deleted successfully');

    const response = new messages.DeleteUserResponse();
    response.setStatus(statusProto);

    callback(null, response);
  },

  updateUser: (call, callback) => {
    const userId = call.request.getUserid();
    const username = call.request.getUsername();
    const email = call.request.getEmail();
    const name = call.request.getName();
    const password = call.request.getPassword();

    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'User not found'
      });
    }

    // Check if username is being changed and already exists
    if (username && username !== users[userIndex].username &&
        users.some(u => u.username === username)) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'Username already exists'
      });
    }

    // Check if email is being changed and already exists
    if (email && email !== users[userIndex].email &&
        users.some(u => u.email === email)) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'Email already exists'
      });
    }

    // Update user
    const updatedUser = {
      ...users[userIndex],
      ...(username && { username }),
      ...(email && { email }),
      ...(name && { name }),
      ...(password && { password }) // In a real app, this would be hashed
    };

    users[userIndex] = updatedUser;

    // Return user without password
    const { password: _, ...userWithoutPassword } = updatedUser;

    // Create response using proto messages
    const userProto = new messages.User();
    userProto.setId(userWithoutPassword.id);
    userProto.setUsername(userWithoutPassword.username);
    userProto.setEmail(userWithoutPassword.email);
    userProto.setName(userWithoutPassword.name);

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('User updated successfully');

    const response = new messages.UserResponse();
    response.setUser(userProto);
    response.setStatus(statusProto);

    callback(null, response);
  }
};
