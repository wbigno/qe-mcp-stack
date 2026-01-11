# QE MCP Stack - Setup Guide

## Quick Start

For first-time setup, just run:

```bash
./setup.sh
```

That's it! The script will guide you through the entire setup process.

## Setup Scripts Overview

### Primary Scripts

#### `setup.sh` ⭐ **RECOMMENDED**
**Complete one-command setup for new users**

```bash
# First time setup (with prompts)
./setup.sh

# Quick restart (skip build, skip health checks)
./setup.sh --quick

# Start with existing images
./setup.sh --skip-build

# Show help
./setup.sh --help
```

**Features:**
- ✅ Checks all prerequisites (Docker, Node.js, etc.)
- ✅ Creates and validates configuration files
- ✅ Sets up persistent data directories
- ✅ Builds Docker images
- ✅ Starts all services
- ✅ Waits for health checks with retry logic
- ✅ Displays all service URLs
- ✅ Optional health check tests
- ✅ Command-line flags for flexibility
- ✅ Error recovery and cleanup

#### `start.sh`
**Quick restart for configured environments**

Use this when you already have everything set up and just want to restart services.

```bash
./start.sh
```

This is equivalent to `./setup.sh --quick` but without the setup validation steps.

### Utility Scripts

#### `test-all-mcps.sh`
**Health check and MCP validation**

```bash
./test-all-mcps.sh
```

Tests all 15 MCPs to ensure they're running and responding correctly.

#### `manage-data.sh`
**Comprehensive data management and backup utility**

```bash
./manage-data.sh status              # Check data usage and statistics
./manage-data.sh backup              # Create timestamped backups
./manage-data.sh restore <file>      # Restore from backup
./manage-data.sh clear [service]     # Clear all or specific service data
./manage-data.sh list                # List all data directories
./manage-data.sh verify              # Verify data structure
```

**What it backs up:**
- Local data directories (`./data/third-party/`, `./data/test-plan-manager/`)
- Docker named volumes (`orchestrator-data`, `azure-devops-data`, `dashboard-data`)

See the [Data Management & Backup Best Practices](#data-management--backup-best-practices) section for detailed backup strategies.

## Setup Options Comparison

| Scenario | Command | What It Does |
|----------|---------|--------------|
| **First time user** | `./setup.sh` | Full guided setup with validation |
| **Quick restart** | `./setup.sh --quick` | Skip build, start immediately |
| **After code changes** | `./setup.sh` | Rebuild and restart |
| **Already configured** | `./start.sh` | Simple restart (legacy) |
| **Rebuild one service** | `docker compose up -d --build <service>` | Rebuild specific service |

## Configuration Files

### `.env` (Root directory)
Main environment configuration:

```bash
# Azure DevOps
AZURE_DEVOPS_PAT=your_pat_token
AZURE_DEVOPS_ORG=your_org
AZURE_DEVOPS_PROJECT=your_project

# API Keys (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### `config/apps.json`
Application paths for code analysis:

```json
{
  "apps": [
    {
      "name": "Core",
      "path": "/path/to/your/Core"
    }
  ]
}
```

### `config/ado-config.json`
Azure DevOps specific configuration:

```json
{
  "organization": "your_org",
  "project": "your_project"
}
```

## Common Workflows

### First Time Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd qe-mcp-stack

# 2. Run setup (will prompt for configuration)
./setup.sh

# 3. Edit configuration if needed
nano .env

# 4. Restart to apply changes
./setup.sh --skip-build
```

### Daily Development

```bash
# Start services
./setup.sh --quick

# View logs
docker compose logs -f

# Restart a specific service
docker compose restart azure-devops

# Stop everything
docker compose down
```

### After Making Code Changes

```bash
# Rebuild and restart
./setup.sh

# Or rebuild specific service
docker compose up -d --build code-analyzer
```

### Troubleshooting

```bash
# Check all services health
./test-all-mcps.sh

# Check Docker status
docker compose ps

# View service logs
docker compose logs -f orchestrator

# Restart from scratch
docker compose down
./setup.sh
```

## Prerequisites

- **Docker Desktop** (required) - v20.10 or later
- **Docker Compose** (included with Docker Desktop)
- **Node.js** (optional) - v18 or later for local development
- **npm** (optional) - comes with Node.js

## What Gets Created

The setup script creates:

```
qe-mcp-stack/
├── .env                    # Your environment config (DO NOT COMMIT)
├── data/                   # Persistent data storage
│   ├── third-party/        # Third-party integration cache
│   └── test-plan-manager/  # Test plans and templates
├── config/                 # Configuration files
└── [Docker volumes]        # orchestrator-data, azure-devops-data, etc.
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_DEVOPS_PAT` | Yes | Personal Access Token |
| `AZURE_DEVOPS_ORG` | Yes | Organization name |
| `AZURE_DEVOPS_PROJECT` | Yes | Project name |
| `OPENAI_API_KEY` | No | For AI-powered analysis |
| `ANTHROPIC_API_KEY` | No | For Claude integration |

## Port Reference

| Service | Port | Description |
|---------|------|-------------|
| Orchestrator | 3000 | API Gateway |
| Swagger Hub | 8000 | API Documentation |
| ADO Dashboard | 5173 | Azure DevOps Dashboard |
| Code Dashboard | 8081 | Code Analysis Dashboard |
| Infrastructure | 8082 | Infrastructure Dashboard |
| Azure DevOps MCP | 8100 | ADO Integration |
| Third Party MCP | 8101 | External APIs |
| Test Plan Manager | 8102 | Test Planning |
| Browser Control | 8103 | Browser Automation |
| Code Analyzer | 8200 | Code Quality |
| Coverage Analyzer | 8201 | Test Coverage |
| Migration Analyzer | 8203 | Migration Tracking |
| JS Code Analyzer | 8204 | JavaScript Analysis |
| JS Coverage | 8205 | JS Test Coverage |
| Risk Analyzer | 8300 | Risk Assessment |
| Integration Mapper | 8301 | Integration Mapping |
| Test Selector | 8302 | Test Selection |
| Playwright Generator | 8400 | Test Generation |
| Playwright Analyzer | 8401 | Test Analysis |
| Playwright Healer | 8402 | Test Fixing |

## Getting Help

```bash
# Show setup help
./setup.sh --help

# Check MCP documentation
open http://localhost:8000

# View logs
docker compose logs -f

# Check service health
curl http://localhost:3000/health
```

## Data Management & Backup Best Practices

The QE MCP Stack includes a comprehensive data management utility (`manage-data.sh`) for handling backups, restores, and data maintenance.

### Understanding Data Storage

The stack uses two data persistence strategies:

**1. Local Data Directories** (`./data/`)
- `third-party/` - Third-party integration cache (Stripe, external APIs)
- `test-plan-manager/` - Test plan templates and generated plans
- **Location:** Directly in your project folder
- **Visibility:** Easy to browse and inspect
- **Backup:** Included in `./backups/local-data-backup-*.tar.gz`

**2. Docker Named Volumes**
- `orchestrator-data` - Orchestration state and workflow history
- `azure-devops-data` - Cached ADO queries and work item data
- `dashboard-data` - Dashboard configuration and preferences
- **Location:** Managed by Docker (`/var/lib/docker/volumes/` on Linux, Docker Desktop storage on macOS/Windows)
- **Visibility:** Requires Docker commands to inspect
- **Backup:** Individual files `./backups/qe-mcp-stack_*-data-backup-*.tar.gz`

### Backup Commands

#### Create a Backup

```bash
./manage-data.sh backup
```

This creates timestamped backups of:
- All local data directories → `local-data-backup-YYYYMMDD_HHMMSS.tar.gz`
- All Docker named volumes → `qe-mcp-stack_[volume]-backup-YYYYMMDD_HHMMSS.tar.gz`

**Example output:**
```
Creating backup of local data...
Source: ./data
Target: ./backups/local-data-backup-20260111_143022.tar.gz

✅ Local data backup created
File: ./backups/local-data-backup-20260111_143022.tar.gz (2.4M)

Creating backups of Docker named volumes...
  Backing up qe-mcp-stack_orchestrator-data...
  ✓ qe-mcp-stack_orchestrator-data (856K)
  Backing up qe-mcp-stack_azure-devops-data...
  ✓ qe-mcp-stack_azure-devops-data (1.2M)
  Backing up qe-mcp-stack_dashboard-data...
  ✓ qe-mcp-stack_dashboard-data (124K)

✅ Backup completed!
```

#### Check Status

```bash
./manage-data.sh status
```

Shows:
- Total local data size
- Per-service disk usage
- File counts per service
- Docker named volume sizes
- Recently modified files (last 24 hours)

#### Restore from Backup

```bash
./manage-data.sh restore ./backups/local-data-backup-20260111_143022.tar.gz
```

**WARNING:** This stops services, overwrites all data, and restarts services.

#### Clear Data

```bash
# Clear all data (prompts for confirmation)
./manage-data.sh clear

# Clear specific service
./manage-data.sh clear third-party

# List contents before clearing
./manage-data.sh list
```

#### Verify Data Structure

```bash
./manage-data.sh verify
```

Checks that all expected directories and volumes exist.

### Backup Frequency Recommendations

#### Development Environment

**Recommended schedule:**
- **Before major changes:** Always backup before refactoring, migrations, or infrastructure changes
- **Weekly backups:** Sunday nights for consistent baseline
- **Before pulling updates:** Backup before `git pull` and `docker compose build`

```bash
# Quick backup before risky operations
./manage-data.sh backup && git pull && ./setup.sh
```

#### Production/Staging Environment

**Recommended schedule:**
- **Daily backups:** Automated at 2 AM
- **Pre-deployment:** Before every deployment
- **Weekly full backup:** Keep for 4 weeks
- **Monthly archive:** Keep for 12 months

### Automated Backup Scheduling

#### Using Cron (Linux/macOS)

**1. Create backup wrapper script:**

```bash
# Create ~/qe-mcp-backups.sh
cat > ~/qe-mcp-backups.sh << 'EOF'
#!/bin/bash
cd /Users/williambigno/dev/git/qe-mcp-stack
./manage-data.sh backup
echo "Backup completed at $(date)" >> ~/qe-mcp-backup.log
EOF

chmod +x ~/qe-mcp-backups.sh
```

**2. Add to crontab:**

```bash
crontab -e
```

**Daily at 2 AM:**
```cron
0 2 * * * ~/qe-mcp-backups.sh
```

**Weekly on Sundays at 3 AM:**
```cron
0 3 * * 0 ~/qe-mcp-backups.sh
```

**Before business hours (Mon-Fri at 6 AM):**
```cron
0 6 * * 1-5 ~/qe-mcp-backups.sh
```

#### Using Task Scheduler (Windows)

**1. Create backup script:** `C:\qe-mcp-backups.bat`

```batch
@echo off
cd C:\dev\qe-mcp-stack
bash manage-data.sh backup
echo Backup completed at %date% %time% >> C:\qe-mcp-backup.log
```

**2. Open Task Scheduler:**
- Create Task → General tab: Name it "QE MCP Daily Backup"
- Triggers tab: New → Daily at 2:00 AM
- Actions tab: New → Start a program → Browse to `C:\qe-mcp-backups.bat`
- Conditions tab: Uncheck "Start only if on AC power" (for laptops)

### Backup Retention Policies

#### Recommended Retention Strategy

```bash
# Keep structure:
./backups/
├── daily/      # Last 7 days
├── weekly/     # Last 4 weeks
├── monthly/    # Last 12 months
└── archive/    # Critical milestones
```

**Implementation script:** Create `./scripts/rotate-backups.sh`

```bash
#!/bin/bash
# Backup rotation script

BACKUP_DIR="./backups"
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"
MONTHLY_DIR="$BACKUP_DIR/monthly"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"

# Move root backups to daily/
mv "$BACKUP_DIR"/*.tar.gz "$DAILY_DIR/" 2>/dev/null

# Keep last 7 daily backups
find "$DAILY_DIR" -name "*.tar.gz" -mtime +7 -delete

# Promote Saturday backups to weekly (keep 4 weeks)
if [ "$(date +%u)" = "6" ]; then
    cp "$DAILY_DIR"/*.tar.gz "$WEEKLY_DIR/" 2>/dev/null
    find "$WEEKLY_DIR" -name "*.tar.gz" -mtime +28 -delete
fi

# Promote last-day-of-month backups to monthly (keep 12 months)
if [ "$(date +%d)" = "01" ]; then
    cp "$DAILY_DIR"/*.tar.gz "$MONTHLY_DIR/" 2>/dev/null
    find "$MONTHLY_DIR" -name "*.tar.gz" -mtime +365 -delete
fi

echo "Backup rotation completed at $(date)"
```

**Add to cron after daily backup:**
```cron
0 2 * * * ~/qe-mcp-backups.sh && cd /path/to/qe-mcp-stack && ./scripts/rotate-backups.sh
```

#### Manual Retention Management

```bash
# Delete backups older than 30 days
find ./backups -name "*.tar.gz" -mtime +30 -delete

# Archive important milestone
mkdir -p ./backups/archive
cp ./backups/local-data-backup-20260111_143022.tar.gz ./backups/archive/pre-v2-migration.tar.gz

# Check backup disk usage
du -sh ./backups/
du -sh ./backups/*/ | sort -h
```

### Disaster Recovery Procedures

#### Scenario 1: Corrupted Service Data

```bash
# 1. Identify the problem service
./manage-data.sh status
docker compose logs -f <service-name>

# 2. Clear only that service's data
./manage-data.sh clear <service-name>

# 3. Restart the service
docker compose restart <service-name>

# 4. Verify recovery
./test-all-mcps.sh
```

#### Scenario 2: Complete Data Loss

```bash
# 1. Stop all services
docker compose down

# 2. Restore from most recent backup
./manage-data.sh restore ./backups/local-data-backup-YYYYMMDD_HHMMSS.tar.gz

# 3. Manually restore Docker volumes (if needed)
for volume in orchestrator-data azure-devops-data dashboard-data; do
    docker volume rm qe-mcp-stack_${volume}
    docker volume create qe-mcp-stack_${volume}
    docker run --rm -v qe-mcp-stack_${volume}:/data -v $(pwd)/backups:/backup alpine \
        tar xzf /backup/qe-mcp-stack_${volume}-backup-YYYYMMDD_HHMMSS.tar.gz -C /data
done

# 4. Start services
docker compose up -d

# 5. Verify all MCPs
./test-all-mcps.sh
```

#### Scenario 3: Moving to New Machine

```bash
# On old machine:
./manage-data.sh backup
cp -r ./backups /path/to/external/drive/

# On new machine:
git clone <repo-url>
cd qe-mcp-stack
cp -r /path/to/external/drive/backups ./
./manage-data.sh restore ./backups/local-data-backup-YYYYMMDD_HHMMSS.tar.gz
```

### Backup Verification Best Practices

#### 1. Test Restore Regularly

```bash
# Create test environment
mkdir -p ~/qe-mcp-test-restore
cd ~/qe-mcp-test-restore

# Clone repo
git clone <repo-url> .

# Restore from backup
cp ~/qe-mcp-stack/backups/local-data-backup-*.tar.gz ./backups/
./manage-data.sh restore ./backups/local-data-backup-*.tar.gz

# Start and verify
./setup.sh --skip-build
./test-all-mcps.sh

# Cleanup
cd ~ && rm -rf ~/qe-mcp-test-restore
```

**Recommended frequency:** Monthly test restore

#### 2. Verify Backup Integrity

```bash
# Check backup files aren't corrupted
for backup in ./backups/*.tar.gz; do
    echo "Verifying: $backup"
    if tar tzf "$backup" > /dev/null 2>&1; then
        echo "  ✓ Valid"
    else
        echo "  ✗ CORRUPTED!"
    fi
done
```

#### 3. Monitor Backup Size

```bash
# Track backup growth over time
echo "$(date +%Y-%m-%d)  $(du -sh ./backups | cut -f1)" >> backup-size-history.txt

# Alert if backup size grows abnormally
CURRENT_SIZE=$(du -sb ./backups | cut -f1)
THRESHOLD=10737418240  # 10 GB in bytes

if [ "$CURRENT_SIZE" -gt "$THRESHOLD" ]; then
    echo "WARNING: Backup size exceeds 10 GB!"
    ./manage-data.sh status
fi
```

#### 4. Validate Backup Content

```bash
# List backup contents without extracting
tar tzf ./backups/local-data-backup-20260111_143022.tar.gz | head -20

# Verify critical directories exist in backup
tar tzf ./backups/local-data-backup-*.tar.gz | grep -E "data/third-party|data/test-plan-manager"
```

### Security Best Practices

#### 1. Protect Backup Files

```bash
# Set restrictive permissions
chmod 600 ./backups/*.tar.gz

# Encrypt sensitive backups (optional)
tar czf - data/ | gpg -c > ./backups/encrypted-backup-$(date +%Y%m%d).tar.gz.gpg

# Decrypt and restore
gpg -d ./backups/encrypted-backup-20260111.tar.gz.gpg | tar xz
```

#### 2. Offsite Backup Storage

**Option 1: Cloud Storage (AWS S3)**
```bash
# Install AWS CLI
brew install awscli  # macOS
apt-get install awscli  # Linux

# Configure AWS credentials
aws configure

# Sync backups to S3
aws s3 sync ./backups/ s3://your-bucket/qe-mcp-backups/ --exclude "*" --include "*.tar.gz"

# Automate with cron
0 3 * * * ~/qe-mcp-backups.sh && aws s3 sync /path/to/backups/ s3://your-bucket/qe-mcp-backups/
```

**Option 2: Network Storage (NAS/SMB)**
```bash
# Mount network drive
mount -t cifs //nas-server/backups /mnt/nas-backups -o username=user

# Copy backups
cp ./backups/*.tar.gz /mnt/nas-backups/qe-mcp/

# Automate
0 4 * * * ~/qe-mcp-backups.sh && cp /path/to/backups/*.tar.gz /mnt/nas-backups/qe-mcp/
```

**Option 3: Git LFS (for small backups)**
```bash
# Initialize Git LFS for backup files
git lfs install
git lfs track "*.tar.gz"
git add .gitattributes
git add backups/*.tar.gz
git commit -m "Add backup files"
git push
```

#### 3. Backup .env and Config Files

**IMPORTANT:** Never commit `.env` to git! Back it up separately:

```bash
# Backup critical config files (encrypted)
tar czf - .env config/apps.json config/ado-config.json | \
    gpg -c > ./backups/config-backup-$(date +%Y%m%d).tar.gz.gpg

# Add to .gitignore
echo "backups/config-backup-*.tar.gz.gpg" >> .gitignore
```

### Quick Reference

| Task | Command | Frequency |
|------|---------|-----------|
| **Create backup** | `./manage-data.sh backup` | Daily (automated) |
| **Check disk usage** | `./manage-data.sh status` | Before/after operations |
| **Restore backup** | `./manage-data.sh restore <file>` | When needed |
| **Clear service data** | `./manage-data.sh clear <service>` | Troubleshooting |
| **Verify structure** | `./manage-data.sh verify` | After setup/restore |
| **Test restore** | Full restore in test env | Monthly |
| **Rotate old backups** | `find backups/ -mtime +30 -delete` | Weekly |
| **Offsite sync** | `aws s3 sync backups/ s3://bucket/` | Daily (automated) |

### Troubleshooting Backups

#### Backup Command Fails

```bash
# Check disk space
df -h

# Verify Docker is running
docker ps

# Check permissions
ls -la ./backups/
chmod 755 ./backups/
```

#### Restore Doesn't Fix Issue

```bash
# Restore Docker volumes manually
docker volume ls | grep qe-mcp-stack

# Remove and recreate volume
docker compose down
docker volume rm qe-mcp-stack_orchestrator-data
docker volume create qe-mcp-stack_orchestrator-data

# Restore volume from backup
docker run --rm -v qe-mcp-stack_orchestrator-data:/data -v $(pwd)/backups:/backup alpine \
    tar xzf /backup/qe-mcp-stack_orchestrator-data-backup-*.tar.gz -C /data
```

#### Backup Files Growing Too Large

```bash
# Identify large files
./manage-data.sh list
du -sh ./data/*

# Clear old cache files
./manage-data.sh clear third-party

# Implement retention policy (see above)
./scripts/rotate-backups.sh
```

## Tips

1. **Use `--quick` for restarts:** `./setup.sh --quick` is much faster than rebuilding
2. **Check logs early:** If something fails, run `docker compose logs <service>` immediately
3. **Don't commit .env:** Your `.env` file contains secrets - it's git-ignored by default
4. **Backup before major changes:** Run `./manage-data.sh backup` before refactoring, migrations, or updates
5. **Keep Docker Desktop running:** The stack won't work if Docker isn't running
6. **Automate backups:** Set up cron/Task Scheduler for daily automated backups
7. **Test your backups:** Monthly test restore ensures backups actually work when needed

## Migration from Old Scripts

If you were using the old setup process:

**Old way:**
```bash
./setup-data-dirs.sh      # Created data directories
./generate-lockfiles.sh   # Generated package-lock.json (took 10+ minutes)
./start.sh                # Started services
```

**New way:**
```bash
./setup.sh  # Does everything in one command!
```

**What changed:**
- ✅ `setup-data-dirs.sh` - Functionality now built into `setup.sh`
- ✅ `generate-lockfiles.sh` - Removed! Docker handles this automatically
- ✅ `start.sh` - Still available for quick restarts, but `setup.sh --quick` is recommended

The new `setup.sh` is faster (skips unnecessary lockfile generation), smarter (validates config), and provides better feedback throughout the setup process.
