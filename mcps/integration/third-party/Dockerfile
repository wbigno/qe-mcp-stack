FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* turbo.json ./
COPY packages ./packages
COPY mcps/integration/third-party ./mcps/integration/third-party

# Install dependencies
ENV HUSKY=0
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/integration/third-party && npm install

# Set working directory to MCP
WORKDIR /app/mcps/integration/third-party

# Expose port
EXPOSE 8101

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8101/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["npm", "start"]
