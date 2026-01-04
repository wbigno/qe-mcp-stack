# Playwright Analyzer - Critical UI Path Analysis & Test Prioritization

**Type:** Docker MCP (Always Running)  
**Port:** 3004  
**Container:** `qe-playwright-analyzer`  
**Location:** `mcps/playwright-analyzer/`  
**Technology:** Node.js 18 + Express + Playwright + Static Analysis  
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

The **Playwright Analyzer** is a specialized MCP designed to identify, analyze, and prioritize critical user interface paths for end-to-end testing with Playwright. It analyzes application structure, user requirements, controller endpoints, and business workflows to automatically identify the most important UI paths that require testing. The service calculates risk scores based on business impact, usage frequency, complexity, and integration points, then provides prioritized recommendations for which UI paths should be tested first.

This MCP bridges the gap between requirement analysis and test generation by understanding which user journeys are most critical to business operations. It identifies high-risk paths involving Epic EMR integrations, financial transactions, patient data access, and appointment scheduling. The analyzer examines controller routes, view components, and navigation flows to map complete user journeys from login to task completion.

The Playwright Analyzer is essential for test planning when resources are limited, ensuring the most critical paths are tested first. It helps teams avoid the trap of testing everything equally by providing data-driven prioritization based on actual business risk and user impact.

### Key Features

- ✅ **Critical Path Detection** - Automatically identifies the most important UI workflows from code and requirements
- ✅ **Risk-Based Prioritization** - Calculates risk scores using business impact, frequency, complexity, and integration points
- ✅ **Controller Analysis** - Parses MVC controllers to identify API endpoints and user-facing routes
- ✅ **Workflow Mapping** - Maps complete user journeys from start to finish with all intermediate steps
- ✅ **Integration Point Identification** - Highlights paths involving Epic, financial systems, and external services
- ✅ **Selector Recommendations** - Suggests robust Playwright selectors for each UI element
- ✅ **Test Effort Estimation** - Estimates hours required to create tests for each path
- ✅ **Frequency Analysis** - Identifies most commonly used paths based on usage patterns
- ✅ **Existing Test Coverage** - Analyzes existing Playwright tests to identify coverage gaps
- ✅ **Business Impact Scoring** - Weighs paths by their impact on patient care, revenue, and compliance

### Use Cases

1. **Test Planning** - Prioritize which UI paths to test when creating a new test suite
2. **Regression Test Selection** - Identify critical paths for smoke/regression test suites
3. **Resource Allocation** - Estimate testing effort and allocate resources to high-priority paths
4. **Coverage Gap Analysis** - Find critical paths that lack automated UI test coverage
5. **Sprint Test Focus** - Determine which new features require UI testing based on risk
6. **Compliance Testing** - Identify paths involving HIPAA-sensitive operations requiring validation
7. **Performance Test Targets** - Select high-frequency paths for performance testing
8. **New Team Onboarding** - Help new QA team members understand critical user workflows

### What It Does NOT Do

- ❌ Does not generate Playwright tests (delegates to playwright-generator)
- ❌ Does not execute tests (delegates to test execution frameworks)
- ❌ Does not heal broken tests (delegates to playwright-healer)
- ❌ Does not analyze test results (delegates to test result analyzers)
- ❌ Does not monitor live production traffic (static analysis only)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Analyze critical UI paths for application
curl -X POST http://localhost:3000/api/tests/analyze-ui-paths \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Analyze with requirements integration
curl -X POST http://localhost:3000/api/tests/analyze-ui-paths \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeRequirements": true,
    "sprint": "Sprint 45"
  }'

# Get prioritized path recommendations
curl -X POST http://localhost:3000/api/tests/prioritize-ui-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "maxPaths": 10,
    "riskThreshold": "high"
  }'
```

### Direct Access (Testing Only)

```bash
# Analyze UI paths
curl -X POST http://localhost:3004/analyze-paths \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeRequirements": false
  }'

# Prioritize paths
curl -X POST http://localhost:3004/prioritize \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "riskThreshold": "high",
    "maxResults": 10
  }'

# Analyze existing tests
curl -X POST http://localhost:3004/existing-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testDirectory": "/tests/e2e"
  }'

# Get recommendations
curl -X POST http://localhost:3004/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Health check
curl http://localhost:3004/health
```

### Expected Output

```json
{
  "success": true,
  "app": "App1",
  "analysis": {
    "criticalPaths": [
      {
        "id": "path-001",
        "name": "Patient Search and Chart Access",
        "description": "Clinician searches for patient and opens their chart",
        "priority": "critical",
        "riskScore": 95,
        "businessImpact": 10,
        "frequency": "very-high",
        "complexity": 6,
        "steps": [
          {
            "step": 1,
            "action": "Navigate to patient search page",
            "url": "/patients/search",
            "selector": "a[href='/patients/search']",
            "description": "Click patient search link in navigation"
          },
          {
            "step": 2,
            "action": "Enter patient name in search field",
            "selector": "input[data-testid='patient-search-input']",
            "description": "Type patient name in search box",
            "testData": "John Smith"
          },
          {
            "step": 3,
            "action": "Click search button",
            "selector": "button[type='submit']:has-text('Search')",
            "description": "Submit search query"
          },
          {
            "step": 4,
            "action": "Click on patient result",
            "selector": ".patient-result:first-child",
            "description": "Select first patient from results"
          },
          {
            "step": 5,
            "action": "Verify chart loads",
            "selector": ".patient-chart-container",
            "assertion": "Chart container is visible",
            "epicIntegration": true
          }
        ],
        "integrationPoints": [
          {
            "type": "epic",
            "endpoint": "EpicService.SearchPatients",
            "step": 3
          },
          {
            "type": "epic",
            "endpoint": "EpicService.GetPatientChart",
            "step": 5
          }
        ],
        "estimatedEffort": "4 hours",
        "testCoverage": 0,
        "reasons": [
          "High business impact - core clinical workflow",
          "Epic EMR integration - 2 external API calls",
          "Very high frequency - used 500+ times daily",
          "HIPAA compliance - patient data access",
          "Currently no automated test coverage"
        ]
      },
      {
        "id": "path-002",
        "name": "Appointment Scheduling",
        "description": "Patient schedules a new appointment",
        "priority": "high",
        "riskScore": 88,
        "businessImpact": 9,
        "frequency": "high",
        "complexity": 7,
        "steps": [
          {
            "step": 1,
            "action": "Navigate to appointments",
            "url": "/appointments",
            "selector": "a[href='/appointments']"
          },
          {
            "step": 2,
            "action": "Click new appointment button",
            "selector": "button:has-text('New Appointment')"
          },
          {
            "step": 3,
            "action": "Select appointment type",
            "selector": "select[name='appointmentType']",
            "testData": "Consultation"
          },
          {
            "step": 4,
            "action": "Select date and time",
            "selector": ".date-picker",
            "testData": "2024-12-30 10:00"
          },
          {
            "step": 5,
            "action": "Select provider",
            "selector": "select[name='provider']",
            "testData": "Dr. Smith"
          },
          {
            "step": 6,
            "action": "Submit appointment",
            "selector": "button[type='submit']"
          },
          {
            "step": 7,
            "action": "Verify confirmation",
            "selector": ".confirmation-message",
            "assertion": "Appointment confirmed"
          }
        ],
        "integrationPoints": [
          {
            "type": "epic",
            "endpoint": "EpicService.CreateAppointment",
            "step": 6
          }
        ],
        "estimatedEffort": "5 hours",
        "testCoverage": 25,
        "reasons": [
          "High business impact - revenue generating",
          "Epic integration - appointment creation",
          "High frequency - 200+ daily appointments",
          "Complex workflow - 7 steps",
          "Partial test coverage - needs improvement"
        ]
      },
      {
        "id": "path-003",
        "name": "Payment Processing",
        "description": "Patient makes a payment for services",
        "priority": "high",
        "riskScore": 92,
        "businessImpact": 10,
        "frequency": "medium",
        "complexity": 8,
        "steps": [
          {
            "step": 1,
            "action": "Navigate to billing",
            "url": "/billing",
            "selector": "a[href='/billing']"
          },
          {
            "step": 2,
            "action": "View outstanding balance",
            "selector": ".balance-amount"
          },
          {
            "step": 3,
            "action": "Click make payment",
            "selector": "button:has-text('Make Payment')"
          },
          {
            "step": 4,
            "action": "Enter payment amount",
            "selector": "input[name='amount']",
            "testData": "100.00"
          },
          {
            "step": 5,
            "action": "Enter card details",
            "selector": ".payment-form",
            "financialTouchpoint": true
          },
          {
            "step": 6,
            "action": "Submit payment",
            "selector": "button:has-text('Pay Now')"
          },
          {
            "step": 7,
            "action": "Verify payment success",
            "selector": ".payment-success",
            "assertion": "Payment processed"
          }
        ],
        "integrationPoints": [
          {
            "type": "financial",
            "endpoint": "StripeService.ProcessPayment",
            "step": 6
          }
        ],
        "estimatedEffort": "6 hours",
        "testCoverage": 0,
        "reasons": [
          "Critical - financial transaction",
          "Stripe integration - payment processing",
          "High risk - money movement",
          "PCI compliance required",
          "No automated test coverage"
        ]
      }
    ],
    "summary": {
      "totalPaths": 15,
      "criticalPaths": 3,
      "highPriority": 5,
      "mediumPriority": 4,
      "lowPriority": 3,
      "averageComplexity": 6.2,
      "totalEstimatedEffort": "45 hours",
      "overallCoverage": 18,
      "epicIntegrationPaths": 8,
      "financialPaths": 3
    },
    "recommendations": [
      "PRIORITY 1: Implement test for Patient Search and Chart Access (risk: 95, no coverage)",
      "PRIORITY 2: Implement test for Payment Processing (risk: 92, no coverage)",
      "PRIORITY 3: Improve test for Appointment Scheduling (risk: 88, 25% coverage)",
      "Consider Epic integration mocking for development testing",
      "Focus on paths with no coverage first (12 paths)",
      "Estimated 45 hours to achieve full critical path coverage"
    ]
  },
  "cached": false,
  "executionTime": 1850,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│           Playwright Analyzer (Port 3004)                        │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Controller   │──▶│ Path           │         │
│  │ Router   │   │ Parser       │   │ Mapper         │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      Route Analysis      Workflow Mapping            │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Risk         │   │ Selector     │   │ Coverage     │      │
│  │ Calculator   │   │ Generator    │   │ Analyzer     │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Risk Scoring        Playwright Selectors   Test Coverage
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /analyze-paths` - Main path analysis endpoint
   - `POST /prioritize` - Prioritize paths by risk
   - `POST /existing-tests` - Analyze existing test coverage
   - `POST /recommendations` - Get testing recommendations
   - `GET /health` - Health check endpoint

2. **Controller Parser** (`src/analyzers/controllerParser.js`)
   - **Route Extractor** - Extracts MVC routes from controllers
   - **Action Parser** - Parses controller actions and parameters
   - **Authorization Detector** - Identifies routes requiring authentication
   - **HTTP Method Mapper** - Maps routes to HTTP methods (GET, POST, etc.)

3. **Path Mapper** (`src/services/pathMapper.js`)
   - **Workflow Builder** - Constructs complete user workflows from routes
   - **Navigation Tracker** - Maps how users navigate between pages
   - **Form Flow Analyzer** - Identifies multi-step form submissions
   - **Integration Correlator** - Links UI paths to backend integration points

4. **Risk Calculator** (`src/services/riskCalculator.js`)
   - **Business Impact Scorer** - Rates paths by business criticality (1-10)
   - **Frequency Estimator** - Estimates usage frequency from route patterns
   - **Complexity Calculator** - Counts steps and decision points
   - **Integration Risk** - Weights paths with Epic/financial integrations higher

5. **Selector Generator** (`src/services/selectorGenerator.js`)
   - **Test ID Generator** - Suggests data-testid attributes
   - **CSS Selector Builder** - Creates robust CSS selectors
   - **Text Locator** - Generates has-text() locators for buttons/links
   - **Accessibility Selector** - Suggests role-based selectors for accessibility

6. **Coverage Analyzer** (`src/analyzers/coverageAnalyzer.js`)
   - **Test File Parser** - Parses existing Playwright test files
   - **Path Matcher** - Matches existing tests to identified paths
   - **Coverage Calculator** - Calculates percentage coverage per path
   - **Gap Identifier** - Identifies paths without test coverage

7. **Recommendation Engine** (`src/services/recommendationEngine.js`)
   - **Prioritizer** - Orders paths by risk score and coverage gaps
   - **Effort Estimator** - Estimates hours to create tests
   - **Strategy Suggester** - Recommends testing strategies (smoke, regression, full)

### Dependencies

**Internal:**
- code-analyzer (3001) - For controller and integration point analysis
- azure-devops (3003) - Optional: For requirements integration
- coverage-analyzer (3002) - Optional: For test coverage correlation

**External Services:**
- File system access to application code (`/mnt/apps/*`)
- File system access to test files (if analyzing existing tests)
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- playwright - For selector validation
- @babel/parser - For parsing JavaScript/TypeScript test files
- acorn - For parsing controller files
- glob - File pattern matching
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /analyze-paths)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name exists
   ├─▶ Validate analysis options
   └─▶ Load app configuration
       │
       ▼
3. Controller Analysis
   ├─▶ Scan for controller files (*Controller.cs)
   ├─▶ Parse each controller with Roslyn
   ├─▶ Extract routes and actions
   ├─▶ Identify authorization requirements
   └─▶ Map HTTP methods to routes
       │
       ▼
4. Integration Point Correlation
   ├─▶ Call code-analyzer for integration points
   ├─▶ Match Epic/Financial calls to routes
   ├─▶ Identify which paths call external systems
   └─▶ Tag paths with integration metadata
       │
       ▼
5. Workflow Mapping
   ├─▶ Group related routes into user workflows
   ├─▶ Identify entry points (login, home, etc.)
   ├─▶ Map navigation sequences
   ├─▶ Build step-by-step user journeys
   └─▶ Identify completion points
       │
       ▼
6. Risk Calculation
   ├─▶ Calculate business impact (1-10)
   ├─▶ Estimate usage frequency (very-high/high/medium/low)
   ├─▶ Calculate complexity (step count + decision points)
   ├─▶ Weight Epic/financial integrations
   ├─▶ Calculate overall risk score (0-100)
   └─▶ Assign priority (critical/high/medium/low)
       │
       ▼
7. Selector Generation
   ├─▶ Generate data-testid suggestions
   ├─▶ Build CSS selectors for each step
   ├─▶ Create text-based locators
   └─▶ Add accessibility selectors
       │
       ▼
8. Coverage Analysis (if existing tests provided)
   ├─▶ Parse existing Playwright test files
   ├─▶ Match test scenarios to identified paths
   ├─▶ Calculate coverage percentage per path
   └─▶ Identify coverage gaps
       │
       ▼
9. Prioritization
   ├─▶ Sort paths by risk score
   ├─▶ Filter by risk threshold (if specified)
   ├─▶ Apply max results limit
   └─▶ Generate recommendations
       │
       ▼
10. Response Formatting
    └─▶ Return JSON with critical paths, priorities, recommendations
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3004 | Playwright analyzer HTTP port |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `CODE_ANALYZER_URL` | ❌ No | http://code-analyzer:3001 | Code analyzer service URL |
| `ADO_INTEGRATION` | ❌ No | false | Enable ADO requirements integration |

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
      "criticalPaths": [
        "Patient Search",
        "Appointment Scheduling",
        "Payment Processing"
      ],
      "businessImpact": {
        "patientSearch": 10,
        "appointments": 9,
        "billing": 10,
        "charts": 8
      }
    }
  ]
}
```

**Field Descriptions:**

- `criticalPaths` - Known critical workflows (helps prioritization)
- `businessImpact` - Custom business impact scores for specific areas

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
playwright-analyzer:
  build: ./mcps/playwright-analyzer
  container_name: qe-playwright-analyzer
  ports:
    - "3004:3004"
  environment:
    - NODE_ENV=production
    - PORT=3004
    - CODE_ANALYZER_URL=http://code-analyzer:3001
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/playwright-analyzer:/app/data   # Analysis results
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
    - ${APP2_PATH}:/mnt/apps/app2:ro
    - ${APP3_PATH}:/mnt/apps/app3:ro
  networks:
    - qe-network
  restart: unless-stopped
  depends_on:
    - code-analyzer
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read application definitions
- `./data/playwright-analyzer` - Store path analysis results
- `/mnt/apps/*` - Read-only access to application code

---

## API Reference

### Path Analysis Endpoints

#### POST /analyze-paths

Analyze critical UI paths for an application

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
  includeRequirements?: boolean;  // Optional: Include ADO requirements (default: false)
  sprint?: string;                // Optional: Sprint for requirements filtering
  riskThreshold?: "critical" | "high" | "medium" | "low";  // Optional: Min risk level
}
```

**Response:**
```typescript
{
  success: boolean;
  app: string;
  analysis: {
    criticalPaths: CriticalPath[];
    summary: Summary;
    recommendations: string[];
  };
  cached: boolean;
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3004/analyze-paths \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeRequirements": false,
    "riskThreshold": "high"
  }'
```

---

#### POST /prioritize

Get prioritized list of paths for testing

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  riskThreshold?: "critical" | "high" | "medium" | "low";  // Optional: Min risk
  maxResults?: number;            // Optional: Max paths to return (default: 10)
  sortBy?: "risk" | "coverage" | "effort";  // Optional: Sort criteria
}
```

**Response:**
```typescript
{
  success: boolean;
  prioritizedPaths: CriticalPath[];
  totalPaths: number;
  estimatedEffort: string;
  recommendations: string[];
}
```

**Example:**
```bash
curl -X POST http://localhost:3004/prioritize \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "riskThreshold": "high",
    "maxResults": 5,
    "sortBy": "risk"
  }'
```

---

#### POST /existing-tests

Analyze existing Playwright test coverage

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  testDirectory?: string;         // Optional: Path to test files (default: /tests/e2e)
}
```

**Response:**
```typescript
{
  success: boolean;
  coverage: {
    totalTests: number;
    coveredPaths: string[];
    uncoveredPaths: string[];
    coveragePercentage: number;
    pathCoverage: Array<{
      pathId: string;
      pathName: string;
      covered: boolean;
      testFile?: string;
    }>;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3004/existing-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testDirectory": "/mnt/apps/app1/tests/e2e"
  }'
```

---

#### POST /recommendations

Get testing strategy recommendations

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  strategy?: "smoke" | "regression" | "full";  // Optional: Testing strategy
}
```

**Response:**
```typescript
{
  success: boolean;
  recommendations: {
    smokePaths: string[];         // Top 3-5 critical paths
    regressionPaths: string[];    // Top 10-15 important paths
    fullSuite: string[];          // All identified paths
    estimatedEffort: {
      smoke: string;
      regression: string;
      full: string;
    };
    priorities: string[];
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3004/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "strategy": "regression"
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
  dependencies: {
    codeAnalyzer: "healthy" | "unhealthy";
  };
  timestamp: string;
}
```

**Example:**
```bash
curl http://localhost:3004/health
```

---

## Usage Examples

### Example 1: Identify Critical Paths for New Application

**Scenario:** Starting UI testing for a new application - need to identify which paths to test first

```bash
curl -X POST http://localhost:3004/analyze-paths \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

**Response Snippet:**
```json
{
  "success": true,
  "analysis": {
    "criticalPaths": [
      {
        "name": "Patient Search and Chart Access",
        "priority": "critical",
        "riskScore": 95,
        "reasons": [
          "High business impact - core clinical workflow",
          "Epic EMR integration - 2 external API calls",
          "Very high frequency - used 500+ times daily"
        ]
      }
    ]
  }
}
```

**Action:** Start with the top 3 critical paths (risk score 90+)

---

### Example 2: Get Top 5 Paths for Smoke Test Suite

**Scenario:** Creating a smoke test suite that must run in <5 minutes

```bash
curl -X POST http://localhost:3004/prioritize \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "riskThreshold": "critical",
    "maxResults": 5,
    "sortBy": "risk"
  }'
```

**Response:**
```json
{
  "success": true,
  "prioritizedPaths": [
    {
      "id": "path-001",
      "name": "Patient Search and Chart Access",
      "riskScore": 95,
      "estimatedEffort": "4 hours"
    },
    {
      "id": "path-003",
      "name": "Payment Processing",
      "riskScore": 92,
      "estimatedEffort": "6 hours"
    },
    {
      "id": "path-002",
      "name": "Appointment Scheduling",
      "riskScore": 88,
      "estimatedEffort": "5 hours"
    },
    {
      "id": "path-005",
      "name": "User Login and Authentication",
      "riskScore": 87,
      "estimatedEffort": "3 hours"
    },
    {
      "id": "path-008",
      "name": "Lab Results Review",
      "riskScore": 85,
      "estimatedEffort": "4 hours"
    }
  ],
  "estimatedEffort": "22 hours"
}
```

**Action:** Create these 5 tests for smoke suite (22 hours of work)

---

### Example 3: Analyze Existing Test Coverage

**Scenario:** Have some Playwright tests - want to know what gaps exist

```bash
curl -X POST http://localhost:3004/existing-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testDirectory": "/mnt/apps/app1/tests/e2e"
  }'
```

**Response:**
```json
{
  "success": true,
  "coverage": {
    "totalTests": 8,
    "coveredPaths": [
      "User Login",
      "Patient Search",
      "View Labs"
    ],
    "uncoveredPaths": [
      "Payment Processing",
      "Appointment Scheduling",
      "Chart Documentation",
      "Prescription Ordering"
    ],
    "coveragePercentage": 38,
    "pathCoverage": [
      {
        "pathId": "path-001",
        "pathName": "Patient Search and Chart Access",
        "covered": true,
        "testFile": "patient-search.spec.ts"
      },
      {
        "pathId": "path-003",
        "pathName": "Payment Processing",
        "covered": false
      }
    ]
  }
}
```

**Action:** Focus on the 4 uncovered paths with highest risk

---

### Example 4: Get Testing Strategy Recommendation

**Scenario:** Need guidance on testing approach for regression suite

```bash
curl -X POST http://localhost:3004/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "strategy": "regression"
  }'
```

**Response:**
```json
{
  "success": true,
  "recommendations": {
    "smokePaths": [
      "Patient Search and Chart Access",
      "Payment Processing",
      "User Login and Authentication"
    ],
    "regressionPaths": [
      "Patient Search and Chart Access",
      "Payment Processing",
      "Appointment Scheduling",
      "User Login and Authentication",
      "Lab Results Review",
      "Prescription Ordering",
      "Chart Documentation",
      "Patient Registration",
      "Insurance Verification",
      "Appointment Cancellation"
    ],
    "estimatedEffort": {
      "smoke": "13 hours",
      "regression": "42 hours",
      "full": "87 hours"
    },
    "priorities": [
      "CRITICAL: Implement Payment Processing test (no coverage, risk 92)",
      "HIGH: Improve Appointment Scheduling test (partial coverage, risk 88)",
      "MEDIUM: Add Prescription Ordering test (no coverage, risk 76)"
    ]
  }
}
```

**Action:** Build regression suite with these 10 paths (42 hours)

---

### Example 5: Integration with Test Generation

**Scenario:** Use path analysis to drive automated test generation

```bash
# Step 1: Get critical paths
PATHS=$(curl -s -X POST http://localhost:3004/prioritize \
  -H "Content-Type: application/json" \
  -d '{"app":"App1","maxResults":3}')

# Step 2: Extract top path
TOP_PATH=$(echo $PATHS | jq '.prioritizedPaths[0]')

# Step 3: Generate Playwright test for top path (via playwright-generator)
curl -X POST http://localhost:3005/generate-test \
  -H "Content-Type: application/json" \
  -d "{
    \"app\": \"App1\",
    \"pathName\": $(echo $TOP_PATH | jq '.name'),
    \"steps\": $(echo $TOP_PATH | jq '.steps')
  }"
```

---

### Example 6: Sprint-Based Path Analysis

**Scenario:** Analyze paths for current sprint's new features

```bash
curl -X POST http://localhost:3004/analyze-paths \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeRequirements": true,
    "sprint": "Sprint 45"
  }'
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "criticalPaths": [
      {
        "name": "New Telehealth Video Consultation",
        "priority": "high",
        "riskScore": 82,
        "associatedStory": {
          "id": 12345,
          "title": "As a patient, I want to join video consultations"
        },
        "reasons": [
          "New feature in Sprint 45",
          "Third-party integration (Twilio Video)",
          "High business value - telehealth expansion"
        ]
      }
    ]
  }
}
```

**Action:** Prioritize testing new Sprint 45 features

---

### Example 7: Export Path Analysis for Documentation

**Scenario:** Generate path documentation for test planning meeting

```bash
# Get full analysis
curl -X POST http://localhost:3004/analyze-paths \
  -d '{"app":"App1"}' > paths-analysis.json

# Extract summary
cat paths-analysis.json | jq '.analysis.summary'

# Extract top 10 critical paths
cat paths-analysis.json | jq '.analysis.criticalPaths | sort_by(-.riskScore) | .[0:10]'

# Generate markdown report
cat paths-analysis.json | jq -r '.analysis.criticalPaths[] | 
  "## \(.name)\n**Risk:** \(.riskScore)\n**Effort:** \(.estimatedEffort)\n**Steps:** \(.steps | length)\n"'
```

---

## Input/Output Schemas

### Input Schema: Analyze Paths Request

```typescript
interface AnalyzePathsRequest {
  app: string;                    // Application name from apps.json
  includeRequirements?: boolean;  // Include ADO requirements analysis
  sprint?: string;                // Sprint for requirements filtering
  riskThreshold?: "critical" | "high" | "medium" | "low";
}
```

---

### Output Schema: Analyze Paths Result

```typescript
interface AnalyzePathsResult {
  success: boolean;
  app: string;
  analysis: {
    criticalPaths: CriticalPath[];
    summary: Summary;
    recommendations: string[];
  };
  cached: boolean;
  executionTime: number;
  timestamp: string;
}

interface CriticalPath {
  id: string;                     // Unique path identifier
  name: string;                   // Human-readable path name
  description: string;            // Path description
  priority: "critical" | "high" | "medium" | "low";
  riskScore: number;              // 0-100
  businessImpact: number;         // 1-10
  frequency: "very-high" | "high" | "medium" | "low";
  complexity: number;             // Step count + decision points
  steps: Step[];                  // Step-by-step workflow
  integrationPoints: IntegrationPoint[];
  estimatedEffort: string;        // e.g., "4 hours"
  testCoverage: number;           // 0-100 percentage
  reasons: string[];              // Why this path is critical
  associatedStory?: {             // If includeRequirements=true
    id: number;
    title: string;
  };
}

interface Step {
  step: number;                   // Step number
  action: string;                 // Action description
  url?: string;                   // URL if navigation
  selector: string;               // Recommended Playwright selector
  description: string;            // Detailed step description
  testData?: string;              // Example test data
  assertion?: string;             // Expected result
  epicIntegration?: boolean;      // Epic API call in this step
  financialTouchpoint?: boolean;  // Financial operation in this step
}

interface IntegrationPoint {
  type: "epic" | "financial" | "external";
  endpoint: string;               // API endpoint or service method
  step: number;                   // Which step uses this integration
}

interface Summary {
  totalPaths: number;
  criticalPaths: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  averageComplexity: number;
  totalEstimatedEffort: string;
  overallCoverage: number;
  epicIntegrationPaths: number;
  financialPaths: number;
}
```

---

### Input Schema: Prioritize Request

```typescript
interface PrioritizeRequest {
  app: string;
  riskThreshold?: "critical" | "high" | "medium" | "low";
  maxResults?: number;            // Default: 10
  sortBy?: "risk" | "coverage" | "effort";
}
```

---

### Output Schema: Prioritize Result

```typescript
interface PrioritizeResult {
  success: boolean;
  prioritizedPaths: CriticalPath[];
  totalPaths: number;
  estimatedEffort: string;
  recommendations: string[];
}
```

---

### Input Schema: Existing Tests Request

```typescript
interface ExistingTestsRequest {
  app: string;
  testDirectory?: string;         // Default: /tests/e2e
}
```

---

### Output Schema: Existing Tests Result

```typescript
interface ExistingTestsResult {
  success: boolean;
  coverage: {
    totalTests: number;
    coveredPaths: string[];
    uncoveredPaths: string[];
    coveragePercentage: number;
    pathCoverage: Array<{
      pathId: string;
      pathName: string;
      covered: boolean;
      testFile?: string;
    }>;
  };
}
```

---

## Data Persistence

### Storage Locations

```
./data/playwright-analyzer/
├── analyses/
│   ├── App1-paths.json          # Path analysis for App1
│   ├── App2-paths.json          # Path analysis for App2
│   └── metadata.json            # Analysis timestamps
├── coverage/
│   ├── App1-coverage.json       # Test coverage data
│   └── App2-coverage.json
└── logs/
    └── playwright-analyzer.log  # Service logs
```

### What Gets Stored

1. **Path Analyses** (`analyses/*.json`)
   - Complete path analysis per application
   - Risk scores and priorities
   - Not automatically expired (manual cleanup)

2. **Coverage Data** (`coverage/*.json`)
   - Test coverage mapping
   - Covered/uncovered paths
   - Updated when analyzing existing tests

3. **Execution Logs** (`logs/playwright-analyzer.log`)
   - Analysis execution times
   - Errors and warnings
   - Integration calls

### Data Backup

```bash
# Backup analyzer data
./manage-data.sh backup playwright-analyzer

# Restore from backup
./manage-data.sh restore playwright-analyzer
```

---

## Development

### Local Setup

```bash
# Navigate to MCP directory
cd mcps/playwright-analyzer

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Copy environment file
cp ../../.env.example .env

# Ensure code-analyzer is running
curl http://localhost:3001/health
```

### Project Structure

```
mcps/playwright-analyzer/
├── src/
│   ├── index.js                     # Entry point
│   ├── routes/
│   │   ├── pathRoutes.js            # Path analysis endpoints
│   │   ├── priorityRoutes.js        # Prioritization endpoints
│   │   └── healthRoutes.js          # Health check
│   ├── analyzers/
│   │   ├── controllerParser.js      # Parse MVC controllers
│   │   └── coverageAnalyzer.js      # Analyze existing tests
│   ├── services/
│   │   ├── pathMapper.js            # Map user workflows
│   │   ├── riskCalculator.js        # Calculate risk scores
│   │   ├── selectorGenerator.js     # Generate Playwright selectors
│   │   └── recommendationEngine.js  # Testing recommendations
│   └── utils/
│       ├── configReader.js          # Config file reader
│       └── logger.js                # Winston logger
├── tests/
│   ├── unit/
│   │   ├── riskCalculator.test.js
│   │   └── pathMapper.test.js
│   └── integration/
│       └── path-analysis.test.js
├── package.json
├── Dockerfile
└── README.md
```

### Running Locally

```bash
# Development mode
npm run dev

# Production mode
npm start

# With debug logging
DEBUG=* npm run dev
```

---

## Testing

### Unit Tests

```bash
cd mcps/playwright-analyzer
npm test
```

### Integration Tests

```bash
# Start services
cd ../..
./start.sh

# Run integration tests
cd mcps/playwright-analyzer
npm run test:integration
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INVALID_APP` | 400 | App not found | Verify app name in apps.json |
| `CODE_ANALYZER_UNAVAILABLE` | 503 | Code analyzer not responding | Check code-analyzer service |
| `NO_CONTROLLERS_FOUND` | 404 | No controller files found | Verify app has MVC controllers |
| `ANALYSIS_ERROR` | 500 | Analysis failed | Check logs for details |

---

## Troubleshooting

### Issue: No paths detected

**Solution:**
```bash
# Verify controllers exist
docker exec qe-playwright-analyzer find /mnt/apps/app1 -name "*Controller.cs"

# Check code-analyzer integration
curl http://localhost:3001/health
```

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3004/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/tests/analyze-ui-paths`

**Playwright Generator:** Uses path analysis for test generation

### Uses

**Code Analyzer:** For controller and integration analysis

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Critical path detection
- ✅ Risk-based prioritization
- ✅ Controller analysis
- ✅ Workflow mapping
- ✅ Selector generation
- ✅ Coverage analysis
- ✅ Docker containerization

---

**Need help?** Check the troubleshooting section or view logs with `docker compose logs -f playwright-analyzer`
