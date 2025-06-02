import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { Task, TasksResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [sort, setSort] = useState<string>('created_at:desc');
  const [showAddForm, setShowAddForm] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch tasks
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: any = {
        page,
        limit,
        sort
      };

      if (status !== 'all') {
        params.status = status;
      }

      const response = await tasksAPI.getAllTasks(params);
      const data = response.data as TasksResponse;

      setTasks(data.tasks);
      setTotal(data.total);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to fetch tasks');
      } else {
        setError('An error occurred while fetching tasks. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load tasks on component mount and when filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, page, limit, status, sort]);

  // Handle task creation
  const handleCreateTask = async (title: string, description: string, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      await tasksAPI.createTask({ title, description, status });
      setShowAddForm(false);
      fetchTasks();
    } catch (err: any) {
      console.error('Error creating task:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to create task');
      } else {
        setError('An error occurred while creating the task. Please try again.');
      }
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskId: number, data: { title?: string; description?: string; status?: 'pending' | 'in_progress' | 'completed' }) => {
    try {
      await tasksAPI.updateTask(taskId, data);
      fetchTasks();
    } catch (err: any) {
      console.error('Error updating task:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to update task');
      } else {
        setError('An error occurred while updating the task. Please try again.');
      }
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: number) => {
    try {
      await tasksAPI.deleteTask(taskId);
      fetchTasks();
    } catch (err: any) {
      console.error('Error deleting task:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to delete task');
      } else {
        setError('An error occurred while deleting the task. Please try again.');
      }
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle status filter change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value as any);
    setPage(1); // Reset to first page when filter changes
  };

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
    setPage(1); // Reset to first page when sort changes
  };

  return (
    <div className="tasks-container">
      <h1>Tasks</h1>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="tasks-controls">
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add New Task'}
        </button>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={status}
              onChange={handleStatusChange}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-filter">Sort by:</label>
            <select
              id="sort-filter"
              value={sort}
              onChange={handleSortChange}
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="title:asc">Title (A-Z)</option>
              <option value="title:desc">Title (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {showAddForm && (
        <TaskForm onSubmit={handleCreateTask} />
      )}

      {isLoading ? (
        <div className="loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="no-tasks">No tasks found. Create a new task to get started.</div>
      ) : (
        <div className="tasks-list">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="btn-pagination"
          >
            Previous
          </button>

          <span className="page-info">
            Page {page} of {Math.ceil(total / limit)}
          </span>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="btn-pagination"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Tasks;
