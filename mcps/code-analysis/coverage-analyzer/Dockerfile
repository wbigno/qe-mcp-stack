FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY mcps/code-analysis/coverage-analyzer ./mcps/code-analysis/coverage-analyzer

# Install dependencies
ENV HUSKY=0
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/code-analysis/coverage-analyzer && npm install

# Set working directory to MCP
WORKDIR /app/mcps/code-analysis/coverage-analyzer

# Expose port
EXPOSE 8201

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8201/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["npm", "start"]
