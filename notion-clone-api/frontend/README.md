# Task Manager Frontend

This is a React frontend application for the Task Manager API. It provides a user interface for managing tasks, user accounts, and authentication.

## Features

- User authentication (login, register, logout)
- Task management (create, read, update, delete)
- User profile management (update password, delete account)
- View all users
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- npm
- Backend API running (default: http://localhost:5001)

## Installation

### Option 1: Using the root project setup (Recommended)

If you're setting up the entire project (backend and frontend), you can use the simplified setup process from the root directory:

```
npm run setup
```

This will install both backend and frontend dependencies and build the frontend for production.

### Option 2: Manual frontend setup

If you only want to set up the frontend:

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```
2. Install dependencies:
   ```
   npm install
   ```

## Configuration

The application is configured to connect to the backend API at `http://localhost:5001` by default. You can change this by:

1. Creating a `.env` file in the frontend directory
2. Adding the following line:
   ```
   REACT_APP_API_URL=your_api_url
   ```

## Running the Application

To start the development server:

```
npm start
```

The application will be available at `http://localhost:3000`.

## Building for Production

To create a production build:

```
npm run build
```

The build files will be created in the `build` directory.

## API Endpoints

The frontend interacts with the following backend API endpoints:

### Authentication
- `POST /sessions` - Login
- `DELETE /sessions` - Logout

### Users
- `POST /users` - Register a new user
- `GET /users` - Get all users
- `GET /users/:userId` - Get user by ID
- `PATCH /users/:userId` - Update user password
- `DELETE /users/:userId` - Delete user account

### Tasks
- `GET /tasks` - Get all tasks with pagination and filtering
- `POST /tasks` - Create a new task
- `PATCH /tasks/:taskId` - Update a task
- `DELETE /tasks/:taskId` - Delete a task

## Technologies Used

- React
- TypeScript
- React Router
- Axios
- CSS (custom styling)

## License

This project is licensed under the MIT License.
