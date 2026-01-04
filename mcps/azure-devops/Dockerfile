FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY azure-devops/package*.json ./
RUN npm ci --only=production
COPY azure-devops .
EXPOSE 3003
CMD ["npm", "start"]
