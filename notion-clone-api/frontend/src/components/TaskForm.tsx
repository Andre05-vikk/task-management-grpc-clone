import React, { useState } from 'react';

interface TaskFormProps {
  onSubmit: (title: string, description: string, status: 'pending' | 'in_progress' | 'completed') => void;
  initialTitle?: string;
  initialDescription?: string;
  initialStatus?: 'pending' | 'in_progress' | 'completed';
  buttonText?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  initialTitle = '',
  initialDescription = '',
  initialStatus = 'pending',
  buttonText = 'Create Task'
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!title) {
      setError('Title is required');
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      await onSubmit(title, description, status);
      // Reset form if it's a new task
      if (!initialTitle) {
        setTitle('');
        setDescription('');
        setStatus('pending');
      }
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="task-form">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            rows={4}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'pending' | 'in_progress' | 'completed')}
            disabled={isSubmitting}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? 'Submitting...' : buttonText}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;
