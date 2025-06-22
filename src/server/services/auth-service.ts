import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as messages from '../../proto/task_management_pb';
import * as services from '../../proto/task_management_grpc_pb';
import { pool } from '../data/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// For a production system, you might want to store blacklisted tokens in database
// For now, keeping simple in-memory blacklist for logout functionality
const tokenBlacklist = new Set<string>();

export const authServiceHandlers = {
  login: async (call: any, callback: any) => {
    console.log('🟢 gRPC - login()');
    
    try {
      const email = call.request.getUsername(); // Rename to match REST API
      const password = call.request.getPassword();

      console.log('  Request body:', { email, password: 'password123' });

      // Validate required fields (match REST API)
      if (!email || !password) {
        console.log('  ❌ Missing email or password');
        const error = new Error('Email and password are required');
        (error as any).code = grpc.status.INVALID_ARGUMENT;
        return callback(error);
      }

      console.log('  🔍 Searching for user with email:', email);
      // Find user by email (match REST API exactly)
      const connection = await pool.getConnection();
      const rows = await connection.query(
        'SELECT * FROM users WHERE username = ?',
        [email]
      );
      connection.release();

      if (!rows || rows.length === 0) {
        console.log('  ❌ User not found');
        const error = new Error('Invalid email or password');
        (error as any).code = grpc.status.UNAUTHENTICATED;
        return callback(error);
      }

      const user = rows[0];
      console.log('  ✅ User found:', { id: user.id, email: user.username });

      // Verify password using bcrypt (now that passwords are hashed in database)
      console.log('  🔐 Comparing passwords...');
      console.log('    Provided password:', password);
      console.log('    Stored hash:', user.password.substring(0, 20) + '...');
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('  🔐 Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('  ❌ Invalid password');
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

      // JWT tokens are stateless - no need to store sessions

      // Create response using proto messages (match REST API response structure)
      const statusProto = new messages.Status();
      statusProto.setCode(grpc.status.OK);
      statusProto.setMessage('Login successful');

      const response = new messages.LoginResponse();
      response.setToken(token);
      response.setStatus(statusProto);

      callback(null, response);
    } catch (error) {
      console.error('Error during login:', error);
      const grpcError = new Error('Login failed');
      (grpcError as any).code = grpc.status.INTERNAL;
      callback(grpcError);
    }
  },

  logout: (call: any, callback: any) => {
    console.log('🟢 gRPC - logout()');
    
    const token = call.request.getToken();
    console.log('  Token (first 10 chars):', token?.substring(0, 10) + '...');

    if (!token) {
      console.log('  ❌ Token missing');
      const error = new Error('Token is required');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    // Verify token is valid before blacklisting
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('  ✅ Token valid for user:', (decoded as any).id);
    } catch (error) {
      console.log('  ❌ Invalid token');
      const grpcError = new Error('Invalid token');
      (grpcError as any).code = grpc.status.UNAUTHENTICATED;
      return callback(grpcError);
    }

    // Blacklist token (match REST API behavior)
    tokenBlacklist.add(token);
    console.log('  ✅ Token blacklisted');

    console.log('  ✅ Logout successful');

    // Create empty response to match REST API (204 No Content)
    const response = new messages.LogoutResponse();

    callback(null, response);
  }
};
