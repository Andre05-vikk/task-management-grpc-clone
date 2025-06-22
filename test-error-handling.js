const grpc = require('@grpc/grpc-js');
const messages = require('./dist/src/proto/task_management_pb');
const services = require('./dist/src/proto/task_management_grpc_pb');

const authClient = new services.AuthServiceClient('localhost:50051', grpc.credentials.createInsecure());

console.log('Testing error handling...');

// Test 1: Invalid login (empty credentials)
console.log('\n1. Testing invalid login (empty credentials):');
const loginReq = new messages.LoginRequest();
loginReq.setUsername('');
loginReq.setPassword('');

authClient.login(loginReq, (err, response) => {
    if (err) {
        console.log('✅ Login error correctly handled:');
        console.log(`  Code: ${err.code} (${Object.keys(grpc.status).find(key => grpc.status[key] === err.code)})`);
        console.log(`  Details: ${err.details}`);
    } else {
        console.log('❌ Error should have been thrown');
    }
    
    // Test 2: Invalid task creation (missing data)
    console.log('\n2. Testing invalid task creation (missing data):');
    const taskClient = new services.TaskServiceClient('localhost:50051', grpc.credentials.createInsecure());
    const taskReq = new messages.CreateTaskRequest();
    taskReq.setTitle(''); // Empty title
    taskReq.setUserid('invalid'); // Invalid user ID
    
    taskClient.createTask(taskReq, (err, response) => {
        if (err) {
            console.log('✅ Task creation error correctly handled:');
            console.log(`  Code: ${err.code} (${Object.keys(grpc.status).find(key => grpc.status[key] === err.code)})`);
            console.log(`  Details: ${err.details}`);
        } else {
            console.log('❌ Error should have been thrown');
        }
        
        console.log('\n🎯 Error handling tests completed');
        process.exit(0);
    });
});
