import * as grpc from '@grpc/grpc-js';
import path from 'path';
import { authServiceHandlers } from './services/auth-service';
import { userServiceHandlers } from './services/user-service';
import { taskServiceHandlers } from './services/task-service';

// Import generated proto services
import * as services from '../proto/task_management_grpc_pb';
import * as protoDescriptor from '../proto/task_management_pb';

const PORT = process.env.PORT || 50051;

function main() {
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
