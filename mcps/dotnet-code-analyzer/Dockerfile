FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY dotnet-code-analyzer/package*.json ./
RUN npm ci --only=production
COPY dotnet-code-analyzer .
EXPOSE 3001
CMD ["npm", "start"]
