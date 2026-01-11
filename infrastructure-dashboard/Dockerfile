FROM nginx:alpine

# Copy pre-built assets
COPY dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 8082

CMD ["nginx", "-g", "daemon off;"]
