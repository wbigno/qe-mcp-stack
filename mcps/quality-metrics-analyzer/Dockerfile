FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY quality-metrics-analyzer/package*.json ./
RUN npm ci --only=production
COPY quality-metrics-analyzer .
EXPOSE 3011
CMD ["npm", "start"]
