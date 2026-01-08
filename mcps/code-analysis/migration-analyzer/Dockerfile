FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY mcps/code-analysis/migration-analyzer ./mcps/code-analysis/migration-analyzer

# Install dependencies
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/code-analysis/migration-analyzer && npm install

# Set working directory to MCP
WORKDIR /app/mcps/code-analysis/migration-analyzer

# Expose port
EXPOSE 8203

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8203/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["npm", "start"]
