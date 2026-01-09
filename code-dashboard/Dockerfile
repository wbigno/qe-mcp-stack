FROM nginx:alpine

# Copy static files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY modelSelector.js /usr/share/nginx/html/

# Fix permissions for all static files
RUN chmod -R 644 /usr/share/nginx/html/*.html /usr/share/nginx/html/*.js /usr/share/nginx/html/*.css

# Create nginx configuration for port 8081
RUN echo 'server { \
    listen 8081; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location /code-dashboard/ { \
        rewrite ^/code-dashboard/(.*)$ /$1 last; \
    } \
    location /api/ { \
        proxy_pass http://orchestrator:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 8081
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8081/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
