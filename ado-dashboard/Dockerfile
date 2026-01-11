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

# Fix permissions for all static files
RUN chmod -R 644 /usr/share/nginx/html/*.html /usr/share/nginx/html/*.js /usr/share/nginx/html/*.css

# Copy nginx configuration with CSP headers for development
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 5173
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:5173/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
