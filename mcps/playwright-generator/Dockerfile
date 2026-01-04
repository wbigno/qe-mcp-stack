FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY shared /app/shared
COPY playwright-generator/package*.json ./
RUN npm ci --only=production
COPY playwright-generator .
EXPOSE 3005
CMD ["npm", "start"]
