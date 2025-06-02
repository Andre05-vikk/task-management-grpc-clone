// In-memory data store for the example
// In a real application, this would be replaced with a database

// Users store (matching REST API structure exactly)
export interface User {
  id: number;
  username: string; // This stores the email in REST API
  email?: string; // Added for gRPC compatibility
  name?: string; // Added for gRPC compatibility
  password: string; // In a real app, this would be hashed
  createdAt: string;
  updatedAt: string;
}

export const users: User[] = [];

// Tasks store (matching REST API structure exactly)
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  user_id: number;
  createdAt: string;
  updatedAt: string;
}

export const tasks: Task[] = [];

// Sessions store (token -> userId)
export const sessions = new Map<string, number>();

// Token blacklist (like in REST API)
export const tokenBlacklist = new Set<string>();

// Auto-increment counters (like database auto-increment)
export let userIdCounter = 1;
export let taskIdCounter = 1;

export function getNextUserId(): number {
  return userIdCounter++;
}

export function getNextTaskId(): number {
  return taskIdCounter++;
}
