# gRPC Task Management API

A complete gRPC implementation that provides identical functionality to a REST API. This project demonstrates how to create a gRPC service that is functionally equivalent to an existing REST API, with comprehensive testing to prove equivalence.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

## Quick Start

**One-command setup and start:**

```bash
./start.sh
```

This will automatically:
1. Install dependencies
2. Build the project  
3. Start the gRPC server on port 50051

## Usage

### Test the API

Run the client example to see all operations:
```bash
npm run client
```

### Run comprehensive tests

Verify REST/gRPC equivalence with automated tests:
```bash
npm run test:all
```
Expected result: `Steps completed: 5/5 🎉 All tests passed!`

### Database setup (for full testing)

**Start MariaDB database:**

```bash
./start-db.sh
```

This starts the MariaDB database needed for REST API comparison tests.

**Then run full tests:**
```bash
npm run test:all
```

## API Overview

The gRPC service provides these operations:

**Authentication:**
- Login (get JWT token)
- Logout

**Users:**  
- Create, Read, Update, Delete users
- Get all users

**Tasks:**
- Create, Read, Update, Delete tasks  
- Get all tasks with filtering

All operations include proper error handling and validation.

## Manual Setup (if needed)

If you prefer manual setup:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Available Commands

| Command | Description |
|---------|-------------|
| `./start.sh` | **Quick start** - install, build, and run gRPC only |
| `./start-db.sh` | **Database** - start MariaDB for full testing |
| `npm run client` | Run client example |
| `npm run test:all` | Complete test suite |
| `npm start` | Start gRPC server |
| `npm run build` | Build the project |

## Project Achievement

This project successfully demonstrates complete functional equivalence between REST and gRPC APIs, verified by 28 automated tests that prove identical behavior across all operations.

## License

This project is licensed under the ISC License.
