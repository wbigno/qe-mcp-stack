#!/bin/bash
# QE MCP Stack Startup Script (with Persistent Data Support)
set -e

echo "🚀 Starting QE MCP Stack..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi
echo "✓ Docker is running"

# Check if .env file exists
if [ ! -f "config/.env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp config/.env.example config/.env
    echo "📝 Please edit config/.env with your Azure DevOps credentials"
    echo "   Then run this script again."
    exit 1
fi
echo "✓ Environment configuration found"

# Setup data directories if they don't exist
if [ ! -d "data" ]; then
    echo ""
    echo "📁 First-time setup: Creating persistent data directories..."
    chmod +x setup-data-dirs.sh
    ./setup-data-dirs.sh
    echo ""
else
    echo "✓ Persistent data directories exist"
fi

# Check if apps.json is configured
if ! grep -q "YOUR_" config/apps.json 2>/dev/null; then
    echo "✓ Apps configuration looks good"
else
    echo "⚠️  Please update config/apps.json with your actual app paths"
fi

# Check if ADO config is set
if grep -q "YOUR_" config/ado-config.json 2>/dev/null; then
    echo "⚠️  Please update config/ado-config.json with your Azure DevOps details"
fi

echo ""
echo "Building Docker images..."
docker compose build

echo ""
echo "Starting services..."
docker compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ QE MCP Stack is running!"
echo ""
echo "📊 Orchestrator Dashboard: http://localhost:3000"
echo "🔍 Health Check: http://localhost:3000/health"
echo ""
echo "Services:"
echo "  - Orchestrator:              http://localhost:3000"
echo "  - Code Analyzer:             http://localhost:3001"
echo "  - Coverage Analyzer:         http://localhost:3002"
echo "  - Azure DevOps:              http://localhost:3003"
echo "  - Playwright Analyzer:       http://localhost:3004"
echo "  - Playwright Generator:      http://localhost:3005"
echo "  - Playwright Healer:         http://localhost:3006"
echo "  - Architecture Analyzer:     http://localhost:3007"
echo "  - Integration Mapper:        http://localhost:3008"
echo "  - Risk Analyzer:             http://localhost:3009"
echo "  - Workflow Analyzer:         http://localhost:3010"
echo "  - Quality Metrics Analyzer:  http://localhost:3011"
echo "  - Security Analyzer:         http://localhost:3012"
echo "  - Data Model Analyzer:       http://localhost:3013"
echo ""
echo "💾 Persistent Data:"
echo "  All analysis results are now saved to ./data/"
echo "  Data survives container restarts and rebuilds"
echo "  See data/README.md for backup and maintenance info"
echo ""
echo "📝 STDIO MCPs (run on-demand via Claude Desktop):"
echo "  - unit-test-generator, integration-test-generator"
echo "  - requirements-analyzer, test-case-planner"
echo "  - automation-requirements, playwright-planner"
echo "  - blast-radius-analyzer, change-impact-analyzer"
echo "  - business-logic-documenter, state-machine-analyzer"
echo "  - smell-detector, trend-analyzer"
echo "  - performance-analyzer, documentation-generator"
echo ""
echo "📋 Useful commands:"
echo "  - View logs:        docker compose logs -f"
echo "  - View logs (one):  docker compose logs -f code-analyzer"
echo "  - Stop stack:       docker compose down"
echo "  - Restart service:  docker compose restart code-analyzer"
echo "  - Check status:     docker compose ps"
echo "  - Disk usage:       du -sh data/*"
echo ""
