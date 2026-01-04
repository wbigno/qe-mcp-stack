# Docker MCPs - Quick Reference

All Docker MCPs are always-running HTTP services that start with `./start.sh` and are accessible via their respective ports.

## 📋 Table of Contents

- [Quick Overview](#quick-overview)
- [Central Services](#central-services)
- [Code Analysis Services](#code-analysis-services)
- [Integration Services](#integration-services)
- [UI Test Services](#ui-test-services)
- [Architecture Services](#architecture-services)
- [Quality Services](#quality-services)
- [Common Patterns](#common-patterns)
- [Health Checks](#health-checks)

---

## Quick Overview

| Service | Port | Purpose | Status Check |
|---------|------|---------|--------------|
| [orchestrator](#orchestrator) | 3000 | Central API gateway | `curl http://localhost:3000/health` |
| [code-analyzer](#code-analyzer) | 3001 | .NET code scanning | `curl http://localhost:3001/health` |
| [coverage-analyzer](#coverage-analyzer) | 3002 | Test coverage analysis | `curl http://localhost:3002/health` |
| [azure-devops](#azure-devops) | 3003 | ADO integration | `curl http://localhost:3003/health` |
| [playwright-analyzer](#playwright-analyzer) | 3004 | UI path analysis | `curl http://localhost:3004/health` |
| [playwright-generator](#playwright-generator) | 3005 | UI test generation | `curl http://localhost:3005/health` |
| [playwright-healer](#playwright-healer) | 3006 | Test self-healing | `curl http://localhost:3006/health` |
| [architecture-analyzer](#architecture-analyzer) | 3007 | Architecture analysis | `curl http://localhost:3007/health` |
| [integration-mapper](#integration-mapper) | 3008 | Integration mapping | `curl http://localhost:3008/health` |
| [risk-analyzer](#risk-analyzer) | 3009 | Risk assessment | `curl http://localhost:3009/health` |
| [workflow-analyzer](#workflow-analyzer) | 3010 | Workflow optimization | `curl http://localhost:3010/health` |
| [quality-metrics-analyzer](#quality-metrics-analyzer) | 3011 | Quality metrics | `curl http://localhost:3011/health` |
| [security-analyzer](#security-analyzer) | 3012 | Security scanning | `curl http://localhost:3012/health` |
| [data-model-analyzer](#data-model-analyzer) | 3013 | Data model analysis | `curl http://localhost:3013/health` |

---

## Central Services

### orchestrator

**Port:** 3000  
**Container:** `qe-orchestrator`  
**Purpose:** Central API gateway and MCP coordinator

**Key Endpoints:**
```bash
# Health check
GET http://localhost:3000/health

# MCP status
GET http://localhost:3000/api/mcp/status

# MCP health (specific)
GET http://localhost:3000/api/mcp/health/:mcpName
```

**Usage via Orchestrator (Recommended):**
All other MCPs should be accessed through the orchestrator API, not directly.

**Direct Access (Testing Only):**
```bash
curl http://localhost:3000/health
```

**Configuration:**
- Environment: `.env`
- Apps: `config/apps.json`
- ADO: `config/ado-config.json`

**Data Storage:**
- `./data/orchestrator/` - Workflow state, execution history

**Logs:**
```bash
docker compose logs -f orchestrator
```

**Details:** [→ README](../orchestrator/README.md)

---

## Code Analysis Services

### code-analyzer

**Port:** 3001  
**Container:** `qe-code-analyzer`  
**Purpose:** Scan .NET C# applications

**Key Endpoints:**
```bash
POST /analyze
POST /applications
GET /health
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/analysis/code-scan \
  -H "Content-Type: application/json" \
  -d '{"apps": ["App1"]}'
```

**Direct Testing:**
```bash
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeTests": false,
    "deep": false
  }'
```

**Input Schema:**
```typescript
{
  app: string;              // Required: App name from apps.json
  includeTests?: boolean;   // Optional: Include test files (default: false)
  deep?: boolean;           // Optional: Deep analysis (default: false)
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  analysis: {
    totalFiles: number;
    totalClasses: number;
    totalMethods: number;
    classes: Array<{
      name: string;
      namespace: string;
      methods: Array<{
        name: string;
        parameters: string[];
        returnType: string;
      }>;
    }>;
    epicIntegrations: string[];      // Epic API calls found
    financialTouchpoints: string[];  // Financial system references
    dependencies: object;
  };
}
```

**Configuration:**
- Reads: `config/apps.json`
- Volume: `/mnt/apps/*` (read-only)

**Data Storage:**
- `./data/code-analyzer/` - Cached analysis results

**Common Use Cases:**
1. Scan all applications for overview
2. Find Epic/Financial integration points
3. Identify test coverage gaps
4. Map dependencies

**Details:** [→ README](../mcps/code-analyzer/README.md)

---

### coverage-analyzer

**Port:** 3002  
**Container:** `qe-coverage-analyzer`  
**Purpose:** Analyze xUnit test coverage

**Key Endpoints:**
```bash
POST /analyze-coverage
POST /test-gaps
GET /health
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/analysis/coverage \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'
```

**Direct Testing:**
```bash
curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'
```

**Input Schema:**
```typescript
{
  app: string;  // Required: App name from apps.json
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  coverage: {
    percentage: number;           // Overall coverage %
    totalMethods: number;
    testedMethods: number;
    untestedMethods: Array<{
      className: string;
      methodName: string;
      complexity: number;
      risk: "high" | "medium" | "low";
    }>;
    missingNegativeTests: string[];
    recommendations: string[];
  };
}
```

**Configuration:**
- Reads: `config/apps.json`
- Coverage files: Looks for `coverage.xml` or similar

**Data Storage:**
- `./data/coverage-analyzer/` - Coverage reports, trends

**Common Use Cases:**
1. Check current test coverage
2. Identify untested methods
3. Find missing negative tests
4. Track coverage trends

**Details:** [→ README](../mcps/coverage-analyzer/README.md)

---

## Integration Services

### azure-devops

**Port:** 3003  
**Container:** `qe-azure-devops`  
**Purpose:** Azure DevOps API integration

**Key Endpoints:**
```bash
POST /work-items/query
POST /work-items/get
POST /work-items/update
POST /work-items/create
GET /health
```

**Usage via Orchestrator:**
```bash
# Pull stories
curl -X POST http://localhost:3000/api/ado/pull-stories \
  -H "Content-Type: application/json" \
  -d '{"sprint": "Sprint 45"}'

# Get specific work items
curl -X POST http://localhost:3000/api/ado/pull-stories \
  -d '{"workItemIds": [12345, 12346]}'
```

**Direct Testing:**
```bash
curl -X POST http://localhost:3003/work-items/query \
  -H "Content-Type: application/json" \
  -d '{
    "wiql": "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project"
  }'
```

**Input Schema (Query):**
```typescript
{
  wiql?: string;           // WIQL query
  sprint?: string;         // Sprint name
  workItemIds?: number[];  // Specific IDs
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  workItems: Array<{
    id: number;
    fields: {
      "System.Title": string;
      "System.State": string;
      "System.AssignedTo": string;
      "System.Description": string;
      "Microsoft.VSTS.Common.AcceptanceCriteria": string;
      // ... more fields
    };
  }>;
}
```

**Configuration:**
- Reads: `.env` (ADO_PAT, ADO_ORG, ADO_PROJECT)
- Reads: `config/ado-config.json`

**Data Storage:**
- `./data/azure-devops/` - Cached work items, query results

**Common Use Cases:**
1. Pull current sprint stories
2. Query work items by criteria
3. Update work items with test cases
4. Create test cases from requirements

**Authentication:**
- Uses Personal Access Token from `.env`
- Scopes needed: Work Items (Read & Write)

**Details:** [→ README](../mcps/azure-devops/README.md)

---

## UI Test Services

### playwright-analyzer

**Port:** 3004  
**Container:** `qe-playwright-analyzer`  
**Purpose:** Analyze critical UI paths

**Key Endpoints:**
```bash
POST /analyze-paths
POST /prioritize
GET /health
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/tests/analyze-ui-paths \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'
```

**Output Schema:**
```typescript
{
  success: boolean;
  analysis: {
    criticalPaths: Array<{
      name: string;
      priority: "high" | "medium" | "low";
      steps: Array<{
        action: string;
        selector: string;
        description: string;
      }>;
      risk: number;
      frequency: number;
    }>;
    recommendations: string[];
  };
}
```

**Details:** [→ README](../mcps/playwright-analyzer/README.md)

---

### playwright-generator

**Port:** 3005  
**Container:** `qe-playwright-generator`  
**Purpose:** Generate Playwright tests

**Uses:** Anthropic Claude API for AI-powered generation

**Details:** [→ README](../mcps/playwright-generator/README.md)

---

### playwright-healer

**Port:** 3006  
**Container:** `qe-playwright-healer`  
**Purpose:** Self-healing test maintenance

**Uses:** Anthropic Claude API for AI-powered healing

**Details:** [→ README](../mcps/playwright-healer/README.md)

---

## Architecture Services

### architecture-analyzer

**Port:** 3007  
**Container:** `qe-architecture-analyzer`  
**Purpose:** Analyze application architecture

**Details:** [→ README](../mcps/architecture-analyzer/README.md)

---

### integration-mapper

**Port:** 3008  
**Container:** `qe-integration-mapper`  
**Purpose:** Map API integrations

**Details:** [→ README](../mcps/integration-mapper/README.md)

---

### data-model-analyzer

**Port:** 3013  
**Container:** `qe-data-model-analyzer`  
**Purpose:** Analyze data models

**Details:** [→ README](../mcps/data-model-analyzer/README.md)

---

## Quality Services

### risk-analyzer

**Port:** 3009  
**Container:** `qe-risk-analyzer`  
**Purpose:** Assess risk scores

**Details:** [→ README](../mcps/risk-analyzer/README.md)

---

### workflow-analyzer

**Port:** 3010  
**Container:** `qe-workflow-analyzer`  
**Purpose:** Analyze workflows

**Uses:** Anthropic Claude API for recommendations

**Details:** [→ README](../mcps/workflow-analyzer/README.md)

---

### quality-metrics-analyzer

**Port:** 3011  
**Container:** `qe-quality-metrics-analyzer`  
**Purpose:** Track quality metrics

**Details:** [→ README](../mcps/quality-metrics-analyzer/README.md)

---

### security-analyzer

**Port:** 3012  
**Container:** `qe-security-analyzer`  
**Purpose:** Security scanning

**Details:** [→ README](../mcps/security-analyzer/README.md)

---

## Common Patterns

### Pattern 1: Via Orchestrator (Recommended)
```bash
# Always use orchestrator API in production
curl -X POST http://localhost:3000/api/analysis/code-scan \
  -H "Content-Type: application/json" \
  -d '{"apps": ["App1"]}'
```

### Pattern 2: Direct Access (Testing Only)
```bash
# Only for debugging/testing individual MCPs
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'
```

### Pattern 3: Health Checks
```bash
# Check all MCPs
curl http://localhost:3000/api/mcp/status

# Check specific MCP
curl http://localhost:3001/health
```

---

## Health Checks

### Check All Services
```bash
# Via orchestrator
curl http://localhost:3000/api/mcp/status

# Or individually
for port in {3000..3013}; do
  echo "Port $port:"
  curl -s http://localhost:$port/health | jq '.' || echo "Not responding"
done
```

### Expected Response
```json
{
  "status": "healthy",
  "service": "service-name",
  "uptime": 12345,
  "version": "1.0.0"
}
```

### Troubleshooting
```bash
# Check if service is running
docker compose ps qe-service-name

# View logs
docker compose logs -f qe-service-name

# Restart service
docker compose restart qe-service-name
```

---

## Data Persistence

All Docker MCPs store data in `./data/service-name/`:

```bash
# View data usage
./manage-data.sh status

# Backup data
./manage-data.sh backup

# Clear specific service cache
./manage-data.sh clear service-name
```

---

## Environment Variables

Docker MCPs read from `.env` (root directory):

```bash
# Required for all
ADO_PAT=...
ADO_ORG=...
ADO_PROJECT=...

# Required for AI-powered MCPs
ANTHROPIC_API_KEY=...
# OR
OPENAI_API_KEY=...
```

---

## Next Steps

- [View STDIO MCPs](STDIO_MCPS.md)
- [Back to Overview](MCP_OVERVIEW.md)
- [Getting Started](GETTING_STARTED.md)
- [API Reference](QUICK_REFERENCE.md)

---

**Last Updated:** December 29, 2024
