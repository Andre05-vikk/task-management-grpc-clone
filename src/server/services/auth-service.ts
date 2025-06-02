import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as messages from '../../proto/task_management_pb';
import * as services from '../../proto/task_management_grpc_pb';
import { users, sessions, tokenBlacklist } from '../data/store';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authServiceHandlers = {
  login: (call: any, callback: any) => {
    const username = call.request.getUsername(); // This will be email
    const password = call.request.getPassword();

    // Validate required fields (match REST API)
    if (!username || !password) {
      const error = new Error('Email and password are required');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    // Find user by username (which is actually email in our case to match REST API)
    const user = users.find(u => u.username === username);

    if (!user) {
      const error = new Error('Invalid email or password');
      (error as any).code = grpc.status.UNAUTHENTICATED;
      return callback(error);
    }

    // Verify password (in a real app, passwords would be hashed with bcrypt)
    if (user.password !== password) {
      const error = new Error('Invalid email or password');
      (error as any).code = grpc.status.UNAUTHENTICATED;
      return callback(error);
    }

    // Generate token (match REST API token structure and expiration)
    const token = jwt.sign(
      { id: user.id, email: user.username },
      JWT_SECRET,
      { expiresIn: '7d' } // Match REST API 7-day expiration
    );

    // Store session
    sessions.set(token, user.id);

    // Create response using proto messages (match REST API response structure)
    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Login successful');

    const response = new messages.LoginResponse();
    response.setToken(token);
    response.setStatus(statusProto);

    callback(null, response);
  },

  logout: (call: any, callback: any) => {
    const token = call.request.getToken();

    if (!token) {
      const error = new Error('Token is required');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    // Check if session exists
    if (!sessions.has(token)) {
      const error = new Error('Session not found');
      (error as any).code = grpc.status.NOT_FOUND;
      return callback(error);
    }

    // Remove session and blacklist token (match REST API behavior)
    sessions.delete(token);
    tokenBlacklist.add(token);

    // Create response using proto messages
    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Logout successful');

    const response = new messages.LogoutResponse();
    response.setStatus(statusProto);

    callback(null, response);
  }
};
