import * as grpc from '@grpc/grpc-js';
import * as messages from '../../proto/task_management_pb';
import * as services from '../../proto/task_management_grpc_pb';
import { pool } from '../data/database';
import { verifyToken } from '../utils/auth';
import bcrypt from 'bcrypt';

export const userServiceHandlers = {
  createUser: async (call: any, callback: any) => {
    console.log('🟢 gRPC - createUser()');
    
    const email = call.request.getEmail();
    const password = call.request.getPassword();

    console.log('  Request body:', { email, password: 'password123' });

    // Validate required fields (match REST API validation exactly)
    if (!email || !password) {
      console.log('  ❌ Missing email or password');
      const error = new Error('Email and password are required');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    if (password.length < 6) {
      console.log('  ❌ Password too short');
      const error = new Error('Password must be at least 6 characters long');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    let conn;
    try {
      conn = await pool.getConnection();

      // Check if email already exists (match REST API check)
      const existing = await conn.query('SELECT * FROM users WHERE username = ?', [email]);
      if (existing.length > 0) {
        conn.release();
        const error = new Error('Email already exists');
        (error as any).code = grpc.status.ALREADY_EXISTS;
        return callback(error);
      }

      // Hash password (match REST API behavior)
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user in database (username field stores the email)
      const result = await conn.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [email, hashedPassword]
      );

      // Get the created user
      const [user] = await conn.query(
        'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
        [result.insertId]
      );
      
      conn.release();

      // Return user without password (match REST API response exactly)
      const userProto = new messages.User();
      userProto.setId(user.id.toString());
      userProto.setUsername(user.username);
      userProto.setEmail(user.username); // Email is same as username
      userProto.setName(user.username); // Default name is username/email

      const statusProto = new messages.Status();
      statusProto.setCode(grpc.status.OK);
      statusProto.setMessage('User created successfully');

      const response = new messages.UserResponse();
      response.setUser(userProto);
      response.setStatus(statusProto);

      callback(null, response);
    } catch (error) {
      if (conn) conn.release();
      console.error('  💥 gRPC Error creating user:', error);
      const err = new Error('Failed to create user');
      (err as any).code = grpc.status.INTERNAL;
      return callback(err);
    }
  },

  getUsers: async (call: any, callback: any) => {
    console.log('🟢 gRPC - getUsers()');
    
    let conn;
    try {
      conn = await pool.getConnection();

      // Get all users without passwords (match REST API exactly)
      const users = await conn.query(
        'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users'
      );
      
      conn.release();

      const usersProto = users.map((user: any) => {
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
    } catch (error) {
      if (conn) conn.release();
      console.error('Error fetching users:', error);
      const err = new Error('Failed to fetch users');
      (err as any).code = grpc.status.INTERNAL;
      return callback(err);
    }
  },

  getUser: async (call: any, callback: any) => {
    console.log('🟢 gRPC - getUser()');
    
    const userIdStr = call.request.getUserid();
    const userId = parseInt(userIdStr);
    
    console.log('  Request params: { userId:', userIdStr, '}');
    
    // Validate userId
    if (!userIdStr || isNaN(userId)) {
      console.log('  ❌ Invalid user ID');
      const err = new Error('Invalid user ID');
      (err as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(err);
    }
    
    let conn;
    try {
      conn = await pool.getConnection();

      const [user] = await conn.query(
        'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
        [userId]
      );
      
      conn.release();

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
    } catch (error) {
      if (conn) conn.release();
      console.error('Error fetching user:', error);
      const err = new Error('Failed to fetch user');
      (err as any).code = grpc.status.INTERNAL;
      return callback(err);
    }
  },

  updateUser: async (call: any, callback: any) => {
    console.log('🟢 gRPC - updateUser()');
    
    const userIdStr = call.request.getUserid();
    const userId = parseInt(userIdStr);
    const password = call.request.getPassword();

    console.log('  Request params: { userId:', userIdStr, '}');
    console.log('  Request body: { password: \'password123\' }');

    // Validate userId
    if (!userIdStr || isNaN(userId)) {
      console.log('  ❌ Invalid user ID');
      const err = new Error('Invalid user ID');
      (err as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(err);
    }

    // Match REST API validation - only password can be updated
    if (!password || password.length < 6) {
      console.log('  ❌ Password validation failed');
      const error = new Error('Password must be at least 6 characters long');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    let conn;
    try {
      conn = await pool.getConnection();

      // Check if user exists
      const [existingUser] = await conn.query(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );

      if (!existingUser) {
        conn.release();
        const error = new Error('User not found');
        (error as any).code = grpc.status.NOT_FOUND;
        return callback(error);
      }

      // Hash password and update user (match REST API behavior)
      const hashedPassword = await bcrypt.hash(password, 10);
      await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

      // Get updated user
      const [user] = await conn.query(
        'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
        [userId]
      );
      
      conn.release();

      // Return user without password (match REST API response)
      const userProto = new messages.User();
      userProto.setId(user.id.toString());
      userProto.setUsername(user.username);
      userProto.setEmail(user.username); // Email is same as username
      userProto.setName(user.username); // Default name is username/email

      const statusProto = new messages.Status();
      statusProto.setCode(grpc.status.OK);
      statusProto.setMessage('User updated successfully');

      const response = new messages.UserResponse();
      response.setUser(userProto);
      response.setStatus(statusProto);

      callback(null, response);
    } catch (error) {
      if (conn) conn.release();
      console.error('Error updating user:', error);
      const err = new Error('Failed to update user');
      (err as any).code = grpc.status.INTERNAL;
      return callback(err);
    }
  },

  deleteUser: async (call: any, callback: any) => {
    console.log('🟢 gRPC - deleteUser()');
    
    const userIdStr = call.request.getUserid();
    const userId = parseInt(userIdStr);
    
    console.log('  Request params: { userId:', userIdStr, '}');
    
    // Validate userId
    if (!userIdStr || isNaN(userId)) {
      console.log('  ❌ Invalid user ID');
      const err = new Error('Invalid user ID');
      (err as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(err);
    }
    
    let conn;
    try {
      conn = await pool.getConnection();

      // Check if user exists
      const [existingUser] = await conn.query(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );

      if (!existingUser) {
        conn.release();
        const error = new Error('User not found');
        (error as any).code = grpc.status.NOT_FOUND;
        return callback(error);
      }

      // Delete user from database (match REST API behavior)
      await conn.query('DELETE FROM users WHERE id = ?', [userId]);
      conn.release();

      // REST API returns 204 No Content for DELETE, but gRPC needs a response
      const statusProto = new messages.Status();
      statusProto.setCode(grpc.status.OK);
      statusProto.setMessage('User deleted successfully');

      const response = new messages.DeleteUserResponse();
      response.setStatus(statusProto);

      callback(null, response);
    } catch (error) {
      if (conn) conn.release();
      console.error('Error deleting user:', error);
      const err = new Error('Failed to delete user');
      (err as any).code = grpc.status.INTERNAL;
      return callback(err);
    }
  }
};