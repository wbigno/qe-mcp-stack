FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY dotnet-coverage-analyzer/package*.json ./
RUN npm ci --only=production
COPY dotnet-coverage-analyzer .
EXPOSE 3002
CMD ["npm", "start"]
