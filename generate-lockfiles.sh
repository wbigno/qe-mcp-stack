#!/bin/bash
# Generate package-lock.json files for all MCP services

set -e

echo "🔧 Generating package-lock.json files for all MCP services..."
echo ""

# List of all MCP directories
MCP_DIRS=(
"orchestrator"
"mcps/dotnet-code-analyzer"
"mcps/dotnet-coverage-analyzer"
"mcps/azure-devops"
"mcps/playwright-analyzer"
"mcps/playwright-generator"
"mcps/playwright-healer"
"mcps/architecture-analyzer"
"mcps/integration-mapper"
"mcps/data-model-analyzer"
"mcps/risk-analyzer"
"mcps/workflow-analyzer"
"mcps/quality-metrics-analyzer"
"mcps/security-analyzer"
# STDIO MCPs - Testing Workflow (HIGH PRIORITY)
"mcps/requirements-analyzer"
"mcps/test-case-planner"
"mcps/dotnet-unit-test-generator"
"mcps/dotnet-integration-test-generator"
"mcps/automation-requirements"
# STDIO MCPs - Planning & Analysis (MEDIUM PRIORITY)
"mcps/playwright-planner"
"mcps/blast-radius-analyzer"
"mcps/change-impact-analyzer"
# STDIO MCPs - Documentation & Quality (LOWER PRIORITY)
"mcps/business-logic-documenter"
"mcps/documentation-generator"
"mcps/state-machine-analyzer"
"mcps/smell-detector"
"mcps/trend-analyzer"
"mcps/performance-analyzer"
)

success_count=0
skip_count=0
error_count=0

for dir in "${MCP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        if [ -f "$dir/package.json" ]; then
            echo "📦 Processing: $dir"
            cd "$dir"
            
            # Run npm install to generate package-lock.json
            if npm install > /dev/null 2>&1; then
                echo "   ✅ Generated package-lock.json"
                ((success_count++))
            else
                echo "   ❌ Error running npm install"
                ((error_count++))
            fi
            
            cd - > /dev/null
            echo ""
        else
            echo "⚠️  Skipping $dir: No package.json found"
            ((skip_count++))
            echo ""
        fi
    else
        echo "⚠️  Skipping $dir: Directory does not exist"
        ((skip_count++))
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  ✅ Success: $success_count"
echo "  ⚠️  Skipped: $skip_count"
echo "  ❌ Errors: $error_count"
echo ""

if [ $error_count -eq 0 ] && [ $success_count -gt 0 ]; then
    echo "🎉 All package-lock.json files generated successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: docker compose build"
    echo "  2. Run: ./start.sh"
else
    echo "⚠️  Some services had issues. Check the output above."
    echo ""
    echo "You can also manually run:"
    echo "  cd mcps/service-name"
    echo "  npm install"
fi
echo ""
