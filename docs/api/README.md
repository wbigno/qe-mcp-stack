# API Documentation

## Overview

All MCP services expose REST APIs documented with OpenAPI 3.0 (Swagger). The Swagger Hub aggregates all API documentation in one place.

## Access Points

### Swagger Hub (Aggregated)

**URL**: http://localhost:8000  
**Purpose**: Central portal for all API documentation

### Individual MCP Swagger UIs

| Service              | Port | Swagger UI                     |
| -------------------- | ---- | ------------------------------ |
| Orchestrator         | 3000 | http://localhost:3000/api-docs |
| Azure DevOps         | 8100 | http://localhost:8100/api-docs |
| Third Party          | 8101 | http://localhost:8101/api-docs |
| Test Plan Manager    | 8102 | http://localhost:8102/api-docs |
| Code Analyzer        | 8200 | http://localhost:8200/api-docs |
| Coverage Analyzer    | 8201 | http://localhost:8201/api-docs |
| Playwright Generator | 8202 | http://localhost:8202/api-docs |
| Migration Analyzer   | 8203 | http://localhost:8203/api-docs |
| Risk Analyzer        | 8300 | http://localhost:8300/api-docs |
| Integration Mapper   | 8301 | http://localhost:8301/api-docs |
| Test Selector        | 8302 | http://localhost:8302/api-docs |

## API Standards

All MCPs follow these standards:

### Authentication

```bash
# API Key in header
curl -H "X-API-Key: your-api-key" http://localhost:8100/api/iterations

# Or Bearer token
curl -H "Authorization: Bearer your-token" http://localhost:8100/api/iterations
```

### Response Format

```json
{
  "success": true,
  "data": {},
  "error": null,
  "metadata": {
    "timestamp": "2026-01-08T12:00:00Z",
    "requestId": "abc-123"
  }
}
```

### Error Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Work item ID is required",
    "details": {}
  }
}
```

## Common Endpoints

All MCPs implement:

```
GET  /health         - Health check
GET  /api-docs       - Swagger UI
GET  /swagger.json   - OpenAPI spec
```

## Key API Features

### Test Plan Hierarchy (Azure DevOps MCP)

The Azure DevOps MCP supports creating test cases with proper Test Plan hierarchy:

```
Test Plan
└── Feature Suite (StaticTestSuite)
    └── PBI Suite (RequirementTestSuite)
        └── Test Cases
```

**Endpoints:**

- `GET /work-items/test-plans` - List all test plans
- `POST /work-items/test-plans` - Create a test plan
- `GET /work-items/test-plans/:planId/suites` - List suites
- `POST /work-items/test-plans/:planId/suites` - Create a suite
- `POST /work-items/create-test-cases-in-plan` - Create test cases with hierarchy

See the [Azure DevOps MCP README](/mcps/integration/azure-devops/README.md) for full documentation.

### AI Query Assistant (Orchestrator)

The Orchestrator provides AI-powered SQL query generation endpoints:

**Endpoints:**

- `POST /api/ai/generate-query` - Generate SQL from natural language
- `GET /api/ai/schema-summary` - Get database schema summary
- `POST /api/ai/explain-query` - Explain an existing SQL query

**Generate Query Request:**

```json
{
  "database": "CarePayment",
  "environment": "PROD",
  "prompt": "Show patients with balance over $1000 who haven't paid in 60 days",
  "options": {
    "includeExplanation": true,
    "includeWarnings": true
  }
}
```

**Generate Query Response:**

```json
{
  "success": true,
  "query": {
    "sql": "SELECT pa.PAAcctID, pa.PatientName...",
    "formatted": true
  },
  "explanation": {
    "summary": "Finds patients with high balances and no recent payments",
    "steps": ["Filter patients by balance", "Join with payment history"],
    "tablesUsed": [
      {
        "schema": "CarePayment",
        "table": "SitePatientAccount",
        "purpose": "Patient data"
      }
    ]
  },
  "warnings": [
    { "type": "performance", "message": "Consider adding date range filter" }
  ]
}
```

**Features:**

- Generates only SELECT statements (read-only)
- Uses Claude AI with full database schema context
- Supports CarePayment database with 1,200+ tables across 56 schemas
- Environment-aware (PROD vs QA schema differences)

## Exporting OpenAPI Specs

Download specs for local use:

```bash
# Individual MCP
curl http://localhost:8100/swagger.json > azure-devops-api.json

# All MCPs
npm run api:export:all
```

## API Versioning

APIs use URL versioning:

```
/api/v1/users
/api/v2/users
```

## Rate Limiting

Default rate limits:

- 100 requests per 15 minutes per API key
- 429 status code when exceeded

## Related Documentation

- [MCP Architecture](../architecture/mcp-architecture.md)
- [Individual MCP Docs](../mcps/)
