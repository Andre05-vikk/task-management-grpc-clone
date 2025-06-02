# Notion Clone - Full Stack Application

A full-stack task management application with a Node.js/Express backend API and React/TypeScript frontend.

## Features

### Backend
- User authentication with JWT
- Task management (create, read, update, delete)
- Swagger UI for API documentation and testing in multiple languages
- Secure password handling with bcrypt
- Token blacklisting for logout

### Frontend
- User authentication (register, login, logout)
- User profile management (update password, delete account)
- Task management with filtering and sorting
- Responsive design
- Form validation

## Prerequisites

- Node.js (v14 or higher)
- MariaDB (v10 or higher)

## Installation

### Quick Setup (Recommended)

1. Install all dependencies and build the frontend with a single command:

```bash
npm run setup
```

This command will:
- Install backend dependencies
- Install frontend dependencies
- Build the frontend for production

2. Set up the environment variables:

Create a `.env` file with the following content:

```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=notion_clone
JWT_SECRET=your-secret-key
```

3. Set up the database:

```bash
# Create the database and tables
mysql -u root -p < database.sql
```

### Manual Installation (Alternative)

If you prefer to install components separately:

#### Backend

1. Install backend dependencies:

```bash
npm install
```

#### Frontend

1. Install frontend dependencies:

```bash
npm run client-install
```

2. Build the frontend for production:

```bash
npm run client-build
```

## Running the Application

### Backend Only (Development Mode)

```bash
npm run dev
```

### Frontend Only

```bash
npm run client
```

### Full Stack (Backend and Frontend)

```bash
npm run dev-full
```

The backend server will run on port 5001 by default, and the frontend will run on port 3000 in development mode. You can change the backend port by setting the PORT environment variable in your .env file.

### Production Deployment

For production deployment, the application is configured to serve both the backend API and frontend from a single server:

1. Set up the application (if not already done):
```bash
npm run setup
```

2. Start the server:
```bash
npm start
```


### Using PM2 for Production

For production environments, it's recommended to use PM2 to manage the Node.js process:

1. Install PM2 globally (if not already installed):
```bash
npm install -g pm2
```

2. Start the application with PM2:
```bash
pm2 start notion-clone-api.js
```

3. To ensure the application starts automatically after server reboot:
```bash
pm2 startup
pm2 save
```

4. To restart the application after changes:
```bash
pm2 restart notion-clone-api
```

## API Documentation

The API documentation is available in multiple languages when the server is running:

- English Documentation: `<your-server-url>/en`
- Estonian Documentation: `<your-server-url>/et`
- Main application: `<your-server-url>/` (serves the frontend)

For local development:

- English Documentation: <http://localhost:5001/en>
- Estonian Documentation: <http://localhost:5001/et>
- Main application: <http://localhost:5001/> (serves the frontend)

You can use the Swagger UI to test all endpoints directly from your browser.

## Database Structure

The application uses two main tables:

- `users`: Stores user information
- `tasks`: Stores task information with a foreign key to the users table

## Project Structure

```
notion-clone-api/
├── frontend/                  # React frontend application
│   ├── public/                # Static files
│   ├── src/                   # Source files
│   │   ├── components/        # Reusable components
│   │   ├── contexts/          # React contexts
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   ├── package.json           # Frontend dependencies
│   └── tsconfig.json          # TypeScript configuration
├── routes/                    # Backend API routes
│   ├── auth.js                # Authentication routes
│   ├── tasks.js               # Task management routes
│   └── users.js               # User management routes
├── openapi.yaml               # OpenAPI specification (English)
├── openapi.et.yaml            # OpenAPI specification (Estonian)
├── notion-clone-api.js        # Express server setup
├── package.json               # Backend dependencies
└── README.md                  # Project documentation
```

## Technologies Used

### Backend
- Node.js
- Express
- MariaDB
- JWT for authentication
- bcrypt for password hashing
- Swagger/OpenAPI for documentation

### Frontend
- React
- TypeScript
- React Router for navigation
- Axios for API requests
- Context API for state management
- Custom CSS for styling
