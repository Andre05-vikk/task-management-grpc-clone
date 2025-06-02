FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application (proto files are pre-generated)
RUN npm run build

# Expose the gRPC port
EXPOSE 50051

# Start the server
CMD ["npm", "start"]
