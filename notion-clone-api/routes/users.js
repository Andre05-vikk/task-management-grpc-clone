
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// POST /users - Create a new user
router.post('/', async (req, res) => {
    console.log('🔵 REST API - POST /users (create user)');
    console.log('  Request body:', req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
        console.log('  ❌ Missing email or password');
        return res.status(400).json({
            code: 400,
            error: 'Bad Request',
            message: 'Email and password are required'
        });
    }
    if (password.length < 6) {
        console.log('  ❌ Password too short');
        return res.status(400).json({
            code: 400,
            error: 'Bad Request',
            message: 'Password must be at least 6 characters long'
        });
    }

    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();

        const existing = await conn.query('SELECT * FROM users WHERE username = ?', [email]);
        if (existing.length > 0) {
            conn.release();
            return res.status(409).json({
                code: 409,
                error: 'Conflict',
                message: 'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await conn.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [email, hashedPassword]
        );

        const [user] = await conn.query(
            'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
            [result.insertId]
        );
        conn.release();

        return res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to create user'
        });
    }
});

// GET /users
router.get('/', (req, res, next) => req.app.locals.authenticateToken(req, res, next), async (req, res) => {
    console.log('🔵 REST API - GET /users');
    
    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();

        const rows = await conn.query(
            'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users'
        );
        conn.release();

        return res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch users'
        });
    }
});

// GET /users/:userId
router.get('/:userId', (req, res, next) => req.app.locals.authenticateToken(req, res, next), async (req, res) => {
    console.log('🔵 REST API - GET /users/:userId');
    console.log('  Request params: { userId:', req.params.userId, '}');
    
    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();
        const userId = parseInt(req.params.userId);

        const [user] = await conn.query(
            'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
            [userId]
        );
        conn.release();

        if (!user) {
            return res.status(404).json({
                code: 404,
                error: 'Not Found',
                message: 'User not found'
            });
        }

        return res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch user'
        });
    }
});

// PATCH /users/:userId
router.patch('/:userId', (req, res, next) => req.app.locals.authenticateToken(req, res, next), async (req, res) => {
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({
            code: 400,
            error: 'Bad Request',
            message: 'Password must be at least 6 characters long'
        });
    }

    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();
        const userId = parseInt(req.params.userId);

        if (userId !== req.user.id) {
            conn.release();
            return res.status(403).json({
                code: 403,
                error: 'Forbidden',
                message: 'You can only update your own account'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        const [user] = await conn.query(
            'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
            [userId]
        );
        conn.release();

        if (!user) {
            return res.status(404).json({
                code: 404,
                error: 'Not Found',
                message: 'User not found'
            });
        }

        return res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to update user'
        });
    }
});

// DELETE /users/:userId
router.delete('/:userId', (req, res, next) => req.app.locals.authenticateToken(req, res, next), async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();
        const userId = parseInt(req.params.userId);

        if (userId !== req.user.id) {
            conn.release();
            return res.status(403).json({
                code: 403,
                error: 'Forbidden',
                message: 'You can only delete your own account'
            });
        }

        await conn.query('DELETE FROM users WHERE id = ?', [userId]);
        conn.release();

        return res.sendStatus(204); // No Content - successful deletion without response body
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to delete user'
        });
    }
});

module.exports = router;