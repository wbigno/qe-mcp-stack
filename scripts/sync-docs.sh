#!/bin/bash
# Syncs MCP READMEs to docs/mcps/ directory
# This ensures central documentation stays in sync with individual MCP READMEs

set -e

DOCS_DIR="docs/mcps"
mkdir -p "$DOCS_DIR"

echo "🔄 Syncing MCP documentation..."
echo ""

SYNCED=0
MISSING=0

# Function to sync a README file
sync_readme() {
  local mcp_path=$1
  local doc_name=$2

  if [ -f "$mcp_path/README.md" ]; then
    /bin/cp "$mcp_path/README.md" "$DOCS_DIR/$doc_name.md"
    echo "  ✓ Synced $doc_name"
    SYNCED=$((SYNCED + 1))
  else
    echo "  ⚠ Missing: $mcp_path/README.md"
    MISSING=$((MISSING + 1))
  fi
}

echo "Integration MCPs (8100-8199):"
sync_readme "mcps/integration/azure-devops" "azure-devops"
sync_readme "mcps/integration/third-party" "third-party"
sync_readme "mcps/integration/test-plan-manager" "test-plan-manager"
sync_readme "mcps/integration/browser-control-mcp" "browser-control-mcp"
echo ""

echo "Code Analysis MCPs (8200-8299):"
sync_readme "mcps/code-analysis/code-analyzer" "code-analyzer"
sync_readme "mcps/code-analysis/coverage-analyzer" "coverage-analyzer"
sync_readme "mcps/code-analysis/javascript-code-analyzer" "javascript-code-analyzer"
sync_readme "mcps/code-analysis/javascript-coverage-analyzer" "javascript-coverage-analyzer"
sync_readme "mcps/code-analysis/migration-analyzer" "migration-analyzer"
echo ""

echo "Quality Analysis MCPs:"
sync_readme "mcps/quality-analysis/risk-analyzer" "risk-analyzer"
sync_readme "mcps/quality-analysis/integration-mapper" "integration-mapper"
echo ""

echo "Playwright MCPs (8400-8499):"
sync_readme "mcps/playwright/playwright-generator" "playwright-generator"
sync_readme "mcps/playwright/playwright-healer" "playwright-healer"
sync_readme "mcps/playwright/playwright-analyzer" "playwright-analyzer"
echo ""

echo "Framework Packages:"
sync_readme "packages/mcp-sdk" "mcp-sdk"
sync_readme "packages/shared" "shared"
sync_readme "packages/test-framework" "test-framework"
echo ""

echo "Infrastructure:"
sync_readme "swagger-hub" "swagger-hub"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Documentation sync complete!"
echo "📊 Summary:"
echo "   • Synced: $SYNCED files"
echo "   • Missing: $MISSING files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $MISSING -gt 0 ]; then
  echo "⚠️  Some MCP READMEs are missing. Please create them:"
  echo "   1. Use existing READMEs as templates (e.g., browser-control-mcp)"
  echo "   2. Include: Overview, Features, API Endpoints, Usage, Docker config"
  echo "   3. Follow the documentation style guide"
  echo ""
fi

exit 0
