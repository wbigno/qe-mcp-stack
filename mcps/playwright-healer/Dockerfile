FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY shared /app/shared
COPY playwright-healer/package*.json ./
RUN npm ci --only=production
COPY playwright-healer .
EXPOSE 3006
CMD ["npm", "start"]
