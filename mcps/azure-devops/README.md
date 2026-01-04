# Azure DevOps - ADO API Integration & Work Item Management

**Type:** Docker MCP (Always Running)  
**Port:** 3003  
**Container:** `qe-azure-devops`  
**Location:** `mcps/azure-devops/`  
**Technology:** Node.js 18 + Express + Azure DevOps REST API v7.0  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Input/Output Schemas](#inputoutput-schemas)
8. [Data Persistence](#data-persistence)
9. [Development](#development)
10. [Testing](#testing)
11. [Error Handling](#error-handling)
12. [Troubleshooting](#troubleshooting)
13. [Monitoring](#monitoring)
14. [Integration](#integration)
15. [Changelog](#changelog)

---

## Overview

### Purpose

The **Azure DevOps MCP** is a specialized service designed to provide seamless integration with Azure DevOps (ADO) REST API for comprehensive work item management, query execution, and test case creation. It serves as the bridge between the QE MCP Stack and Azure DevOps, enabling automated retrieval of user stories, bugs, and features, extraction of acceptance criteria for test generation, creation of test cases, linking of test artifacts to work items, and management of test plans and test suites.

This MCP handles all authentication, API versioning, rate limiting, and error handling for Azure DevOps interactions. It supports the full WIQL (Work Item Query Language) for complex queries, provides intelligent caching to reduce API calls, and includes retry logic for transient failures. The service understands ADO's work item structure, field mappings, and relationships, making it easy to integrate ADO workflows into automated QE processes.

The Azure DevOps MCP is essential for requirements-driven test generation, traceability between requirements and tests, automated test case creation from acceptance criteria, and sprint-based test planning. It enables teams to maintain a single source of truth in Azure DevOps while automating test generation and execution tracking.

### Key Features

- ✅ **WIQL Query Execution** - Execute complex Work Item Query Language queries with full syntax support
- ✅ **Sprint-Based Retrieval** - Pull all work items for a specific sprint with automatic iteration path resolution
- ✅ **Work Item CRUD** - Create, read, update, and delete work items with full field support
- ✅ **Acceptance Criteria Extraction** - Parse and extract acceptance criteria for automated test generation
- ✅ **Test Case Management** - Create test cases, test plans, and test suites programmatically
- ✅ **Work Item Linking** - Create parent-child, related, and tested-by relationships between work items
- ✅ **Field Validation** - Validate work item fields against ADO project configuration
- ✅ **Batch Operations** - Retrieve and update multiple work items efficiently in single API calls
- ✅ **Intelligent Caching** - Cache work items with TTL to reduce API calls and improve performance
- ✅ **Authentication Management** - Secure PAT (Personal Access Token) handling with automatic refresh

### Use Cases

1. **Sprint Story Retrieval** - Pull all user stories and bugs for the current sprint for test planning
2. **Acceptance Criteria Extraction** - Extract acceptance criteria from stories for automated test case generation
3. **Test Case Creation** - Automatically create test cases from user stories with proper linking
4. **Test Plan Management** - Create and organize test plans and test suites for sprint testing
5. **Traceability** - Maintain bidirectional links between requirements, test cases, and test results
6. **Automation Requirements** - Generate automation requirements documents from ADO work items
7. **Test Result Publishing** - Update work items with test execution results and status
8. **Requirement Analysis** - Analyze work item descriptions and acceptance criteria for testability

### What It Does NOT Do

- ❌ Does not execute tests (delegates to test execution frameworks)
- ❌ Does not generate tests (delegates to test generation MCPs)
- ❌ Does not store work item data permanently (caching only)
- ❌ Does not modify ADO project configuration (work items only)
- ❌ Does not support Azure DevOps Server (Azure DevOps Services/Cloud only)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Pull current sprint stories
curl -X POST http://localhost:3000/api/ado/pull-stories \
  -H "Content-Type: application/json" \
  -d '{
    "sprint": "Sprint 45"
  }'

# Pull specific work items
curl -X POST http://localhost:3000/api/ado/pull-stories \
  -H "Content-Type: application/json" \
  -d '{
    "workItemIds": [12345, 12346, 12347]
  }'

# Create test case from story
curl -X POST http://localhost:3000/api/ado/create-test-case \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Patient Search Functionality",
    "steps": [
      {"action": "Navigate to patient search", "expected": "Search page loads"},
      {"action": "Enter patient name", "expected": "Results appear"}
    ],
    "parentStoryId": 12345
  }'
```

### Direct Access (Testing Only)

```bash
# Execute WIQL query
curl -X POST http://localhost:3003/work-items/query \
  -H "Content-Type: application/json" \
  -d '{
    "wiql": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = '\''Active'\''"
  }'

# Get specific work items
curl -X POST http://localhost:3003/work-items/get \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [12345, 12346]
  }'

# Create work item
curl -X POST http://localhost:3003/work-items/create \
  -H "Content-Type: application/json" \
  -d '{
    "workItemType": "Test Case",
    "title": "Verify Login Functionality",
    "fields": {
      "System.Description": "Test that users can login successfully",
      "System.AreaPath": "MyProject\\Testing"
    }
  }'

# Update work item
curl -X POST http://localhost:3003/work-items/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "fields": {
      "System.State": "Resolved",
      "System.AssignedTo": "john.doe@company.com"
    }
  }'

# Create link between work items
curl -X POST http://localhost:3003/work-items/link \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": 12345,
    "targetId": 12346,
    "linkType": "System.LinkTypes.Hierarchy-Forward"
  }'

# Health check
curl http://localhost:3003/health
```

### Expected Output

```json
{
  "success": true,
  "workItems": [
    {
      "id": 12345,
      "rev": 5,
      "url": "https://dev.azure.com/williambigno/test/_apis/wit/workItems/12345",
      "fields": {
        "System.Id": 12345,
        "System.WorkItemType": "User Story",
        "System.Title": "As a clinician, I want to search for patients by name",
        "System.State": "Active",
        "System.AssignedTo": {
          "displayName": "John Doe",
          "uniqueName": "john.doe@company.com"
        },
        "System.CreatedDate": "2024-12-01T10:00:00Z",
        "System.ChangedDate": "2024-12-15T14:30:00Z",
        "System.IterationPath": "MyProject\\Sprint 45",
        "System.AreaPath": "MyProject\\Clinical",
        "System.Description": "<div>Users need the ability to search for patients by their full or partial name to quickly locate patient records.</div>",
        "Microsoft.VSTS.Common.AcceptanceCriteria": "<div>Given I am on the patient search page<br>When I enter a patient name<br>Then I see a list of matching patients<br><br>Given I enter a partial name<br>When I search<br>Then results include all patients with names containing that text</div>",
        "Microsoft.VSTS.Common.Priority": 1,
        "System.Tags": "Epic:PatientManagement; Feature:Search"
      },
      "relations": [
        {
          "rel": "System.LinkTypes.Hierarchy-Reverse",
          "url": "https://dev.azure.com/williambigno/test/_apis/wit/workItems/12300",
          "attributes": {
            "name": "Parent"
          }
        }
      ]
    },
    {
      "id": 12346,
      "fields": {
        "System.WorkItemType": "Bug",
        "System.Title": "Patient search returns incorrect results",
        "System.State": "New",
        "System.Priority": 2,
        "System.Description": "When searching for 'John Smith', results include patients with only 'John' in name"
      }
    }
  ],
  "count": 2,
  "cached": false,
  "executionTime": 450,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│              Azure DevOps MCP (Port 3003)                        │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ ADO API      │──▶│ Work Item      │         │
│  │ Router   │   │ Client       │   │ Manager        │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      REST API Calls      Work Item CRUD              │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ WIQL         │   │ Field        │   │ Cache        │      │
│  │ Builder      │   │ Validator    │   │ Manager      │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Azure DevOps API    Field Validation    Cached Data
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /work-items/query` - Execute WIQL queries
   - `POST /work-items/get` - Get specific work items by ID
   - `POST /work-items/create` - Create new work items
   - `POST /work-items/update` - Update existing work items
   - `POST /work-items/link` - Create links between work items
   - `POST /test-cases/create` - Create test cases
   - `POST /test-plans/create` - Create test plans
   - `GET /health` - Health check endpoint

2. **ADO API Client** (`src/services/adoClient.js`)
   - **HTTP Client** - Axios-based client with authentication headers
   - **Rate Limiter** - Respects ADO API rate limits (200 requests/minute)
   - **Retry Logic** - Automatic retry for transient failures (429, 503)
   - **Response Parser** - Parses ADO responses into consistent format
   - **Error Handler** - Converts ADO errors into user-friendly messages

3. **Work Item Manager** (`src/services/workItemManager.js`)
   - **CRUD Operations** - Create, read, update, delete work items
   - **Batch Retrieval** - Fetch multiple work items in single API call
   - **Field Mapping** - Map between user-friendly and ADO field names
   - **Validation** - Validate work item fields before API calls

4. **WIQL Builder** (`src/services/wiqlBuilder.js`)
   - **Sprint Query Builder** - Generate WIQL for sprint-based queries
   - **Query Validator** - Validate WIQL syntax before execution
   - **Parameter Injection** - Safely inject parameters into WIQL queries
   - **Common Queries** - Pre-built queries for common scenarios

5. **Field Validator** (`src/utils/fieldValidator.js`)
   - **Required Fields** - Validate required fields are present
   - **Field Types** - Validate field value types (string, int, date, etc.)
   - **Allowed Values** - Validate against picklist values
   - **Area/Iteration Paths** - Validate paths exist in project

6. **Cache Manager** (`src/services/cacheManager.js`)
   - **TTL Cache** - Time-based cache with configurable expiration
   - **Work Item Cache** - Cache individual work items by ID
   - **Query Cache** - Cache WIQL query results
   - **Invalidation** - Automatic cache invalidation on updates

7. **Link Manager** (`src/services/linkManager.js`)
   - **Link Types** - Support all ADO link types (Parent, Child, Related, Tested By)
   - **Bidirectional Links** - Automatically create reverse links
   - **Link Validation** - Validate source and target work items exist

### Dependencies

**Internal:**
- None (standalone integration MCP)

**External Services:**
- Azure DevOps REST API v7.0 (`https://dev.azure.com/{org}/{project}/_apis/`)
- Authentication via Personal Access Token (PAT)

**Libraries:**
- express - HTTP server
- axios - HTTP client for ADO API
- node-cache - In-memory caching
- winston - Logging
- joi - Request validation

### Data Flow

```
1. HTTP Request (POST /work-items/query)
   │
   ▼
2. Request Validation
   ├─▶ Validate authentication token present
   ├─▶ Validate request parameters
   └─▶ Check cache for recent results
       │
       ├─ Cache Hit → Return cached results
       │
       └─ Cache Miss
          │
          ▼
3. WIQL Query Building (if sprint/criteria provided)
   ├─▶ Build WIQL query from parameters
   ├─▶ Inject sprint/iteration path
   ├─▶ Add field selections
   └─▶ Validate WIQL syntax
       │
       ▼
4. ADO API Call
   ├─▶ Add authentication headers (PAT)
   ├─▶ Set API version (7.0)
   ├─▶ Execute POST request to ADO
   └─▶ Handle rate limiting (429 responses)
       │
       ▼
5. Response Processing
   ├─▶ Parse JSON response
   ├─▶ Extract work item IDs
   └─▶ Batch fetch full work item details
       │
       ▼
6. Field Expansion
   ├─▶ Fetch all fields for each work item
   ├─▶ Expand identity fields (AssignedTo, CreatedBy)
   ├─▶ Fetch relations (links to other work items)
   └─▶ Format dates and HTML fields
       │
       ▼
7. Result Formatting
   ├─▶ Convert ADO format to standard format
   ├─▶ Extract acceptance criteria
   ├─▶ Parse HTML descriptions
   └─▶ Build work item objects
       │
       ▼
8. Caching
   ├─▶ Store results in cache with TTL
   ├─▶ Store individual work items
   └─▶ Update cache metadata
       │
       ▼
9. Response
   └─▶ Return JSON response with work items
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3003 | Azure DevOps MCP HTTP port |
| `ADO_PAT` | ✅ Yes | - | Azure DevOps Personal Access Token |
| `ADO_ORG` | ✅ Yes | - | Azure DevOps organization name |
| `ADO_PROJECT` | ✅ Yes | - | Azure DevOps project name |
| `ADO_API_VERSION` | ❌ No | 7.0 | ADO REST API version |
| `CACHE_TTL` | ❌ No | 3600 | Cache time-to-live in seconds (1 hour) |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |

### Configuration Files

#### `.env` Example

```bash
# Azure DevOps Configuration
ADO_PAT=abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstu
ADO_ORG=williambigno
ADO_PROJECT=test

# Optional Configuration
ADO_API_VERSION=7.0
CACHE_TTL=3600
PORT=3003
LOG_LEVEL=info
```

#### `config/ado-config.json`

Additional ADO project configuration:

```json
{
  "organization": "williambigno",
  "project": "test",
  "apiVersion": "7.0",
  "baseUrl": "https://dev.azure.com",
  "workItemTypes": [
    "User Story",
    "Bug",
    "Task",
    "Feature",
    "Epic",
    "Test Case"
  ],
  "fields": {
    "required": [
      "System.Title",
      "System.WorkItemType",
      "System.State"
    ],
    "optional": [
      "System.Description",
      "System.AssignedTo",
      "System.Tags",
      "Microsoft.VSTS.Common.AcceptanceCriteria",
      "Microsoft.VSTS.Common.Priority"
    ]
  },
  "testCase": {
    "areaPath": "test\\Testing",
    "iterationPath": "test",
    "defaultState": "Design",
    "defaultTags": ["AutoGenerated", "QE"],
    "template": "Test Case"
  },
  "states": {
    "User Story": ["New", "Active", "Resolved", "Closed", "Removed"],
    "Bug": ["New", "Active", "Resolved", "Closed"],
    "Test Case": ["Design", "Ready", "Closed"]
  },
  "linkTypes": {
    "parent": "System.LinkTypes.Hierarchy-Reverse",
    "child": "System.LinkTypes.Hierarchy-Forward",
    "related": "System.LinkTypes.Related",
    "testedBy": "Microsoft.VSTS.Common.TestedBy-Forward",
    "tests": "Microsoft.VSTS.Common.TestedBy-Reverse"
  }
}
```

**Field Descriptions:**

- `workItemTypes` - Supported work item types in the project
- `fields.required` - Fields that must be provided when creating work items
- `testCase` - Default configuration for test case creation
- `states` - Valid states for each work item type
- `linkTypes` - ADO link type identifiers for relationships

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
azure-devops:
  build: ./mcps/azure-devops
  container_name: qe-azure-devops
  ports:
    - "3003:3003"
  environment:
    - NODE_ENV=production
    - PORT=3003
  env_file:
    - .env  # Contains ADO_PAT, ADO_ORG, ADO_PROJECT
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/azure-devops:/app/data    # Cached work items
  networks:
    - qe-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read ADO configuration
- `./data/azure-devops` - Store cached work items and query results

---

## API Reference

### Work Item Query Endpoints

#### POST /work-items/query

Execute WIQL query or retrieve work items by sprint/criteria

**Request Body:**
```typescript
{
  wiql?: string;           // Optional: Direct WIQL query
  sprint?: string;         // Optional: Sprint name or iteration path
  workItemIds?: number[];  // Optional: Specific work item IDs
  workItemType?: string;   // Optional: Filter by type ("User Story", "Bug", etc.)
  state?: string;          // Optional: Filter by state ("Active", "Resolved", etc.)
  assignedTo?: string;     // Optional: Filter by assignee email
  tags?: string[];         // Optional: Filter by tags
}
```

**Response:**
```typescript
{
  success: boolean;
  workItems: WorkItem[];
  count: number;
  cached: boolean;
  executionTime: number;
  timestamp: string;
}
```

**Example - Sprint Query:**
```bash
curl -X POST http://localhost:3003/work-items/query \
  -H "Content-Type: application/json" \
  -d '{
    "sprint": "Sprint 45",
    "workItemType": "User Story"
  }'
```

**Example - WIQL Query:**
```bash
curl -X POST http://localhost:3003/work-items/query \
  -H "Content-Type: application/json" \
  -d '{
    "wiql": "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = '\''Active'\'' AND [System.WorkItemType] = '\''Bug'\''"
  }'
```

**Example - Specific IDs:**
```bash
curl -X POST http://localhost:3003/work-items/query \
  -H "Content-Type: application/json" \
  -d '{
    "workItemIds": [12345, 12346, 12347]
  }'
```

---

#### POST /work-items/get

Get full details for specific work items by ID

**Request Body:**
```typescript
{
  ids: number[];          // Required: Array of work item IDs
  expand?: string;        // Optional: "relations" | "all" | "none"
}
```

**Response:**
```typescript
{
  success: boolean;
  workItems: WorkItem[];
  count: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3003/work-items/get \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [12345, 12346],
    "expand": "relations"
  }'
```

---

### Work Item CRUD Endpoints

#### POST /work-items/create

Create a new work item

**Request Body:**
```typescript
{
  workItemType: string;   // Required: "User Story" | "Bug" | "Test Case" | etc.
  title: string;          // Required: Work item title
  fields?: {              // Optional: Additional fields
    "System.Description"?: string;
    "System.AssignedTo"?: string;
    "System.AreaPath"?: string;
    "System.IterationPath"?: string;
    "System.Tags"?: string;
    "Microsoft.VSTS.Common.AcceptanceCriteria"?: string;
    "Microsoft.VSTS.Common.Priority"?: number;
    [key: string]: any;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  workItem: WorkItem;
  message: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3003/work-items/create \
  -H "Content-Type: application/json" \
  -d '{
    "workItemType": "Test Case",
    "title": "Verify patient search returns correct results",
    "fields": {
      "System.Description": "Test that searching for patient name returns matching patients",
      "System.AreaPath": "MyProject\\Testing",
      "System.Tags": "AutoGenerated; QE"
    }
  }'
```

---

#### POST /work-items/update

Update an existing work item

**Request Body:**
```typescript
{
  id: number;             // Required: Work item ID
  fields: {               // Required: Fields to update
    [fieldName: string]: any;
  };
  comment?: string;       // Optional: Comment to add to work item
}
```

**Response:**
```typescript
{
  success: boolean;
  workItem: WorkItem;
  message: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3003/work-items/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "fields": {
      "System.State": "Resolved",
      "System.AssignedTo": "john.doe@company.com"
    },
    "comment": "Tests completed successfully"
  }'
```

---

#### POST /work-items/link

Create a link between two work items

**Request Body:**
```typescript
{
  sourceId: number;       // Required: Source work item ID
  targetId: number;       // Required: Target work item ID
  linkType: string;       // Required: Link type identifier
  comment?: string;       // Optional: Comment for the link
}
```

**Link Types:**
- `System.LinkTypes.Hierarchy-Forward` - Child link (source is parent of target)
- `System.LinkTypes.Hierarchy-Reverse` - Parent link (source is child of target)
- `System.LinkTypes.Related` - Related link (bidirectional)
- `Microsoft.VSTS.Common.TestedBy-Forward` - Tested by link (target tests source)
- `Microsoft.VSTS.Common.TestedBy-Reverse` - Tests link (source tests target)

**Response:**
```typescript
{
  success: boolean;
  link: {
    sourceId: number;
    targetId: number;
    linkType: string;
  };
  message: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3003/work-items/link \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": 12345,
    "targetId": 12350,
    "linkType": "Microsoft.VSTS.Common.TestedBy-Forward",
    "comment": "Test case created for this story"
  }'
```

---

### Test Management Endpoints

#### POST /test-cases/create

Create a test case with steps

**Request Body:**
```typescript
{
  title: string;          // Required: Test case title
  steps: Array<{          // Required: Test steps
    action: string;
    expected: string;
    data?: string;
  }>;
  parentStoryId?: number; // Optional: Link to parent story
  areaPath?: string;      // Optional: Area path (default from config)
  iterationPath?: string; // Optional: Iteration path (default from config)
  tags?: string[];        // Optional: Tags
}
```

**Response:**
```typescript
{
  success: boolean;
  testCase: WorkItem;
  parentLink?: object;
  message: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3003/test-cases/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Verify patient search functionality",
    "steps": [
      {
        "action": "Navigate to patient search page",
        "expected": "Search page loads successfully",
        "data": ""
      },
      {
        "action": "Enter patient name in search field",
        "expected": "Search field accepts input",
        "data": "John Smith"
      },
      {
        "action": "Click Search button",
        "expected": "Results display matching patients",
        "data": ""
      }
    ],
    "parentStoryId": 12345,
    "tags": ["Search", "PatientManagement", "AutoGenerated"]
  }'
```

---

#### POST /test-plans/create

Create a test plan for organizing test cases

**Request Body:**
```typescript
{
  name: string;           // Required: Test plan name
  areaPath?: string;      // Optional: Area path
  iterationPath?: string; // Optional: Iteration path
  description?: string;   // Optional: Description
}
```

**Response:**
```typescript
{
  success: boolean;
  testPlan: {
    id: number;
    name: string;
    url: string;
  };
  message: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3003/test-plans/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprint 45 Test Plan",
    "iterationPath": "MyProject\\Sprint 45",
    "description": "Test plan for Sprint 45 user stories"
  }'
```

---

### Health Endpoints

#### GET /health

Service health check

**Response:**
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  uptime: number;
  version: string;
  adoConnection: "connected" | "disconnected";
  cache: {
    enabled: boolean;
    size: number;
  };
  timestamp: string;
}
```

**Example:**
```bash
curl http://localhost:3003/health
```

---

## Usage Examples

### Example 1: Pull Current Sprint Stories

**Scenario:** Retrieve all user stories for the current sprint for test planning

```bash
curl -X POST http://localhost:3003/work-items/query \
  -H "Content-Type: application/json" \
  -d '{
    "sprint": "Sprint 45",
    "workItemType": "User Story",
    "state": "Active"
  }'
```

**Response:**
```json
{
  "success": true,
  "workItems": [
    {
      "id": 12345,
      "fields": {
        "System.Title": "As a clinician, I want to search for patients",
        "System.State": "Active",
        "Microsoft.VSTS.Common.AcceptanceCriteria": "Given I am on search page\nWhen I enter name\nThen I see results"
      }
    },
    {
      "id": 12346,
      "fields": {
        "System.Title": "As a patient, I want to book appointments",
        "System.State": "Active"
      }
    }
  ],
  "count": 2
}
```

**Use Case:** Feed these stories to requirements-analyzer for test case generation

---

### Example 2: Create Test Case from Story

**Scenario:** Automatically create a test case for a user story

```bash
# Step 1: Get story details
STORY=$(curl -s -X POST http://localhost:3003/work-items/get \
  -H "Content-Type: application/json" \
  -d '{"ids": [12345]}')

# Step 2: Extract acceptance criteria (parsed by your code)
# Acceptance criteria: "Given I am on search page\nWhen I enter name\nThen I see results"

# Step 3: Create test case
curl -X POST http://localhost:3003/test-cases/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Verify patient search functionality",
    "steps": [
      {
        "action": "Navigate to patient search page",
        "expected": "Search page loads"
      },
      {
        "action": "Enter patient name",
        "expected": "Results display"
      }
    ],
    "parentStoryId": 12345,
    "tags": ["AutoGenerated", "PatientSearch"]
  }'
```

**Response:**
```json
{
  "success": true,
  "testCase": {
    "id": 12400,
    "fields": {
      "System.Title": "Verify patient search functionality",
      "System.WorkItemType": "Test Case",
      "System.State": "Design"
    }
  },
  "parentLink": {
    "sourceId": 12345,
    "targetId": 12400,
    "linkType": "Microsoft.VSTS.Common.TestedBy-Forward"
  }
}
```

---

### Example 3: Query Active Bugs

**Scenario:** Find all active bugs assigned to QA team

```bash
curl -X POST http://localhost:3003/work-items/query \
  -H "Content-Type: application/json" \
  -d '{
    "wiql": "SELECT [System.Id], [System.Title], [System.AssignedTo] FROM WorkItems WHERE [System.WorkItemType] = '\''Bug'\'' AND [System.State] = '\''Active'\'' AND [System.Tags] CONTAINS '\''QA'\''"
  }'
```

**Response:**
```json
{
  "success": true,
  "workItems": [
    {
      "id": 12350,
      "fields": {
        "System.Title": "Search returns incorrect results for partial names",
        "System.AssignedTo": {
          "displayName": "Jane Smith",
          "uniqueName": "jane.smith@company.com"
        },
        "System.Priority": 1
      }
    }
  ],
  "count": 1
}
```

---

### Example 4: Update Work Item State

**Scenario:** Mark a story as resolved after tests pass

```bash
curl -X POST http://localhost:3003/work-items/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "fields": {
      "System.State": "Resolved",
      "Microsoft.VSTS.Common.ResolvedReason": "Verified"
    },
    "comment": "All test cases passed. Story verified in Sprint 45."
  }'
```

**Response:**
```json
{
  "success": true,
  "workItem": {
    "id": 12345,
    "rev": 6,
    "fields": {
      "System.State": "Resolved",
      "System.ChangedDate": "2024-12-29T10:30:00Z"
    }
  },
  "message": "Work item 12345 updated successfully"
}
```

---

### Example 5: Create Parent-Child Relationship

**Scenario:** Link a task to its parent story

```bash
curl -X POST http://localhost:3003/work-items/link \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": 12345,
    "targetId": 12360,
    "linkType": "System.LinkTypes.Hierarchy-Forward",
    "comment": "Task created for implementing patient search"
  }'
```

**Response:**
```json
{
  "success": true,
  "link": {
    "sourceId": 12345,
    "targetId": 12360,
    "linkType": "System.LinkTypes.Hierarchy-Forward"
  },
  "message": "Link created successfully"
}
```

---

### Example 6: Batch Retrieve Work Items

**Scenario:** Get full details for multiple work items efficiently

```bash
curl -X POST http://localhost:3003/work-items/get \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [12345, 12346, 12347, 12348, 12349],
    "expand": "relations"
  }'
```

**Response:**
```json
{
  "success": true,
  "workItems": [
    {
      "id": 12345,
      "fields": {...},
      "relations": [
        {
          "rel": "Microsoft.VSTS.Common.TestedBy-Forward",
          "url": "...",
          "attributes": {
            "name": "Tested By"
          }
        }
      ]
    },
    // ... 4 more work items
  ],
  "count": 5
}
```

---

### Example 7: Extract Acceptance Criteria for Test Generation

**Scenario:** Get acceptance criteria from story for automated test generation

```bash
# Get story
STORY=$(curl -s -X POST http://localhost:3003/work-items/get \
  -H "Content-Type: application/json" \
  -d '{"ids": [12345]}')

# Extract acceptance criteria
CRITERIA=$(echo $STORY | jq -r '.workItems[0].fields["Microsoft.VSTS.Common.AcceptanceCriteria"]')

echo "Acceptance Criteria:"
echo "$CRITERIA" | sed 's/<[^>]*>//g' | sed 's/&nbsp;/ /g'
```

**Output:**
```
Acceptance Criteria:
Given I am on the patient search page
When I enter a patient name
Then I see a list of matching patients

Given I enter a partial name
When I search
Then results include all patients with names containing that text
```

**Next Step:** Feed this to test-case-planner or unit-test-generator MCP

---

## Input/Output Schemas

### Input Schema: Query Request

```typescript
interface QueryRequest {
  wiql?: string;           // Direct WIQL query
  sprint?: string;         // Sprint name or iteration path
  workItemIds?: number[];  // Specific work item IDs
  workItemType?: string;   // "User Story" | "Bug" | "Feature" | etc.
  state?: string;          // "New" | "Active" | "Resolved" | "Closed"
  assignedTo?: string;     // User email or display name
  tags?: string[];         // Tags to filter by
}
```

---

### Output Schema: Query Result

```typescript
interface QueryResult {
  success: boolean;
  workItems: WorkItem[];
  count: number;
  cached: boolean;
  executionTime: number;
  timestamp: string;
}

interface WorkItem {
  id: number;
  rev: number;
  url: string;
  fields: WorkItemFields;
  relations?: Relation[];
}

interface WorkItemFields {
  "System.Id": number;
  "System.WorkItemType": string;
  "System.Title": string;
  "System.State": string;
  "System.AssignedTo"?: AssignedTo;
  "System.CreatedDate": string;
  "System.ChangedDate": string;
  "System.CreatedBy"?: Identity;
  "System.ChangedBy"?: Identity;
  "System.IterationPath": string;
  "System.AreaPath": string;
  "System.Description"?: string;
  "System.Tags"?: string;
  "Microsoft.VSTS.Common.AcceptanceCriteria"?: string;
  "Microsoft.VSTS.Common.Priority"?: number;
  "Microsoft.VSTS.Common.Severity"?: string;
  "Microsoft.VSTS.Common.ResolvedReason"?: string;
  [key: string]: any;
}

interface AssignedTo {
  displayName: string;
  uniqueName: string;      // Email
  id?: string;
  imageUrl?: string;
}

interface Identity {
  displayName: string;
  uniqueName: string;
  id: string;
  imageUrl?: string;
}

interface Relation {
  rel: string;             // Link type identifier
  url: string;             // Related work item URL
  attributes: {
    name: string;          // Human-readable link name
    isLocked?: boolean;
    comment?: string;
  };
}
```

---

### Input Schema: Create Work Item

```typescript
interface CreateWorkItemRequest {
  workItemType: string;    // Required: Work item type
  title: string;           // Required: Work item title
  fields?: {               // Optional: Additional fields
    [fieldName: string]: any;
  };
}
```

---

### Output Schema: Create Work Item Result

```typescript
interface CreateWorkItemResult {
  success: boolean;
  workItem: WorkItem;
  message: string;
}
```

---

### Input Schema: Update Work Item

```typescript
interface UpdateWorkItemRequest {
  id: number;              // Required: Work item ID
  fields: {                // Required: Fields to update
    [fieldName: string]: any;
  };
  comment?: string;        // Optional: Comment to add
}
```

---

### Output Schema: Update Work Item Result

```typescript
interface UpdateWorkItemResult {
  success: boolean;
  workItem: WorkItem;
  message: string;
}
```

---

### Input Schema: Create Link

```typescript
interface CreateLinkRequest {
  sourceId: number;        // Required: Source work item ID
  targetId: number;        // Required: Target work item ID
  linkType: string;        // Required: Link type identifier
  comment?: string;        // Optional: Link comment
}
```

---

### Output Schema: Create Link Result

```typescript
interface CreateLinkResult {
  success: boolean;
  link: {
    sourceId: number;
    targetId: number;
    linkType: string;
  };
  message: string;
}
```

---

### Input Schema: Create Test Case

```typescript
interface CreateTestCaseRequest {
  title: string;           // Required: Test case title
  steps: TestStep[];       // Required: Test steps
  parentStoryId?: number;  // Optional: Parent story ID
  areaPath?: string;       // Optional: Area path
  iterationPath?: string;  // Optional: Iteration path
  tags?: string[];         // Optional: Tags
}

interface TestStep {
  action: string;          // Step action/description
  expected: string;        // Expected result
  data?: string;           // Test data
}
```

---

### Output Schema: Create Test Case Result

```typescript
interface CreateTestCaseResult {
  success: boolean;
  testCase: WorkItem;
  parentLink?: {
    sourceId: number;
    targetId: number;
    linkType: string;
  };
  message: string;
}
```

---

## Data Persistence

### Storage Locations

```
./data/azure-devops/
├── cache/
│   ├── work-items/
│   │   ├── 12345.json           # Cached work item 12345
│   │   ├── 12346.json           # Cached work item 12346
│   │   └── metadata.json        # Cache timestamps
│   └── queries/
│       ├── sprint-45-hash.json  # Cached query result
│       └── metadata.json        # Query cache metadata
├── exports/
│   ├── sprint-45-export.json    # Exported work items
│   └── test-cases-export.json   # Exported test cases
└── logs/
    └── azure-devops.log         # Service logs
```

### What Gets Stored

1. **Cached Work Items** (`cache/work-items/*.json`)
   - Individual work items by ID
   - TTL-based expiration (default: 1 hour)
   - Automatically invalidated on updates

2. **Cached Query Results** (`cache/queries/*.json`)
   - WIQL query results
   - Sprint-based query results
   - TTL-based expiration

3. **Exported Data** (`exports/*.json`)
   - Manual exports of work items
   - Backup data for offline access
   - Not automatically managed

4. **Execution Logs** (`logs/azure-devops.log`)
   - API calls to ADO
   - Errors and warnings
   - Performance metrics

### Cache Management

```bash
# View cache status
curl http://localhost:3003/health | jq '.cache'

# Clear cache manually (restart service)
docker compose restart azure-devops

# Or clear cache directory
docker exec qe-azure-devops rm -rf /app/data/cache/*
```

### Data Backup

```bash
# Backup ADO data
./manage-data.sh backup azure-devops

# Restore from backup
./manage-data.sh restore azure-devops
```

---

## Development

### Local Setup

```bash
# Navigate to MCP directory
cd mcps/azure-devops

# Install dependencies
npm install

# Copy environment file
cp ../../.env.example .env

# Edit .env with your ADO credentials
vim .env
# Set: ADO_PAT, ADO_ORG, ADO_PROJECT
```

### Project Structure

```
mcps/azure-devops/
├── src/
│   ├── index.js                     # Entry point
│   ├── routes/
│   │   ├── workItemRoutes.js        # Work item CRUD endpoints
│   │   ├── queryRoutes.js           # Query endpoints
│   │   ├── testRoutes.js            # Test management endpoints
│   │   └── healthRoutes.js          # Health check
│   ├── services/
│   │   ├── adoClient.js             # ADO API client
│   │   ├── workItemManager.js       # Work item operations
│   │   ├── wiqlBuilder.js           # WIQL query builder
│   │   ├── linkManager.js           # Link management
│   │   └── cacheManager.js          # Cache operations
│   └── utils/
│       ├── configReader.js          # Config file reader
│       ├── fieldValidator.js        # Field validation
│       ├── logger.js                # Winston logger
│       └── htmlParser.js            # HTML field parsing
├── tests/
│   ├── unit/
│   │   ├── adoClient.test.js
│   │   ├── wiqlBuilder.test.js
│   │   └── fieldValidator.test.js
│   └── integration/
│       └── workItem.test.js
├── package.json
├── Dockerfile
└── README.md
```

### Running Locally

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# With debug logging
DEBUG=* npm run dev

# Run specific port
PORT=3003 npm start
```

### Debugging with VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Azure DevOps MCP",
      "program": "${workspaceFolder}/mcps/azure-devops/src/index.js",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3003",
        "DEBUG": "*",
        "ADO_PAT": "your-pat-here",
        "ADO_ORG": "your-org",
        "ADO_PROJECT": "your-project"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Testing

### Unit Tests

```bash
cd mcps/azure-devops
npm test
```

**Test Coverage:**
- ADO API client operations
- WIQL query building
- Field validation
- Cache operations
- Link management

### Integration Tests

```bash
# Start service
cd ../..
./start.sh

# Run integration tests
cd mcps/azure-devops
npm run test:integration
```

**Integration Tests Cover:**
- Full work item CRUD workflow
- Query execution
- Link creation
- Test case creation
- Cache behavior

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3003/health

# Test query (replace with your sprint name)
curl -X POST http://localhost:3003/work-items/query \
  -H "Content-Type: application/json" \
  -d '{"sprint": "Sprint 45"}'

# Test work item retrieval
curl -X POST http://localhost:3003/work-items/get \
  -H "Content-Type: application/json" \
  -d '{"ids": [12345]}'
```

### Test Data

Use your actual ADO project for testing, or create a test project with sample work items.

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `MISSING_PAT` | 401 | ADO_PAT not configured | Set ADO_PAT in .env file |
| `INVALID_PAT` | 401 | Personal Access Token invalid | Generate new PAT in ADO |
| `INSUFFICIENT_PERMISSIONS` | 403 | PAT lacks required permissions | Grant Work Items (Read & Write) permission |
| `WORK_ITEM_NOT_FOUND` | 404 | Work item ID doesn't exist | Verify work item ID |
| `INVALID_WIQL` | 400 | WIQL query syntax error | Check WIQL syntax |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many API requests | Wait and retry (automatic retry included) |
| `PROJECT_NOT_FOUND` | 404 | ADO project doesn't exist | Verify ADO_PROJECT setting |
| `FIELD_VALIDATION_ERROR` | 400 | Invalid field value | Check field requirements |
| `LINK_ALREADY_EXISTS` | 409 | Link between work items exists | No action needed |
| `ADO_API_ERROR` | 500 | Azure DevOps API error | Check ADO service status |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "WORK_ITEM_NOT_FOUND",
    "message": "Work item 99999 not found",
    "details": {
      "workItemId": 99999,
      "project": "test",
      "organization": "williambigno",
      "suggestion": "Verify work item ID exists in Azure DevOps"
    }
  },
  "timestamp": "2024-12-29T10:30:00Z"
}
```

### Error Handling Strategy

1. **Authentication Errors** - Return clear message about PAT configuration
2. **Rate Limiting** - Automatic retry with exponential backoff
3. **Validation Errors** - Detailed field-level validation messages
4. **Not Found Errors** - Suggest verification steps
5. **API Errors** - Log full error, return user-friendly message

---

## Troubleshooting

### Issue: Service won't start

**Symptoms:** Container exits immediately

**Possible Causes:**
- Missing ADO_PAT, ADO_ORG, or ADO_PROJECT
- Invalid .env syntax

**Solution:**
```bash
# Check .env exists
ls -la .env

# Verify required variables
grep ADO .env

# Expected output:
# ADO_PAT=your-token
# ADO_ORG=your-org
# ADO_PROJECT=your-project

# Check logs
docker compose logs azure-devops

# Restart
docker compose restart azure-devops
```

---

### Issue: Authentication failure

**Symptoms:** `INVALID_PAT` or `INSUFFICIENT_PERMISSIONS` errors

**Possible Causes:**
- PAT expired
- PAT lacks required scopes
- PAT for wrong organization

**Solution:**
```bash
# Generate new PAT:
# 1. Go to https://dev.azure.com/{your-org}/_usersSettings/tokens
# 2. Click "New Token"
# 3. Grant these scopes:
#    - Work Items: Read & Write
#    - Test Management: Read & Write (for test cases)
# 4. Copy the token

# Update .env
vim .env
# Set ADO_PAT=your-new-token

# Restart service
docker compose restart azure-devops

# Test authentication
curl http://localhost:3003/health
```

---

### Issue: Work items not found

**Symptoms:** `WORK_ITEM_NOT_FOUND` for valid IDs

**Possible Causes:**
- Wrong project configured
- Work items in different organization
- Insufficient permissions

**Solution:**
```bash
# Verify project setting
echo $ADO_PROJECT

# Check work item exists in ADO web UI
# https://dev.azure.com/{org}/{project}/_workitems/edit/{id}

# Test with known work item ID
curl -X POST http://localhost:3003/work-items/get \
  -d '{"ids": [YOUR_KNOWN_ID]}'

# Check permissions
curl http://localhost:3003/health | jq '.adoConnection'
```

---

### Issue: Sprint query returns no results

**Symptoms:** Sprint query succeeds but returns empty array

**Possible Causes:**
- Incorrect sprint name
- Sprint in different iteration path
- Work items not assigned to sprint

**Solution:**
```bash
# List sprints in ADO web UI
# Project Settings → Project configuration → Iterations

# Try different sprint name formats:
# - "Sprint 45"
# - "MyProject\\Sprint 45"
# - "Sprint 45" (with quotes)

curl -X POST http://localhost:3003/work-items/query \
  -d '{"sprint": "Sprint 45"}'

# Alternative: Use WIQL directly
curl -X POST http://localhost:3003/work-items/query \
  -d '{
    "wiql": "SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] = '\''MyProject\\\\Sprint 45'\''"
  }'
```

---

### Issue: Field validation errors

**Symptoms:** `FIELD_VALIDATION_ERROR` when creating work items

**Possible Causes:**
- Required field missing
- Invalid field value
- Wrong field name

**Solution:**
```bash
# Check required fields in config/ado-config.json
cat config/ado-config.json | jq '.fields.required'

# Ensure title is provided
curl -X POST http://localhost:3003/work-items/create \
  -d '{
    "workItemType": "Test Case",
    "title": "Required field: title",
    "fields": {
      "System.Description": "Optional description"
    }
  }'

# Check valid states
cat config/ado-config.json | jq '.states["Test Case"]'
```

---

### Issue: Rate limiting (429 errors)

**Symptoms:** `RATE_LIMIT_EXCEEDED` errors

**Possible Causes:**
- Too many API calls in short time
- Multiple services calling ADO
- ADO rate limit reached (200 requests/minute)

**Solution:**
```bash
# Service automatically retries with backoff
# Check logs for retry attempts
docker compose logs azure-devops | grep "rate limit"

# Reduce request frequency
# Enable caching
CACHE_TTL=3600  # 1 hour cache

# Batch work item retrieval
curl -X POST http://localhost:3003/work-items/get \
  -d '{"ids": [1,2,3,4,5]}'  # Get 5 at once instead of 5 separate calls

# Wait for rate limit reset (1 minute window)
sleep 60
```

---

### Issue: HTML in acceptance criteria

**Symptoms:** Acceptance criteria contains HTML tags

**Possible Causes:**
- ADO stores rich text fields as HTML
- Need HTML parsing

**Solution:**
```bash
# Service should parse HTML automatically
# If not working, check htmlParser.js

# Manual parsing (if needed):
CRITERIA=$(curl -s -X POST http://localhost:3003/work-items/get \
  -d '{"ids": [12345]}' | \
  jq -r '.workItems[0].fields["Microsoft.VSTS.Common.AcceptanceCriteria"]')

# Strip HTML
echo "$CRITERIA" | sed 's/<[^>]*>//g' | sed 's/&nbsp;/ /g'
```

---

### Issue: Cache not working

**Symptoms:** Every request hits ADO API (slow performance)

**Possible Causes:**
- Cache disabled
- Cache TTL too short
- Cache directory not writable

**Solution:**
```bash
# Check cache status
curl http://localhost:3003/health | jq '.cache'

# Verify cache directory exists
docker exec qe-azure-devops ls -la /app/data/cache/

# Check cache TTL
echo $CACHE_TTL  # Should be 3600 (1 hour)

# Verify caching working
# First call (miss)
time curl -s -X POST http://localhost:3003/work-items/get \
  -d '{"ids": [12345]}' | jq '.cached'
# Output: "cached": false, ~500ms

# Second call (hit)
time curl -s -X POST http://localhost:3003/work-items/get \
  -d '{"ids": [12345]}' | jq '.cached'
# Output: "cached": true, ~50ms
```

---

## Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:3003/health

# Expected healthy response
{
  "status": "healthy",
  "service": "azure-devops-mcp",
  "uptime": 12345,
  "version": "1.0.0",
  "adoConnection": "connected",
  "cache": {
    "enabled": true,
    "size": 150
  },
  "timestamp": "2024-12-29T10:30:00Z"
}
```

### Metrics Tracked

Automatically tracked metrics:
- API calls to ADO
- API response times
- Cache hit/miss rate
- Work items queried
- Work items created/updated
- Rate limit hits
- Error rate by error code

### Performance Monitoring

```bash
# View API call latency
docker compose logs azure-devops | grep "API call"

# Check cache effectiveness
curl http://localhost:3003/health | jq '.cache'

# Monitor Docker stats
docker stats qe-azure-devops
```

### Logging

```bash
# View real-time logs
docker compose logs -f azure-devops

# View last 100 lines
docker compose logs --tail=100 azure-devops

# View error logs only
docker compose logs azure-devops | grep ERROR

# Log format (JSON)
{
  "timestamp": "2024-12-29T10:30:00Z",
  "level": "info",
  "message": "Work items retrieved",
  "metadata": {
    "count": 25,
    "executionTime": 450,
    "cached": false
  }
}
```

### Alerts (Recommended)

Set up monitoring alerts for:
- ADO connection lost > 5 minutes
- API response time > 5 seconds
- Error rate > 10%
- Rate limit hit > 10 times/hour
- Cache hit rate < 50%
- Service unhealthy > 5 minutes

---

## Integration

### Used By

**Orchestrator:**
- `POST /api/ado/pull-stories` endpoint
- `POST /api/ado/create-test-case` endpoint
- Requirements-driven workflows

**Requirements Analyzer (STDIO):**
- Uses work item data for requirement analysis

**Test Case Planner (STDIO):**
- Uses acceptance criteria for test case generation

**Automation Requirements (STDIO):**
- Uses work items for automation requirement docs

### Uses

**Azure DevOps REST API:**
- Work Items API
- WIQL API
- Test Management API

**Configuration:**
- Reads `config/ado-config.json`
- Uses `.env` for credentials

**No Other MCPs:**
- Standalone integration service

### Workflow Integration Examples

**Workflow 1: Story → Test Cases**
```
1. azure-devops: Pull sprint stories
2. requirements-analyzer: Analyze acceptance criteria
3. test-case-planner: Generate test cases
4. azure-devops: Create test cases in ADO
5. azure-devops: Link test cases to stories
```

**Workflow 2: Bug → Regression Test**
```
1. azure-devops: Get bug details
2. unit-test-generator: Generate regression test
3. azure-devops: Update bug with test case link
```

**Workflow 3: Complete Sprint Planning**
```
1. azure-devops: Pull all sprint stories
2. requirements-analyzer: Analyze all requirements
3. test-case-planner: Generate test plan
4. azure-devops: Create test plan in ADO
5. azure-devops: Create test cases
6. azure-devops: Link everything together
```

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ WIQL query execution
- ✅ Sprint-based work item retrieval
- ✅ Work item CRUD operations
- ✅ Test case creation with steps
- ✅ Work item linking (all link types)
- ✅ Acceptance criteria extraction
- ✅ Intelligent caching with TTL
- ✅ Rate limit handling with retry
- ✅ Field validation
- ✅ Docker containerization
- ✅ Health monitoring
- ✅ Comprehensive error handling

### v1.1.0 (Planned)
- 🚧 Test plan creation and management
- 🚧 Test suite organization
- 🚧 Test result publishing
- 🚧 Attachment upload/download
- 🚧 Work item templates
- 🚧 Bulk operations optimization
- 🚧 Webhook support for real-time updates
- 🚧 Advanced WIQL query builder UI
- 🚧 Historical work item tracking

---

**Need help?** Check the troubleshooting section or view logs with `docker compose logs -f azure-devops`
