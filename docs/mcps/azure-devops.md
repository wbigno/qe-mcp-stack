# Azure DevOps MCP

## Overview

The Azure DevOps MCP provides integration with Azure DevOps REST APIs, enabling the QE MCP Stack to fetch work items, iterations, test plans, and sync test results.

**Port**: 8100  
**Swagger UI**: http://localhost:8100/api-docs  
**Category**: Integration MCP

## Features

- Fetch iterations/sprints for a project
- Get work items with details
- Query test plans and test suites
- Sync test results back to Azure DevOps
- Cache frequently accessed data

## API Endpoints

### Get Current Iteration

```
GET /api/iterations/current
```

**Response**:
```json
{
  "id": "abc123",
  "name": "Sprint 42",
  "path": "Project\\Sprint 42",
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-01-14T23:59:59Z",
  "workItems": [
    {
      "id": 12345,
      "title": "Add payment validation",
      "state": "Active",
      "type": "UserStory"
    }
  ]
}
```

### Get Work Item Details

```
GET /api/workitems/:id
```

**Response**:
```json
{
  "id": 12345,
  "title": "Add payment validation",
  "description": "Validate credit card payments",
  "state": "Active",
  "assignedTo": "john.doe@company.com",
  "tags": ["payments", "validation"],
  "changedFiles": [
    "src/payments/validation.cs",
    "tests/payments/validation.test.cs"
  ]
}
```

## Configuration

Required environment variables:

```bash
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_PROJECT=your-project-name
AZURE_DEVOPS_API_URL=https://dev.azure.com
```

## Usage Examples

### Fetch Current Sprint Work Items

```typescript
const response = await fetch('http://localhost:8100/api/iterations/current');
const iteration = await response.json();

iteration.workItems.forEach(workItem => {
  console.log(`${workItem.id}: ${workItem.title}`);
});
```

### Get Work Item with Changed Files

```typescript
const workItemId = 12345;
const response = await fetch(`http://localhost:8100/api/workitems/${workItemId}`);
const workItem = await response.json();

console.log('Changed files:', workItem.changedFiles);
```

## Related MCPs

- **Risk Analyzer**: Uses work item data for risk assessment
- **Test Selector**: Maps work items to tests
- **Code Analyzer**: Analyzes files changed in work items
