# Data Flow Architecture

## Overview

This document describes how data flows through the QE MCP Stack, from user requests to external APIs and back.

## Request/Response Flow

### 1. Dashboard Sprint Analysis

```
┌─────────┐
│  User   │ Selects sprint in dashboard
└────┬────┘
     │
     │ GET /api/azure-devops/iterations/current
     v
┌──────────────┐
│  Dashboard   │ Port 5173
│  (Frontend)  │
└──────┬───────┘
       │
       │ HTTP Request
       v
┌──────────────────┐
│  Orchestrator    │ Port 3000
│  (API Gateway)   │
├──────────────────┤
│ 1. Validate auth │
│ 2. Check cache   │
│ 3. Route request │
└──────┬───────────┘
       │
       │ GET http://azure-devops:8100/api/iterations/current
       v
┌────────────────────┐
│ Azure DevOps MCP   │ Port 8100
├────────────────────┤
│ 1. Call ADO API    │
│ 2. Transform data  │
│ 3. Return response │
└──────┬─────────────┘
       │
       │ External API call
       v
┌─────────────────────────┐
│ Azure DevOps REST API   │
│ dev.azure.com          │
└──────┬──────────────────┘
       │
       │ JSON response
       v
    (back up the chain to user)
```

### 2. Risk Analysis Flow

```
User Request → Orchestrator
    │
    ├─→ Azure DevOps MCP → Get work items
    │       └─→ Returns: Work item details
    │
    ├─→ Code Analyzer MCP → Analyze changed files
    │       └─→ Returns: Complexity metrics
    │
    ├─→ Coverage Analyzer MCP → Check test coverage
    │       └─→ Returns: Coverage %
    │
    └─→ Risk Analyzer MCP
            ├─→ Receives aggregated data
            ├─→ Calls Anthropic Claude API
            │     └─→ AI analysis of risk
            └─→ Returns: Risk score + recommendations
```

### 3. Test Selection Flow

```
Code Change Event
    │
    v
Git diff analysis
    │
    v
Test Selector MCP
    │
    ├─→ Analyze changed files
    ├─→ Map to test files
    ├─→ Calculate test impact
    └─→ Return: Prioritized test list
          │
          v
    Playwright Runner
          │
          └─→ Execute selected tests
```

## Data Transformation Examples

### Work Item Transformation

**From Azure DevOps API**:
```json
{
  "id": 12345,
  "fields": {
    "System.Title": "Add payment validation",
    "System.State": "Active",
    "System.AssignedTo": {
      "displayName": "John Doe"
    }
  }
}
```

**Transformed by Azure DevOps MCP**:
```json
{
  "id": 12345,
  "title": "Add payment validation",
  "state": "active",
  "assignee": "John Doe",
  "category": "feature"
}
```

### Risk Assessment Aggregation

**Input (from multiple MCPs)**:
```json
{
  "workItem": { "id": 12345, "title": "Add payment validation" },
  "codeMetrics": { "complexity": 15, "linesChanged": 250 },
  "coverage": { "percentage": 45, "gap": 55 }
}
```

**Output (from Risk Analyzer)**:
```json
{
  "workItemId": 12345,
  "riskScore": 7.5,
  "riskLevel": "high",
  "factors": {
    "complexity": "high",
    "coverage": "low",
    "changeSize": "medium"
  },
  "recommendations": [
    "Increase test coverage to at least 70%",
    "Consider refactoring complex methods"
  ]
}
```

## Caching Strategy

### Level 1: Orchestrator In-Memory Cache

```typescript
// Cache work items for 15 minutes
const cacheKey = `work-items:${iterationId}`;
const cached = cache.get(cacheKey);
if (cached) return cached;

const data = await mcpClient.get('/api/iterations');
cache.set(cacheKey, data, 900); // 15 minutes
```

### Level 2: MCP-Level Cache

```typescript
// Azure DevOps MCP caches API responses
const cacheKey = `ado:iterations:${projectId}`;
if (this.cache.has(cacheKey)) {
  return this.cache.get(cacheKey);
}

const response = await this.adoClient.getIterations();
this.cache.set(cacheKey, response, 300); // 5 minutes
```

## Error Flow

```
Request Error
    │
    ├─→ MCP Level
    │   ├─→ Log error with context
    │   ├─→ Return structured error
    │   └─→ HTTP 500/400/404
    │
    └─→ Orchestrator Level
        ├─→ Catch MCP error
        ├─→ Add correlation ID
        ├─→ Sanitize sensitive data
        └─→ Return to client
            │
            └─→ Dashboard
                └─→ Display user-friendly message
```

## Performance Considerations

1. **Parallel Requests**: Orchestrator makes parallel calls to multiple MCPs
2. **Timeout Management**: 30s timeout per MCP request
3. **Retry Logic**: 3 retries with exponential backoff
4. **Circuit Breaker**: Fail fast if MCP is down

## Related Documentation

- [System Overview](system-overview.md)
- [MCP Architecture](mcp-architecture.md)
