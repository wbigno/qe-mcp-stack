# Test Plan Manager MCP

## Overview

The Test Plan Manager MCP provides comprehensive test plan management capabilities, including test suite organization, test case lifecycle management, and integration with Azure DevOps Test Plans. This MCP enables structured test planning, execution tracking, and reporting across multiple test suites.

**Port**: 8102 (HTTP API)
**Swagger UI**: http://localhost:8102/api-docs
**Category**: Integration MCP
**Docker Container**: `qe-test-plan-manager-mcp`

## Architecture

```
Azure DevOps Test Plans API
         ↕ HTTP/REST API
    Test Plan Manager MCP Server (HTTP)
         ↕ HTTP REST API (port 8102)
         Orchestrator / Claude Desktop
```

The system provides:
1. **Test Plan Management**: Create, update, and organize test plans
2. **Test Suite Organization**: Hierarchical test suite structure
3. **Test Case Lifecycle**: Track test case creation, execution, and results
4. **Integration with ADO**: Bidirectional sync with Azure DevOps Test Plans

## Features

- 📋 **Test Plan Management**: Create and manage test plans across projects
- 📂 **Test Suite Organization**: Organize tests into logical groupings
- ✅ **Test Case Management**: Create, update, and track test cases
- 🔄 **Execution Tracking**: Monitor test execution progress and results
- 📊 **Reporting**: Generate test coverage and execution reports
- 🔗 **ADO Integration**: Sync with Azure DevOps Test Plans
- 💚 **Health Monitoring**: Built-in health checks and status endpoints

## Core Concepts

### Test Plans
A test plan is a collection of test suites that defines the testing scope for a release or iteration. Test plans typically map to:
- Sprint releases
- Feature releases
- Regression test cycles
- UAT phases

### Test Suites
Test suites group related test cases together. Types include:
- **Static Suites**: Manually created collections of test cases
- **Requirement-Based Suites**: Test cases linked to user stories/requirements
- **Query-Based Suites**: Dynamic suites based on work item queries

### Test Cases
Individual test scenarios that define:
- Test steps and expected results
- Preconditions and test data
- Priority and assignment
- Automation status
- Execution history

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8102
NODE_ENV=production

# Azure DevOps Configuration
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_ORG=your-organization-name
AZURE_DEVOPS_PROJECT=your-default-project

# Optional Configuration
AZURE_DEVOPS_API_VERSION=7.0
DEFAULT_TEST_PLAN_NAME=Sprint Test Plan
LOG_LEVEL=info
```

### Azure DevOps Permissions

The Personal Access Token requires these scopes:
- **Test Management**: Read & Write
- **Work Items**: Read & Write
- **Project and Team**: Read

## API Endpoints

### Test Plans

#### GET /api/test-plans
Get all test plans for a project.

**Query Parameters:**
- `project` - Project name (optional, uses default if not specified)
- `state` - Filter by state (Active, Inactive, Completed)

**Response:**
```json
{
  "success": true,
  "testPlans": [
    {
      "id": 12345,
      "name": "Sprint 26.Q1.01 Test Plan",
      "project": "Core",
      "state": "Active",
      "iteration": "Core\\2026\\Q1\\26.Q1.01",
      "startDate": "2026-01-01",
      "endDate": "2026-01-14",
      "owner": "john.doe@example.com"
    }
  ],
  "count": 1
}
```

#### POST /api/test-plans
Create a new test plan.

**Request Body:**
```json
{
  "project": "Core",
  "name": "Sprint 26.Q1.02 Test Plan",
  "iteration": "Core\\2026\\Q1\\26.Q1.02",
  "startDate": "2026-01-15",
  "endDate": "2026-01-28",
  "description": "Test plan for Sprint 26.Q1.02 release"
}
```

**Response:**
```json
{
  "success": true,
  "testPlan": {
    "id": 12346,
    "name": "Sprint 26.Q1.02 Test Plan",
    "url": "https://dev.azure.com/org/Core/_testPlans/define?planId=12346"
  }
}
```

#### GET /api/test-plans/:id
Get test plan details.

**Response:**
```json
{
  "success": true,
  "testPlan": {
    "id": 12345,
    "name": "Sprint 26.Q1.01 Test Plan",
    "project": "Core",
    "state": "Active",
    "iteration": "Core\\2026\\Q1\\26.Q1.01",
    "startDate": "2026-01-01",
    "endDate": "2026-01-14",
    "owner": "john.doe@example.com",
    "statistics": {
      "totalTests": 150,
      "passed": 120,
      "failed": 10,
      "blocked": 5,
      "notRun": 15
    }
  }
}
```

#### PATCH /api/test-plans/:id
Update test plan properties.

**Request Body:**
```json
{
  "state": "Completed",
  "endDate": "2026-01-14"
}
```

### Test Suites

#### GET /api/test-suites
Get test suites for a test plan.

**Query Parameters:**
- `testPlanId` - Test plan ID (required)
- `includeChildSuites` - Include nested suites (default: true)

**Response:**
```json
{
  "success": true,
  "testSuites": [
    {
      "id": 123,
      "name": "Authentication Tests",
      "testPlanId": 12345,
      "suiteType": "StaticTestSuite",
      "testCaseCount": 25,
      "parent": null
    },
    {
      "id": 124,
      "name": "Login Flow",
      "testPlanId": 12345,
      "suiteType": "StaticTestSuite",
      "testCaseCount": 10,
      "parent": 123
    }
  ],
  "count": 2
}
```

#### POST /api/test-suites
Create a new test suite.

**Request Body:**
```json
{
  "testPlanId": 12345,
  "name": "Payment Processing Tests",
  "suiteType": "StaticTestSuite",
  "parentSuiteId": null
}
```

**Response:**
```json
{
  "success": true,
  "testSuite": {
    "id": 125,
    "name": "Payment Processing Tests",
    "testPlanId": 12345,
    "url": "https://dev.azure.com/org/Core/_testPlans/define?planId=12345&suiteId=125"
  }
}
```

#### POST /api/test-suites/:id/test-cases
Add test cases to a suite.

**Request Body:**
```json
{
  "testCaseIds": [67890, 67891, 67892]
}
```

**Response:**
```json
{
  "success": true,
  "added": 3,
  "testCaseIds": [67890, 67891, 67892]
}
```

### Test Cases

#### GET /api/test-cases
Get test cases from a test suite.

**Query Parameters:**
- `testPlanId` - Test plan ID (required)
- `testSuiteId` - Test suite ID (required)
- `state` - Filter by state (Active, Design, Closed)

**Response:**
```json
{
  "success": true,
  "testCases": [
    {
      "id": 67890,
      "title": "Verify user can login with valid credentials",
      "state": "Active",
      "priority": 1,
      "automationStatus": "Automated",
      "assignedTo": "john.doe@example.com",
      "lastExecutionOutcome": "Passed"
    }
  ],
  "count": 1
}
```

#### POST /api/test-cases
Create a new test case and add to suite.

**Request Body:**
```json
{
  "testPlanId": 12345,
  "testSuiteId": 123,
  "title": "Verify password reset functionality",
  "priority": 2,
  "steps": [
    {
      "stepNumber": 1,
      "action": "Navigate to login page and click 'Forgot Password'",
      "expectedResult": "Password reset page is displayed"
    },
    {
      "stepNumber": 2,
      "action": "Enter email address and submit",
      "expectedResult": "Password reset email is sent"
    }
  ],
  "preconditions": "User account must exist in system"
}
```

**Response:**
```json
{
  "success": true,
  "testCase": {
    "id": 67893,
    "title": "Verify password reset functionality",
    "url": "https://dev.azure.com/org/Core/_workitems/edit/67893"
  }
}
```

#### PATCH /api/test-cases/:id
Update test case properties.

**Request Body:**
```json
{
  "state": "Active",
  "automationStatus": "Planned",
  "assignedTo": "jane.smith@example.com"
}
```

### Test Execution

#### POST /api/test-runs
Create a test run to execute tests.

**Request Body:**
```json
{
  "testPlanId": 12345,
  "name": "Sprint 26.Q1.01 - Smoke Tests",
  "testCaseIds": [67890, 67891, 67892],
  "configuration": "Windows 10 + Chrome",
  "comment": "Automated smoke test execution"
}
```

**Response:**
```json
{
  "success": true,
  "testRun": {
    "id": 98765,
    "name": "Sprint 26.Q1.01 - Smoke Tests",
    "state": "InProgress",
    "url": "https://dev.azure.com/org/Core/_testManagement/runs?runId=98765"
  }
}
```

#### POST /api/test-runs/:id/results
Update test results for a run.

**Request Body:**
```json
{
  "results": [
    {
      "testCaseId": 67890,
      "outcome": "Passed",
      "durationInMs": 5000,
      "comment": "Test passed successfully"
    },
    {
      "testCaseId": 67891,
      "outcome": "Failed",
      "durationInMs": 3000,
      "comment": "Element not found",
      "errorMessage": "Timeout waiting for login button"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 2,
  "testRunId": 98765
}
```

#### GET /api/test-runs/:id
Get test run details and results.

**Response:**
```json
{
  "success": true,
  "testRun": {
    "id": 98765,
    "name": "Sprint 26.Q1.01 - Smoke Tests",
    "state": "Completed",
    "totalTests": 3,
    "passedTests": 2,
    "failedTests": 1,
    "startDate": "2026-01-11T10:00:00Z",
    "completeDate": "2026-01-11T10:15:00Z"
  }
}
```

### Health Check

#### GET /health
Service health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "test-plan-manager-mcp",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "port": 8102,
  "connections": {
    "azureDevOps": "connected"
  }
}
```

## Usage Examples

### With Claude Desktop

Once the MCP is running and configured:

- "Create a test plan for Sprint 26.Q1.02"
- "Add test cases from story 63019 to the authentication suite"
- "Show me the test execution results for the last run"
- "Create a test suite for payment processing"
- "Update test case 67890 to mark it as automated"

### With HTTP API

```bash
# Create test plan
curl -X POST http://localhost:8102/api/test-plans \
  -H "Content-Type: application/json" \
  -d '{
    "project": "Core",
    "name": "Sprint 26.Q1.02 Test Plan",
    "iteration": "Core\\2026\\Q1\\26.Q1.02"
  }'

# Get test plans
curl http://localhost:8102/api/test-plans?project=Core

# Create test suite
curl -X POST http://localhost:8102/api/test-suites \
  -H "Content-Type: application/json" \
  -d '{
    "testPlanId": 12345,
    "name": "Authentication Tests"
  }'

# Create test case
curl -X POST http://localhost:8102/api/test-cases \
  -H "Content-Type: application/json" \
  -d '{
    "testPlanId": 12345,
    "testSuiteId": 123,
    "title": "Verify login functionality",
    "steps": [...]
  }'

# Check health
curl http://localhost:8102/health
```

## Development

### Install Dependencies
```bash
cd mcps/integration/test-plan-manager
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Run in Production
```bash
npm start
```

## Docker

### Build Image
```bash
docker build -t test-plan-manager-mcp -f mcps/integration/test-plan-manager/Dockerfile .
```

### Run Container
```bash
docker run -p 8102:8102 \
  -e AZURE_DEVOPS_PAT=your-pat \
  -e AZURE_DEVOPS_ORG=your-org \
  -e AZURE_DEVOPS_PROJECT=Core \
  test-plan-manager-mcp
```

### Docker Compose
```bash
docker compose up test-plan-manager-mcp
```

## Integration with QE MCP Stack

The Test Plan Manager integrates with:
- **Azure DevOps MCP**: Sync work items and test cases
- **Test Generation MCP**: Auto-generate test cases from requirements
- **Playwright Generator MCP**: Create automated tests from test cases
- **Risk Analyzer MCP**: Prioritize test cases based on risk

## Common Workflows

### Creating a Sprint Test Plan

```bash
# 1. Create test plan
curl -X POST http://localhost:8102/api/test-plans \
  -H "Content-Type: application/json" \
  -d '{
    "project": "Core",
    "name": "Sprint 26.Q1.02",
    "iteration": "Core\\2026\\Q1\\26.Q1.02"
  }'

# 2. Create test suites
curl -X POST http://localhost:8102/api/test-suites \
  -H "Content-Type: application/json" \
  -d '{
    "testPlanId": 12346,
    "name": "Smoke Tests"
  }'

# 3. Add existing test cases to suite
curl -X POST http://localhost:8102/api/test-suites/126/test-cases \
  -H "Content-Type: application/json" \
  -d '{
    "testCaseIds": [67890, 67891, 67892]
  }'
```

### Executing Tests and Recording Results

```bash
# 1. Create test run
curl -X POST http://localhost:8102/api/test-runs \
  -H "Content-Type: application/json" \
  -d '{
    "testPlanId": 12346,
    "name": "Automated Run - Build 1234",
    "testCaseIds": [67890, 67891, 67892]
  }'

# 2. Update results
curl -X POST http://localhost:8102/api/test-runs/98766/results \
  -H "Content-Type: application/json" \
  -d '{
    "results": [
      {"testCaseId": 67890, "outcome": "Passed"},
      {"testCaseId": 67891, "outcome": "Passed"},
      {"testCaseId": 67892, "outcome": "Failed", "errorMessage": "Timeout"}
    ]
  }'
```

## Best Practices

### Test Plan Organization
- Create one test plan per sprint/release
- Use hierarchical test suites for better organization
- Link test cases to requirements (user stories)
- Maintain separate suites for smoke, regression, and feature tests

### Test Case Management
- Write clear, unambiguous test steps
- Include preconditions and test data
- Mark automation status accurately
- Keep test cases updated as features evolve

### Execution Tracking
- Use configurations to track test environments
- Record all test results with meaningful comments
- Include error messages and screenshots for failures
- Review failed tests and update as needed

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Azure DevOps
**Solution**:
```bash
# Verify PAT
curl -u :${AZURE_DEVOPS_PAT} \
  https://dev.azure.com/${AZURE_DEVOPS_ORG}/_apis/projects

# Check organization and project names
# Verify PAT has Test Management permissions
```

### Test Case Creation Failures

**Problem**: Unable to create test cases
**Solution**:
1. Verify work item type "Test Case" exists in project
2. Check PAT has Work Items: Write permission
3. Ensure test suite exists and is accessible
4. Verify all required fields are provided

### Performance Issues

**Problem**: Slow test plan queries
**Solution**:
- Enable caching for frequently accessed test plans
- Use pagination for large result sets
- Filter by specific test suites instead of entire plan
- Consider archiving completed test plans

## Dependencies

- **Node.js** 18+ (Alpine)
- **express** ^4.18.2 - HTTP server
- **axios** ^1.6.2 - HTTP client for ADO API
- **azure-devops-node-api** - Azure DevOps SDK

## Related Documentation

- [Azure DevOps Test Plans API](https://learn.microsoft.com/en-us/rest/api/azure/devops/test)
- [Azure DevOps MCP README](../azure-devops/README.md)
- [Orchestrator Health](http://localhost:3000/health)

## Contributing

When making changes to this MCP:

1. Update API endpoint handlers in `src/index.js`
2. Test with Azure DevOps Test Plans API
3. Update this README with new features
4. Add Swagger documentation for new endpoints
5. Update integration tests

## Roadmap

### Planned Features
- [ ] Test configuration management
- [ ] Test attachment support (screenshots, logs)
- [ ] Bulk test case import from Excel/CSV
- [ ] Test case cloning and templates
- [ ] Test execution scheduling
- [ ] Advanced reporting and analytics
- [ ] Integration with CI/CD pipelines
- [ ] Real-time test execution monitoring

## License

MIT
