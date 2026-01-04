FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY shared /app/shared
COPY playwright-analyzer/package*.json ./
RUN npm ci --only=production
COPY playwright-analyzer .
EXPOSE 3004
CMD ["npm", "start"]
