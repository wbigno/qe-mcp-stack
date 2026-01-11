FROM node:18-alpine

WORKDIR /app

# Copy root package files and turbo config
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY mcps/integration/azure-devops ./mcps/integration/azure-devops

# Install dependencies (HUSKY=0 skips git hooks in Docker)
ENV HUSKY=0
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/integration/azure-devops && npm run build

# Set working directory to MCP
WORKDIR /app/mcps/integration/azure-devops

# Expose port
EXPOSE 8100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8100/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["npm", "start"]
