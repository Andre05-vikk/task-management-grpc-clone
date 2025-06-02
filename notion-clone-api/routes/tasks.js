const express = require('express');
const router = express.Router();

// GET /tasks
router.get('/', (req, res, next) => req.app.locals.authenticateToken(req, res, next), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { status, sort } = req.query;

        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();

        let query = 'SELECT * FROM tasks WHERE user_id = ?';
        const queryParams = [req.user.id];

        if (status && ['pending', 'in_progress', 'completed'].includes(status)) {
            query += ' AND status = ?';
            queryParams.push(status);
        }

        if (sort) {
            const [sortField, sortOrder] = sort.split(':');
            if (sortField && ['title', 'status', 'created_at', 'updated_at'].includes(sortField)) {
                const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';
                query += ` ORDER BY ${sortField} ${direction}`;
            }
        } else {
            query += ' ORDER BY created_at DESC';
        }

        const countQueryResult = await conn.query(
            'SELECT COUNT(*) as total FROM tasks WHERE user_id = ?' + (status ? ' AND status = ?' : ''),
            status ? [req.user.id, status] : [req.user.id]
        );

        // Avoid JSON.stringify for BigInt values
        console.log('Count query result received');

        // Handle different possible formats of the COUNT result
        let total = 0;
        if (countQueryResult && countQueryResult[0]) {
            if (Array.isArray(countQueryResult[0]) && countQueryResult[0][0] && countQueryResult[0][0].total !== undefined) {
                total = Number(countQueryResult[0][0].total);
            } else if (countQueryResult[0].total !== undefined) {
                total = Number(countQueryResult[0].total);
            } else if (countQueryResult[0][0] && typeof countQueryResult[0][0] === 'object') {
                // Try to find a property that might contain the count
                const firstRow = countQueryResult[0][0];
                const possibleCountKey = Object.keys(firstRow)[0];
                if (possibleCountKey) {
                    total = Number(firstRow[possibleCountKey]);
                }
            }
        }

        query += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        const tasksResult = await conn.query(query, queryParams);
        conn.release();

        // Handle different possible formats of the query result
        let tasks = [];
        if (tasksResult && Array.isArray(tasksResult)) {
            if (tasksResult[0] && Array.isArray(tasksResult[0])) {
                tasks = tasksResult[0];
            } else {
                tasks = tasksResult;
            }
        }

        const formattedTasks = tasks.map(t => ({
            id: Number(t.id),
            title: t.title,
            description: t.description,
            status: t.status,
            user_id: Number(t.user_id),
            createdAt: t.created_at,
            updatedAt: t.updated_at
        }));

        return res.json({ page, limit, total, tasks: formattedTasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch tasks'
        });
    }
});

// POST /tasks
router.post('/', (req, res, next) => req.app.locals.authenticateToken(req, res, next), async (req, res) => {
    const { title, description, status } = req.body;

    if (!title || title.length < 1) {
        return res.status(400).json({
            code: 400,
            error: 'Bad Request',
            message: 'Title is required and must be at least 1 character long'
        });
    }
    if (status && !['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({
            code: 400,
            error: 'Bad Request',
            message: 'Status must be pending, in_progress, or completed'
        });
    }

    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();
        // Format date in MySQL/MariaDB compatible format (YYYY-MM-DD HH:MM:SS)
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const result = await conn.query(
            'INSERT INTO tasks (title, description, status, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description || null, status || 'pending', req.user.id, now, now]
        );

        // Handle BigInt serialization
        const insertId = result.insertId ? Number(result.insertId) : null;
        console.log('Insert ID:', insertId);

        // Return basic info without querying for the task
        conn.release();
        return res.status(201).json({
            success: true,
            message: 'Task created successfully',
            taskId: insertId,
            title: title,
            description: description || null,
            status: status || 'pending'
        });
    } catch (error) {
        console.error('Error creating task:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred'
        });
    }
});

// PATCH /tasks/:taskId
router.patch('/:taskId', (req, res, next) => req.app.locals.authenticateToken(req, res, next), async (req, res) => {
    try {
        const { title, description, status } = req.body;
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();
        const taskId = parseInt(req.params.taskId);

        // Log the exact values we receive
        console.log('Raw request body:', req.body);

        const taskResult = await conn.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
        const tasks = taskResult[0];
        if (!tasks || tasks.length === 0) {
            conn.release();
            return res.status(404).json({
                code: 404,
                error: 'Not Found',
                message: 'Task not found or you do not have permission'
            });
        }

        const updates = ['updated_at = ?'];
        const values = [new Date().toISOString().slice(0, 19).replace('T', ' ')];

        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (status !== undefined) {
            // Validate status value
            if (!['pending', 'in_progress', 'completed'].includes(status)) {
                conn.release();
                return res.status(400).json({
                    code: 400,
                    error: 'Bad Request',
                    message: 'Status must be one of: pending, in_progress, completed'
                });
            }
            // Add status to update query exactly as received
            updates.push('status = ?');
            values.push(status);
            // Log the exact status value being used
            console.log('Status value being used:', status);
        }

        values.push(taskId, req.user.id);
        const updateQuery = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;

        try {
            const result = await conn.query(updateQuery, values);
            conn.release();
            return res.json({
                success: true,
                message: 'Task updated successfully'
            });
        } catch (error) {
            console.error('Error executing update query:', error);
            conn.release();
            return res.status(500).json({
                code: 500,
                error: 'Internal Server Error',
                message: 'Failed to update task'
            });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to update task'
        });
    }
});

// DELETE /tasks/:taskId
router.delete('/:taskId', (req, res, next) => req.app.locals.authenticateToken(req, res, next), async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();
        const taskId = parseInt(req.params.taskId);

        const taskResult = await conn.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
        const tasks = taskResult[0];
        if (!tasks || tasks.length === 0) {
            conn.release();
            return res.status(404).json({
                code: 404,
                error: 'Not Found',
                message: 'Task not found or you do not have permission'
            });
        }

        await conn.query('DELETE FROM tasks WHERE id = ?', [taskId]);
        conn.release();

        return res.sendStatus(204); // No Content - successful deletion without response body
    } catch (error) {
        console.error('Error deleting task:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to delete task'
        });
    }
});

module.exports = router;