# Azure DevOps MCP

Azure DevOps integration MCP providing comprehensive work item management and sprint tracking capabilities.

## Features

- **Work Item Queries**: Query work items by sprint, custom WIQL, or specific IDs
- **Work Item Management**: Create, update, and retrieve work items
- **Test Case Management**: Create and manage test cases
- **Bulk Operations**: Perform bulk updates on multiple work items
- **Iteration Management**: Retrieve projects, teams, and sprints
- **OpenAPI Documentation**: Complete API documentation at `/api-docs`

## Configuration

### Environment Variables

```bash
# Required
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_ORG=your-organization-name
AZURE_DEVOPS_PROJECT=your-default-project

# Optional
AZURE_DEVOPS_API_VERSION=7.0
PORT=8100
NODE_ENV=development
LOG_LEVEL=info
```

### Azure DevOps Personal Access Token

Create a PAT with the following scopes:
- Work Items: Read & Write
- Project and Team: Read

## API Endpoints

### Work Items

#### POST /work-items/query
Query work items by sprint, custom WIQL query, or specific IDs.

**Request Body Examples:**

Query by sprint name:
```json
{
  "sprint": "25.Q4.07",
  "project": "Core",
  "team": "Core Team"
}
```

Query by full iteration path:
```json
{
  "sprint": "Core\\Core Team\\2025\\Q4\\25.Q4.07"
}
```

Query by work item IDs:
```json
{
  "workItemIds": [12345, 12346, 12347]
}
```

Custom WIQL query:
```json
{
  "query": "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
}
```

#### POST /work-items/get
Get specific work items by IDs.

```json
{
  "ids": [12345, 12346]
}
```

#### POST /work-items/update
Update a work item's fields.

```json
{
  "id": 12345,
  "fields": {
    "System.State": "Active",
    "System.AssignedTo": "user@example.com"
  }
}
```

#### POST /work-items/create-test-cases
Create test cases.

```json
{
  "parentId": 12345,
  "testCases": [
    {
      "title": "Test login functionality",
      "steps": [
        {
          "stepNumber": 1,
          "action": "Navigate to login page",
          "expectedResult": "Login page is displayed"
        }
      ]
    }
  ]
}
```

#### POST /work-items/bulk-update
Bulk update work items with test cases and automation requirements.

```json
{
  "storyId": 12345,
  "testCases": [...],
  "automationReqs": {
    "summary": "Automation requirements summary"
  }
}
```

### Iterations

#### GET /iterations/projects
Get all projects in the organization.

#### GET /iterations/teams?project=ProjectName
Get teams for a specific project.

#### GET /iterations/sprints?project=ProjectName&team=TeamName
Get sprints/iterations for a specific team.

## Development

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Run in Production
```bash
npm run build
npm start
```

## Docker

### Build Image
```bash
docker build -t azure-devops-mcp -f mcps/integration/azure-devops/Dockerfile .
```

### Run Container
```bash
docker run -p 8100:8100 \
  -e AZURE_DEVOPS_PAT=your-pat \
  -e AZURE_DEVOPS_ORG=your-org \
  -e AZURE_DEVOPS_PROJECT=your-project \
  azure-devops-mcp
```

## API Documentation

Once the service is running, access the Swagger UI at:
- http://localhost:8100/api-docs

Download OpenAPI JSON specification:
- http://localhost:8100/api-docs.json

## Health Check

```bash
curl http://localhost:8100/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-08T10:00:00.000Z",
  "uptime": 123456,
  "version": "2.0.0",
  "dependencies": [
    {
      "name": "azure-devops-api",
      "status": "up",
      "responseTime": 150
    }
  ]
}
```

## Architecture

This MCP follows the standardized architecture:

```
src/
├── index.ts           # Main MCP entry point using BaseMCP
├── types.ts           # TypeScript type definitions
├── routes/            # Route handlers
│   ├── work-items.ts  # Work item endpoints
│   └── iterations.ts  # Iteration endpoints
├── services/          # Business logic layer
│   └── ado-service.ts # Azure DevOps API client
└── swagger/           # OpenAPI schemas
    └── schemas.ts     # Schema definitions
```

## Integration

### Using MCPClient

```typescript
import { MCPClient } from '@qe-mcp-stack/mcp-sdk';

const client = new MCPClient({
  baseURL: 'http://azure-devops:8100',
});

// Query work items
const workItems = await client.post('/work-items/query', {
  sprint: '25.Q4.07',
  project: 'Core',
});

// Get projects
const projects = await client.get('/iterations/projects');
```

## Testing

Tests are organized into:
- `tests/unit/` - Unit tests for services and utilities
- `tests/integration/` - Integration tests with Azure DevOps API

Run tests:
```bash
npm test
```

## License

MIT
