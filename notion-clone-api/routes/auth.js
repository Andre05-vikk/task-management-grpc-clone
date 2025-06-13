const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST /sessions - Login
router.post('/sessions', async (req, res) => {
    console.log('🔵 REST API - POST /sessions (login)');
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

    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();

        console.log('  🔍 Searching for user with email:', email);
        const rows = await conn.query('SELECT * FROM users WHERE username = ?', [email]);
        if (rows.length === 0) {
            console.log('  ❌ User not found');
            conn.release();
            return res.status(401).json({
                code: 401,
                error: 'Unauthorized',
                message: 'Invalid email or password'
            });
        }

        const user = rows[0];
        console.log('  ✅ User found:', { id: user.id, username: user.username });
        console.log('  🔐 Comparing passwords...');
        console.log('    Provided password:', password);
        console.log('    Stored hash:', user.password.substring(0, 20) + '...');
        
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('  🔐 Password valid:', validPassword);
        
        if (!validPassword) {
            console.log('  ❌ Invalid password');
            conn.release();
            return res.status(401).json({
                code: 401,
                error: 'Unauthorized',
                message: 'Invalid password'
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.username },
            req.app.locals.JWT_SECRET,
            { expiresIn: '7d' }
        );

        conn.release();
        return res.json({ token });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            code: 500,
            error: 'Internal Server Error',
            message: 'Failed to authenticate'
        });
    }
});

// DELETE /sessions - Logout
router.delete(
    '/sessions',
    (req, res, next) => req.app.locals.authenticateToken(req, res, next),
    async (req, res) => {
        console.log('🔵 REST API - DELETE /sessions (logout)');
        console.log('  User ID:', req.user?.id);
        console.log('  Token (first 10 chars):', req.token?.substring(0, 10) + '...');
        
        try {
            // Add the token to the blacklist
            if (req.token) {
                req.app.locals.tokenBlacklist.add(req.token);
                console.log('  ✅ Token blacklisted');
            }

            console.log('  ✅ Logout successful');
            // Return 204 No Content without body
            return res.sendStatus(204);
        } catch (error) {
            console.error('  ❌ Error processing logout:', error);
            return res.status(500).json({
                code: 500,
                error: 'Internal Server Error',
                message: 'Failed to process logout'
            });
        }
    }
);

module.exports = router;