# Playwright Healer - Self-Healing Test Maintenance & Repair

**Type:** Docker MCP (Always Running)  
**Port:** 3006  
**Container:** `qe-playwright-healer`  
**Location:** `mcps/playwright-healer/`  
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

The **Playwright Healer** is a specialized MCP that uses AI (Anthropic Claude) to automatically diagnose and repair broken Playwright tests. It analyzes test failures, identifies root causes (selector changes, timing issues, API changes, UI redesigns), generates fixes with updated selectors and logic, validates fixes work correctly, and provides detailed explanations of what broke and why. The service acts as an intelligent test maintenance assistant, dramatically reducing the time QA engineers spend fixing flaky or broken tests.

This MCP addresses the most time-consuming aspect of test automation: maintenance. When UI changes break tests with outdated selectors, when timing issues cause intermittent failures, when API response changes break assertions, or when page structure refactors invalidate test logic, the Playwright Healer analyzes the failure context, understands what changed, generates appropriate fixes, and validates the repairs work before applying them.

The Playwright Healer is essential for maintaining large test suites where UI changes are frequent, reducing test maintenance overhead from hours to minutes, ensuring CI/CD pipelines stay green even after UI refactors, and keeping test coverage high without proportional maintenance effort.

### Key Features

- ✅ **AI-Powered Diagnosis** - Uses Claude API to intelligently analyze test failures and identify root causes
- ✅ **Selector Healing** - Automatically finds working alternatives when selectors break (data-testid → role → text → css)
- ✅ **Timing Fix** - Detects and fixes timing/synchronization issues with proper waits
- ✅ **Assertion Updates** - Updates assertions when expected values change legitimately
- ✅ **DOM Analysis** - Compares page DOM before/after to understand UI changes
- ✅ **Screenshot Comparison** - Uses screenshots to identify visual changes affecting tests
- ✅ **Fix Validation** - Runs repaired tests to verify fixes work before applying
- ✅ **Change Explanation** - Provides clear explanations of what changed and why test broke
- ✅ **Batch Healing** - Repairs multiple related test failures efficiently
- ✅ **Confidence Scoring** - Rates repair confidence (high/medium/low) to guide manual review

### Use Cases

1. **Post-Deploy Test Healing** - Automatically fix tests after UI deployments break selectors
2. **Flaky Test Repair** - Diagnose and fix intermittent timing issues causing flakiness
3. **Refactor Support** - Update tests after planned UI/API refactors
4. **CI/CD Recovery** - Quickly restore green builds after legitimate changes break tests
5. **Selector Migration** - Migrate tests to new selector strategies (e.g., data-testid migration)
6. **Assertion Maintenance** - Update assertions when expected values change in features
7. **Page Object Updates** - Automatically update Page Object Model selectors
8. **Test Debt Reduction** - Batch-fix accumulated broken tests in legacy suites

### What It Does NOT Do

- ❌ Does not generate new tests (delegates to playwright-generator)
- ❌ Does not execute tests initially (uses existing test results)
- ❌ Does not identify what to test (delegates to playwright-analyzer)
- ❌ Does not modify application code (only test code)
- ❌ Does not guarantee 100% fix success (provides confidence scores)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Heal single test failure
curl -X POST http://localhost:3000/api/tests/heal-playwright \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-search.spec.ts",
    "failureLog": "Error: Locator not found: [data-testid=\"search-button\"]"
  }'

# Heal all failures from test run
curl -X POST http://localhost:3000/api/tests/heal-test-run \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testRunId": "run-12345"
  }'

# Batch heal multiple tests
curl -X POST http://localhost:3000/api/tests/batch-heal \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "failedTests": ["test-1", "test-2", "test-3"]
  }'
```

### Direct Access (Testing Only)

```bash
# Heal single test
curl -X POST http://localhost:3006/heal \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-search.spec.ts",
    "testName": "should display search results",
    "failureLog": "Error: Locator not found",
    "screenshot": "base64_screenshot_data",
    "pageSource": "<html>...</html>"
  }'

# Analyze failure without healing
curl -X POST http://localhost:3006/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-search.spec.ts",
    "failureLog": "TimeoutError: Waiting for selector timed out"
  }'

# Validate proposed fix
curl -X POST http://localhost:3006/validate-fix \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-search.spec.ts",
    "originalCode": "await page.click(\"[data-testid=search-btn]\");",
    "fixedCode": "await page.click(\"button:has-text(\\\"Search\\\")\");"
  }'

# Batch heal
curl -X POST http://localhost:3006/batch-heal \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "failures": [
      {
        "testFile": "test1.spec.ts",
        "failureLog": "..."
      },
      {
        "testFile": "test2.spec.ts",
        "failureLog": "..."
      }
    ]
  }'

# Health check
curl http://localhost:3006/health
```

### Expected Output

```json
{
  "success": true,
  "healing": {
    "testFile": "patient-search.spec.ts",
    "testName": "should display search results when searching by name",
    "diagnosis": {
      "failureType": "SelectorNotFound",
      "rootCause": "data-testid attribute removed from search button during UI refactor",
      "confidence": "high",
      "analysis": "The test is looking for button with data-testid='search-button', but the current page has a button with class 'search-btn' and text 'Search'. The data-testid was likely removed during a recent refactor to simplify the markup."
    },
    "fix": {
      "type": "SelectorUpdate",
      "changes": [
        {
          "line": 15,
          "original": "await page.click('[data-testid=\"search-button\"]');",
          "fixed": "await page.click('button:has-text(\"Search\")');",
          "reason": "Replaced broken data-testid selector with text-based selector that works on current page"
        },
        {
          "line": 16,
          "original": "await page.waitForSelector('[data-testid=\"results-container\"]');",
          "fixed": "await page.waitForSelector('.search-results', { state: 'visible' });",
          "reason": "Updated results container selector to match current class name and added explicit visible state"
        }
      ],
      "fullCode": "import { test, expect } from '@playwright/test';\nimport { PatientSearchPage } from '../pages/patient-search.page';\n\ntest.describe('Patient Search Functionality', () => {\n  let patientSearchPage: PatientSearchPage;\n\n  test.beforeEach(async ({ page }) => {\n    patientSearchPage = new PatientSearchPage(page);\n    await patientSearchPage.navigate();\n  });\n\n  test('should display search results when searching by name', async ({ page }) => {\n    // Arrange\n    const testPatientName = 'John Smith';\n\n    // Act\n    await patientSearchPage.enterSearchTerm(testPatientName);\n    await page.click('button:has-text(\"Search\")'); // FIXED: Updated selector\n    await page.waitForSelector('.search-results', { state: 'visible' }); // FIXED: Updated selector\n\n    // Assert\n    const resultCount = await page.locator('.patient-result').count();\n    expect(resultCount).toBeGreaterThan(0);\n  });\n});",
      "confidence": "high",
      "validated": true,
      "estimatedFixTime": "30 seconds"
    },
    "pageObjectUpdates": [
      {
        "file": "patient-search.page.ts",
        "changes": [
          {
            "line": 8,
            "original": "this.searchButton = page.locator('[data-testid=\"search-button\"]');",
            "fixed": "this.searchButton = page.locator('button:has-text(\"Search\")');",
            "reason": "Updated Page Object to match new selector strategy"
          }
        ]
      }
    ],
    "recommendations": [
      "Consider adding data-testid attributes back to critical elements for more stable tests",
      "Update selector strategy in playwright.config.ts to prefer text-based selectors",
      "Run full test suite to identify other tests affected by same selector changes"
    ],
    "metadata": {
      "healingTime": 3250,
      "validationTime": 1500,
      "alternativeSelectorsConsidered": 5,
      "selectedSelectorType": "text",
      "requiresManualReview": false
    }
  },
  "executionTime": 5200,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│           Playwright Healer (Port 3006)                          │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Claude API   │──▶│ Failure        │         │
│  │ Router   │   │ Client       │   │ Analyzer       │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      AI Diagnosis        Root Cause Analysis         │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Selector     │   │ Fix          │   │ Validator    │      │
│  │ Finder       │   │ Generator    │   │              │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Working Selectors    Fixed Test Code    Validation Pass
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /heal` - Heal single test failure
   - `POST /diagnose` - Diagnose failure without healing
   - `POST /validate-fix` - Validate proposed fix
   - `POST /batch-heal` - Heal multiple tests
   - `POST /find-selector` - Find working selector for element
   - `GET /health` - Health check endpoint

2. **Claude API Client** (`src/services/claudeClient.js`)
   - **Authentication** - Manages Anthropic API key
   - **Diagnosis Prompts** - Constructs prompts for failure analysis
   - **Fix Prompts** - Constructs prompts for code fixes
   - **Response Parser** - Extracts diagnosis and fixes from Claude responses
   - **Token Counter** - Tracks token usage

3. **Failure Analyzer** (`src/analyzers/failureAnalyzer.js`)
   - **Log Parser** - Parses Playwright error logs
   - **Failure Classifier** - Categorizes failures (selector, timing, assertion, etc.)
   - **Stack Trace Analyzer** - Analyzes stack traces for context
   - **Screenshot Analyzer** - Compares screenshots to identify visual changes

4. **Selector Finder** (`src/services/selectorFinder.js`)
   - **DOM Inspector** - Examines current page DOM
   - **Selector Tester** - Tests alternative selectors for validity
   - **Selector Ranker** - Ranks selectors by robustness
   - **Fallback Chain** - Tries data-testid → role → text → css

5. **Fix Generator** (`src/generators/fixGenerator.js`)
   - **Code Parser** - Parses test code to locate issues
   - **Selector Replacer** - Replaces broken selectors with working ones
   - **Timing Fixer** - Adds proper waits for timing issues
   - **Assertion Updater** - Updates assertions when values change

6. **Validator** (`src/services/validator.js`)
   - **Test Runner** - Executes repaired tests
   - **Result Checker** - Verifies test passes after fix
   - **Diff Generator** - Shows before/after diff
   - **Confidence Calculator** - Calculates fix confidence score

7. **Page Object Updater** (`src/services/pageObjectUpdater.js`)
   - **POM Locator** - Finds associated Page Object files
   - **Selector Mapper** - Maps test selectors to POM properties
   - **POM Fixer** - Updates Page Object selectors
   - **Consistency Checker** - Ensures test and POM align

### Dependencies

**Internal:**
- playwright-generator (3005) - Optional: For regenerating tests if healing fails
- code-analyzer (3001) - For understanding test structure

**External Services:**
- Anthropic Claude API - For AI-powered diagnosis and fixing
- Playwright - For selector validation and test execution
- File system access to read/write test files

**Libraries:**
- express - HTTP server
- @anthropic-ai/sdk - Claude API client
- @playwright/test - For test execution and validation
- typescript-compiler - For parsing TypeScript test files
- diff - For generating code diffs
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /heal)
   │
   ▼
2. Request Validation
   ├─▶ Validate test file exists
   ├─▶ Validate failure log provided
   └─▶ Check Claude API availability
       │
       ▼
3. Failure Analysis
   ├─▶ Parse error log for failure type
   ├─▶ Extract failed selector or assertion
   ├─▶ Identify failure location (file, line)
   └─▶ Classify failure type
       │
       ▼
4. Context Gathering
   ├─▶ Load test file code
   ├─▶ Load Page Object (if exists)
   ├─▶ Load page screenshot (if provided)
   ├─▶ Fetch current page DOM (if available)
   └─▶ Build failure context
       │
       ▼
5. Claude Diagnosis
   ├─▶ Construct diagnosis prompt with context
   ├─▶ Send to Claude API
   ├─▶ Parse diagnosis response
   └─▶ Extract root cause and confidence
       │
       ▼
6. Selector Discovery (if selector failure)
   ├─▶ Launch headless browser
   ├─▶ Navigate to page
   ├─▶ Try alternative selector strategies:
   │   ├─ data-testid
   │   ├─ ARIA role
   │   ├─ Text content
   │   └─ CSS fallback
   ├─▶ Test each selector
   └─▶ Rank by robustness
       │
       ▼
7. Fix Generation
   ├─▶ Construct fix prompt with:
   │   ├─ Original test code
   │   ├─ Diagnosis
   │   ├─ Working selector (if found)
   │   └─ Page context
   ├─▶ Send to Claude API
   ├─▶ Parse fixed code response
   └─▶ Extract line-by-line changes
       │
       ▼
8. Page Object Update (if applicable)
   ├─▶ Find associated Page Object file
   ├─▶ Identify matching properties
   ├─▶ Update selectors in POM
   └─▶ Validate POM syntax
       │
       ▼
9. Fix Validation
   ├─▶ Apply fixes to test file (in memory)
   ├─▶ Execute test with Playwright
   ├─▶ Check test passes
   ├─▶ Calculate confidence score
   └─▶ Generate diff
       │
       ▼
10. Response
    └─▶ Return diagnosis, fix, validation result, recommendations
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3006 | Playwright healer HTTP port |
| `ANTHROPIC_API_KEY` | ✅ Yes | - | Anthropic Claude API key |
| `CLAUDE_MODEL` | ❌ No | claude-sonnet-4-20250514 | Claude model to use |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `AUTO_APPLY_FIXES` | ❌ No | false | Auto-apply high-confidence fixes |
| `VALIDATION_REQUIRED` | ❌ No | true | Require validation before applying fixes |

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
      "testPath": "/mnt/apps/patient-portal/tests/e2e",
      "pageObjectPath": "/mnt/apps/patient-portal/tests/pages",
      "baseUrl": "http://localhost:5000",
      "healingConfig": {
        "autoApplyHighConfidence": false,
        "requireValidation": true,
        "maxHealAttempts": 3,
        "selectorStrategy": ["data-testid", "role", "text", "css"]
      }
    }
  ]
}
```

**Field Descriptions:**

- `testPath` - Location of test files
- `pageObjectPath` - Location of Page Object files
- `healingConfig.autoApplyHighConfidence` - Auto-apply fixes with >90% confidence
- `healingConfig.requireValidation` - Require test execution before applying fix
- `healingConfig.maxHealAttempts` - Maximum healing attempts per test
- `healingConfig.selectorStrategy` - Selector fallback order

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
playwright-healer:
  build: ./mcps/playwright-healer
  container_name: qe-playwright-healer
  ports:
    - "3006:3006"
  environment:
    - NODE_ENV=production
    - PORT=3006
    - AUTO_APPLY_FIXES=false
    - VALIDATION_REQUIRED=true
  env_file:
    - .env  # Contains ANTHROPIC_API_KEY
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/playwright-healer:/app/data   # Healing logs
    - ${APP1_PATH}:/mnt/apps/app1:rw   # Application tests (read-write for fixing)
    - ${APP2_PATH}:/mnt/apps/app2:rw
  networks:
    - qe-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3006/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Important:** Test directories need read-write access for healing to apply fixes

---

## API Reference

### Test Healing Endpoints

#### POST /heal

Heal single test failure

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
  testFile: string;               // Required: Test file path
  testName?: string;              // Optional: Specific test name
  failureLog: string;             // Required: Error/failure log
  screenshot?: string;            // Optional: Base64 screenshot
  pageSource?: string;            // Optional: Page HTML at failure
  autoApply?: boolean;            // Optional: Auto-apply fix (default: false)
}
```

**Response:**
```typescript
{
  success: boolean;
  healing: {
    testFile: string;
    testName: string;
    diagnosis: Diagnosis;
    fix: Fix;
    pageObjectUpdates?: PageObjectUpdate[];
    recommendations: string[];
    metadata: HealingMetadata;
  };
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3006/heal \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-search.spec.ts",
    "testName": "should display search results",
    "failureLog": "Error: Locator not found: [data-testid=\"search-button\"]",
    "autoApply": false
  }'
```

---

#### POST /diagnose

Diagnose failure without healing (analysis only)

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  testFile: string;               // Required: Test file path
  failureLog: string;             // Required: Error/failure log
  screenshot?: string;            // Optional: Base64 screenshot
}
```

**Response:**
```typescript
{
  success: boolean;
  diagnosis: {
    failureType: string;
    rootCause: string;
    confidence: "high" | "medium" | "low";
    analysis: string;
    suggestedApproach: string;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3006/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-search.spec.ts",
    "failureLog": "TimeoutError: Waiting for selector timed out after 30000ms"
  }'
```

---

#### POST /validate-fix

Validate proposed fix by running test

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  testFile: string;               // Required: Test file path
  originalCode: string;           // Required: Original test code
  fixedCode: string;              // Required: Fixed test code
}
```

**Response:**
```typescript
{
  success: boolean;
  validation: {
    passed: boolean;
    executionTime: number;
    output: string;
    confidence: "high" | "medium" | "low";
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3006/validate-fix \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-search.spec.ts",
    "originalCode": "await page.click(\"[data-testid=btn]\");",
    "fixedCode": "await page.click(\"button:has-text(\\\"Search\\\")\");"
  }'
```

---

#### POST /batch-heal

Heal multiple test failures in batch

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  failures: Array<{               // Required: Array of failures
    testFile: string;
    testName?: string;
    failureLog: string;
  }>;
  autoApply?: boolean;            // Optional: Auto-apply fixes
}
```

**Response:**
```typescript
{
  success: boolean;
  results: Array<{
    testFile: string;
    healed: boolean;
    diagnosis: Diagnosis;
    fix?: Fix;
    error?: string;
  }>;
  summary: {
    total: number;
    healed: number;
    failed: number;
    highConfidence: number;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3006/batch-heal \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "failures": [
      {
        "testFile": "test1.spec.ts",
        "failureLog": "Selector not found"
      },
      {
        "testFile": "test2.spec.ts",
        "failureLog": "Timeout waiting"
      }
    ]
  }'
```

---

#### POST /find-selector

Find working selector for element (utility endpoint)

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  pageUrl: string;                // Required: Page URL
  brokenSelector: string;         // Required: Selector that's not working
  elementDescription?: string;    // Optional: Description of element
}
```

**Response:**
```typescript
{
  success: boolean;
  selectors: Array<{
    selector: string;
    type: "data-testid" | "role" | "text" | "css";
    confidence: number;
    validated: boolean;
  }>;
}
```

**Example:**
```bash
curl -X POST http://localhost:3006/find-selector \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "pageUrl": "/patients/search",
    "brokenSelector": "[data-testid=\"search-btn\"]",
    "elementDescription": "Search button"
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
    playwright: "available" | "unavailable";
  };
  timestamp: string;
}
```

**Example:**
```bash
curl http://localhost:3006/health
```

---

## Usage Examples

### Example 1: Heal Selector Failure

**Scenario:** Test fails because data-testid was removed during refactor

```bash
curl -X POST http://localhost:3006/heal \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-search.spec.ts",
    "testName": "should display search results",
    "failureLog": "Error: Locator not found: [data-testid=\"search-button\"]\\n  at PatientSearchPage.clickSearchButton (patient-search.page.ts:24:5)"
  }'
```

**Response:**
```json
{
  "success": true,
  "healing": {
    "diagnosis": {
      "failureType": "SelectorNotFound",
      "rootCause": "data-testid attribute removed from element",
      "confidence": "high"
    },
    "fix": {
      "type": "SelectorUpdate",
      "changes": [
        {
          "line": 24,
          "original": "await page.click('[data-testid=\"search-button\"]');",
          "fixed": "await page.click('button:has-text(\"Search\")');",
          "reason": "Replaced with text-based selector"
        }
      ],
      "validated": true,
      "confidence": "high"
    }
  }
}
```

**Action:** Review fix and apply to test file

---

### Example 2: Heal Timing Issue

**Scenario:** Test fails intermittently due to missing wait

```bash
curl -X POST http://localhost:3006/heal \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "appointment-scheduling.spec.ts",
    "failureLog": "Error: expect(received).toBeVisible()\\nReceived element is not visible\\n  at Object.<anonymous> (appointment-scheduling.spec.ts:45:5)"
  }'
```

**Response:**
```json
{
  "success": true,
  "healing": {
    "diagnosis": {
      "failureType": "TimingIssue",
      "rootCause": "Assertion executed before element became visible",
      "confidence": "high"
    },
    "fix": {
      "type": "WaitAddition",
      "changes": [
        {
          "line": 44,
          "original": "await page.click('.submit-button');",
          "fixed": "await page.click('.submit-button');\\nawait page.waitForLoadState('networkidle');",
          "reason": "Added wait for network idle before assertion"
        }
      ],
      "validated": true,
      "confidence": "high"
    }
  }
}
```

---

### Example 3: Batch Heal After Deploy

**Scenario:** Deploy broke 10 tests - heal them all at once

```bash
# Get failed tests from CI
FAILED_TESTS=$(cat test-results.json | jq -r '.failures[] | {testFile: .file, failureLog: .error}' | jq -s '.')

# Batch heal
curl -X POST http://localhost:3006/batch-heal \
  -H "Content-Type: application/json" \
  -d "{
    \"app\": \"App1\",
    \"failures\": $FAILED_TESTS,
    \"autoApply\": false
  }"
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "testFile": "test1.spec.ts",
      "healed": true,
      "diagnosis": {...},
      "fix": {...}
    },
    {
      "testFile": "test2.spec.ts",
      "healed": true,
      "diagnosis": {...},
      "fix": {...}
    }
  ],
  "summary": {
    "total": 10,
    "healed": 8,
    "failed": 2,
    "highConfidence": 6
  }
}
```

**Action:** Review and apply high-confidence fixes automatically

---

### Example 4: Find Working Selector

**Scenario:** Need to find alternative selector for broken element

```bash
curl -X POST http://localhost:3006/find-selector \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "pageUrl": "/patients/search",
    "brokenSelector": "[data-testid=\"patient-list\"]",
    "elementDescription": "Patient search results list"
  }'
```

**Response:**
```json
{
  "success": true,
  "selectors": [
    {
      "selector": ".patient-results-container",
      "type": "css",
      "confidence": 85,
      "validated": true
    },
    {
      "selector": "[role=\"list\"]",
      "type": "role",
      "confidence": 90,
      "validated": true
    },
    {
      "selector": "ul:has(li.patient-result)",
      "type": "css",
      "confidence": 80,
      "validated": true
    }
  ]
}
```

**Action:** Use highest confidence selector in test

---

### Example 5: Diagnose Without Healing

**Scenario:** Want to understand failure before attempting fix

```bash
curl -X POST http://localhost:3006/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "payment-processing.spec.ts",
    "failureLog": "Error: expect(received).toBe(expected)\\nExpected: \"Payment successful\"\\nReceived: \"Payment pending\""
  }'
```

**Response:**
```json
{
  "success": true,
  "diagnosis": {
    "failureType": "AssertionFailure",
    "rootCause": "Payment flow changed from synchronous to asynchronous",
    "confidence": "medium",
    "analysis": "The test expects immediate payment success confirmation, but the application now shows 'pending' status while payment processes. This suggests the payment flow was updated to be asynchronous.",
    "suggestedApproach": "Update test to wait for payment status to change from 'pending' to 'successful' using waitFor() with expected condition"
  }
}
```

**Action:** Manually update test based on diagnosis

---

### Example 6: Update Page Object

**Scenario:** Fix test and automatically update Page Object

```bash
curl -X POST http://localhost:3006/heal \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testFile": "patient-chart.spec.ts",
    "failureLog": "Error: page.locator is not a function\\n  at PatientChartPage.openVitals (patient-chart.page.ts:15:5)"
  }'
```

**Response:**
```json
{
  "success": true,
  "healing": {
    "fix": {
      "type": "SelectorUpdate",
      "changes": [...]
    },
    "pageObjectUpdates": [
      {
        "file": "patient-chart.page.ts",
        "changes": [
          {
            "line": 8,
            "original": "this.vitalsTab = page.locator('[data-testid=\"vitals-tab\"]');",
            "fixed": "this.vitalsTab = page.locator('button[role=\"tab\"]:has-text(\"Vitals\")');",
            "reason": "Updated Page Object selector to match test fix"
          }
        ]
      }
    ]
  }
}
```

---

### Example 7: Automated CI/CD Healing

**Scenario:** Integrate healing into CI/CD pipeline

```bash
#!/bin/bash
# ci-heal-tests.sh

# Run tests
npm run test:e2e 2>&1 | tee test-output.log

# Check if tests failed
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "Tests failed. Attempting to heal..."
  
  # Extract failures
  FAILURES=$(cat test-output.log | grep "Error:" | jq -Rs 'split("\n") | map(select(length > 0))')
  
  # Heal failures
  HEAL_RESULT=$(curl -s -X POST http://localhost:3006/batch-heal \
    -H "Content-Type: application/json" \
    -d "{\"app\":\"App1\",\"failures\":$FAILURES}")
  
  # Check heal success
  HEALED=$(echo $HEAL_RESULT | jq '.summary.healed')
  HIGH_CONF=$(echo $HEAL_RESULT | jq '.summary.highConfidence')
  
  if [ "$HEALED" -gt 0 ]; then
    echo "Healed $HEALED tests ($HIGH_CONF high confidence)"
    echo "Review fixes and re-run tests"
    exit 1  # Still fail CI, but provide fixes
  fi
fi
```

---

## Input/Output Schemas

### Input Schema: Heal Request

```typescript
interface HealRequest {
  app: string;                    // Application name
  testFile: string;               // Test file path
  testName?: string;              // Specific test name
  failureLog: string;             // Error/failure log
  screenshot?: string;            // Base64 screenshot
  pageSource?: string;            // Page HTML
  autoApply?: boolean;            // Auto-apply fix
}
```

---

### Output Schema: Heal Result

```typescript
interface HealResult {
  success: boolean;
  healing: {
    testFile: string;
    testName: string;
    diagnosis: Diagnosis;
    fix: Fix;
    pageObjectUpdates?: PageObjectUpdate[];
    recommendations: string[];
    metadata: HealingMetadata;
  };
  executionTime: number;
  timestamp: string;
}

interface Diagnosis {
  failureType: "SelectorNotFound" | "TimingIssue" | "AssertionFailure" | "NetworkError" | "Other";
  rootCause: string;
  confidence: "high" | "medium" | "low";
  analysis: string;
  suggestedApproach?: string;
}

interface Fix {
  type: "SelectorUpdate" | "WaitAddition" | "AssertionUpdate" | "Multiple";
  changes: Change[];
  fullCode: string;
  confidence: "high" | "medium" | "low";
  validated: boolean;
  estimatedFixTime: string;
}

interface Change {
  line: number;
  original: string;
  fixed: string;
  reason: string;
}

interface PageObjectUpdate {
  file: string;
  changes: Change[];
}

interface HealingMetadata {
  healingTime: number;
  validationTime: number;
  alternativeSelectorsConsidered: number;
  selectedSelectorType: string;
  requiresManualReview: boolean;
}
```

---

## Data Persistence

### Storage Locations

```
./data/playwright-healer/
├── healing-logs/
│   ├── 2024-12-29-healing-log.json
│   └── healing-history.json
├── fixes/
│   ├── App1/
│   │   ├── patient-search.spec.ts.backup
│   │   └── patient-search.spec.ts.fixed
│   └── App2/
└── logs/
    └── playwright-healer.log
```

### What Gets Stored

1. **Healing Logs** - Complete record of all healing attempts
2. **Test Backups** - Original test files before fixes
3. **Fixed Tests** - Repaired test files
4. **Execution Logs** - Service logs

---

## Development

### Local Setup

```bash
cd mcps/playwright-healer
npm install
npx playwright install
cp ../../.env.example .env
# Set ANTHROPIC_API_KEY in .env
```

---

## Testing

### Unit Tests

```bash
npm test
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `MISSING_API_KEY` | 401 | ANTHROPIC_API_KEY not set | Set API key in .env |
| `TEST_NOT_FOUND` | 404 | Test file doesn't exist | Verify test file path |
| `HEALING_FAILED` | 500 | Could not heal test | Review diagnosis |
| `VALIDATION_FAILED` | 400 | Fixed test still fails | Manual review needed |

---

## Troubleshooting

### Issue: Healing not working

**Solution:** Check Claude API connectivity and test file accessibility

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3006/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/tests/heal-playwright`

### Uses

**Anthropic Claude API:** For diagnosis and fixing
**Playwright:** For validation

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ AI-powered diagnosis
- ✅ Selector healing
- ✅ Timing fixes
- ✅ Batch healing

---

**Need help?** View logs with `docker compose logs -f playwright-healer`
