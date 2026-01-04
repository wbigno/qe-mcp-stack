#!/bin/bash
# QE MCP Stack - Data Directory Setup Script
# This script creates all necessary persistent data directories

set -e

echo "🔧 Setting up persistent data directories for QE MCP Stack..."
echo ""

# Create main data directory
mkdir -p data

# Create data directories for each MCP service
echo "Creating data directories..."

services=(
    "orchestrator"
    "code-analyzer"
    "coverage-analyzer"
    "azure-devops"
    "playwright-analyzer"
    "playwright-generator"
    "playwright-healer"
    "architecture-analyzer"
    "integration-mapper"
    "data-model-analyzer"
    "risk-analyzer"
    "workflow-analyzer"
    "quality-metrics-analyzer"
    "security-analyzer"
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

This directory contains persistent data for all QE MCP services. Data stored here survives container restarts and rebuilds.

## Directory Structure

```
data/
├── orchestrator/              # Orchestration state and workflow history
├── code-analyzer/             # Code analysis results and metrics
├── coverage-analyzer/         # Test coverage reports and history
├── azure-devops/              # Cached ADO queries and work item data
├── playwright-analyzer/       # Test analysis results
├── playwright-generator/      # Generated test files and templates
├── playwright-healer/         # Test healing history and patterns
├── architecture-analyzer/     # Architecture diagrams and dependency graphs
├── integration-mapper/        # API integration maps and schemas
├── data-model-analyzer/       # Data model schemas and relationships
├── risk-analyzer/             # Risk assessment results and scores
├── workflow-analyzer/         # Workflow analysis and recommendations
├── quality-metrics-analyzer/  # Quality metrics trends and history
└── security-analyzer/         # Security scan results and vulnerabilities
```

## What Gets Stored

Each MCP service stores its own persistent data:

- **Analysis Results**: Cached computations that don't need to be recalculated
- **Historical Data**: Metrics and trends over time
- **Generated Artifacts**: Test files, documentation, diagrams
- **Cache Data**: Frequently accessed information for faster responses
- **State Information**: Workflow progress and session data

## Benefits

- ⚡ **Faster Analysis**: Cached results mean instant responses for repeated queries
- 📊 **Historical Tracking**: See how metrics change over time
- 💾 **Persistent Artifacts**: Keep generated tests and documentation
- 🔄 **Survive Restarts**: Data persists across container restarts and rebuilds

## Maintenance

### Backup
Regularly backup this directory:
```bash
tar -czf qe-mcp-data-backup-$(date +%Y%m%d).tar.gz data/
```

### Clear Cache
To clear all cached data and start fresh:
```bash
# WARNING: This deletes all persistent data!
rm -rf data/*/
./setup-data-dirs.sh  # Recreate directories
```

### Clear Specific Service
```bash
rm -rf data/code-analyzer/*
```

### View Disk Usage
```bash
du -sh data/*
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
echo "   ./data/ (with 14 subdirectories)"
echo ""
echo "📝 Files created:"
echo "   - data/README.md (documentation)"
echo "   - .gitignore (updated)"
echo "   - .gitkeep files (to preserve structure)"
echo ""
echo "🚀 Next steps:"
echo "   1. Review the docker compose.yml changes"
echo "   2. Run: docker compose down"
echo "   3. Run: docker compose up -d"
echo "   4. Your MCPs will now persist data across restarts!"
echo ""
echo "💡 Tip: Check data/README.md for maintenance and backup info"
echo ""
