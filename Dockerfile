FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm install -g typescript && npx tsc

# Expose the gRPC port
EXPOSE 50051

# Start the server
CMD ["npm", "start"]
