const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST /sessions - Login
router.post('/sessions', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            code: 400,
            error: 'Bad Request',
            message: 'Email and password are required'
        });
    }

    try {
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();

        const rows = await conn.query('SELECT * FROM users WHERE username = ?', [email]);
        if (rows.length === 0) {
            conn.release();
            return res.status(401).json({
                code: 401,
                error: 'Unauthorized',
                message: 'Invalid email or password'
            });
        }

        const user = rows[0];
        console.log('Login attempt:', {
            username: user.username,
            providedPassword: password,
            storedHash: user.password
        });
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword);
        if (!validPassword) {
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
        try {
            // Add the token to the blacklist
            if (req.token) {
                req.app.locals.tokenBlacklist.add(req.token);
                console.log('Token blacklisted:', req.token.substring(0, 10) + '...');
            }

            // Return 204 No Content without body
            return res.sendStatus(204);
        } catch (error) {
            console.error('Error processing logout:', error);
            return res.status(500).json({
                code: 500,
                error: 'Internal Server Error',
                message: 'Failed to process logout'
            });
        }
    }
);

module.exports = router;