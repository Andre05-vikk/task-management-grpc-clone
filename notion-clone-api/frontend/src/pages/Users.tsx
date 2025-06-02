import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await usersAPI.getAllUsers();
        setUsers(response.data);
      } catch (err: any) {
        console.error('Error fetching users:', err);
        if (err.response && err.response.data) {
          setError(err.response.data.message || 'Failed to fetch users');
        } else {
          setError('An error occurred while fetching users. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="users-container">
      <h1>Users</h1>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="no-users">No users found.</div>
      ) : (
        <div className="users-list">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Created At</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="user-item">
                  <td>{user.id}</td>
                  <td>{user.email}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{formatDate(user.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;
