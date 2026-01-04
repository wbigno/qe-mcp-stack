FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY architecture-analyzer/package*.json ./
RUN npm ci --only=production
COPY architecture-analyzer .
EXPOSE 3007
CMD ["npm", "start"]
