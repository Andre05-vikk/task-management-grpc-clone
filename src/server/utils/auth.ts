import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import { pool } from '../data/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface TokenPayload {
  id: string;
  username: string;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    // Verify JWT token (JWT tokens are stateless - no need for session storage)
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function authMiddleware(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  const metadata = call.metadata;
  const token = metadata.get('authorization')[0] as string;

  if (!token) {
    const error = new Error('Authentication required');
    (error as any).code = grpc.status.UNAUTHENTICATED;
    return callback(error);
  }

  const payload = verifyToken(token);

  if (!payload) {
    const error = new Error('Invalid or expired token');
    (error as any).code = grpc.status.UNAUTHENTICATED;
    return callback(error);
  }

  // In a real implementation, we would add user to call context
  // call.user = payload;

  return null;
}
