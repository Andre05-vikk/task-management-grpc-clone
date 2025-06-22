const express = require('express');
const bcrypt = require('bcrypt');
const mariadb = require('mariadb');

const app = express();
app.use(express.json());

const pool = mariadb.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'taskuser',
    password: 'taskpassword',
    database: 'notion_clone',
    connectionLimit: 5
});

app.post('/test-user', async (req, res) => {
    console.log('📝 Starting user creation test...');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        console.log('❌ Missing fields');
        return res.status(400).json({ error: 'Missing fields' });
    }
    
    try {
        console.log('1. Starting database operations...');
        const pool_conn = await pool.getConnection();
        console.log('2. Got database connection');
        
        console.log('3. Checking existing user...');
        const existing = await pool_conn.query('SELECT * FROM users WHERE username = ?', [email]);
        console.log('4. Existing check result:', existing.length);
        
        if (existing.length > 0) {
            pool_conn.release();
            console.log('❌ User exists');
            return res.status(409).json({ error: 'User exists' });
        }
        
        console.log('5. Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('6. Password hashed');
        
        console.log('7. Inserting user...');
        const result = await pool_conn.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [email, hashedPassword]
        );
        console.log('8. Insert result:', result);
        
        console.log('9. Fetching created user...');
        const [user] = await pool_conn.query(
            'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
            [result.insertId]
        );
        console.log('10. User fetched:', user);
        
        pool_conn.release();
        console.log('11. Connection released');
        
        console.log('12. Sending response...');
        return res.status(201).json(user);
    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(5002, () => {
    console.log('Debug server running on port 5002');
});
