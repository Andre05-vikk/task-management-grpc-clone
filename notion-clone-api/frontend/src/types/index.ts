// User types
export interface User {
  id: number;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

// Task types
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  user_id: number;  // Changed from userId to user_id to match backend
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

// API response types
export interface TasksResponse {
  page: number;
  limit: number;
  total: number;
  tasks: Task[];
}

export interface LoginResponse {
  token: string;
}

// Error types
export interface ApiError {
  code: number;
  error: string;
  message: string;
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (userId: number, password: string) => Promise<void>;
  deleteAccount: (userId: number) => Promise<void>;
}
