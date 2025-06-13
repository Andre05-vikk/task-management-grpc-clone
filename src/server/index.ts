import * as grpc from '@grpc/grpc-js';
import path from 'path';
import { authServiceHandlers } from './services/auth-service';
import { userServiceHandlers } from './services/user-service';
import { taskServiceHandlers } from './services/task-service';
import { testConnection } from './data/database';
import { setupDatabase } from './data/setup-db';

// Import generated proto services
import * as services from '../proto/task_management_grpc_pb';
import * as protoDescriptor from '../proto/task_management_pb';

const PORT = process.env.PORT || 50051;

async function main() {
  // Setup database tables first
  const dbSetup = await setupDatabase();
  if (!dbSetup) {
    console.error('Failed to setup database tables. Exiting...');
    process.exit(1);
  }

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  const server = new grpc.Server();

  // Register services
  server.addService(
    services.AuthServiceService as unknown as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>,
    authServiceHandlers as unknown as grpc.UntypedServiceImplementation
  );
  server.addService(
    services.UserServiceService as unknown as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>,
    userServiceHandlers as unknown as grpc.UntypedServiceImplementation
  );
  server.addService(
    services.TaskServiceService as unknown as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>,
    taskServiceHandlers as unknown as grpc.UntypedServiceImplementation
  );

  // Start server
  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Failed to bind server:', err);
        return;
      }

      server.start();
      console.log(`Server running on port ${port}`);
    }
  );
}

main();
