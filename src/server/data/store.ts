// In-memory data store for the example
// In a real application, this would be replaced with a database

// Users store
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  password: string; // In a real app, this would be hashed
}

export const users: User[] = [];

// Tasks store
export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const tasks: Task[] = [];

// Sessions store (token -> userId)
export const sessions = new Map<string, string>();
