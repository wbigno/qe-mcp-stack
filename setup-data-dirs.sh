#!/bin/bash
# QE MCP Stack - Data Directory Setup Script
# This script creates all necessary persistent data directories

set -e

echo "🔧 Setting up persistent data directories for QE MCP Stack..."
echo ""

# Create main data directory
mkdir -p data

# Create data directories for MCP services that use local ./data/ volumes
# Note: Most services use Docker named volumes instead (orchestrator-data, azure-devops-data, etc.)
echo "Creating data directories..."

services=(
    "third-party"
    "test-plan-manager"
)

for service in "${services[@]}"; do
    mkdir -p "data/$service"
    echo "  ✓ Created: data/$service"
done

echo ""
echo "Creating .gitkeep files to preserve empty directories..."

for service in "${services[@]}"; do
    touch "data/$service/.gitkeep"
done

echo ""
echo "Updating .gitignore..."

# Create or update .gitignore
if [ ! -f ".gitignore" ]; then
    touch .gitignore
fi

# Add data directory to .gitignore if not already present
if ! grep -q "^data/\*" .gitignore 2>/dev/null; then
    cat >> .gitignore << 'EOF'

# QE MCP Stack - Persistent Data
data/*
!data/.gitkeep
!data/*/.gitkeep

# Keep the data directory structure but ignore contents
EOF
    echo "  ✓ Added data/ to .gitignore"
else
    echo "  ✓ .gitignore already configured"
fi

echo ""
echo "Creating data directory README..."

cat > data/README.md << 'EOF'
# QE MCP Stack - Persistent Data Storage

This directory contains local persistent data for specific QE MCP services. Most services use Docker named volumes (orchestrator-data, azure-devops-data, etc.) which are managed by Docker.

## Directory Structure

```
data/
├── third-party/          # Third-party integration cache (Stripe, external APIs)
└── test-plan-manager/    # Test plan templates and generated plans
```

## Docker Volume Strategy

The QE MCP Stack uses two data persistence strategies:

### 1. Docker Named Volumes (Managed by Docker)
Most core services use named volumes for better isolation and Docker management:
- `orchestrator-data` - Orchestration state and workflow history
- `azure-devops-data` - Cached ADO queries and work item data
- `dashboard-data` - Dashboard configuration and preferences

**Location**: `/var/lib/docker/volumes/` on Linux, Docker Desktop storage on macOS/Windows

**Backup Named Volumes**:
```bash
docker run --rm -v qe-mcp-stack_orchestrator-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/orchestrator-backup.tar.gz -C /data .
```

### 2. Local ./data/ Directories (This Directory)
Some services use local directories for easier access:
- `third-party/` - Integration cache and test data
- `test-plan-manager/` - Test plans and templates

## What Gets Stored

### third-party/
- Stripe test customer data and payment method cache
- External API response caching for faster tests
- Mock data for third-party integrations

### test-plan-manager/
- Test plan templates
- Generated test plans with risk assessments
- Test coverage mapping data

## Benefits

- ⚡ **Faster Analysis**: Cached results mean instant responses for repeated queries
- 📊 **Historical Tracking**: See how metrics change over time
- 💾 **Persistent Artifacts**: Keep generated tests and documentation
- 🔄 **Survive Restarts**: Data persists across container restarts and rebuilds

## Maintenance

### Backup Local Data
Regularly backup this directory:
```bash
tar -czf qe-mcp-data-backup-$(date +%Y%m%d).tar.gz data/
```

### Backup All Data (Including Named Volumes)
```bash
# Backup named volumes
docker run --rm -v qe-mcp-stack_orchestrator-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/orchestrator-backup.tar.gz -C /data .

docker run --rm -v qe-mcp-stack_azure-devops-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/azure-devops-backup.tar.gz -C /data .

# Backup local data
tar -czf data-local-backup-$(date +%Y%m%d).tar.gz data/
```

### Clear Cache
To clear all cached local data and start fresh:
```bash
# WARNING: This deletes all local persistent data!
rm -rf data/*/
./setup-data-dirs.sh  # Recreate directories
```

### Clear Specific Service
```bash
rm -rf data/third-party/*
```

### View Disk Usage
```bash
# Local data
du -sh data/*

# Named volumes
docker system df -v | grep qe-mcp-stack
```

## Git Ignore

The contents of this directory are ignored by git (see `.gitignore`), but the directory structure is preserved using `.gitkeep` files.

## File Formats

Most services store data as JSON files:
- `cache.json` - Cached analysis results
- `history.json` - Historical metrics and trends
- `metadata.json` - Service-specific metadata
- `*.result.json` - Individual analysis results

Some services may also store:
- Generated test files (`.spec.ts`, `.test.ts`)
- Markdown documentation (`.md`)
- Diagram files (`.mermaid`, `.puml`)
- CSV exports (`.csv`)

## Troubleshooting

### Permission Issues
If you encounter permission errors:
```bash
chmod -R 755 data/
```

### Corrupted Data
If a service behaves unexpectedly:
```bash
rm -rf data/<service-name>/*
docker compose restart <service-name>
```

### Disk Space
Monitor disk usage:
```bash
df -h
du -sh data/
```

Consider implementing data retention policies if storage grows large.
EOF

echo "  ✓ Created data/README.md"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📁 Data directories created:"
echo "   ./data/third-party/"
echo "   ./data/test-plan-manager/"
echo ""
echo "📝 Files created:"
echo "   - data/README.md (documentation)"
echo "   - .gitignore (updated)"
echo "   - .gitkeep files (to preserve structure)"
echo ""
echo "ℹ️  Note: Most services use Docker named volumes:"
echo "   - orchestrator-data"
echo "   - azure-devops-data"
echo "   - dashboard-data"
echo ""
echo "🚀 Next steps:"
echo "   1. Review docker-compose.yml volume mappings"
echo "   2. Run: docker compose down"
echo "   3. Run: docker compose up -d"
echo "   4. Your data will persist across restarts!"
echo ""
echo "💡 Tip: Check data/README.md for backup and maintenance info"
echo ""
