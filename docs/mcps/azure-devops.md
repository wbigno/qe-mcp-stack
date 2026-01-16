# Azure DevOps MCP

Azure DevOps integration MCP providing comprehensive work item management and sprint tracking capabilities.

## Features

- **Work Item Queries**: Query work items by sprint, custom WIQL, or specific IDs
- **Work Item Management**: Create, update, and retrieve work items
- **Enhanced Work Items**: Fetch work items with development links (PRs, commits, builds), attachments, and related items
- **PR File Analysis**: Get files changed in linked Pull Requests for blast radius expansion
- **Test Case Management**: Create, update, and manage test cases
- **Smart Test Case Comparison**: Compare generated test cases with existing ones (NEW/UPDATE/EXISTS)
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

### Enhanced Work Items (Development Links & PR Analysis)

These endpoints provide enhanced work item data including development links (PRs, commits, builds), attachments, and related work items. They also enable PR file analysis for blast radius expansion and smart test case comparison.

#### POST /work-items/enhanced

Fetch work items with full development link data, attachments, and relations parsed.

```json
{
  "workItemIds": [12345, 12346]
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 12345,
      "fields": { ... },
      "developmentLinks": [
        {
          "type": "PullRequest",
          "artifactUri": "vstfs:///Git/PullRequestId/...",
          "repositoryId": "repo-guid",
          "projectId": "project-guid",
          "pullRequestId": 789
        },
        {
          "type": "Commit",
          "artifactUri": "vstfs:///Git/Commit/...",
          "commitId": "abc123..."
        }
      ],
      "attachments": [
        {
          "id": "attach-guid",
          "name": "requirements.pdf",
          "url": "https://...",
          "size": 102400,
          "createdDate": "2025-01-15T10:00:00Z"
        }
      ],
      "relatedWorkItems": [
        { "id": 456, "relationType": "Related" }
      ],
      "parentWorkItem": { "id": 100, "relationType": "Parent" },
      "childWorkItems": [
        { "id": 200, "relationType": "Child" }
      ]
    }
  ]
}
```

#### GET /work-items/:id/files-changed

Get all files changed in Pull Requests linked to a work item. Used for expanding blast radius analysis beyond the Impact field.

**Response:**

```json
{
  "success": true,
  "data": {
    "workItemId": 12345,
    "files": [
      "src/services/auth-service.ts",
      "src/components/LoginForm.tsx",
      "tests/auth.test.ts"
    ],
    "pullRequests": [
      {
        "pullRequestId": 789,
        "title": "Implement login feature",
        "status": "completed",
        "fileCount": 3,
        "changes": [
          {
            "path": "src/services/auth-service.ts",
            "changeType": "edit"
          }
        ]
      }
    ]
  }
}
```

#### GET /work-items/:id/existing-test-cases

Get existing test cases linked to a work item via "TestedBy" relation.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 5001,
      "title": "TC01 PBI-12345: Verify login functionality",
      "state": "Active",
      "steps": [
        {
          "stepNumber": 1,
          "action": "Navigate to login page",
          "expectedResult": "Login form displayed"
        }
      ],
      "linkedWorkItemId": 12345
    }
  ]
}
```

#### POST /work-items/:id/compare-test-cases

Compare generated test cases with existing ones. Returns comparison status for each: NEW (create), UPDATE (modify), or EXISTS (skip).

**Request:**

```json
{
  "generatedTestCases": [
    {
      "title": "TC01 PBI-12345: Verify login functionality",
      "steps": [
        {
          "action": "Navigate to login page",
          "expectedResult": "Login form displayed",
          "stepNumber": 1
        }
      ]
    },
    {
      "title": "TC02 PBI-12345: Verify logout functionality",
      "steps": [...]
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "workItemId": 12345,
    "workItemTitle": "Login page design",
    "existingTestCases": [...],
    "generatedTestCases": [...],
    "comparisons": [
      {
        "generated": { "title": "TC01...", "steps": [...] },
        "existing": { "id": 5001, "title": "TC01...", "steps": [...] },
        "status": "UPDATE",
        "similarity": 85,
        "diff": {
          "titleChanged": false,
          "stepsAdded": 1,
          "stepsRemoved": 0,
          "stepsModified": 0
        }
      },
      {
        "generated": { "title": "TC02...", "steps": [...] },
        "existing": null,
        "status": "NEW",
        "similarity": 0
      }
    ],
    "summary": {
      "newCount": 1,
      "updateCount": 1,
      "existsCount": 0,
      "totalGenerated": 2,
      "totalExisting": 1
    }
  }
}
```

**Comparison Logic:**

- `NEW`: similarity < 40% - Create as new test case
- `UPDATE`: similarity 40-90% - Update existing test case
- `EXISTS`: similarity > 90% - Skip, already exists

#### PATCH /work-items/test-cases/:id

Update an existing test case.

**Request:**

```json
{
  "title": "Updated test case title",
  "steps": [
    {
      "action": "Updated step action",
      "expectedResult": "Updated expected result",
      "stepNumber": 1
    }
  ],
  "priority": 2,
  "automationStatus": "Planned"
}
```

#### GET /work-items/pull-requests/:repoId/:prId

Get Pull Request details from Azure DevOps Git API.

#### GET /work-items/pull-requests/:repoId/:prId/changes

Get files changed in a specific Pull Request.

### Test Plan Management

Test Plans in Azure DevOps organize test cases hierarchically. This MCP supports creating and managing test plans with proper hierarchy:

```
Test Plan
└── Feature Suite (StaticTestSuite) - Groups related PBIs
    └── PBI Suite (RequirementTestSuite) - Links to work item
        └── Test Cases
```

#### GET /work-items/test-plans

Get all test plans in the project.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1234,
      "name": "Sprint 42 Test Plan",
      "state": "Active",
      "iteration": "Project\\Sprint 42",
      "rootSuite": { "id": 5678, "name": "Sprint 42 Test Plan" }
    }
  ]
}
```

#### GET /work-items/test-plans/:planId

Get a specific test plan by ID.

#### POST /work-items/test-plans

Create a new test plan.

```json
{
  "name": "Sprint 43 Test Plan",
  "areaPath": "Project\\Team",
  "iteration": "Project\\Sprint 43",
  "description": "Test plan for Sprint 43 features"
}
```

#### GET /work-items/test-plans/:planId/suites

Get all test suites for a plan.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "name": "Sprint 42 Test Plan",
      "suiteType": "StaticTestSuite",
      "parentSuite": null
    },
    {
      "id": 101,
      "name": "Feature 123: User Authentication",
      "suiteType": "StaticTestSuite",
      "parentSuite": { "id": 100 }
    },
    {
      "id": 102,
      "name": "456: Login page design",
      "suiteType": "RequirementTestSuite",
      "parentSuite": { "id": 101 },
      "requirementId": 456
    }
  ]
}
```

#### POST /work-items/test-plans/:planId/suites

Create a test suite under a plan.

**Static Suite (for Feature grouping):**

```json
{
  "name": "Feature 123: User Authentication",
  "suiteType": "StaticTestSuite",
  "parentSuiteId": 100
}
```

**Requirement Suite (links to PBI/Feature):**

```json
{
  "name": "456: Login page design",
  "suiteType": "RequirementTestSuite",
  "parentSuiteId": 101,
  "requirementId": 456
}
```

**Dynamic Suite (query-based):**

```json
{
  "name": "All Active Test Cases",
  "suiteType": "DynamicTestSuite",
  "parentSuiteId": 100,
  "queryString": "SELECT * FROM TestCase WHERE [System.State] = 'Active'"
}
```

#### POST /work-items/test-plans/:planId/suites/:suiteId/test-cases

Add existing test cases to a suite.

```json
{
  "testCaseIds": [1001, 1002, 1003]
}
```

#### POST /work-items/create-test-cases-in-plan

**Primary endpoint for creating test cases with proper hierarchy.**

This endpoint automatically:

1. Finds or creates a Feature suite (if featureId provided)
2. Finds or creates a PBI suite linked to the story
3. Creates all test cases as work items
4. Adds test cases to the PBI suite

```json
{
  "testPlanId": 1234,
  "storyId": 456,
  "storyTitle": "Login page design",
  "featureId": 123,
  "featureTitle": "User Authentication",
  "testCases": [
    {
      "title": "TC01 PBI-456 AC1: [positive] Verify successful login",
      "steps": [
        {
          "stepNumber": 1,
          "action": "Navigate to login page",
          "expectedResult": "Login form is displayed"
        },
        {
          "stepNumber": 2,
          "action": "Enter valid credentials",
          "expectedResult": "Fields accept input"
        }
      ]
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "testCases": [
      {
        "id": 1001,
        "fields": {
          "System.Title": "TC01 PBI-456 AC1: [positive] Verify successful login"
        }
      }
    ],
    "suite": {
      "id": 102,
      "name": "456: Login page design",
      "suiteType": "RequirementTestSuite",
      "requirementId": 456
    }
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
import { MCPClient } from "@qe-mcp-stack/mcp-sdk";

const client = new MCPClient({
  baseURL: "http://azure-devops:8100",
});

// Query work items
const workItems = await client.post("/work-items/query", {
  sprint: "25.Q4.07",
  project: "Core",
});

// Get projects
const projects = await client.get("/iterations/projects");
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
