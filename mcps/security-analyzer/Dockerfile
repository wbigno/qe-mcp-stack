FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY security-analyzer/package*.json ./
RUN npm ci --only=production
COPY security-analyzer .
EXPOSE 3012
CMD ["npm", "start"]
