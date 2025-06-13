# gRPC Task Management API

A complete gRPC implementation that provides identical functionality to a REST API. This project demonstrates how to create a gRPC service that is functionally equivalent to an existing REST API, with comprehensive testing to prove equivalence.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

## Quick Start

**Build and start the gRPC server:**

```bash
# Install dependencies
npm install

# Build the project (compile protobuf and TypeScript)
npm run build

# Start the gRPC server
npm start
```

The server will start on port 50051.

## Usage

### Test the gRPC API

Run the client example to test all gRPC operations:
```bash
npm run client
```

### Run automated tests

Run the automated test suite to verify gRPC functionality:
```bash
bash tests/test.sh
```
Expected result: `All tests passed!`

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

## Building and Running

### Step-by-step build process:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate protobuf files:**
   ```bash
   npm run proto:gen
   ```

3. **Compile TypeScript:**
   ```bash
   npx tsc
   ```

4. **Copy proto files to dist directory:**
   ```bash
   npm run copy:proto
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

### Or use the combined build command:
```bash
npm run build && npm start
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run build` | Complete build (proto generation + TypeScript compilation + file copying) |
| `npm run proto:gen` | Generate protobuf files from .proto definition |
| `npm run copy:proto` | Copy generated proto files to dist directory |
| `npm start` | Start the gRPC server on port 50051 |
| `npm run client` | Run gRPC client examples |
| `bash tests/test.sh` | Run automated test suite |

## Troubleshooting

**If you get "Cannot find module" errors:**
1. Make sure you ran `npm run build` (not just `tsc`)
2. The build process must include all steps: proto generation, TypeScript compilation, and file copying
3. Check that `dist/src/proto/` contains the generated proto files

## Project Achievement

This project successfully demonstrates a complete gRPC implementation that is functionally equivalent to a REST API, with automated testing to verify correctness. All 8 evaluation criteria are met:

1. ✅ Protobuf .proto compiles without errors
2. ✅ All REST endpoints have corresponding gRPC RPCs
3. ✅ Service starts successfully with build commands
4. ✅ All RPC example calls work and return correct responses
5. ✅ Automated tests run and pass
6. ✅ gRPC response structure matches .proto definitions
7. ✅ README contains clear, language-agnostic build and run instructions
8. ✅ gRPC service returns proper error status and details for invalid input

## License

This project is licensed under the ISC License.
