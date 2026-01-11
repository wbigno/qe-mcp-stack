# Playwright Generator - AI-Powered E2E Test Generation

**Type:** Docker MCP (Always Running)  
**Port:** 3005  
**Container:** `qe-playwright-generator`  
**Location:** `mcps/playwright-generator/`  
**Technology:** Node.js 18 + Express + Playwright + Anthropic Claude API  
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

The **Playwright Generator** is a specialized MCP that uses AI (Anthropic Claude) to automatically generate production-ready Playwright TypeScript tests for web applications. It takes user stories, acceptance criteria, UI path descriptions, or manual test cases and transforms them into executable, well-structured E2E tests with proper assertions, waits, error handling, and test data management. The service understands modern web application patterns, generates robust selectors, implements proper test organization with Page Object Models, and produces tests that follow Playwright best practices.

This MCP bridges the gap between requirement documentation and automated testing by eliminating the manual effort of writing test code. It analyzes acceptance criteria to understand expected behavior, generates appropriate test steps with realistic test data, implements proper synchronization and waits to avoid flakiness, adds comprehensive assertions to validate functionality, and structures tests for maintainability using Page Object Model patterns.

The Playwright Generator is essential for accelerating test automation efforts, converting manual tests to automated tests at scale, ensuring consistent test structure and quality across the team, reducing the learning curve for new QA engineers, and maintaining high test coverage without massive manual effort.

### Key Features

- ✅ **AI-Powered Generation** - Uses Claude API to generate intelligent, context-aware Playwright tests
- ✅ **Acceptance Criteria Parsing** - Converts Given-When-Then scenarios directly into test code
- ✅ **Page Object Model** - Automatically generates POM structure for maintainability
- ✅ **Robust Selectors** - Creates data-testid, role-based, and fallback selectors for stability
- ✅ **Proper Assertions** - Generates appropriate expect() statements based on requirements
- ✅ **Test Data Management** - Creates fixtures and test data with realistic values
- ✅ **Error Handling** - Includes try-catch blocks and proper cleanup in tests
- ✅ **Synchronization** - Adds proper waits (waitForSelector, waitForLoadState) to prevent flakiness
- ✅ **Code Comments** - Generates clear, helpful comments explaining test logic
- ✅ **Multiple Test Types** - Supports smoke, regression, integration, and negative test generation

### Use Cases

1. **Story → Test Automation** - Convert user stories with acceptance criteria into Playwright tests
2. **Manual Test Migration** - Translate manual test cases to automated Playwright tests
3. **Smoke Test Suite Creation** - Generate critical path tests for CI/CD pipelines
4. **Regression Test Expansion** - Quickly create comprehensive regression test coverage
5. **Negative Test Generation** - Generate edge case and error handling tests
6. **API Integration Tests** - Create tests that validate UI + API interactions
7. **Visual Regression Setup** - Generate tests with screenshot comparison
8. **Accessibility Testing** - Generate tests that validate WCAG compliance

### What It Does NOT Do

- ❌ Does not execute tests (delegates to Playwright test runner)
- ❌ Does not heal broken tests (delegates to playwright-healer)
- ❌ Does not analyze test results (delegates to test result analyzers)
- ❌ Does not identify what to test (delegates to playwright-analyzer for path analysis)
- ❌ Does not deploy tests to CI/CD (manual integration required)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Generate test from user story
curl -X POST http://localhost:3000/api/tests/generate-playwright \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "storyId": 12345,
    "testType": "integration"
  }'

# Generate test from custom scenario
curl -X POST http://localhost:3000/api/tests/generate-playwright \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "scenario": {
      "title": "Patient Search",
      "steps": [
        "Navigate to patient search page",
        "Enter patient name",
        "Click search button",
        "Verify results display"
      ]
    }
  }'
```

### Direct Access (Testing Only)

```bash
# Generate from acceptance criteria
curl -X POST http://localhost:3005/generate \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "title": "Patient Search Functionality",
    "acceptanceCriteria": "Given I am on the patient search page\nWhen I enter a patient name\nThen I see matching results",
    "testType": "integration"
  }'

# Generate from UI path
curl -X POST http://localhost:3005/generate-from-path \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "pathId": "path-001",
    "includePageObjects": true
  }'

# Generate page object
curl -X POST http://localhost:3005/generate-page-object \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "pageName": "PatientSearch",
    "elements": [
      {"name": "searchInput", "selector": "[data-testid=\"patient-search\"]"},
      {"name": "searchButton", "selector": "button:has-text(\"Search\")"}
    ]
  }'

# Generate test suite
curl -X POST http://localhost:3005/generate-suite \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "suiteType": "smoke",
    "paths": ["path-001", "path-002", "path-003"]
  }'

# Health check
curl http://localhost:3005/health
```

### Expected Output

```json
{
  "success": true,
  "test": {
    "fileName": "patient-search.spec.ts",
    "code": "import { test, expect } from '@playwright/test';\nimport { PatientSearchPage } from '../pages/patient-search.page';\n\ntest.describe('Patient Search Functionality', () => {\n  let patientSearchPage: PatientSearchPage;\n\n  test.beforeEach(async ({ page }) => {\n    patientSearchPage = new PatientSearchPage(page);\n    await patientSearchPage.navigate();\n  });\n\n  test('should display matching patients when searching by name', async ({ page }) => {\n    // Arrange\n    const testPatientName = 'John Smith';\n\n    // Act\n    await patientSearchPage.enterSearchTerm(testPatientName);\n    await patientSearchPage.clickSearchButton();\n\n    // Assert\n    await expect(patientSearchPage.resultsContainer).toBeVisible();\n    const resultCount = await patientSearchPage.getResultCount();\n    expect(resultCount).toBeGreaterThan(0);\n\n    // Verify first result contains search term\n    const firstResultName = await patientSearchPage.getFirstResultName();\n    expect(firstResultName.toLowerCase()).toContain(testPatientName.toLowerCase());\n  });\n\n  test('should display no results message for non-existent patient', async ({ page }) => {\n    // Arrange\n    const nonExistentName = 'XYZ_NONEXISTENT_123';\n\n    // Act\n    await patientSearchPage.enterSearchTerm(nonExistentName);\n    await patientSearchPage.clickSearchButton();\n\n    // Assert\n    await expect(patientSearchPage.noResultsMessage).toBeVisible();\n    await expect(patientSearchPage.noResultsMessage).toHaveText('No patients found matching your search');\n  });\n\n  test('should validate search input for minimum length', async ({ page }) => {\n    // Arrange\n    const shortInput = 'J';\n\n    // Act\n    await patientSearchPage.enterSearchTerm(shortInput);\n    await patientSearchPage.clickSearchButton();\n\n    // Assert\n    await expect(patientSearchPage.validationError).toBeVisible();\n    await expect(patientSearchPage.validationError).toHaveText('Please enter at least 2 characters');\n  });\n});",
    "pageObject": {
      "fileName": "patient-search.page.ts",
      "code": "import { Page, Locator } from '@playwright/test';\n\nexport class PatientSearchPage {\n  readonly page: Page;\n  readonly searchInput: Locator;\n  readonly searchButton: Locator;\n  readonly resultsContainer: Locator;\n  readonly resultRows: Locator;\n  readonly noResultsMessage: Locator;\n  readonly validationError: Locator;\n\n  constructor(page: Page) {\n    this.page = page;\n    this.searchInput = page.locator('[data-testid=\"patient-search-input\"]');\n    this.searchButton = page.locator('button:has-text(\"Search\")');\n    this.resultsContainer = page.locator('[data-testid=\"search-results\"]');\n    this.resultRows = page.locator('.patient-result');\n    this.noResultsMessage = page.locator('[data-testid=\"no-results\"]');\n    this.validationError = page.locator('.validation-error');\n  }\n\n  async navigate() {\n    await this.page.goto('/patients/search');\n    await this.page.waitForLoadState('networkidle');\n  }\n\n  async enterSearchTerm(searchTerm: string) {\n    await this.searchInput.fill(searchTerm);\n  }\n\n  async clickSearchButton() {\n    await this.searchButton.click();\n    await this.page.waitForLoadState('networkidle');\n  }\n\n  async getResultCount(): Promise<number> {\n    await this.resultsContainer.waitFor({ state: 'visible' });\n    return await this.resultRows.count();\n  }\n\n  async getFirstResultName(): Promise<string> {\n    const firstResult = this.resultRows.first();\n    return await firstResult.locator('.patient-name').textContent() || '';\n  }\n}"
    },
    "testData": {
      "fileName": "patient-search.data.ts",
      "code": "export const testPatients = [\n  {\n    name: 'John Smith',\n    dob: '1980-01-15',\n    mrn: 'MRN001'\n  },\n  {\n    name: 'Jane Doe',\n    dob: '1975-06-22',\n    mrn: 'MRN002'\n  }\n];\n\nexport const invalidSearchTerms = [\n  '',\n  'X',\n  '!@#$%',\n  'a'.repeat(101) // Max length test\n];"
    },
    "metadata": {
      "testType": "integration",
      "linesOfCode": 87,
      "numberOfTests": 3,
      "estimatedRuntime": "15 seconds",
      "dependencies": [
        "@playwright/test"
      ],
      "selectors": {
        "dataTestId": 4,
        "text": 2,
        "css": 1
      }
    }
  },
  "executionTime": 8450,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│           Playwright Generator (Port 3005)                       │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Claude API   │──▶│ Test Code      │         │
│  │ Router   │   │ Client       │   │ Generator      │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      AI Generation       TypeScript Code             │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Template     │   │ Code         │   │ Validator    │      │
│  │ Manager      │   │ Formatter    │   │              │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Prompt Templates    Code Formatting    Syntax Validation
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /generate` - Generate test from acceptance criteria
   - `POST /generate-from-path` - Generate test from UI path analysis
   - `POST /generate-page-object` - Generate Page Object Model
   - `POST /generate-suite` - Generate test suite (multiple tests)
   - `POST /generate-negative` - Generate negative test cases
   - `GET /health` - Health check endpoint

2. **Claude API Client** (`src/services/claudeClient.js`)
   - **Authentication** - Manages Anthropic API key
   - **Request Builder** - Constructs Claude API requests with system prompts
   - **Response Parser** - Extracts generated code from Claude responses
   - **Error Handler** - Handles API errors (rate limits, quota, invalid key)
   - **Token Counter** - Tracks token usage for cost monitoring

3. **Test Code Generator** (`src/generators/testGenerator.js`)
   - **Prompt Constructor** - Builds detailed prompts for Claude with context
   - **Code Extraction** - Extracts TypeScript code from Claude markdown responses
   - **Syntax Validator** - Validates generated TypeScript syntax
   - **Import Manager** - Ensures correct Playwright imports
   - **Test Structure** - Enforces test.describe, test.beforeEach patterns

4. **Page Object Generator** (`src/generators/pageObjectGenerator.js`)
   - **Element Mapper** - Maps UI elements to Page Object properties
   - **Locator Builder** - Creates Playwright locator definitions
   - **Method Generator** - Creates interaction methods (click, fill, etc.)
   - **Navigation Logic** - Adds page navigation and wait methods

5. **Template Manager** (`src/templates/`)
   - **Test Templates** - Pre-built test structure templates
   - **POM Templates** - Page Object Model templates
   - **Fixture Templates** - Test data fixture templates
   - **Config Templates** - playwright.config.ts templates

6. **Code Formatter** (`src/utils/codeFormatter.js`)
   - **Prettier Integration** - Formats generated code
   - **Import Sorter** - Organizes import statements
   - **Comment Cleaner** - Removes redundant comments
   - **Line Length** - Enforces 100-character line limit

7. **Validator** (`src/utils/validator.js`)
   - **TypeScript Parser** - Validates TypeScript syntax using @typescript/compiler
   - **Playwright API Check** - Verifies correct Playwright API usage
   - **Selector Validator** - Tests selector validity
   - **Test Structure Check** - Ensures proper test organization

### Dependencies

**Internal:**
- playwright-analyzer (3004) - For UI path data when generating from paths
- azure-devops (3003) - For acceptance criteria from user stories

**External Services:**
- Anthropic Claude API - For AI-powered code generation
- File system access to save generated tests

**Libraries:**
- express - HTTP server
- @anthropic-ai/sdk - Claude API client
- @playwright/test - For type validation
- prettier - Code formatting
- @typescript/compiler - TypeScript syntax validation
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /generate)
   │
   ▼
2. Request Validation
   ├─▶ Validate input (acceptance criteria or path ID)
   ├─▶ Validate API key present
   └─▶ Check Claude API availability
       │
       ▼
3. Context Building
   ├─▶ Load application metadata
   ├─▶ If path ID: Fetch path data from playwright-analyzer
   ├─▶ If story ID: Fetch story from azure-devops
   └─▶ Build test context (app type, framework, selectors)
       │
       ▼
4. Prompt Construction
   ├─▶ Load system prompt template
   ├─▶ Add application-specific context
   ├─▶ Add test type requirements (integration, smoke, etc.)
   ├─▶ Add acceptance criteria or path steps
   └─▶ Add selector preferences (data-testid, role, etc.)
       │
       ▼
5. Claude API Call
   ├─▶ Send prompt to Claude API
   ├─▶ Request JSON response with test code
   ├─▶ Set max_tokens (4096 for tests)
   └─▶ Handle rate limiting (429 responses)
       │
       ▼
6. Code Extraction
   ├─▶ Parse Claude response
   ├─▶ Extract TypeScript code blocks
   ├─▶ Separate test file from Page Object
   └─▶ Extract test data fixtures
       │
       ▼
7. Code Validation
   ├─▶ Validate TypeScript syntax
   ├─▶ Check Playwright API usage
   ├─▶ Validate selector syntax
   └─▶ Check test structure (describe, test blocks)
       │
       ▼
8. Code Formatting
   ├─▶ Run Prettier on generated code
   ├─▶ Sort imports
   ├─▶ Remove redundant comments
   └─▶ Enforce line length
       │
       ▼
9. File Generation
   ├─▶ Create test file (.spec.ts)
   ├─▶ Create Page Object (.page.ts)
   ├─▶ Create test data (.data.ts)
   └─▶ Generate file metadata
       │
       ▼
10. Response
    └─▶ Return JSON with generated files and metadata
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3005 | Playwright generator HTTP port |
| `ANTHROPIC_API_KEY` | ✅ Yes | - | Anthropic Claude API key |
| `CLAUDE_MODEL` | ❌ No | claude-sonnet-4-20250514 | Claude model to use |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `PLAYWRIGHT_ANALYZER_URL` | ❌ No | http://playwright-analyzer:3004 | Playwright analyzer service URL |
| `ADO_INTEGRATION` | ❌ No | false | Enable ADO integration for stories |

### Configuration Files

#### `config/apps.json`

Applications must be defined here:

```json
{
  "applications": [
    {
      "name": "App1",
      "displayName": "Patient Portal",
      "path": "/mnt/apps/patient-portal",
      "type": "dotnet",
      "framework": "net8.0",
      "baseUrl": "http://localhost:5000",
      "testDefaults": {
        "selectorStrategy": "data-testid",
        "waitStrategy": "networkidle",
        "timeout": 30000,
        "retries": 2
      }
    }
  ]
}
```

**Field Descriptions:**

- `baseUrl` - Base URL for the application (used in tests)
- `testDefaults.selectorStrategy` - Preferred selector type (data-testid, role, css)
- `testDefaults.waitStrategy` - Default wait strategy (networkidle, domcontentloaded, load)
- `testDefaults.timeout` - Default timeout in milliseconds
- `testDefaults.retries` - Number of test retries on failure

#### `config/prompts/test-generation.txt`

System prompt for Claude test generation:

```
You are an expert Playwright test automation engineer. Generate production-ready TypeScript tests that:

1. Use proper TypeScript types and interfaces
2. Follow Page Object Model pattern
3. Use robust selectors (data-testid preferred, then role, then CSS)
4. Include proper waits (waitForSelector, waitForLoadState)
5. Add comprehensive assertions with expect()
6. Include AAA pattern (Arrange, Act, Assert) comments
7. Handle errors gracefully with try-catch where appropriate
8. Use realistic test data
9. Follow Playwright best practices
10. Are maintainable and readable

Generate tests as JSON with these fields:
- testFile: Complete test spec TypeScript code
- pageObject: Page Object Model TypeScript code
- testData: Test data fixtures TypeScript code
```

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
playwright-generator:
  build: ./mcps/playwright-generator
  container_name: qe-playwright-generator
  ports:
    - "3005:3005"
  environment:
    - NODE_ENV=production
    - PORT=3005
    - PLAYWRIGHT_ANALYZER_URL=http://playwright-analyzer:3004
  env_file:
    - .env  # Contains ANTHROPIC_API_KEY
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/playwright-generator:/app/data   # Generated tests
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
  networks:
    - qe-network
  restart: unless-stopped
  depends_on:
    - playwright-analyzer
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read configuration
- `./data/playwright-generator` - Store generated tests
- `/mnt/apps/*` - Read application code for context

---

## API Reference

### Test Generation Endpoints

#### POST /generate

Generate Playwright test from acceptance criteria or description

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
  title: string;                  // Required: Test title/description
  acceptanceCriteria?: string;    // Optional: Given-When-Then scenarios
  description?: string;           // Optional: Test description
  testType?: "smoke" | "integration" | "regression" | "negative";  // Optional
  includePageObjects?: boolean;   // Optional: Generate POM (default: true)
  selectorStrategy?: "data-testid" | "role" | "css";  // Optional
}
```

**Response:**
```typescript
{
  success: boolean;
  test: {
    fileName: string;
    code: string;               // Test spec TypeScript code
    pageObject?: {
      fileName: string;
      code: string;             // Page Object TypeScript code
    };
    testData?: {
      fileName: string;
      code: string;             // Test data TypeScript code
    };
    metadata: {
      testType: string;
      linesOfCode: number;
      numberOfTests: number;
      estimatedRuntime: string;
      dependencies: string[];
      selectors: object;
    };
  };
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/generate \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "title": "Patient Search Functionality",
    "acceptanceCriteria": "Given I am on the patient search page\nWhen I enter a patient name\nThen I see matching results",
    "testType": "integration",
    "includePageObjects": true
  }'
```

---

#### POST /generate-from-path

Generate test from playwright-analyzer path analysis

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  pathId: string;                 // Required: Path ID from playwright-analyzer
  includePageObjects?: boolean;   // Optional: Generate POM (default: true)
  testType?: string;              // Optional: Override test type
}
```

**Response:**
```typescript
{
  success: boolean;
  test: GeneratedTest;
  path: CriticalPath;             // Original path data
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/generate-from-path \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "pathId": "path-001",
    "includePageObjects": true
  }'
```

---

#### POST /generate-page-object

Generate Page Object Model class

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  pageName: string;               // Required: Page name (e.g., "PatientSearch")
  url?: string;                   // Optional: Page URL
  elements: Array<{               // Required: Page elements
    name: string;
    selector: string;
    type?: "button" | "input" | "select" | "text";
  }>;
  methods?: string[];             // Optional: Additional methods to generate
}
```

**Response:**
```typescript
{
  success: boolean;
  pageObject: {
    fileName: string;
    code: string;
  };
  executionTime: number;
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/generate-page-object \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "pageName": "PatientSearch",
    "url": "/patients/search",
    "elements": [
      {
        "name": "searchInput",
        "selector": "[data-testid=\"patient-search-input\"]",
        "type": "input"
      },
      {
        "name": "searchButton",
        "selector": "button:has-text(\"Search\")",
        "type": "button"
      }
    ]
  }'
```

---

#### POST /generate-suite

Generate test suite (multiple related tests)

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  suiteType: "smoke" | "regression" | "full";  // Required: Suite type
  paths?: string[];               // Optional: Specific path IDs
  maxTests?: number;              // Optional: Max tests to generate
}
```

**Response:**
```typescript
{
  success: boolean;
  suite: {
    tests: GeneratedTest[];
    sharedPageObjects: PageObject[];
    config: string;               // playwright.config.ts
    metadata: {
      totalTests: number;
      estimatedRuntime: string;
      dependencies: string[];
    };
  };
  executionTime: number;
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/generate-suite \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "suiteType": "smoke",
    "paths": ["path-001", "path-002", "path-003"],
    "maxTests": 5
  }'
```

---

#### POST /generate-negative

Generate negative/edge case tests

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  feature: string;                // Required: Feature name
  positiveTest?: string;          // Optional: Existing positive test code
  edgeCases?: string[];           // Optional: Specific edge cases to test
}
```

**Response:**
```typescript
{
  success: boolean;
  negativeTests: GeneratedTest[];
  coverage: {
    totalScenarios: number;
    scenarios: string[];
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/generate-negative \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "feature": "Patient Search",
    "edgeCases": [
      "Empty search term",
      "Special characters",
      "SQL injection attempt"
    ]
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
  claudeApi: "connected" | "disconnected";
  dependencies: {
    playwrightAnalyzer: "healthy" | "unhealthy";
  };
  timestamp: string;
}
```

**Example:**
```bash
curl http://localhost:3005/health
```

---

## Usage Examples

### Example 1: Generate Test from User Story

**Scenario:** User story in ADO has acceptance criteria - need to generate automated test

```bash
# Get story from ADO (via azure-devops MCP)
STORY=$(curl -s -X POST http://localhost:3003/work-items/get \
  -H "Content-Type: application/json" \
  -d '{"ids": [12345]}')

# Extract acceptance criteria
CRITERIA=$(echo $STORY | jq -r '.workItems[0].fields["Microsoft.VSTS.Common.AcceptanceCriteria"]' | sed 's/<[^>]*>//g')

# Generate test
curl -X POST http://localhost:3005/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"app\": \"App1\",
    \"title\": \"Patient Search\",
    \"acceptanceCriteria\": \"$CRITERIA\",
    \"testType\": \"integration\",
    \"includePageObjects\": true
  }"
```

**Response:**
```json
{
  "success": true,
  "test": {
    "fileName": "patient-search.spec.ts",
    "code": "// Complete test code...",
    "pageObject": {
      "fileName": "patient-search.page.ts",
      "code": "// Complete page object..."
    }
  }
}
```

**Action:** Save generated files to your test repository

---

### Example 2: Generate Test from Critical Path

**Scenario:** Playwright-analyzer identified critical path - need test for it

```bash
# Get critical path
PATH=$(curl -s -X POST http://localhost:3004/analyze-paths \
  -d '{"app":"App1"}' | jq '.analysis.criticalPaths[0]')

# Get path ID
PATH_ID=$(echo $PATH | jq -r '.id')

# Generate test from path
curl -X POST http://localhost:3005/generate-from-path \
  -H "Content-Type: application/json" \
  -d "{
    \"app\": \"App1\",
    \"pathId\": \"$PATH_ID\",
    \"includePageObjects\": true
  }"
```

**Response:**
```json
{
  "success": true,
  "test": {
    "fileName": "patient-search-and-chart-access.spec.ts",
    "code": "// Generated from path-001...",
    "metadata": {
      "numberOfTests": 1,
      "estimatedRuntime": "20 seconds"
    }
  },
  "path": {
    "name": "Patient Search and Chart Access",
    "riskScore": 95
  }
}
```

---

### Example 3: Generate Smoke Test Suite

**Scenario:** Need smoke tests for top 5 critical paths

```bash
# Get top 5 paths
PATHS=$(curl -s -X POST http://localhost:3004/prioritize \
  -d '{"app":"App1","maxResults":5,"sortBy":"risk"}' | \
  jq -r '.prioritizedPaths[].id' | tr '\n' ',' | sed 's/,$//')

# Generate smoke suite
curl -X POST http://localhost:3005/generate-suite \
  -H "Content-Type: application/json" \
  -d "{
    \"app\": \"App1\",
    \"suiteType\": \"smoke\",
    \"paths\": [${PATHS}],
    \"maxTests\": 5
  }"
```

**Response:**
```json
{
  "success": true,
  "suite": {
    "tests": [
      {
        "fileName": "smoke-01-patient-search.spec.ts",
        "code": "..."
      },
      {
        "fileName": "smoke-02-payment-processing.spec.ts",
        "code": "..."
      }
    ],
    "sharedPageObjects": [
      {
        "fileName": "navigation.page.ts",
        "code": "..."
      }
    ],
    "config": "// playwright.config.ts for smoke suite...",
    "metadata": {
      "totalTests": 5,
      "estimatedRuntime": "2 minutes"
    }
  }
}
```

---

### Example 4: Generate Negative Tests

**Scenario:** Have positive test - need negative/edge case tests

```bash
curl -X POST http://localhost:3005/generate-negative \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "feature": "Patient Search",
    "edgeCases": [
      "Empty search term",
      "Search term with special characters",
      "Search term exceeding max length",
      "SQL injection attempt",
      "XSS attempt"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "negativeTests": [
    {
      "fileName": "patient-search-negative.spec.ts",
      "code": "test('should show validation error for empty search', async ({ page }) => {\n  // Test code...\n});\n\ntest('should sanitize special characters', async ({ page }) => {\n  // Test code...\n});"
    }
  ],
  "coverage": {
    "totalScenarios": 5,
    "scenarios": [
      "Empty input validation",
      "Special character handling",
      "Max length validation",
      "SQL injection prevention",
      "XSS prevention"
    ]
  }
}
```

---

### Example 5: Generate Page Object Only

**Scenario:** Already have tests, just need Page Object Model

```bash
curl -X POST http://localhost:3005/generate-page-object \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "pageName": "AppointmentScheduling",
    "url": "/appointments/new",
    "elements": [
      {
        "name": "appointmentTypeSelect",
        "selector": "select[name=\"appointmentType\"]",
        "type": "select"
      },
      {
        "name": "dateInput",
        "selector": "input[type=\"date\"]",
        "type": "input"
      },
      {
        "name": "providerSelect",
        "selector": "select[name=\"provider\"]",
        "type": "select"
      },
      {
        "name": "submitButton",
        "selector": "button[type=\"submit\"]",
        "type": "button"
      }
    ],
    "methods": [
      "scheduleAppointment",
      "verifyAppointmentCreated"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "pageObject": {
    "fileName": "appointment-scheduling.page.ts",
    "code": "import { Page, Locator } from '@playwright/test';\n\nexport class AppointmentSchedulingPage {\n  // Complete page object code...\n}"
  }
}
```

---

### Example 6: Batch Test Generation

**Scenario:** Generate tests for all uncovered critical paths

```bash
#!/bin/bash

# Get uncovered paths
UNCOVERED=$(curl -s -X POST http://localhost:3004/existing-tests \
  -d '{"app":"App1"}' | \
  jq -r '.coverage.uncoveredPaths[]')

# Generate test for each
echo "$UNCOVERED" | while read -r PATH; do
  echo "Generating test for: $PATH"
  
  curl -s -X POST http://localhost:3005/generate \
    -H "Content-Type: application/json" \
    -d "{
      \"app\": \"App1\",
      \"title\": \"$PATH\",
      \"testType\": \"integration\"
    }" | jq '.test.fileName'
    
  sleep 2  # Rate limiting
done
```

---

### Example 7: Custom Test with Specific Requirements

**Scenario:** Need test with specific assertions and test data

```bash
curl -X POST http://localhost:3005/generate \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "title": "Payment Processing with Stripe",
    "description": "Test complete payment flow using Stripe integration",
    "acceptanceCriteria": "Given I have items in cart\nWhen I proceed to payment\nAnd I enter valid card details\nThen payment is processed successfully\nAnd order confirmation is displayed",
    "testType": "integration",
    "includePageObjects": true,
    "selectorStrategy": "data-testid"
  }'
```

---

## Input/Output Schemas

### Input Schema: Generate Test Request

```typescript
interface GenerateTestRequest {
  app: string;                    // Application name
  title: string;                  // Test title
  acceptanceCriteria?: string;    // Given-When-Then scenarios
  description?: string;           // Test description
  testType?: "smoke" | "integration" | "regression" | "negative";
  includePageObjects?: boolean;   // Generate POM (default: true)
  selectorStrategy?: "data-testid" | "role" | "css";
}
```

---

### Output Schema: Generate Test Result

```typescript
interface GenerateTestResult {
  success: boolean;
  test: {
    fileName: string;             // e.g., "patient-search.spec.ts"
    code: string;                 // Complete TypeScript code
    pageObject?: {
      fileName: string;           // e.g., "patient-search.page.ts"
      code: string;               // Page Object TypeScript code
    };
    testData?: {
      fileName: string;           // e.g., "patient-search.data.ts"
      code: string;               // Test data TypeScript code
    };
    metadata: {
      testType: string;
      linesOfCode: number;
      numberOfTests: number;
      estimatedRuntime: string;
      dependencies: string[];
      selectors: {
        dataTestId: number;
        text: number;
        css: number;
        role: number;
      };
    };
  };
  executionTime: number;
  timestamp: string;
}
```

---

## Data Persistence

### Storage Locations

```
./data/playwright-generator/
├── generated/
│   ├── App1/
│   │   ├── tests/
│   │   │   ├── patient-search.spec.ts
│   │   │   └── appointment-scheduling.spec.ts
│   │   ├── pages/
│   │   │   ├── patient-search.page.ts
│   │   │   └── appointment-scheduling.page.ts
│   │   └── data/
│   │       └── test-patients.data.ts
│   └── App2/
├── history/
│   ├── generation-log.json     # History of all generations
│   └── token-usage.json        # Claude API token usage tracking
└── logs/
    └── playwright-generator.log
```

### What Gets Stored

1. **Generated Tests** (`generated/*/tests/*.spec.ts`)
   - Complete test files ready to run
   - Stored by application

2. **Generated Page Objects** (`generated/*/pages/*.page.ts`)
   - Page Object Model classes
   - Reusable across tests

3. **Test Data** (`generated/*/data/*.data.ts`)
   - Test fixtures and data
   - Shared test data

4. **Generation History** (`history/generation-log.json`)
   - Record of all test generations
   - Metadata (when, what, who)

5. **Token Usage** (`history/token-usage.json`)
   - Claude API token consumption
   - Cost tracking

---

## Development

### Local Setup

```bash
# Navigate to MCP directory
cd mcps/playwright-generator

# Install dependencies
npm install

# Install Playwright
npx playwright install

# Copy environment file
cp ../../.env.example .env

# Set API key
# In .env: ANTHROPIC_API_KEY=your-key-here
```

### Project Structure

```
mcps/playwright-generator/
├── src/
│   ├── index.js                     # Entry point
│   ├── routes/
│   │   ├── generateRoutes.js        # Test generation endpoints
│   │   └── healthRoutes.js          # Health check
│   ├── services/
│   │   └── claudeClient.js          # Claude API integration
│   ├── generators/
│   │   ├── testGenerator.js         # Test code generation
│   │   ├── pageObjectGenerator.js   # POM generation
│   │   └── suiteGenerator.js        # Test suite generation
│   ├── templates/
│   │   ├── test-template.txt        # Test template
│   │   └── pom-template.txt         # POM template
│   └── utils/
│       ├── codeFormatter.js         # Prettier formatting
│       └── validator.js             # TypeScript validation
├── tests/
│   └── integration/
│       └── generate.test.js
├── package.json
├── Dockerfile
└── README.md
```

---

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `MISSING_API_KEY` | 401 | ANTHROPIC_API_KEY not set | Set API key in .env |
| `INVALID_API_KEY` | 401 | API key invalid | Get valid key from Anthropic |
| `RATE_LIMIT` | 429 | Claude API rate limit | Wait and retry |
| `QUOTA_EXCEEDED` | 402 | API quota exceeded | Upgrade plan or wait for reset |
| `GENERATION_FAILED` | 500 | Code generation failed | Check prompt and retry |
| `INVALID_SYNTAX` | 400 | Generated code invalid | Report issue |

---

## Troubleshooting

### Issue: API key not working

**Solution:**
```bash
# Verify API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3005/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/tests/generate-playwright`

### Uses

**Playwright Analyzer:** For path data
**Azure DevOps:** For acceptance criteria
**Anthropic Claude API:** For code generation

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ AI-powered test generation
- ✅ Page Object Model generation
- ✅ Test suite generation
- ✅ Negative test generation
- ✅ Claude API integration

---

**Need help?** Check troubleshooting or view logs with `docker compose logs -f playwright-generator`
