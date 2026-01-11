FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY mcps/integration/browser-control-mcp ./mcps/integration/browser-control-mcp

# Install dependencies
ENV HUSKY=0
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/integration/browser-control-mcp && npm install

# Build browser-control-mcp TypeScript
RUN cd mcps/integration/browser-control-mcp && npm run build

# Set working directory to MCP
WORKDIR /app/mcps/integration/browser-control-mcp

# Expose ports (HTTP and WebSocket)
EXPOSE 8103 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://127.0.0.1:8103/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the service
CMD ["npm", "start"]
