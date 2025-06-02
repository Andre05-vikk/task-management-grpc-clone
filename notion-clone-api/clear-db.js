const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'notion_clone',
    connectionLimit: 5
});

async function clearDatabase() {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // First delete all tasks (due to foreign key constraint)
        await conn.query('DELETE FROM tasks');
        console.log('All tasks deleted');
        
        // Then delete all users
        await conn.query('DELETE FROM users');
        console.log('All users deleted');
        
        // Reset auto-increment counters
        await conn.query('ALTER TABLE tasks AUTO_INCREMENT = 1');
        await conn.query('ALTER TABLE users AUTO_INCREMENT = 1');
        console.log('Auto-increment counters reset');
        
    } catch (err) {
        console.error('Error clearing database:', err);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

clearDatabase(); 