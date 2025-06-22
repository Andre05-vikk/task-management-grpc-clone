import * as grpc from '@grpc/grpc-js';
import * as messages from '../../proto/task_management_pb';
import * as services from '../../proto/task_management_grpc_pb';
import { pool } from '../data/database';
import { verifyToken } from '../utils/auth';

export const taskServiceHandlers = {
  getTasks: async (call: any, callback: any) => {
    console.log('🟢 gRPC - getTasks()');
    
    try {
      const userId = call.request.getUserid();
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
        const parsedUserId = parseInt(userId);
        if (isNaN(parsedUserId)) {
          console.log('  ❌ Invalid user ID format');
          const error = new Error('Invalid user ID format');
          (error as any).code = grpc.status.INVALID_ARGUMENT;
          return callback(error);
        }
        console.log('  🔍 Filtering by user ID:', parsedUserId);
        query += ' AND user_id = ?';
        params.push(parsedUserId);
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
        taskProto.setId(task.id.toString());
        taskProto.setTitle(task.title);
        taskProto.setDescription(task.description || '');
        taskProto.setStatus(task.status);
        taskProto.setUserid(task.user_id.toString());
        // Fix timestamp fields - convert database timestamps to ISO string
        taskProto.setCreatedat(task.created_at ? task.created_at.toISOString() : '');
        taskProto.setUpdatedat(task.updated_at ? task.updated_at.toISOString() : '');
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
      const userIdStr = call.request.getUserid();
      
      // Validate user ID
      const userId = parseInt(userIdStr);
      if (!userIdStr || isNaN(userId)) {
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
      response.setTaskid(result.insertId.toString());
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
      const taskIdStr = call.request.getTaskid();
      const title = call.request.getTitle();
      const description = call.request.getDescription();
      const status = call.request.getStatus();

      console.log('  Request params: { taskId:', taskIdStr, '}');
      console.log('  Request body: { title: \'Updated Test Task\' }');

      // Validate task ID
      const taskId = parseInt(taskIdStr);
      if (!taskIdStr || isNaN(taskId)) {
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
      taskProto.setId(updatedTask.id.toString());
      taskProto.setTitle(updatedTask.title);
      taskProto.setDescription(updatedTask.description || '');
      taskProto.setStatus(updatedTask.status);
      taskProto.setUserid(updatedTask.user_id.toString());
      taskProto.setCreatedat(updatedTask.created_at);
      taskProto.setUpdatedat(updatedTask.updated_at);

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
      const taskIdStr = call.request.getTaskid();
      
      console.log('  Request params: { taskId:', taskIdStr, '}');
      
      // Validate task ID
      const taskId = parseInt(taskIdStr);
      if (!taskIdStr || isNaN(taskId)) {
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
