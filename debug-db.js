const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'taskuser',
    password: 'taskpassword',
    database: 'notion_clone',
    connectionLimit: 5
});

async function testDb() {
    let conn;
    try {
        console.log('Getting connection...');
        conn = await pool.getConnection();
        console.log('Connection successful');
        
        console.log('Testing INSERT...');
        const result = await conn.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            ['debug@test.com', 'hashedpwd']
        );
        console.log('INSERT result:', result);
        
        console.log('Testing SELECT...');
        const [user] = await conn.query(
            'SELECT id, username, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
            [result.insertId]
        );
        console.log('SELECT result:', user);
        
        conn.release();
        console.log('Test completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Database test failed:', error);
        if (conn) conn.release();
        process.exit(1);
    }
}

testDb();
