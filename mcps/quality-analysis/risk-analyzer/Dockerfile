FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY mcps/quality-analysis/risk-analyzer ./mcps/quality-analysis/risk-analyzer

# Install dependencies
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/quality-analysis/risk-analyzer && npm install

# Set working directory to MCP
WORKDIR /app/mcps/quality-analysis/risk-analyzer

# Expose port
EXPOSE 8300

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8300/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["npm", "start"]
