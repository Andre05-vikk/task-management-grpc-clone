import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  // Check if the current path matches the given path
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="main-nav">
      <div className="nav-brand">
        <Link to="/">Task Manager</Link>
      </div>

      <ul className="nav-links">
        {isAuthenticated ? (
          <>
            <li className={isActive('/tasks') ? 'active' : ''}>
              <Link to="/tasks">Tasks</Link>
            </li>
            <li className={isActive('/users') ? 'active' : ''}>
              <Link to="/users">Users</Link>
            </li>
            <li className={isActive('/profile') ? 'active' : ''}>
              <Link to="/profile">Profile</Link>
            </li>
            <li>
              <button
                className="btn-logout"
                onClick={() => logout()}
              >
                Logout
              </button>
            </li>
            {user && (
              <li className="user-info">
                <span>Logged in as {user.email}</span>
              </li>
            )}
          </>
        ) : (
          <>
            <li className={isActive('/login') ? 'active' : ''}>
              <Link to="/login">Login</Link>
            </li>
            <li className={isActive('/register') ? 'active' : ''}>
              <Link to="/register">Register</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navigation;
