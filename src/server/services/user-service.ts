import * as grpc from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';
import * as messages from '../../proto/proto/task_management_pb';
import * as services from '../../proto/proto/task_management_grpc_pb';
import { users } from '../data/store';
import { verifyToken } from '../utils/auth';

export const userServiceHandlers = {
  createUser: (call, callback) => {
    const { username, email, password, name } = call.request;

    // Check if username already exists
    if (users.some(u => u.username === username)) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'Username already exists'
      });
    }

    // Check if email already exists
    if (users.some(u => u.email === email)) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'Email already exists'
      });
    }

    // Create new user
    const newUser = {
      id: uuidv4(),
      username,
      email,
      name,
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
    const { page = 1, limit = 10 } = call.request;

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
    const { userId } = call.request;

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
    const { userId } = call.request;

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
    const { userId, username, email, name, password } = call.request;

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
