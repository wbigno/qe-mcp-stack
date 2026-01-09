FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production --ignore-scripts

# Copy application code
COPY . .

# Create logs directory and set ownership
RUN mkdir -p /app/logs && \
    chown -R node:node /app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Run as non-root user
USER node

CMD ["node", "src/index.js"]
