const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const mariadb = require('mariadb');
const jwt = require('jsonwebtoken');

// Load environment variables (if .env is present)
require('dotenv').config();

// Default JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Set API URL based on environment
const API_URL = process.env.API_URL || 'http://localhost:5001';
process.env.API_URL = API_URL;

// DB config
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'notion_clone',
    connectionLimit: 5
};

// Load OpenAPI specs with environment variable substitution
const loadOpenAPISpec = (filePath) => {
    let spec = YAML.load(filePath);

    // Only replace API_URL environment variable
    if (spec.servers && Array.isArray(spec.servers)) {
        spec.servers = spec.servers.map(server => {
            if (server.url === '${API_URL}') {
                return {
                    ...server,
                    url: API_URL
                };
            }
            return server;
        });
    }

    return spec;
};

const app = express();
const pool = mariadb.createPool(dbConfig);

// Create a simple in-memory token blacklist
// In a production environment, this should be stored in Redis or another persistent store
const tokenBlacklist = new Set();

app.locals.pool = pool;
app.locals.JWT_SECRET = JWT_SECRET;
app.locals.tokenBlacklist = tokenBlacklist;

// Attempt DB connection
(async () => {
    let conn;
    try {
        console.log('Attempting to connect to database with config:', {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            database: dbConfig.database,
            // Not logging password for security reasons
            hasPassword: dbConfig.password !== ''
        });

        conn = await pool.getConnection();
        console.log('Database connection established successfully');

        // Check tables
        try {
            await conn.query('SELECT 1 FROM users LIMIT 1');
            await conn.query('SELECT 1 FROM tasks LIMIT 1');
            console.log('Database tables verified');
        } catch (tableError) {
            console.error('Database tables not found. Please run database.sql:', tableError);
        }
    } catch (err) {
        console.error('Database connection failed:', err);
        console.error('Error details:', {
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
            sqlMessage: err.sqlMessage
        });
    } finally {
        if (conn) conn.release();
    }
})();

// Middleware
app.use(cors());
app.use(express.json());

// Load OpenAPI specs with environment variable substitution
const swaggerDocument = loadOpenAPISpec(path.join(__dirname, 'openapi.yaml'));
const swaggerDocumentEt = loadOpenAPISpec(path.join(__dirname, 'openapi.et.yaml'));

// Configure Swagger UI options
const swaggerUiOptions = {
    explorer: true,
    customSiteTitle: "API Documentation",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true
    }
};

const swaggerUiOptionsEt = {
    explorer: true,
    customSiteTitle: "API Dokumentatsioon",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true
    }
};

// Set up English Swagger UI using serveFiles as per documentation
app.use('/en', swaggerUi.serveFiles(swaggerDocument, swaggerUiOptions), swaggerUi.setup(swaggerDocument, swaggerUiOptions));

// Set up Estonian Swagger UI using serveFiles as per documentation
app.use('/et', swaggerUi.serveFiles(swaggerDocumentEt, swaggerUiOptionsEt), swaggerUi.setup(swaggerDocumentEt, swaggerUiOptionsEt));

// Default route - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

// Bearer auth middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            code: 401,
            error: 'Unauthorized',
            message: 'Authentication token is required'
        });
    }

    // Check if token is blacklisted
    if (app.locals.tokenBlacklist.has(token)) {
        return res.status(401).json({
            code: 401,
            error: 'Unauthorized',
            message: 'Token has been revoked'
        });
    }

    try {
        // Verify token signature and expiration
        const user = jwt.verify(token, app.locals.JWT_SECRET);

        // Check if user still exists in database
        const pool = req.app.locals.pool;
        const conn = await pool.getConnection();

        try {
            const rows = await conn.query('SELECT id FROM users WHERE id = ?', [user.id]);

            if (rows.length === 0) {
                conn.release();
                return res.status(410).json({
                    code: 410,
                    error: 'Gone',
                    message: 'User account no longer exists'
                });
            }

            // User exists, proceed
            req.user = user;
            // Store the token in the request for potential blacklisting during logout
            req.token = token;
            conn.release();
            next();
        } catch (dbError) {
            conn.release();
            console.error('Database error during token verification:', dbError);
            return res.status(500).json({
                code: 500,
                error: 'Internal Server Error',
                message: 'Error verifying user account'
            });
        }
    } catch (err) {
        return res.status(403).json({
            code: 403,
            error: 'Forbidden',
            message: 'Invalid or expired token'
        });
    }
};

app.locals.authenticateToken = authenticateToken;

// Use route modules
app.use('/users', require('./routes/users'));
app.use('/tasks', require('./routes/tasks'));
app.use('/', require('./routes/auth'));

// Serve frontend static build
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// Catch-all route for frontend
app.get('*', (req, res, next) => {
  // Väldi API ja Swagger UI marsruutide kattumist
  if (req.path.startsWith('/users') ||
      req.path.startsWith('/tasks') ||
      req.path.startsWith('/sessions') ||
      req.path.startsWith('/en') ||
      req.path.startsWith('/et')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

app.use((err, req, res, next) => {
    // Log the full error with stack trace
    console.error('Detailed error:', {
        message: err.message,
        stack: err.stack,
        type: err.type || 'Undefined',
        code: err.statusCode || 500
    });

    try {
        // Verify response object integrity
        if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
            console.error('Invalid response object detected:', {
                exists: !!res,
                hasStatusMethod: !!(res && res.status),
                hasJsonMethod: !!(res && res.json)
            });

            // Fallback response if res object is corrupted
            if (res && typeof res.end === 'function') {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    code: 500,
                    error: 'Critical Server Error',
                    message: 'Response object corruption detected'
                }));
            }
            return;
        }

        // Normal error handling
        const statusCode = err.statusCode || 500;
        const errorType = statusCode === 500 ? 'Internal Server Error' : err.type || 'Error';
        const errorMessage = err.message || 'An unexpected error occurred';

        // Additional context logging
        console.error('Error context:', {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode,
            errorType,
            errorMessage
        });

        res.status(statusCode).json({
            code: statusCode,
            error: errorType,
            message: errorMessage
        });

    } catch (handlingError) {
        // Log if error handling itself fails
        console.error('Error in error handler:', handlingError);

        // Last resort response
        if (res && !res.headersSent && typeof res.end === 'function') {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                code: 500,
                error: 'Critical Error',
                message: 'Error handling failed'
            }));
        }
    }
});

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API documentation at http://localhost:${PORT}`);
});

// Export for testing
module.exports = { app, server };