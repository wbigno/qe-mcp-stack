FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY data-model-analyzer/package*.json ./
RUN npm ci --only=production
COPY data-model-analyzer .
EXPOSE 3013
CMD ["npm", "start"]
