FROM nginx:alpine

# Copy static files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY *.js /usr/share/nginx/html/
COPY cache.js /usr/share/nginx/html/
COPY emptyState.js /usr/share/nginx/html/
COPY modelSelector.js /usr/share/nginx/html/
COPY analysisPanel.js /usr/share/nginx/html/
COPY appSelector.js /usr/share/nginx/html/
COPY pushPreviewModal.js /usr/share/nginx/html/
COPY sprintSelector.js /usr/share/nginx/html/

# Create nginx configuration for port 5173
RUN echo 'server { \
    listen 5173; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 5173
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5173/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
