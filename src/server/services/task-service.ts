import * as grpc from '@grpc/grpc-js';
import * as messages from '../../proto/task_management_pb';
import * as services from '../../proto/task_management_grpc_pb';
import { pool } from '../data/database';
import { verifyToken } from '../utils/auth';

export const taskServiceHandlers = {
  getTasks: async (call: any, callback: any) => {
    console.log('🟢 gRPC - getTasks()');
    
    try {
      const userId = call.request.getUserId();     // Now getUserId() for camelCase
      const status = call.request.getStatus();

      console.log('  User ID:', userId || 'undefined');
      console.log('  Query params:', { status: status || undefined });
      console.log('  📄 Pagination: { page: 1, limit: 10, offset: 0 }');
      console.log('  🔍 Filters: { status: ' + (status || 'undefined') + ', sort: undefined }');

      // Build SQL query based on filters
      let query = 'SELECT * FROM tasks WHERE 1=1';
      const params: any[] = [];

      // Apply user filter (required like in REST API)
      if (userId) {
        if (userId <= 0) {
          console.log('  ❌ Invalid user ID format');
          const error = new Error('Invalid user ID format');
          (error as any).code = grpc.status.INVALID_ARGUMENT;
          return callback(error);
        }
        console.log('  🔍 Filtering by user ID:', userId);
        query += ' AND user_id = ?';
        params.push(userId);
      }

      // Apply status filter if provided
      if (status && ['pending', 'in_progress', 'completed'].includes(status)) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const connection = await pool.getConnection();
      const rows = await connection.query(query, params);
      connection.release();

      const tasks = rows as any[];

      // Create response using proto messages (match REST API structure)
      const tasksProto = tasks.map(task => {
        const taskProto = new messages.Task();
        taskProto.setId(task.id);                    // Now int32 instead of string
        taskProto.setTitle(task.title);
        taskProto.setDescription(task.description || '');
        taskProto.setStatus(task.status);
        taskProto.setUserId(task.user_id);          // Now setUserId() for camelCase
        // Use helper functions for consistent timestamp formatting
        setCreatedAt(taskProto, task.created_at);
        setUpdatedAt(taskProto, task.updated_at);
        return taskProto;
      });

      const statusProto = new messages.Status();
      statusProto.setCode(grpc.status.OK);
      statusProto.setMessage('Tasks fetched successfully');

      const response = new messages.GetTasksResponse();
      response.setTasksList(tasksProto);
      response.setPage(1);      // Match REST API response structure
      response.setLimit(10);    // Match REST API response structure
      response.setTotal(tasks.length);  // Match REST API response structure
      response.setStatus(statusProto);

      callback(null, response);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      const grpcError = new Error('Failed to fetch tasks');
      (grpcError as any).code = grpc.status.INTERNAL;
      callback(grpcError);
    }
  },

  createTask: async (call: any, callback: any) => {
    console.log('🟢 gRPC - createTask()');
    
    try {
      const title = call.request.getTitle();
      const description = call.request.getDescription();
      const status = call.request.getStatus();
      const userId = call.request.getUserId();    // Now getUserId() returns int32 directly
      
      // Validate user ID
      if (!userId || userId <= 0) {
        const error = new Error('Valid user ID is required');
        (error as any).code = grpc.status.INVALID_ARGUMENT;
        return callback(error);
      }

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

      // Insert new task into database
      const taskStatus = status || 'pending';
      const taskDescription = description || null;
      
      const connection = await pool.getConnection();
      const result = await connection.query(
        'INSERT INTO tasks (title, description, status, user_id) VALUES (?, ?, ?, ?)',
        [title, taskDescription, taskStatus, userId]
      );
      
      console.log('Insert ID:', result.insertId);
      connection.release();

      // Match REST API response structure: {success, message, taskId, title, description, status}
      const statusProto = new messages.Status();
      statusProto.setCode(grpc.status.OK);
      statusProto.setMessage('Task created successfully');

      const response = new messages.CreateTaskResponse();
      response.setSuccess(true);
      response.setMessage('Task created successfully');
      response.setTaskid(Number(result.insertId));  // Now int32 instead of string
      response.setTitle(title);
      response.setDescription(taskDescription || '');
      response.setStatus(taskStatus);
      response.setStatusInfo(statusProto);

      callback(null, response);
    } catch (error) {
      console.error('Error creating task:', error);
      const grpcError = new Error('Failed to create task');
      (grpcError as any).code = grpc.status.INTERNAL;
      callback(grpcError);
    }
  },

  updateTask: async (call: any, callback: any) => {
    console.log('🟢 gRPC - updateTask()');
    
    try {
      const taskId = call.request.getTaskid();    // Now getTaskid() returns int32 directly
      const title = call.request.getTitle();
      const description = call.request.getDescription();
      const status = call.request.getStatus();

      console.log('  Request params: { taskId:', taskId, '}');
      console.log('  Request body: { title: \'Updated Test Task\' }');

      // Validate task ID
      if (!taskId || taskId <= 0) {
        console.log('  ❌ Invalid task ID');
        const error = new Error('Valid task ID is required');
        (error as any).code = grpc.status.INVALID_ARGUMENT;
        return callback(error);
      }

      // Validate status if provided (match REST API validation)
      if (status && !['pending', 'in_progress', 'completed'].includes(status)) {
        console.log('  ❌ Invalid status');
        const error = new Error('Status must be one of: pending, in_progress, completed');
        (error as any).code = grpc.status.INVALID_ARGUMENT;
        return callback(error);
      }

      const connection = await pool.getConnection();
      
      // Check if task exists
      const existingRows = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      if (!existingRows || existingRows.length === 0) {
        connection.release();
        const error = new Error('Task not found or you do not have permission');
        (error as any).code = grpc.status.NOT_FOUND;
        return callback(error);
      }

      // Build update query dynamically - only update fields that are actually provided
      const updateFields: string[] = [];
      const updateParams: any[] = [];

      // Only update title if it's provided (not empty string)
      if (title && title.trim() !== '') {
        updateFields.push('title = ?');
        updateParams.push(title);
      }
      
      // Only update description if it's explicitly provided (even empty string is valid for description)
      if (description !== undefined && description !== '') {
        updateFields.push('description = ?');
        updateParams.push(description);
      }
      
      // Only update status if it's provided and valid
      if (status && ['pending', 'in_progress', 'completed'].includes(status)) {
        updateFields.push('status = ?');
        updateParams.push(status);
      }

      // Always update the updated_at timestamp if we have fields to update
      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateParams.push(taskId); // Add taskId for WHERE clause at the END
        const updateQuery = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
        await connection.query(updateQuery, updateParams);
      }

      // Fetch the updated task
      const updatedRows = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );
      connection.release();

      const updatedTask = updatedRows[0];

      // REST API returns {success: true, message: 'Task updated successfully'}
      // For gRPC, we return the full updated task
      const taskProto = new messages.Task();
      taskProto.setId(updatedTask.id);               // Now int32 instead of string
      taskProto.setTitle(updatedTask.title);
      taskProto.setDescription(updatedTask.description || '');
      taskProto.setStatus(updatedTask.status);        taskProto.setUserId(updatedTask.user_id);      // Now setUserId() for camelCase
      // Use helper functions for consistent timestamp formatting
      setCreatedAt(taskProto, updatedTask.created_at);
      setUpdatedAt(taskProto, updatedTask.updated_at);

      const statusProto = new messages.Status();
      statusProto.setCode(grpc.status.OK);
      statusProto.setMessage('Task updated successfully');

      const response = new messages.TaskResponse();
      response.setTask(taskProto);
      response.setStatus(statusProto);

      callback(null, response);
    } catch (error) {
      console.error('Error updating task:', error);
      const grpcError = new Error('Failed to update task');
      (grpcError as any).code = grpc.status.INTERNAL;
      callback(grpcError);
    }
  },

  deleteTask: async (call: any, callback: any) => {
    console.log('🟢 gRPC - deleteTask()');
    
    try {
      const taskId = call.request.getTaskid();    // Now getTaskid() returns int32 directly
      
      console.log('  Request params: { taskId:', taskId, '}');
      
      // Validate task ID
      if (!taskId || taskId <= 0) {
        console.log('  ❌ Invalid task ID');
        const error = new Error('Valid task ID is required');
        (error as any).code = grpc.status.INVALID_ARGUMENT;
        return callback(error);
      }
      
      const connection = await pool.getConnection();
      
      // Check if task exists before deleting
      const existingRows = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      if (!existingRows || existingRows.length === 0) {
        connection.release();
        const error = new Error('Task not found or you do not have permission');
        (error as any).code = grpc.status.NOT_FOUND;
        return callback(error);
      }

      // Actually delete the task from the database
      await connection.query('DELETE FROM tasks WHERE id = ?', [taskId]);
      connection.release();

      // REST API returns 204 No Content for DELETE, but gRPC needs a response
      const statusProto = new messages.Status();
      statusProto.setCode(grpc.status.OK);
      statusProto.setMessage('Task deleted successfully');

      const response = new messages.DeleteTaskResponse();
      response.setStatus(statusProto);

      callback(null, response);
    } catch (error) {
      console.error('Error deleting task:', error);
      const grpcError = new Error('Failed to delete task');
      (grpcError as any).code = grpc.status.INTERNAL;
      callback(grpcError);
    }
  }
};
/**
 * Sets the createdAt field on a Task proto message.
 * Accepts a Date object or ISO string, and stores as ISO string.
 */
function setCreatedAt(taskProto: messages.Task, createdAt: Date | string | null | undefined) {
  if (!createdAt) {
    taskProto.setCreatedAt('');
    return;
  }
  if (createdAt instanceof Date) {
    taskProto.setCreatedAt(createdAt.toISOString());
  } else if (typeof createdAt === 'string') {
    // If already ISO string, just set it
    taskProto.setCreatedAt(createdAt);
  } else {
    taskProto.setCreatedAt('');
  }
}

/**
 * Sets the updatedAt field on a Task proto message.
 * Accepts a Date object or ISO string, and stores as ISO string.
 */
function setUpdatedAt(taskProto: messages.Task, updatedAt: Date | string | null | undefined) {
  if (!updatedAt) {
    taskProto.setUpdatedAt('');
    return;
  }
  if (updatedAt instanceof Date) {
    taskProto.setUpdatedAt(updatedAt.toISOString());
  } else if (typeof updatedAt === 'string') {
    // If already ISO string, just set it
    taskProto.setUpdatedAt(updatedAt);
  } else {
    taskProto.setUpdatedAt('');
  }
}