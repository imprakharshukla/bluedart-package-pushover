# Use Node.js image as base
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy TypeScript files
COPY . .

# Build TypeScript files
RUN pnpm run build

# Create cron job file
RUN echo "*/2 * * * * node /app/dist/index.js" > /etc/crontabs/root

# Start cron service
CMD ["crond", "-f"]
