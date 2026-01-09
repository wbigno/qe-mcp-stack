FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY mcps/code-analysis/javascript-code-analyzer/package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY mcps/code-analysis/javascript-code-analyzer/ ./

# Expose port
EXPOSE 8204

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8204/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Run the service
CMD ["node", "src/index.js"]
