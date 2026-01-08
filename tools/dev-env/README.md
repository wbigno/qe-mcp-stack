# Development Environment Setup

Scripts and utilities for setting up and managing the local development environment.

## Quick Setup

Run the setup script to configure your development environment:

```bash
./tools/dev-env/setup.sh
```

This will:
1. Check prerequisites (Node.js, Docker, etc.)
2. Install dependencies
3. Build shared packages
4. Copy environment template
5. Verify Docker setup
6. Start services

## Scripts

### setup.sh

Initial environment setup:

```bash
./tools/dev-env/setup.sh [options]

Options:
  --skip-install    Skip npm install
  --skip-build      Skip package build
  --skip-docker     Skip Docker setup
  --no-start        Don't start services after setup
```

### verify.sh

Verify environment is correctly configured:

```bash
./tools/dev-env/verify.sh

Checking prerequisites...
✓ Node.js v18.17.0 installed
✓ npm v9.8.1 installed
✓ Docker v24.0.6 installed
✓ Docker Compose v2.21.0 installed

Checking configuration...
✓ .env file exists
✓ Repository paths configured
✓ All required environment variables set

Checking services...
✓ Orchestrator (http://localhost:3000/health)
✓ Dashboard (http://localhost:5173)
✓ Azure DevOps MCP (http://localhost:8100/health)
✓ Code Analyzer MCP (http://localhost:8200/health)

All checks passed! ✨
```

### start.sh

Start services in development mode:

```bash
./tools/dev-env/start.sh [service]

# Start all services
./tools/dev-env/start.sh

# Start specific service
./tools/dev-env/start.sh orchestrator
./tools/dev-env/start.sh dashboard
```

### stop.sh

Stop running services:

```bash
./tools/dev-env/stop.sh [service]

# Stop all services
./tools/dev-env/stop.sh

# Stop specific service
./tools/dev-env/stop.sh orchestrator
```

### logs.sh

View logs from services:

```bash
./tools/dev-env/logs.sh [service] [options]

# Follow all logs
./tools/dev-env/logs.sh -f

# View specific service logs
./tools/dev-env/logs.sh orchestrator -f

# Last 100 lines
./tools/dev-env/logs.sh --tail=100
```

### clean.sh

Clean build artifacts and caches:

```bash
./tools/dev-env/clean.sh [options]

Options:
  --node-modules    Remove node_modules directories
  --build           Remove build outputs (dist, build)
  --docker          Clean Docker images and volumes
  --all             Remove everything (nuclear option)

# Clean build outputs
./tools/dev-env/clean.sh --build

# Full clean including node_modules
./tools/dev-env/clean.sh --all
```

## Configuration

### Environment Variables

The setup script will create `.env` from `.env.example`. Required variables:

```bash
# Azure DevOps
AZURE_DEVOPS_ORG=your-org
AZURE_DEVOPS_PAT=your-pat
AZURE_DEVOPS_PROJECT=your-project

# Anthropic API
ANTHROPIC_API_KEY=your-api-key

# Application paths
CORE_REPO_PATH=/path/to/Core
CORE_COMMON_REPO_PATH=/path/to/Core.Common
PAYMENTS_REPO_PATH=/path/to/Payments
PRECARE_REPO_PATH=/path/to/PreCare
THIRD_PARTY_REPO_PATH=/path/to/ThirdPartyIntegrations
```

### Repository Paths

Update paths in `.env` to point to your local application repositories:

```bash
# Edit .env
vi .env

# Or use the helper
./tools/dev-env/configure-repos.sh
```

## Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Check what's using a port
lsof -i :3000

# Kill process using port
kill -9 $(lsof -t -i:3000)
```

### Permission Issues

If you encounter permission errors:

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
```

### Docker Issues

```bash
# Restart Docker
sudo systemctl restart docker  # Linux
# or use Docker Desktop UI (macOS/Windows)

# Clean Docker system
docker system prune -a --volumes
```

### Build Failures

```bash
# Clean and rebuild
./tools/dev-env/clean.sh --all
./tools/dev-env/setup.sh
```

## Daily Workflow

### Starting Work

```bash
# Pull latest changes
git pull

# Update dependencies if package.json changed
npm install

# Start services
npm start

# Or use docker
docker-compose up -d
```

### During Development

```bash
# Run specific service in dev mode
npm run dev:orchestrator
npm run dev:dashboard

# Run tests
npm run test

# Lint code
npm run lint
```

### Ending Work

```bash
# Stop services
npm run docker:down

# Or
./tools/dev-env/stop.sh
```

## IDE Integration

### VS Code

The repository includes VS Code settings in `.vscode/`:
- Recommended extensions
- Debug configurations
- Workspace settings

Open the repository in VS Code:

```bash
code .
```

Install recommended extensions when prompted.

### JetBrains IDEs

Import the project:
1. Open IntelliJ/WebStorm
2. File → Open
3. Select the repository root
4. Trust the project when prompted

## Docker Desktop Settings

Recommended settings for Docker Desktop:

- **Memory**: At least 4GB
- **CPUs**: At least 2 cores
- **Disk Space**: At least 20GB

Adjust in Docker Desktop → Preferences → Resources.

## Scripts Reference

All scripts are located in `tools/dev-env/`:

| Script | Purpose |
|--------|---------|
| setup.sh | Initial environment setup |
| verify.sh | Verify configuration |
| start.sh | Start services |
| stop.sh | Stop services |
| logs.sh | View logs |
| clean.sh | Clean artifacts |
| configure-repos.sh | Configure repository paths |
| health-check.sh | Check service health |

## Related Documentation

- [Root README](../../README.md)
- [Docker Setup](../../docs/deployment/docker-setup.md)
- [Environment Variables](../../docs/deployment/environment-variables.md)
