FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* turbo.json ./
COPY packages ./packages
COPY mcps/shared ./mcps/shared
COPY mcps/playwright/playwright-generator ./mcps/playwright/playwright-generator

# Install dependencies
ENV HUSKY=0
RUN npm install

# Build shared packages and this MCP
RUN npm run build:packages || true
RUN cd mcps/playwright/playwright-generator && npm install

# Set working directory to MCP
WORKDIR /app/mcps/playwright/playwright-generator

# Expose port
EXPOSE 8400

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8400/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["npm", "start"]
