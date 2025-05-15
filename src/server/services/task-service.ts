import * as grpc from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';
import * as messages from '../../proto/proto/task_management_pb';
import * as services from '../../proto/proto/task_management_grpc_pb';
import { tasks, users } from '../data/store';
import { verifyToken } from '../utils/auth';

export const taskServiceHandlers = {
  getTasks: (call, callback) => {
    const { userId, status, page = 1, limit = 10 } = call.request;

    let filteredTasks = [...tasks];

    // Apply filters
    if (userId) {
      filteredTasks = filteredTasks.filter(t => t.userId === userId);
    }

    if (status) {
      filteredTasks = filteredTasks.filter(t => t.status === status);
    }

    // In a real app, you would implement pagination here

    // Create response using proto messages
    const tasksProto = filteredTasks.map(task => {
      const taskProto = new messages.Task();
      taskProto.setId(task.id);
      taskProto.setTitle(task.title);
      taskProto.setDescription(task.description);
      taskProto.setStatus(task.status);
      taskProto.setUserid(task.userId);
      taskProto.setCreatedat(task.createdAt);
      taskProto.setUpdatedat(task.updatedAt);
      return taskProto;
    });

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Tasks retrieved successfully');

    const response = new messages.GetTasksResponse();
    response.setTasksList(tasksProto);
    response.setStatus(statusProto);

    callback(null, response);
  },

  createTask: (call, callback) => {
    const { title, description, status, userId } = call.request;

    // Validate user exists
    if (!users.some(u => u.id === userId)) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'User not found'
      });
    }

    // Create new task
    const now = new Date().toISOString();
    const newTask = {
      id: uuidv4(),
      title,
      description,
      status,
      userId,
      createdAt: now,
      updatedAt: now
    };

    tasks.push(newTask);

    // Create response using proto messages
    const taskProto = new messages.Task();
    taskProto.setId(newTask.id);
    taskProto.setTitle(newTask.title);
    taskProto.setDescription(newTask.description);
    taskProto.setStatus(newTask.status);
    taskProto.setUserid(newTask.userId);
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

  deleteTask: (call, callback) => {
    const { taskId } = call.request;

    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Task not found'
      });
    }

    // Remove task
    tasks.splice(taskIndex, 1);

    // Create response using proto messages
    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Task deleted successfully');

    const response = new messages.DeleteTaskResponse();
    response.setStatus(statusProto);

    callback(null, response);
  },

  updateTask: (call, callback) => {
    const { taskId, title, description, status, userId } = call.request;

    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Task not found'
      });
    }

    // Validate user exists if userId is provided
    if (userId && !users.some(u => u.id === userId)) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'User not found'
      });
    }

    // Update task
    const updatedTask = {
      ...tasks[taskIndex],
      ...(title && { title }),
      ...(description && { description }),
      ...(status && { status }),
      ...(userId && { userId }),
      updatedAt: new Date().toISOString()
    };

    tasks[taskIndex] = updatedTask;

    // Create response using proto messages
    const taskProto = new messages.Task();
    taskProto.setId(updatedTask.id);
    taskProto.setTitle(updatedTask.title);
    taskProto.setDescription(updatedTask.description);
    taskProto.setStatus(updatedTask.status);
    taskProto.setUserid(updatedTask.userId);
    taskProto.setCreatedat(updatedTask.createdAt);
    taskProto.setUpdatedat(updatedTask.updatedAt);

    const statusProto = new messages.Status();
    statusProto.setCode(grpc.status.OK);
    statusProto.setMessage('Task updated successfully');

    const response = new messages.TaskResponse();
    response.setTask(taskProto);
    response.setStatus(statusProto);

    callback(null, response);
  }
};
