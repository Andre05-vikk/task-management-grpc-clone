import mariadb from 'mariadb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// DB config (same as REST API)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'taskuser',
    password: process.env.DB_PASSWORD || 'taskpassword',
    database: process.env.DB_DATABASE || 'notion_clone',
    connectionLimit: 10,
    acquireTimeout: 30000,
    timeout: 30000
};

// Create connection pool
export const pool = mariadb.createPool(dbConfig);

// Test database connection
export async function testConnection() {
    let conn;
    try {
        console.log('Testing database connection...');
        conn = await pool.getConnection();
        
        // Test if tables exist
        await conn.query('SELECT 1 FROM users LIMIT 1');
        await conn.query('SELECT 1 FROM tasks LIMIT 1');
        
        console.log('Database connection successful');
        return true;
    } catch (err) {
        console.error('Database connection failed:', err);
        return false;
    } finally {
        if (conn) conn.release();
    }
}
