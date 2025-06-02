import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user, updatePassword, deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (user) {
        await updatePassword(user.id, password);
        setSuccess('Password updated successfully');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to update password');
      } else {
        setError('An error occurred while updating your password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (user) {
        await deleteAccount(user.id);
        // Redirect is handled in the deleteAccount function
      }
    } catch (err: any) {
      console.error('Account deletion error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to delete account');
      } else {
        setError('An error occurred while deleting your account. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <h1>Profile</h1>

      <div className="user-info">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Account Created:</strong> {new Date(user.createdAt).toLocaleString()}</p>
        <p><strong>Last Updated:</strong> {new Date(user.updatedAt).toLocaleString()}</p>
      </div>

      <div className="password-update-section">
        <h2>Update Password</h2>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
              minLength={6}
            />
            <small>Password must be at least 6 characters long</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="danger-zone">
        <h2>Danger Zone</h2>

        {!showDeleteConfirm ? (
          <button
            className="btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        ) : (
          <div className="delete-confirmation">
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            <div className="confirmation-actions">
              <button
                className="btn-danger"
                onClick={handleDeleteAccount}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
