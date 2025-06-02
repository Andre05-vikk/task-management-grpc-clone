import * as grpc from '@grpc/grpc-js';
import * as messages from '../../proto/task_management_pb';
import * as services from '../../proto/task_management_grpc_pb';
import { tasks, getNextTaskId } from '../data/store';
import { verifyToken } from '../utils/auth';

export const taskServiceHandlers = {
  getTasks: (call: any, callback: any) => {
    // Match REST API: get tasks for a specific user (authenticated)
    let filteredTasks = [...tasks];

    const userId = call.request.getUserid();
    const status = call.request.getStatus();

    // Apply user filter (required like in REST API)
    if (userId) {
      filteredTasks = filteredTasks.filter(t => t.user_id === parseInt(userId));
    }

    // Apply status filter if provided
    if (status && ['pending', 'in_progress', 'completed'].includes(status)) {
      filteredTasks = filteredTasks.filter(t => t.status === status);
    }

    // Create response using proto messages (match REST API structure)
    const tasksProto = filteredTasks.map(task => {
      const taskProto = new messages.Task();
      taskProto.setId(task.id.toString());
      taskProto.setTitle(task.title);
      taskProto.setDescription(task.description || '');
      taskProto.setStatus(task.status);
      taskProto.setUserid(task.user_id.toString());
      taskProto.setCreatedat(task.createdAt);
      taskProto.setUpdatedat(task.updatedAt);
      return taskProto;
    });

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Tasks fetched successfully');

    const response = new messages.GetTasksResponse();
    response.setTasksList(tasksProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  createTask: (call: any, callback: any) => {
    const title = call.request.getTitle();
    const description = call.request.getDescription();
    const status = call.request.getStatus();
    const userId = parseInt(call.request.getUserid());

    // Validate required fields (match REST API validation exactly)
    if (!title || title.length < 1) {
      const error = new Error('Title is required and must be at least 1 character long');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    if (status && !['pending', 'in_progress', 'completed'].includes(status)) {
      const error = new Error('Status must be pending, in_progress, or completed');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    // Create new task (matching REST API structure and response exactly)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL format
    const newTask = {
      id: getNextTaskId(),
      title: title,
      description: description || null,
      status: (status || 'pending') as 'pending' | 'in_progress' | 'completed',
      user_id: userId,
      createdAt: now,
      updatedAt: now
    };

    tasks.push(newTask);

    // REST API returns specific structure: {success, message, taskId, title, description, status}
    // For gRPC, we return the full task object
    const taskProto = new messages.Task();
    taskProto.setId(newTask.id.toString());
    taskProto.setTitle(newTask.title);
    taskProto.setDescription(newTask.description || '');
    taskProto.setStatus(newTask.status);
    taskProto.setUserid(newTask.user_id.toString());
    taskProto.setCreatedat(newTask.createdAt);
    taskProto.setUpdatedat(newTask.updatedAt);

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Task created successfully');

    const response = new messages.TaskResponse();
    response.setTask(taskProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  updateTask: (call: any, callback: any) => {
    const taskId = parseInt(call.request.getTaskid());
    const title = call.request.getTitle();
    const description = call.request.getDescription();
    const status = call.request.getStatus();

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      const error = new Error('Task not found or you do not have permission');
      (error as any).code = grpc.status.NOT_FOUND;
      return callback(error);
    }

    // Validate status if provided (match REST API validation)
    if (status && !['pending', 'in_progress', 'completed'].includes(status)) {
      const error = new Error('Status must be one of: pending, in_progress, completed');
      (error as any).code = grpc.status.INVALID_ARGUMENT;
      return callback(error);
    }

    // Update task fields (match REST API behavior)
    if (title !== undefined) tasks[taskIndex].title = title;
    if (description !== undefined) tasks[taskIndex].description = description;
    if (status !== undefined) tasks[taskIndex].status = status as 'pending' | 'in_progress' | 'completed';
    tasks[taskIndex].updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // REST API returns {success: true, message: 'Task updated successfully'}
    // For gRPC, we return the full updated task
    const taskProto = new messages.Task();
    taskProto.setId(tasks[taskIndex].id.toString());
    taskProto.setTitle(tasks[taskIndex].title);
    taskProto.setDescription(tasks[taskIndex].description || '');
    taskProto.setStatus(tasks[taskIndex].status);
    taskProto.setUserid(tasks[taskIndex].user_id.toString());
    taskProto.setCreatedat(tasks[taskIndex].createdAt);
    taskProto.setUpdatedat(tasks[taskIndex].updatedAt);

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Task updated successfully');

    const response = new messages.TaskResponse();
    response.setTask(taskProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  deleteTask: (call: any, callback: any) => {
    const taskId = parseInt(call.request.getTaskid());
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      const error = new Error('Task not found or you do not have permission');
      (error as any).code = grpc.status.NOT_FOUND;
      return callback(error);
    }

    tasks.splice(taskIndex, 1);

    // REST API returns 204 No Content for DELETE, but gRPC needs a response
    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Task deleted successfully');

    const response = new messages.DeleteTaskResponse();
    response.setStatus(statusProto);

    callback(null, response);
  }
};
