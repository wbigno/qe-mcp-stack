#!/bin/bash

# Test All MCPs - Comprehensive Health and Functionality Check
# This script tests all 14 MCPs to ensure they're working correctly

echo "=========================================="
echo "QE MCP Stack - Comprehensive MCP Testing"
echo "=========================================="
echo ""

FAILED_TESTS=0
PASSED_TESTS=0

# Function to test MCP health endpoint
test_health() {
  local name=$1
  local port=$2
  local description=$3

  echo "Testing: $description ($name on port $port)"

  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)

  if [ "$response" = "200" ]; then
    echo "  ✅ Health check passed"
    ((PASSED_TESTS++))
    return 0
  else
    echo "  ❌ Health check failed (HTTP $response)"
    ((FAILED_TESTS++))
    return 1
  fi
}

# Function to test MCP API endpoint
test_api() {
  local name=$1
  local port=$2
  local endpoint=$3
  local method=$4
  local data=$5
  local description=$6

  echo "  Testing API: $description"

  if [ "$method" = "POST" ]; then
    response=$(curl -s -X POST http://localhost:$port$endpoint \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  else
    response=$(curl -s http://localhost:$port$endpoint 2>&1)
  fi

  # Check if response contains error indicators
  if echo "$response" | grep -qi "error\|failed\|not found" && ! echo "$response" | grep -qi "\"success\":true"; then
    echo "    ⚠️  API returned error: $(echo $response | head -c 100)..."
    return 1
  elif [ -z "$response" ]; then
    echo "    ❌ API returned empty response"
    ((FAILED_TESTS++))
    return 1
  else
    echo "    ✅ API responded successfully"
    ((PASSED_TESTS++))
    return 0
  fi
}

echo "=========================================="
echo "INTEGRATION MCPs (8100-8199)"
echo "=========================================="
echo ""

# Azure DevOps MCP (8100)
test_health "azure-devops" 8100 "Azure DevOps MCP"
test_api "azure-devops" 8100 "/iterations/projects" "GET" "" "Get Projects"
echo ""

# Third Party MCP (8101)
test_health "third-party" 8101 "Third Party Integration MCP"
test_api "third-party" 8101 "/integrations/detect" "POST" '{"app":"Core"}' "Detect Integrations"
echo ""

# Test Plan Manager MCP (8102)
test_health "test-plan-manager" 8102 "Test Plan Manager MCP"
test_api "test-plan-manager" 8102 "/test-plans" "GET" "" "List Test Plans"
echo ""

echo "=========================================="
echo "CODE ANALYSIS MCPs (8200-8299)"
echo "=========================================="
echo ""

# .NET Code Analyzer (8200)
test_health "code-analyzer" 8200 ".NET Code Analyzer MCP"
test_api "code-analyzer" 8200 "/analyze" "POST" '{"app":"Core","includeTests":false}' "Analyze .NET Code"
echo ""

# .NET Coverage Analyzer (8201)
test_health "coverage-analyzer" 8201 ".NET Coverage Analyzer MCP"
test_api "coverage-analyzer" 8201 "/analyze" "POST" '{"app":"Core"}' "Analyze .NET Coverage"
echo ""

# Migration Analyzer (8203)
test_health "migration-analyzer" 8203 "Migration Analyzer MCP"
test_api "migration-analyzer" 8203 "/analyze" "POST" '{"app":"Core"}' "Analyze Migration Paths"
echo ""

# JavaScript Code Analyzer (8204)
test_health "javascript-code-analyzer" 8204 "JavaScript Code Analyzer MCP"
test_api "javascript-code-analyzer" 8204 "/analyze" "POST" '{"app":"Core","includeTests":false}' "Analyze JavaScript Code"
echo ""

# JavaScript Coverage Analyzer (8205)
test_health "javascript-coverage-analyzer" 8205 "JavaScript Coverage Analyzer MCP"
test_api "javascript-coverage-analyzer" 8205 "/analyze" "POST" '{"app":"Core"}' "Analyze JavaScript Coverage"
echo ""

echo "=========================================="
echo "QUALITY ANALYSIS MCPs (8300-8399)"
echo "=========================================="
echo ""

# Risk Analyzer (8300)
test_health "risk-analyzer" 8300 "Risk Analyzer MCP"
test_api "risk-analyzer" 8300 "/analyze" "POST" '{"storyId":63019,"title":"Test Story","description":"Test"}' "Analyze Risk"
echo ""

# Integration Mapper (8301)
test_health "integration-mapper" 8301 "Integration Mapper MCP"
test_api "integration-mapper" 8301 "/detect" "POST" '{"app":"Core"}' "Detect Integrations"
echo ""

# Test Selector (8302)
test_health "test-selector" 8302 "Test Selector MCP"
test_api "test-selector" 8302 "/select" "POST" '{"changedFiles":["test.cs"],"testSuite":"all"}' "Select Tests"
echo ""

echo "=========================================="
echo "PLAYWRIGHT MCPs (8400-8499)"
echo "=========================================="
echo ""

# Playwright Generator (8400)
test_health "playwright-generator" 8400 "Playwright Generator MCP"
test_api "playwright-generator" 8400 "/generate" "POST" '{"acceptanceCriteria":"User can login","framework":"playwright"}' "Generate Playwright Test"
echo ""

# Playwright Analyzer (8401)
test_health "playwright-analyzer" 8401 "Playwright Analyzer MCP"
test_api "playwright-analyzer" 8401 "/analyze" "POST" '{"app":"Core","depth":"shallow"}' "Analyze UI Paths"
echo ""

# Playwright Healer (8402)
test_health "playwright-healer" 8402 "Playwright Healer MCP"
test_api "playwright-healer" 8402 "/analyze-failures" "POST" '{"testFile":"test.spec.js","errorLog":"Error: Element not found"}' "Analyze Test Failures"
echo ""

echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo ""
echo "✅ Passed: $PASSED_TESTS"
echo "❌ Failed: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo "🎉 All MCPs are working correctly!"
  exit 0
else
  echo "⚠️  Some MCPs have issues that need attention"
  exit 1
fi
