import React, { useState } from 'react';
import { Task } from '../types';
import TaskForm from './TaskForm';

interface TaskItemProps {
  task: Task;
  onUpdate: (taskId: number, data: { title?: string; description?: string; status?: 'pending' | 'in_progress' | 'completed' }) => void;
  onDelete: (taskId: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Handle status change directly
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as 'pending' | 'in_progress' | 'completed';
    onUpdate(task.id, { status: newStatus });
  };

  // Handle task update from form
  const handleUpdate = (title: string, description: string, status: 'pending' | 'in_progress' | 'completed') => {
    onUpdate(task.id, { title, description, status });
    setIsEditing(false);
  };

  // Handle task deletion
  const handleDelete = () => {
    onDelete(task.id);
    setShowConfirmDelete(false);
  };

  // Get status class for styling
  const getStatusClass = () => {
    switch (task.status) {
      case 'pending':
        return 'status-pending';
      case 'in_progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      default:
        return '';
    }
  };

  return (
    <div className={`task-item ${getStatusClass()}`}>
      {isEditing ? (
        <div className="task-edit">
          <TaskForm
            onSubmit={handleUpdate}
            initialTitle={task.title}
            initialDescription={task.description || ''}
            initialStatus={task.status}
            buttonText="Update Task"
          />
          <button 
            className="btn-secondary"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="task-header">
            <h3 className="task-title">{task.title}</h3>
            <div className="task-status">
              <select 
                value={task.status}
                onChange={handleStatusChange}
                className={getStatusClass()}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          {task.description && (
            <div className="task-description">
              {task.description}
            </div>
          )}
          
          <div className="task-meta">
            <div className="task-dates">
              <span>Created: {formatDate(task.createdAt)}</span>
              <span>Updated: {formatDate(task.updatedAt)}</span>
            </div>
            
            <div className="task-actions">
              <button 
                className="btn-edit"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
              
              <button 
                className="btn-delete"
                onClick={() => setShowConfirmDelete(true)}
              >
                Delete
              </button>
            </div>
          </div>
          
          {showConfirmDelete && (
            <div className="delete-confirmation">
              <p>Are you sure you want to delete this task?</p>
              <div className="confirmation-actions">
                <button 
                  className="btn-danger"
                  onClick={handleDelete}
                >
                  Yes, Delete
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TaskItem;
