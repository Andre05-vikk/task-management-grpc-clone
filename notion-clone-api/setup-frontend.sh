#!/bin/bash

# Script to set up the frontend

echo "Setting up the frontend..."

# Navigate to the frontend directory
cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Return to the root directory
cd ..

echo "Frontend setup complete!"
echo "You can now run the full stack application with: npm run dev-full"
