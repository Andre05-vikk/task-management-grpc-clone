const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if .env.example exists
const envExamplePath = path.join(__dirname, '.env.example');
if (!fs.existsSync(envExamplePath)) {
  console.error('.env.example file not found. Please create it first.');
  process.exit(1);
}

// Read .env.example content
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
const envVars = {};

// Parse .env.example to extract variable names
envExampleContent.split('\n').forEach(line => {
  // Skip comments and empty lines
  if (line.startsWith('#') || line.trim() === '') return;
  
  const [key, defaultValue] = line.split('=');
  if (key) envVars[key.trim()] = defaultValue || '';
});

// Function to ask for each environment variable
function askForEnvVars(keys, index = 0, result = {}) {
  if (index >= keys.length) {
    // All variables collected, create .env file
    createEnvFile(result);
    return;
  }
  
  const key = keys[index];
  const defaultValue = envVars[key];
  
  rl.question(`Enter value for ${key} [${defaultValue}]: `, (answer) => {
    // Use provided answer or default value
    result[key] = answer.trim() || defaultValue;
    askForEnvVars(keys, index + 1, result);
  });
}

// Function to create .env file
function createEnvFile(variables) {
  let envContent = '';
  
  // Build .env content
  Object.entries(variables).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });
  
  // Write to .env file
  fs.writeFileSync(path.join(__dirname, '.env'), envContent);
  
  console.log('\n.env file created successfully!');
  console.log('You can now run your server with: npm run dev');
  
  rl.close();
}

console.log('Creating .env file based on .env.example template...');
console.log('Press Enter to accept default values in brackets []\n');

// Start asking for environment variables
askForEnvVars(Object.keys(envVars));
