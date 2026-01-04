FROM node:18-alpine
WORKDIR /app
COPY shared /app/shared
COPY integration-mapper/package*.json ./
RUN npm ci --only=production
COPY integration-mapper .
EXPOSE 3008
CMD ["npm", "start"]
