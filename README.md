# Task Management gRPC API

This project is a gRPC implementation of a Task Management API, providing the same functionality as a REST API but using gRPC protocol.

## Project Structure

```
/project-root
 ├── proto/             # *.proto files
 ├── src/               # source code
 │   ├── server/        # gRPC server implementation
 │   └── client/        # gRPC client example
 ├── scripts/run.sh     # script to build and run the server
 ├── tests/test.sh      # automated tests
 ├── Dockerfile         # Docker configuration
 ├── docker-compose.yml # Docker Compose configuration
 └── README.md          # this file
```

## Features

The API provides the following functionality:

### Authentication
- Login and get JWT token
- Logout (delete session)

### Users
- Create a new user
- Get all users
- Get user by ID
- Delete user
- Update user

### Tasks
- Get all tasks
- Create a new task
- Delete a task
- Update a task

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Docker (optional, for containerized deployment)

## Building and Running

### Using npm

1. Install dependencies:
   ```
   npm install
   ```

2. Build the project:
   ```
   npm run build
   ```

3. Start the server:
   ```
   npm start
   ```

### Using the run script

You can use the provided run script to install dependencies, build the project, and start the server in one command:

```
chmod +x scripts/run.sh
./scripts/run.sh
```

### Using Docker

You can also use Docker to build and run the server:

```
docker-compose up
```

## Testing

To run the automated tests:

```
chmod +x tests/test.sh
./tests/test.sh
```

This will start the server, run the client example, and check the output for expected results.

## Client Example

A client example is provided in `src/client/index.ts`. You can run it with:

```
npm run client
```

This will demonstrate how to use the gRPC API by:
1. Creating a user
2. Logging in
3. Getting all users
4. Getting a user by ID
5. Creating a task
6. Getting all tasks
7. Updating a task
8. Updating a user
9. Deleting a task
10. Logging out
11. Deleting a user

## Protocol Buffers

The API is defined in the `proto/task_management.proto` file. This file defines the services, RPCs, and message types used by the API.

You can compile the proto file manually with:

```
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=service=grpc-node,mode=grpc-js:./src/proto --js_out=import_style=commonjs,binary:./src/proto --grpc_out=grpc_js:./src/proto ./proto/*.proto
```

## Error Handling

The API uses gRPC status codes for error handling. Each response includes a status object with a code and message.

## License

This project is licensed under the ISC License.
