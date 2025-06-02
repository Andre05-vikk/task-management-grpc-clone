import axios, { AxiosRequestConfig } from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Handle 410 Gone errors (user deleted)
    if (error.response && error.response.status === 410) {
      localStorage.removeItem('token');
      window.location.href = '/login?deleted=true';
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/sessions', { email, password }),

  logout: () =>
    api.delete('/sessions'),

  register: (email: string, password: string) =>
    api.post('/users', { email, password }),
};

// Users API
export const usersAPI = {
  getAllUsers: () =>
    api.get('/users'),

  getUserById: (userId: number) =>
    api.get(`/users/${userId}`),

  updateUserPassword: (userId: number, password: string) =>
    api.patch(`/users/${userId}`, { password }),

  deleteUser: (userId: number) =>
    api.delete(`/users/${userId}`),
};

// Tasks API
export const tasksAPI = {
  getAllTasks: (params?: {
    page?: number;
    limit?: number;
    sort?: string;
    status?: 'pending' | 'in_progress' | 'completed';
  }) =>
    api.get('/tasks', { params }),

  createTask: (data: {
    title: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed';
  }) =>
    api.post('/tasks', data),

  updateTask: (taskId: number, data: {
    title?: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed';
  }) =>
    api.patch(`/tasks/${taskId}`, data),

  deleteTask: (taskId: number) =>
    api.delete(`/tasks/${taskId}`),
};

export default api;
