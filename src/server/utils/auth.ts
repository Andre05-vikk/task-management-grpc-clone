import * as grpc from '@grpc/grpc-js';
import jwt from 'jsonwebtoken';
import { sessions } from '../data/store';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface TokenPayload {
  id: string;
  username: string;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // Check if session exists
    if (!sessions.has(token)) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

export function authMiddleware(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  const metadata = call.metadata;
  const token = metadata.get('authorization')[0] as string;

  if (!token) {
    return callback({
      code: grpc.status.UNAUTHENTICATED,
      message: 'Authentication required'
    });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return callback({
      code: grpc.status.UNAUTHENTICATED,
      message: 'Invalid or expired token'
    });
  }

  // In a real implementation, we would add user to call context
  // call.user = payload;

  return null;
}
