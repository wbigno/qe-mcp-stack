# QE MCP Stack - Quick Reference

## 🚀 Startup & Shutdown

```bash
# First time setup
chmod +x *.sh
./generate-lockfiles.sh  # ONE TIME: Generate package-lock.json files

# Start everything
./start.sh

# Stop everything
docker compose down

# Restart a service
docker compose restart orchestrator

# View logs
docker compose logs -f
docker compose logs -f code-analyzer  # specific service
```

## 🔍 Health & Status

```bash
# Overall health
curl http://localhost:3000/health

# MCP status
curl http://localhost:3000/api/mcp/status

# Check specific MCP
curl http://localhost:3000/api/mcp/health/codeAnalyzer
```

## 📊 Code Analysis

```bash
# Scan all apps
curl -X POST http://localhost:3000/api/analysis/code-scan

# Scan specific app
curl -X POST http://localhost:3000/api/analysis/code-scan \
  -H "Content-Type: application/json" \
  -d '{"apps": ["App1"]}'

# Get coverage
curl -X POST http://localhost:3000/api/analysis/coverage \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'

# Identify test gaps
curl -X POST http://localhost:3000/api/analysis/test-gaps \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'
```

## 📝 Azure DevOps

```bash
# Pull current sprint stories
curl -X POST http://localhost:3000/api/ado/pull-stories \
  -H "Content-Type: application/json" \
  -d '{"sprint": "Sprint 45"}'

# Pull specific stories
curl -X POST http://localhost:3000/api/ado/pull-stories \
  -H "Content-Type: application/json" \
  -d '{"workItemIds": [12345, 12346, 12347]}'

# Analyze requirements
curl -X POST http://localhost:3000/api/ado/analyze-requirements \
  -H "Content-Type: application/json" \
  -d '{"storyIds": [12345]}'

# Generate test cases
curl -X POST http://localhost:3000/api/ado/generate-test-cases \
  -H "Content-Type: application/json" \
  -d '{"storyId": 12345, "updateADO": false}'

# Complete workflow (does everything)
curl -X POST http://localhost:3000/api/ado/complete-workflow \
  -H "Content-Type: application/json" \
  -d '{"storyId": 12345, "updateADO": false}'
```

## 🧪 Test Generation

```bash
# Generate unit tests
curl -X POST http://localhost:3000/api/tests/generate-unit-tests \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'

# Generate integration tests
curl -X POST http://localhost:3000/api/tests/generate-integration-tests \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'

# Analyze critical UI paths
curl -X POST http://localhost:3000/api/tests/analyze-ui-paths \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'

# Generate Playwright tests
curl -X POST http://localhost:3000/api/tests/generate-playwright-tests \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'

# Heal Playwright tests
curl -X POST http://localhost:3000/api/tests/heal-playwright-tests \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'
```

## 🌐 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Orchestrator | http://localhost:3000 | Main API & Dashboard |
| Code Analyzer | http://localhost:3001 | .NET code scanning |
| Coverage Analyzer | http://localhost:3002 | Test coverage analysis |
| Azure DevOps | http://localhost:3003 | ADO integration |
| Playwright Analyzer | http://localhost:3004 | UI path analysis |
| Playwright Generator | http://localhost:3005 | Test generation |
| Playwright Healer | http://localhost:3006 | Test healing |

## 📁 Important Files

```
.env                        # Environment variables (ROOT, not config/)
config/apps.json            # Your .NET applications config
config/ado-config.json      # Azure DevOps settings
docker-compose.yml          # Service definitions
start.sh                    # Main startup script
setup-data-dirs.sh          # Data directory setup (auto-run by start.sh)
manage-data.sh              # Data backup/management utility
generate-lockfiles.sh       # Generate package-lock.json (run once)
data/                       # Persistent data storage (auto-created)
```

## 🛠️ Troubleshooting

```bash
# Service not healthy
docker compose restart service-name

# Can't access mounted volumes
# → Docker Desktop → Settings → Resources → File Sharing
# → Add /Users/williambigno/Desktop/git

# View detailed logs
docker compose logs --tail=100 service-name

# Rebuild service
docker compose build service-name
docker compose up -d service-name

# Clean restart
docker compose down -v
docker compose up -d
```

## 💡 Common Patterns

### Daily Workflow
```bash
# 1. Start services
./scripts/start.sh

# 2. Scan code for changes
curl -X POST http://localhost:3000/api/analysis/code-scan

# 3. Pull today's stories
curl -X POST http://localhost:3000/api/ado/pull-stories \
  -d '{"sprint": "Current"}'

# 4. Analyze and generate tests
curl -X POST http://localhost:3000/api/ado/complete-workflow \
  -d '{"storyId": STORY_ID}'
```

### Test Gap Analysis
```bash
# 1. Scan code
curl -X POST http://localhost:3000/api/analysis/code-scan \
  -d '{"apps": ["App1"]}'

# 2. Get gaps
curl -X POST http://localhost:3000/api/analysis/test-gaps \
  -d '{"app": "App1"}'

# 3. Generate missing tests
curl -X POST http://localhost:3000/api/tests/generate-unit-tests \
  -d '{"app": "App1"}'
```

### Playwright Setup
```bash
# 1. Analyze critical paths
curl -X POST http://localhost:3000/api/tests/analyze-ui-paths \
  -d '{"app": "App1"}'

# 2. Plan architecture
curl -X POST http://localhost:3000/api/tests/plan-playwright-architecture \
  -d '{"app": "App1"}'

# 3. Generate tests
curl -X POST http://localhost:3000/api/tests/generate-playwright-tests \
  -d '{"app": "App1"}'
```

## 📞 Need Help?

1. Check logs: `docker compose logs -f`
2. Verify health: `curl http://localhost:3000/health`
3. Check configuration files in `config/`
4. See full docs in `docs/GETTING_STARTED.md`
