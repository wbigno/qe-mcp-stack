# Docker Setup Guide

## Overview

This guide covers running the QE MCP Stack locally using Docker Compose.

## Prerequisites

- Docker >= 20.10.0
- Docker Compose >= 2.0.0
- 8GB RAM minimum
- 20GB disk space

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/qe-mcp-stack.git
cd qe-mcp-stack
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start All Services

```bash
docker compose up -d
```

### 3. Verify Services

```bash
docker compose ps
```

Expected output:
```
NAME                    STATUS
qe-orchestrator         Up (healthy)
qe-azure-devops         Up (healthy)
qe-risk-analyzer        Up (healthy)
qe-dashboard            Up (healthy)
...
```

### 4. Access Services

- Dashboard: http://localhost:5173
- Swagger Hub: http://localhost:8000
- Orchestrator: http://localhost:3000

## Individual Service Management

### Start Specific Services

```bash
# Start orchestrator and dependencies only
docker compose up orchestrator

# Start specific MCP
docker compose up azure-devops
```

### Stop Services

```bash
# Stop all
docker compose down

# Stop specific service
docker compose stop azure-devops
```

### Restart Service

```bash
docker compose restart orchestrator
```

## Viewing Logs

### All Services

```bash
docker compose logs -f
```

### Specific Service

```bash
docker compose logs -f orchestrator
docker compose logs -f azure-devops
```

### Last 100 Lines

```bash
docker compose logs --tail=100 orchestrator
```

## Rebuilding Services

After code changes:

```bash
# Rebuild all
docker compose build

# Rebuild specific service
docker compose build orchestrator

# Rebuild without cache
docker compose build --no-cache orchestrator

# Rebuild and restart
docker compose up -d --build
```

## Service Configuration

### docker-compose.yml Structure

```yaml
services:
  orchestrator:
    build: ./orchestrator
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - orchestrator-data:/app/data
    networks:
      - qe-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Volume Mounts

Application repositories are mounted read-only:

```yaml
volumes:
  - /Users/yourname/dev/Core:/mnt/apps/Core:ro
  - /Users/yourname/dev/Payments:/mnt/apps/Payments:ro
```

Update paths in `.env`:
```bash
CORE_REPO_PATH=/Users/yourname/dev/Core
PAYMENTS_REPO_PATH=/Users/yourname/dev/Payments
```

## Networking

All services communicate via `qe-network`:

```yaml
networks:
  qe-network:
    driver: bridge
```

Services use Docker DNS:
```
http://azure-devops:8100/health
http://orchestrator:3000/health
```

## Data Persistence

Volumes for persistent data:

```yaml
volumes:
  orchestrator-data:
  azure-devops-data:
  risk-analyzer-data:
```

### Backup Volumes

```bash
docker run --rm -v qe-mcp-stack_orchestrator-data:/data \
  -v $(pwd):/backup alpine tar czf /backup/orchestrator-backup.tar.gz -C /data .
```

### Restore Volumes

```bash
docker run --rm -v qe-mcp-stack_orchestrator-data:/data \
  -v $(pwd):/backup alpine tar xzf /backup/orchestrator-backup.tar.gz -C /data
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # External:Internal
```

### Service Not Healthy

```bash
# Check logs
docker compose logs orchestrator

# Check health check
docker compose ps
docker inspect qe-orchestrator | grep -A 10 Health
```

### Out of Memory

```bash
# Check Docker memory
docker stats

# Increase Docker memory
# Docker Desktop → Preferences → Resources → Memory
```

### Clean Everything

```bash
# Stop and remove containers, networks, volumes
docker compose down -v

# Remove all images
docker compose down --rmi all

# System prune
docker system prune -a --volumes
```

## Development Workflow

### Live Reload

For development with live reload:

```yaml
# docker-compose.dev.yml
services:
  orchestrator:
    build: ./orchestrator
    volumes:
      - ./orchestrator/src:/app/src
    command: npm run dev
```

Run with:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Debug Mode

```yaml
services:
  orchestrator:
    environment:
      - DEBUG=true
    ports:
      - "9229:9229"  # Node.js debugger
    command: node --inspect=0.0.0.0:9229 dist/index.js
```

## Performance Optimization

### Multi-Stage Builds

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### Layer Caching

Order Dockerfile commands from least to most frequently changing:

```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

## Related Documentation

- [Azure Setup](azure-setup.md)
- [Environment Variables](environment-variables.md)
- [Architecture Overview](../architecture/system-overview.md)
