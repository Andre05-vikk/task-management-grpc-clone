import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, usersAPI } from '../services/api';
import { User, AuthContextType } from '../types';
import jwt_decode from 'jwt-decode';

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// JWT token interface
interface JwtPayload {
  id: number;
  email: string;
  exp: number;
  iat: number;
}

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Initialize auth state from token
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');

      if (token) {
        try {
          // Decode token to get user info
          const decoded = jwt_decode<JwtPayload>(token);

          // Check if token is expired
          const currentTime = Date.now() / 1000;
          if (decoded.exp < currentTime) {
            localStorage.removeItem('token');
            setUser(null);
          } else {
            // Get user details from API
            const response = await usersAPI.getUserById(decoded.id);
            setUser(response.data);
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(email, password);
      const { token } = response.data;

      localStorage.setItem('token', token);

      // Decode token to get user ID
      const decoded = jwt_decode<JwtPayload>(token);

      // Get user details
      const userResponse = await usersAPI.getUserById(decoded.id);
      setUser(userResponse.data);

      navigate('/tasks');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authAPI.register(email, password);
      // After registration, log the user in
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if API call fails, remove token and user
      localStorage.removeItem('token');
      setUser(null);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (userId: number, password: string) => {
    setIsLoading(true);
    try {
      await usersAPI.updateUserPassword(userId, password);
      // After password update, get updated user
      const response = await usersAPI.getUserById(userId);
      setUser(response.data);
    } catch (error) {
      console.error('Password update failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete account function
  const deleteAccount = async (userId: number) => {
    setIsLoading(true);
    try {
      await usersAPI.deleteUser(userId);
      localStorage.removeItem('token');
      setUser(null);
      navigate('/login?deleted=true');
    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updatePassword,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
