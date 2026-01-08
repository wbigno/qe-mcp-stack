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
echo "📊 Dashboard: http://localhost:5173"
echo "📖 Swagger Hub: http://localhost:8000"
echo "🔍 Orchestrator Health Check: http://localhost:3000/health"
echo ""
echo "Core Services:"
echo "  - Orchestrator (API Gateway):  http://localhost:3000"
echo "  - Dashboard UI:                http://localhost:5173"
echo "  - Swagger Hub:                 http://localhost:8000"
echo ""
echo "Integration MCPs (8100-8199):"
echo "  - Azure DevOps:                http://localhost:8100"
echo "  - Third-Party Integrations:    http://localhost:8101"
echo "  - Test Plan Manager:           http://localhost:8102"
echo ""
echo "Code Analysis MCPs (8200-8299):"
echo "  - Code Analyzer:               http://localhost:8200"
echo "  - Coverage Analyzer:           http://localhost:8201"
echo "  - Playwright Generator:        http://localhost:8202"
echo "  - Migration Analyzer:          http://localhost:8203"
echo ""
echo "Quality Analysis MCPs (8300-8399):"
echo "  - Risk Analyzer:               http://localhost:8300"
echo "  - Integration Mapper:          http://localhost:8301"
echo "  - Test Selector:               http://localhost:8302"
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
echo "  - View all logs:       docker compose logs -f"
echo "  - View specific logs:  docker compose logs -f azure-devops"
echo "  - Stop stack:          docker compose down"
echo "  - Restart service:     docker compose restart risk-analyzer"
echo "  - Rebuild service:     docker compose up -d --build code-analyzer"
echo "  - Check status:        docker compose ps"
echo "  - Check health:        docker compose ps | grep healthy"
echo "  - Disk usage:          du -sh data/*"
echo ""
