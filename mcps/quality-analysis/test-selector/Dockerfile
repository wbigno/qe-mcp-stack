FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* turbo.json ./
COPY packages ./packages
COPY mcps/quality-analysis/test-selector ./mcps/quality-analysis/test-selector

# Install dependencies
ENV HUSKY=0
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/quality-analysis/test-selector && npm install

# Set working directory to MCP
WORKDIR /app/mcps/quality-analysis/test-selector

# Expose port
EXPOSE 8302

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8302/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["npm", "start"]
