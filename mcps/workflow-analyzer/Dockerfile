FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY workflow-analyzer/package*.json ./
RUN npm ci --only=production
COPY workflow-analyzer .
EXPOSE 3010
CMD ["npm", "start"]
