FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY mcps/shared ./mcps/shared
COPY mcps/quality-analysis/integration-mapper ./mcps/quality-analysis/integration-mapper

# Install dependencies
ENV HUSKY=0
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/quality-analysis/integration-mapper && npm install

# Set working directory to MCP
WORKDIR /app/mcps/quality-analysis/integration-mapper

# Expose port
EXPOSE 8301

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8301/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["npm", "start"]
