# QE MCP Stack - Complete Setup Guide

This guide explains the complete setup process in the correct order, with explanations of all files and scripts.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Setup Steps](#setup-steps)
4. [Scripts Explained](#scripts-explained)
5. [Configuration Files](#configuration-files)
6. [First Run](#first-run)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

✅ **Required:**
- macOS
- Docker Desktop (installed and running)
- .NET applications on your Mac
- Azure DevOps account with access
- Anthropic API key OR OpenAI API key

✅ **Nice to have:**
- Basic terminal/command line knowledge
- Understanding of Docker concepts

---

## Project Structure

```
qe-mcp-stack/                    # ROOT directory
├── .env                         # ⚠️ IN ROOT! Environment variables
├── .gitignore                   # Git ignore rules
├── docker-compose.yml           # Docker service definitions
│
├── start.sh                     # 🚀 Main startup script
├── setup-data-dirs.sh           # 📁 Data directory creator
├── manage-data.sh               # 💾 Data management utility
├── generate-lockfiles.sh        # 🔧 Package lock generator
├── check-docker-compose.sh      # 🔍 Docker version checker
│
├── config/                      # Configuration files
│   ├── apps.json                # Your app definitions
│   ├── ado-config.json          # Azure DevOps settings
│   └── .env.example             # Template for .env
│
├── orchestrator/                # Main Node.js application
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── mcps/                        # Individual MCP services
│   ├── code-analyzer/
│   ├── coverage-analyzer/
│   ├── azure-devops/
│   └── [11 more services]/
│
├── data/                        # 📊 Persistent storage (auto-created)
│   ├── orchestrator/
│   ├── code-analyzer/
│   └── [13 more directories]/
│
├── docs/                        # Documentation
│   ├── GETTING_STARTED.md
│   ├── QUICK_REFERENCE.md
│   ├── PROJECT_SUMMARY.md
│   ├── PERSISTENT_STORAGE_SETUP.md
│   ├── QUICK_FIX_GUIDE.md
│   └── SETUP_GUIDE.md (this file)
│
└── README.md                    # Project overview
```

---

## Setup Steps

### Step 1: Place the Project

Place the entire `qe-mcp-stack/` directory in your development folder:

```bash
# Option 1: Dev folder
/Users/*****/Dev/git/qe-mcp-stack/

# Option 2: Desktop folder
/Users/*****/Desktop/git/qe-mcp-stack/
```

### Step 2: Create Environment File

**⚠️ CRITICAL:** The `.env` file goes in the **ROOT** directory, NOT in `config/`!

```bash
cd /Users/*****/Dev/git/qe-mcp-stack

# Copy the example file
cp config/.env.example .env

# Edit the file
nano .env  # or use your preferred editor
```

Required values in `.env`:

```bash
# Azure DevOps (Required)
ADO_PAT=your_actual_personal_access_token
ADO_ORG=*****
ADO_PROJECT=test

# AI Provider (Required - choose one)
ANTHROPIC_API_KEY=sk-ant-api03-...
# OR
OPENAI_API_KEY=sk-...

# Application Paths (must match docker-compose.yml)
APP1_PATH=/mnt/apps/patient-portal
APP2_PATH=/mnt/apps/app2
APP3_PATH=/mnt/apps/app3
APP4_PATH=/mnt/apps/app4

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Feature Flags
ENABLE_AUTO_HEALING=true
ENABLE_TEST_GENERATION=true
ENABLE_COVERAGE_ANALYSIS=true
```

**How to get Azure DevOps PAT:**
1. Go to https://dev.azure.com/*****
2. Click User Settings (top right) → Personal Access Tokens
3. Create token with scopes: Work Items (Read & Write), Code (Read)
4. Copy token immediately (you won't see it again)

**How to get Anthropic API key:**
1. Go to https://console.anthropic.com
2. Sign in or create account
3. Navigate to API Keys section
4. Create new key
5. Copy the key

### Step 3: Configure Applications

Edit `config/apps.json` to match your actual applications:

```json
{
  "applications": [
    {
      "name": "App1",
      "displayName": "Patient Portal",
      "path": "/mnt/apps/patient-portal",
      "localPath": "/Users/*****/dev/git/patient-portal",
      "type": "dotnet",
      "framework": "net8.0",
      "testFramework": "xUnit",
      "excludePaths": [
        "bin", "obj", "packages", "node_modules", ".vs", "TestResults"
      ],
      "includePatterns": [
        "**/*.cs", "**/*.csproj"
      ],
      "integrations": [],
      "priority": "high"
    },
    {
      "name": "App2",
      "displayName": "Financial Processing",
      "path": "/mnt/apps/app2",
      "localPath": "/Users/*****/Desktop/git/app2",
      "type": "dotnet",
      "framework": "net8.0",
      "testFramework": "xUnit",
      "excludePaths": [
        "bin", "obj", "packages", "node_modules", ".vs", "TestResults"
      ],
      "includePatterns": [
        "**/*.cs", "**/*.csproj"
      ],
      "integrations": ["Financial"],
      "priority": "high"
    }
    // Add App3 and App4 similarly
  ],
  "settings": {
    "parallelAnalysis": true,
    "maxConcurrency": 2,
    "cacheResults": true,
    "cacheTTL": 3600
  }
}
```

**Important fields:**
- `path`: Path inside Docker (matches docker-compose.yml mount point)
- `localPath`: Actual path on your Mac where the code lives
- `framework`: Your .NET version (net8.0, net6.0, etc.)
- These paths MUST match the volume mounts in docker-compose.yml!

### Step 4: Configure Azure DevOps

Edit `config/ado-config.json`:

```json
{
  "organization": "*****",
  "project": "test",
  "apiVersion": "7.0",
  "baseUrl": "https://dev.azure.com",
  "workItemTypes": [
    "User Story",
    "Bug",
    "Task",
    "Feature"
  ],
  "testCase": {
    "areaPath": "test\\Testing",
    "defaultTags": ["AutoGenerated", "QE"],
    "template": "Test Case"
  }
}
```

### Step 5: Verify docker-compose.yml Paths

Open `docker-compose.yml` and verify the volume mounts match your `apps.json`:

```yaml
# Example from code-analyzer service:
volumes:
  # These local paths must exist on your Mac
  - /Users/*****/dev/git/patient-portal:/mnt/apps/patient-portal:ro
  - /Users/*****/Desktop/git/app2:/mnt/apps/app2:ro
  - /Users/*****/Desktop/git/app3:/mnt/apps/app3:ro
  - /Users/*****/Desktop/git/app4:/mnt/apps/app4:ro
  - ./config:/app/config:ro
  - ./data/code-analyzer:/app/data
```

Make sure these paths actually exist:
```bash
ls -la /Users/*****/dev/git/patient-portal
ls -la /Users/*****/Desktop/git/app2
# etc.
```

### Step 6: Make Scripts Executable

```bash
cd /Users/*****/Dev/git/qe-mcp-stack
chmod +x *.sh
```

This makes all shell scripts executable:
- `start.sh`
- `setup-data-dirs.sh`
- `manage-data.sh`
- `generate-lockfiles.sh`
- `check-docker-compose.sh`

### Step 7: Generate Package Lock Files

**ONE TIME ONLY** - Generate `package-lock.json` for all MCP services:

```bash
./generate-lockfiles.sh
```

This script will:
1. Find all MCP directories with `package.json` files
2. Run `npm install` in each directory
3. Generate `package-lock.json` files
4. Show you a summary of what was created

**Why is this needed?**
- Docker builds use `npm ci` which requires `package-lock.json`
- This ensures reproducible builds
- You only need to run this once (unless you add new MCPs)

### Step 8: Start the Stack

```bash
./start.sh
```

On first run, this script will:
1. ✅ Check Docker is running
2. ✅ Verify `.env` exists in root
3. ✅ Create data directories (via `setup-data-dirs.sh`)
4. ✅ Build all Docker images
5. ✅ Start all 14 services
6. ✅ Show you status and URLs

**On subsequent runs:**
- Data directories already exist (won't recreate)
- Docker images are cached (builds faster)
- Just starts the services

---

## Scripts Explained

### `start.sh` - Main Startup Script

**When to run:** Every time you want to start the stack

**What it does:**
1. Checks if Docker is running
2. Verifies `.env` file exists (in root!)
3. On first run: calls `setup-data-dirs.sh`
4. Builds Docker images
5. Starts all services
6. Shows service URLs

**Usage:**
```bash
./start.sh
```

---

### `setup-data-dirs.sh` - Data Directory Setup

**When to run:** Automatically called by `start.sh` on first run

**What it does:**
1. Creates `data/` directory with 14 subdirectories
2. Adds `.gitkeep` files to preserve structure
3. Updates `.gitignore` to exclude data contents
4. Creates `data/README.md` documentation

**Manual usage (rarely needed):**
```bash
./setup-data-dirs.sh
```

**When you'd run it manually:**
- If you deleted the `data/` directory
- If you're troubleshooting storage issues

---

### `manage-data.sh` - Data Management Utility

**When to run:** As needed for data management

**What it does:**
- `status`: Shows disk usage and file counts
- `backup`: Creates timestamped backup
- `restore`: Restores from backup
- `clear`: Clears all or specific service data
- `list`: Lists data directory contents
- `verify`: Checks directory structure

**Usage:**
```bash
# Check data usage
./manage-data.sh status

# Create backup (recommended weekly)
./manage-data.sh backup

# Clear cache for one service
./manage-data.sh clear code-analyzer

# Clear all data
./manage-data.sh clear

# Restore from backup
./manage-data.sh restore backups/backup-file.tar.gz

# List all data
./manage-data.sh list

# Verify structure
./manage-data.sh verify
```

---

### `generate-lockfiles.sh` - Package Lock Generator

**When to run:** ONE TIME before first build

**What it does:**
1. Finds all MCP directories
2. Runs `npm install` in each
3. Generates `package-lock.json` files
4. Shows summary

**Usage:**
```bash
./generate-lockfiles.sh
```

**When you'd run it again:**
- After adding new MCP services
- After updating package.json in any MCP
- If you deleted node_modules or package-lock.json

---

### `check-docker-compose.sh` - Docker Version Checker

**When to run:** For troubleshooting only

**What it does:**
Checks if you have Docker Compose V1 (`docker-compose`) or V2 (`docker compose`)

**Usage:**
```bash
./check-docker-compose.sh
```

**When you'd use it:**
- If seeing "docker-compose: command not found" errors
- To verify Docker Compose installation

---

## Configuration Files

### `.env` (Root Directory)

**Location:** `/Users/*****/Dev/git/qe-mcp-stack/.env`

**Purpose:** Environment variables for all services

**Contains:**
- Azure DevOps credentials
- API keys (Anthropic/OpenAI)
- Application paths
- Feature flags
- Logging settings

**⚠️ Security:** Never commit this file to git! (It's in `.gitignore`)

---

### `config/apps.json`

**Purpose:** Define your .NET applications

**Contains:**
- Application name and display name
- Docker path and local path
- .NET framework version
- Test framework
- File patterns to include/exclude
- Integration systems
- Priority level

---

### `config/ado-config.json`

**Purpose:** Azure DevOps configuration

**Contains:**
- Organization and project names
- API version
- Work item types
- Required/optional fields
- Query definitions
- Test case settings

---

### `docker-compose.yml`

**Purpose:** Define all Docker services

**Contains:**
- 14 service definitions (orchestrator + 13 MCPs)
- Port mappings
- Volume mounts
- Environment variables
- Network configuration
- Restart policies

**Services:**
1. Orchestrator (3000)
2. Code Analyzer (3001)
3. Coverage Analyzer (3002)
4. Azure DevOps (3003)
5. Playwright Analyzer (3004)
6. Playwright Generator (3005)
7. Playwright Healer (3006)
8. Architecture Analyzer (3007)
9. Integration Mapper (3008)
10. Risk Analyzer (3009)
11. Workflow Analyzer (3010)
12. Quality Metrics Analyzer (3011)
13. Security Analyzer (3012)
14. Data Model Analyzer (3013)

---

## First Run

### Complete First-Time Sequence

```bash
# 1. Navigate to project
cd /Users/*****/Dev/git/qe-mcp-stack

# 2. Verify .env exists in ROOT
ls -la .env

# 3. Make scripts executable
chmod +x *.sh

# 4. Generate lock files (ONE TIME)
./generate-lockfiles.sh

# 5. Start everything
./start.sh

# Wait about 2-3 minutes for first build...
```

### Verify Everything Works

```bash
# 1. Check all services are running
docker compose ps

# Should show 14 services with "Up" status

# 2. Check orchestrator health
curl http://localhost:3000/health

# Should return JSON with all MCPs "healthy"

# 3. Check MCP status
curl http://localhost:3000/api/mcp/status

# 4. Test code analysis
curl -X POST http://localhost:3000/api/analysis/code-scan \
  -H "Content-Type: application/json" \
  -d '{"apps": ["App1"]}'
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f orchestrator
docker compose logs -f code-analyzer

# Last 100 lines
docker compose logs --tail=100 orchestrator
```

---

## Troubleshooting

### Issue: "Environment variables not set"

**Symptom:**
```
WARN[0000] The "ADO_PAT" variable is not set. Defaulting to a blank string.
```

**Solution:**
```bash
# Check .env location
ls -la .env

# If in wrong location, move it
mv config/.env .env

# Verify contents
cat .env
```

---

### Issue: "Cannot find package-lock.json"

**Symptom:**
```
npm error The `npm ci` command can only install with an existing package-lock.json
```

**Solution:**
```bash
# Generate lock files
./generate-lockfiles.sh

# Rebuild
docker compose build
```

---

### Issue: "version is obsolete"

**Symptom:**
```
WARN[0000] docker-compose.yml: the attribute `version` is obsolete
```

**Solution:** This is just a warning, safe to ignore. The docker-compose.yml file has been updated to remove the version field.

---

### Issue: Services show "Exited" status

**Symptom:**
```bash
docker compose ps
# Shows services with "Exited" instead of "Up"
```

**Solution:**
```bash
# Check logs for errors
docker compose logs service-name

# Common fixes:
# 1. Missing .env
ls -la .env

# 2. Wrong volume paths
# Check docker-compose.yml volume mounts exist

# 3. Port conflicts
# Check if ports 3000-3013 are in use
lsof -i :3000

# Restart specific service
docker compose restart service-name
```

---

### Issue: "Permission denied" on scripts

**Symptom:**
```bash
./start.sh
-bash: ./start.sh: Permission denied
```

**Solution:**
```bash
chmod +x *.sh
./start.sh
```

---

### Issue: Can't access volumes in Docker

**Symptom:** Services start but can't read your code

**Solution:**
1. Open Docker Desktop
2. Settings → Resources → File Sharing
3. Add these paths:
   - `/Users/*****/dev/git`
   - `/Users/*****/Desktop/git`
4. Apply & Restart

---

## Daily Usage

### Starting Your Day

```bash
cd /Users/*****/Dev/git/qe-mcp-stack
./start.sh
```

### During Work

Services run in the background. Use the API or view logs as needed:

```bash
# View what's happening
docker compose logs -f orchestrator

# Check status
curl http://localhost:3000/health
```

### End of Day

```bash
docker compose down
```

This stops all services but preserves data in `./data/`

---

## Weekly Maintenance

### Create Backup

```bash
# Backup your analysis data
./manage-data.sh backup

# Backups stored in ./backups/
```

### Check Disk Usage

```bash
# See how much space data is using
./manage-data.sh status

# Or manually
du -sh data/
```

---

## Summary

### Files in ROOT Directory

| File | Purpose | When to Use |
|------|---------|-------------|
| `.env` | Environment variables | Edit once during setup |
| `docker-compose.yml` | Service definitions | Usually don't edit |
| `start.sh` | Start everything | Every time you start |
| `setup-data-dirs.sh` | Create data dirs | Auto-run by start.sh |
| `manage-data.sh` | Manage data | As needed |
| `generate-lockfiles.sh` | Create lock files | Run once |
| `check-docker-compose.sh` | Check Docker | Troubleshooting only |

### Directories

| Directory | Purpose | Created When |
|-----------|---------|--------------|
| `config/` | Configuration files | Part of project |
| `orchestrator/` | Main application | Part of project |
| `mcps/` | MCP services | Part of project |
| `docs/` | Documentation | Part of project |
| `data/` | Persistent storage | Auto-created first run |

### First Time Checklist

- [ ] Place project in correct location
- [ ] Create `.env` in ROOT (not config/)
- [ ] Edit `.env` with real credentials
- [ ] Update `config/apps.json`
- [ ] Update `config/ado-config.json`
- [ ] Verify paths in `docker-compose.yml`
- [ ] Make scripts executable (`chmod +x *.sh`)
- [ ] Generate lock files (`./generate-lockfiles.sh`)
- [ ] Start stack (`./start.sh`)
- [ ] Verify health (`curl http://localhost:3000/health`)

---

## Getting Help

### Quick Diagnostics

```bash
# 1. Check Docker
docker --version
docker info

# 2. Check .env location
ls -la .env
cat .env | head -5

# 3. Check services
docker compose ps

# 4. Check logs
docker compose logs --tail=50

# 5. Check health
curl http://localhost:3000/health
```

### Documentation

- This file: Complete setup guide
- `GETTING_STARTED.md`: Beginner-friendly walkthrough
- `QUICK_REFERENCE.md`: Quick command reference
- `PERSISTENT_STORAGE_SETUP.md`: Data storage details
- `QUICK_FIX_GUIDE.md`: Common fixes
- `PROJECT_SUMMARY.md`: Overview and architecture

---

**You're all set!** 🎉

Once you've completed the setup steps, you'll have a fully functional QE MCP Stack ready for automated testing workflows.
