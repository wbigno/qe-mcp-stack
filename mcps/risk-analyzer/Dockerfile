FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY risk-analyzer/package*.json ./
RUN npm ci --only=production
COPY risk-analyzer .
EXPOSE 3009
CMD ["npm", "start"]
