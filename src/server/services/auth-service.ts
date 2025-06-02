import * as grpc from '@grpc/grpc-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as messages from '../../proto/task_management_pb';
import * as services from '../../proto/task_management_grpc_pb';
import { users, sessions } from '../data/store';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authServiceHandlers = {
  login: (call, callback) => {
    const username = call.request.getUsername();
    const password = call.request.getPassword();

    // Find user by username (which is actually email in our case to match REST API)
    const user = users.find(u => u.username === username);

    if (!user) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Invalid email or password'
      });
    }

    // Verify password (in a real app, passwords would be hashed)
    if (user.password !== password) {
      return callback({
        code: grpc.status.PERMISSION_DENIED,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store session
    sessions.set(token, user.id);

    // Create response using proto messages
    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Login successful');

    const response = new messages.LoginResponse();
    response.setToken(token);
    response.setStatus(statusProto);

    callback(null, response);
  },

  logout: (call, callback) => {
    const token = call.request.getToken();

    if (!sessions.has(token)) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Session not found'
      });
    }

    // Remove session
    sessions.delete(token);

    // Create response using proto messages
    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Logout successful');

    const response = new messages.LogoutResponse();
    response.setStatus(statusProto);

    callback(null, response);
  }
};
