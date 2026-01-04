# Coverage Analyzer - xUnit Test Coverage Analysis & Gap Detection

**Type:** Docker MCP (Always Running)  
**Port:** 3002  
**Container:** `qe-coverage-analyzer`  
**Location:** `mcps/coverage-analyzer/`  
**Technology:** Node.js 18 + Coverage.py + xUnit Parser  
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

The **Coverage Analyzer** is a specialized MCP designed to perform comprehensive test coverage analysis for .NET C# applications using xUnit as the testing framework. It parses coverage reports (coverage.xml, coverage.cobertura.xml), calculates detailed coverage metrics by class and method, identifies untested code with risk scoring, and provides actionable recommendations for improving test coverage.

This MCP goes beyond simple percentage calculations by cross-referencing coverage data with code analysis results from the code-analyzer MCP to identify high-risk untested methods, missing negative test scenarios, and integration points that lack adequate test coverage. It tracks coverage trends over time to ensure quality improvements and helps QA teams prioritize testing efforts based on risk and business impact.

The Coverage Analyzer serves as a critical quality gate in the QE MCP Stack, ensuring that code changes are adequately tested before deployment and helping teams maintain high test coverage standards across their application portfolio. It integrates deeply with the code-analyzer to understand code complexity, with the risk-analyzer to prioritize testing efforts, and with test generation MCPs to automatically fill identified gaps.

### Key Features

- ✅ **xUnit Coverage Parsing** - Parse coverage.xml and coverage.cobertura.xml reports with full metadata extraction
- ✅ **Method-Level Coverage** - Calculate coverage percentage for every class and method in the codebase
- ✅ **Risk-Based Gap Analysis** - Identify untested methods with risk scoring based on complexity, integration points, and business criticality
- ✅ **Missing Negative Tests** - Detect scenarios where positive tests exist but corresponding negative/edge case tests are missing
- ✅ **Coverage Trends** - Track coverage changes over time to monitor quality improvements or regressions
- ✅ **Integration Point Focus** - Highlight untested Epic EMR integrations and financial system touchpoints
- ✅ **Smart Recommendations** - AI-powered recommendations for high-priority test targets
- ✅ **Historical Analysis** - Compare current coverage against previous runs to identify trends
- ✅ **Threshold Enforcement** - Configurable coverage thresholds with quality gate enforcement
- ✅ **Detailed Reporting** - Generate comprehensive coverage reports with drill-down capabilities

### Use Cases

1. **Sprint Quality Gates** - Verify that new code meets minimum coverage thresholds (e.g., 80%) before merge
2. **Test Gap Identification** - Find all untested methods and prioritize them by risk score for test generation
3. **Critical Path Coverage** - Ensure Epic integrations and financial touchpoints have comprehensive test coverage
4. **Regression Prevention** - Track coverage trends to prevent quality degradation over time
5. **Test Planning** - Identify which methods need negative tests, boundary tests, and edge case coverage
6. **Code Review Support** - Provide coverage data during code reviews to ensure new code is properly tested
7. **Technical Debt Tracking** - Monitor untested legacy code and prioritize debt reduction efforts
8. **Compliance Reporting** - Generate coverage reports for audit and compliance requirements

### What It Does NOT Do

- ❌ Does not execute tests (delegates to test execution frameworks)
- ❌ Does not generate tests (delegates to test generation MCPs)
- ❌ Does not modify source code or test files
- ❌ Does not perform dynamic analysis (coverage data must be generated externally)
- ❌ Does not support non-.NET languages (focused on C#/xUnit ecosystem)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Analyze coverage for single application
curl -X POST http://localhost:3000/api/analysis/coverage \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Analyze with custom threshold
curl -X POST http://localhost:3000/api/analysis/coverage \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "threshold": 85
  }'

# Get test gap recommendations
curl -X POST http://localhost:3000/api/analysis/test-gaps \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "prioritize": true
  }'
```

### Direct Access (Testing Only)

```bash
# Basic coverage analysis
curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Analyze with specific coverage file
curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "coverageFile": "/mnt/apps/app1/coverage/coverage.xml",
    "threshold": 80
  }'

# Get detailed test gaps
curl -X POST http://localhost:3002/test-gaps \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "riskLevel": "high"
  }'

# Get coverage history
curl http://localhost:3002/coverage-history/App1

# Get recommendations
curl http://localhost:3002/recommendations/App1

# Health check
curl http://localhost:3002/health
```

### Expected Output

```json
{
  "success": true,
  "coverage": {
    "app": "App1",
    "displayName": "Patient Portal",
    "percentage": 76.5,
    "threshold": 80,
    "meetsThreshold": false,
    "totalMethods": 456,
    "testedMethods": 349,
    "untestedMethods": [
      {
        "className": "PatientService",
        "methodName": "GetPatientById",
        "namespace": "PatientPortal.Services",
        "complexity": 8,
        "risk": "high",
        "epicIntegration": true,
        "financialTouchpoint": false,
        "lineCount": 45,
        "reason": "Epic integration without test coverage"
      },
      {
        "className": "BillingService",
        "methodName": "ProcessPayment",
        "namespace": "PatientPortal.Billing",
        "complexity": 12,
        "risk": "critical",
        "epicIntegration": false,
        "financialTouchpoint": true,
        "lineCount": 67,
        "reason": "Financial touchpoint requires comprehensive testing"
      }
    ],
    "missingNegativeTests": [
      "PatientService.GetPatientById - No null ID test",
      "PatientService.GetPatientById - No invalid ID test",
      "BillingService.ProcessPayment - No insufficient funds test",
      "AppointmentService.Schedule - No double booking test"
    ],
    "coverageByClass": [
      {
        "className": "PatientService",
        "namespace": "PatientPortal.Services",
        "totalMethods": 15,
        "testedMethods": 12,
        "percentage": 80.0,
        "untestedMethods": ["GetPatientById", "UpdatePatientAddress", "MergePatients"]
      },
      {
        "className": "BillingService",
        "namespace": "PatientPortal.Billing",
        "totalMethods": 20,
        "testedMethods": 14,
        "percentage": 70.0,
        "untestedMethods": ["ProcessPayment", "RefundPayment", "CalculateTax"]
      }
    ],
    "recommendations": [
      "HIGH PRIORITY: Add tests for BillingService.ProcessPayment (financial touchpoint)",
      "HIGH PRIORITY: Add tests for PatientService.GetPatientById (Epic integration)",
      "MEDIUM PRIORITY: Add negative tests for null/invalid inputs",
      "MEDIUM PRIORITY: Add boundary tests for payment amounts",
      "LOW PRIORITY: Improve coverage for utility classes"
    ],
    "trends": {
      "previousCoverage": 74.2,
      "change": 2.3,
      "trend": "improving",
      "sprintComparison": {
        "lastSprint": 74.2,
        "twoSprintsAgo": 71.8,
        "trajectory": "positive"
      }
    }
  },
  "cached": false,
  "executionTime": 1234,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│              Coverage Analyzer (Port 3002)                       │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Coverage     │──▶│ Gap Analysis   │         │
│  │ Router   │   │ Parser       │   │ Engine         │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      XML Parsing        Risk Scoring                 │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Code         │   │ Trend        │   │ Recommenda-  │      │
│  │ Integration  │   │ Tracker      │   │ tion Engine  │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Code Analyzer API   Historical Data    Smart Recommendations
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /analyze-coverage` - Main coverage analysis endpoint
   - `POST /test-gaps` - Identify specific test gaps
   - `GET /coverage-history/:app` - Historical coverage trends
   - `GET /recommendations/:app` - Testing recommendations
   - `POST /compare` - Compare coverage between versions
   - `GET /health` - Health check endpoint

2. **Coverage Parser** (`src/parsers/coverageParser.js`)
   - **XML Parser** - Parse coverage.xml and coverage.cobertura.xml formats
   - **Metadata Extractor** - Extract class, method, and line coverage data
   - **Format Detector** - Auto-detect coverage file format
   - **Validation** - Validate coverage file structure and completeness

3. **Gap Analysis Engine** (`src/analyzers/gapAnalyzer.js`)
   - **Untested Method Detector** - Identify methods without test coverage
   - **Risk Scorer** - Calculate risk scores based on complexity and integration points
   - **Negative Test Detector** - Find missing negative/edge case tests
   - **Priority Ranker** - Rank testing priorities by risk and business impact

4. **Code Integration** (`src/services/codeIntegration.js`)
   - **Method Mapper** - Map coverage data to code-analyzer method list
   - **Complexity Enrichment** - Add complexity metrics to coverage data
   - **Integration Detection** - Identify Epic/financial integration points in untested code
   - **Dependency Analysis** - Understand dependencies of untested methods

5. **Trend Tracker** (`src/services/trendTracker.js`)
   - **Historical Storage** - Store coverage results over time
   - **Trend Calculation** - Calculate coverage trends (improving/declining/stable)
   - **Sprint Comparison** - Compare coverage across sprints
   - **Regression Detection** - Alert on coverage decreases

6. **Recommendation Engine** (`src/services/recommendationEngine.js`)
   - **Priority Calculator** - Calculate test priorities based on multiple factors
   - **Test Type Suggester** - Suggest types of tests needed (unit, integration, negative)
   - **Effort Estimator** - Estimate effort required for test coverage improvements
   - **Report Generator** - Generate actionable testing recommendations

### Dependencies

**Internal:**
- code-analyzer (3001) - For method list and complexity metrics
- risk-analyzer (3009) - For risk scoring integration

**External Services:**
- File system access to coverage files
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- xml2js - XML parsing for coverage files
- fast-xml-parser - Alternative XML parser for better performance
- lodash - Data manipulation utilities
- winston - Logging
- node-cache - In-memory caching

### Data Flow

```
1. HTTP Request (POST /analyze-coverage)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name exists in apps.json
   ├─▶ Validate coverage file path (if provided)
   └─▶ Check for recent cached results
       │
       ├─ Cache Hit → Return cached results
       │
       └─ Cache Miss
          │
          ▼
3. Coverage File Discovery
   ├─▶ Locate coverage.xml or coverage.cobertura.xml
   ├─▶ Validate file accessibility
   └─▶ Detect coverage file format
       │
       ▼
4. Coverage Parsing
   ├─▶ Parse XML coverage file
   ├─▶ Extract class/method coverage data
   ├─▶ Calculate line coverage percentages
   └─▶ Build coverage map (class → methods → lines)
       │
       ▼
5. Code Integration
   ├─▶ Call code-analyzer for method list
   ├─▶ Map coverage data to code methods
   ├─▶ Identify untested methods
   └─▶ Enrich with complexity and integration data
       │
       ▼
6. Gap Analysis
   ├─▶ Calculate risk scores for untested methods
   ├─▶ Detect missing negative tests
   ├─▶ Identify critical integration points without coverage
   └─▶ Prioritize testing recommendations
       │
       ▼
7. Trend Analysis
   ├─▶ Load historical coverage data
   ├─▶ Calculate coverage trend
   ├─▶ Compare with previous sprints
   └─▶ Detect regressions
       │
       ▼
8. Recommendation Generation
   ├─▶ Generate prioritized test recommendations
   ├─▶ Estimate testing effort
   ├─▶ Suggest specific test types
   └─▶ Create actionable report
       │
       ▼
9. Result Aggregation
   ├─▶ Combine all analysis results
   ├─▶ Store in cache and history
   └─▶ Return JSON response
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3002 | Coverage analyzer HTTP port |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `COVERAGE_THRESHOLD` | ❌ No | 80 | Default coverage threshold percentage |
| `CACHE_TTL` | ❌ No | 1800 | Cache time-to-live in seconds (30 min) |
| `TREND_HISTORY_DAYS` | ❌ No | 90 | Days of trend history to retain |
| `CODE_ANALYZER_URL` | ❌ No | http://code-analyzer:3001 | Code analyzer service URL |
| `RISK_ANALYZER_URL` | ❌ No | http://risk-analyzer:3009 | Risk analyzer service URL |

### Configuration Files

#### `config/apps.json`

Applications must be defined here for coverage analysis:

```json
{
  "applications": [
    {
      "name": "App1",
      "displayName": "Patient Portal",
      "path": "/mnt/apps/patient-portal",
      "type": "dotnet",
      "testFramework": "xUnit",
      "coverageFiles": [
        "coverage/coverage.xml",
        "TestResults/*/coverage.cobertura.xml"
      ],
      "coverageThreshold": 85,
      "criticalPaths": [
        "Services/EpicService.cs",
        "Services/BillingService.cs"
      ]
    }
  ]
}
```

**Field Descriptions:**

- `coverageFiles` - Array of glob patterns to locate coverage files
- `coverageThreshold` - Minimum coverage percentage required (overrides default)
- `criticalPaths` - Files/paths that require 100% coverage

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
coverage-analyzer:
  build: ./mcps/coverage-analyzer
  container_name: qe-coverage-analyzer
  ports:
    - "3002:3002"
  environment:
    - NODE_ENV=production
    - PORT=3002
    - CODE_ANALYZER_URL=http://code-analyzer:3001
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/coverage-analyzer:/app/data   # Historical data and cache
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
    - ${APP2_PATH}:/mnt/apps/app2:ro
    - ${APP3_PATH}:/mnt/apps/app3:ro
  networks:
    - qe-network
  restart: unless-stopped
  depends_on:
    - code-analyzer
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read application definitions
- `./data/coverage-analyzer` - Store historical coverage data and trends
- `/mnt/apps/*` - Read-only access to application code and coverage files

---

## API Reference

### Coverage Analysis Endpoints

#### POST /analyze-coverage

Analyze test coverage for an application

**Request Body:**
```typescript
{
  app: string;              // Required: App name from apps.json
  coverageFile?: string;    // Optional: Specific coverage file path
  threshold?: number;       // Optional: Coverage threshold (default: 80)
  includeHistory?: boolean; // Optional: Include historical trends (default: true)
}
```

**Response:**
```typescript
{
  success: boolean;
  coverage: {
    app: string;
    displayName: string;
    percentage: number;           // Overall coverage %
    threshold: number;
    meetsThreshold: boolean;
    totalMethods: number;
    testedMethods: number;
    untestedMethods: Array<UntestedMethod>;
    missingNegativeTests: string[];
    coverageByClass: Array<ClassCoverage>;
    recommendations: string[];
    trends?: TrendData;
  };
  cached: boolean;
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "threshold": 85,
    "includeHistory": true
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "coverage": {
    "app": "App1",
    "percentage": 76.5,
    "threshold": 85,
    "meetsThreshold": false,
    "totalMethods": 456,
    "testedMethods": 349,
    "untestedMethods": [...],
    "recommendations": [...]
  },
  "cached": false,
  "executionTime": 1234
}
```

---

#### POST /test-gaps

Identify specific test gaps with detailed analysis

**Request Body:**
```typescript
{
  app: string;              // Required: App name
  riskLevel?: "high" | "medium" | "low" | "all";  // Optional: Filter by risk
  includeRecommendations?: boolean;  // Optional: Include recommendations
  limit?: number;           // Optional: Max gaps to return (default: 50)
}
```

**Response:**
```typescript
{
  success: boolean;
  gaps: {
    total: number;
    high: number;
    medium: number;
    low: number;
    details: Array<{
      method: string;
      className: string;
      risk: string;
      complexity: number;
      epicIntegration: boolean;
      financialTouchpoint: boolean;
      recommendedTests: string[];
      estimatedEffort: string;
    }>;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/test-gaps \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "riskLevel": "high",
    "includeRecommendations": true
  }'
```

---

#### GET /coverage-history/:app

Get historical coverage trends for an application

**Parameters:**
- `app` - Application name (URL parameter)

**Query Parameters:**
- `days` - Number of days of history (default: 30)
- `includeDetails` - Include detailed data points (default: false)

**Response:**
```typescript
{
  success: boolean;
  history: {
    app: string;
    dataPoints: Array<{
      date: string;
      percentage: number;
      totalMethods: number;
      testedMethods: number;
      sprint?: string;
    }>;
    trend: "improving" | "declining" | "stable";
    averageChange: number;
    bestCoverage: number;
    worstCoverage: number;
  };
}
```

**Example:**
```bash
curl "http://localhost:3002/coverage-history/App1?days=60"
```

---

#### GET /recommendations/:app

Get testing recommendations for an application

**Parameters:**
- `app` - Application name (URL parameter)

**Query Parameters:**
- `priorityLevel` - Filter by priority (high/medium/low)
- `limit` - Max recommendations (default: 10)

**Response:**
```typescript
{
  success: boolean;
  recommendations: {
    app: string;
    priority: {
      critical: string[];
      high: string[];
      medium: string[];
      low: string[];
    };
    estimatedEffort: {
      hours: number;
      sprints: number;
    };
    quickWins: string[];  // Easy, high-impact improvements
  };
}
```

**Example:**
```bash
curl "http://localhost:3002/recommendations/App1?priorityLevel=high"
```

---

#### POST /compare

Compare coverage between two versions or time periods

**Request Body:**
```typescript
{
  app: string;
  baseline: {
    date?: string;        // ISO date or "latest"
    sprint?: string;      // Sprint name
  };
  current: {
    date?: string;
    sprint?: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  comparison: {
    app: string;
    baseline: {
      date: string;
      percentage: number;
    };
    current: {
      date: string;
      percentage: number;
    };
    change: number;
    newlyTested: string[];      // Methods now covered
    newlyUntested: string[];    // Methods lost coverage
    summary: string;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/compare \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "baseline": {"sprint": "Sprint 44"},
    "current": {"sprint": "Sprint 45"}
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
    riskAnalyzer: "healthy" | "unhealthy";
  };
  cache: {
    enabled: boolean;
    size: number;
  };
  timestamp: string;
}
```

**Example:**
```bash
curl http://localhost:3002/health
```

---

## Usage Examples

### Example 1: Basic Coverage Analysis

**Scenario:** Check coverage for an application after test run

```bash
# Run your tests first to generate coverage
# dotnet test --collect:"XPlat Code Coverage"

# Analyze the coverage
curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "threshold": 80
  }'
```

**Response:**
```json
{
  "success": true,
  "coverage": {
    "percentage": 76.5,
    "meetsThreshold": false,
    "totalMethods": 456,
    "testedMethods": 349,
    "untestedMethods": [
      {
        "className": "PatientService",
        "methodName": "GetPatientById",
        "risk": "high"
      }
    ],
    "recommendations": [
      "Add tests for PatientService.GetPatientById"
    ]
  }
}
```

**Action:** Coverage below threshold - need to add tests before merge

---

### Example 2: Finding High-Risk Untested Code

**Scenario:** Identify the most critical untested methods

```bash
curl -X POST http://localhost:3002/test-gaps \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "riskLevel": "high",
    "includeRecommendations": true,
    "limit": 10
  }'
```

**Response:**
```json
{
  "success": true,
  "gaps": {
    "total": 107,
    "high": 12,
    "details": [
      {
        "method": "BillingService.ProcessPayment",
        "className": "BillingService",
        "risk": "critical",
        "complexity": 12,
        "financialTouchpoint": true,
        "recommendedTests": [
          "Test successful payment flow",
          "Test insufficient funds scenario",
          "Test invalid payment method",
          "Test concurrent payment attempts"
        ],
        "estimatedEffort": "4 hours"
      },
      {
        "method": "PatientService.GetPatientById",
        "className": "PatientService",
        "risk": "high",
        "epicIntegration": true,
        "recommendedTests": [
          "Test valid patient ID",
          "Test null patient ID",
          "Test non-existent patient ID",
          "Test Epic API failure handling"
        ],
        "estimatedEffort": "3 hours"
      }
    ]
  }
}
```

**Action:** Prioritize creating tests for these 12 high-risk methods

---

### Example 3: Tracking Coverage Trends

**Scenario:** Monitor coverage improvements over last 3 sprints

```bash
curl "http://localhost:3002/coverage-history/App1?days=60&includeDetails=true"
```

**Response:**
```json
{
  "success": true,
  "history": {
    "app": "App1",
    "dataPoints": [
      {
        "date": "2024-11-01",
        "percentage": 71.8,
        "sprint": "Sprint 43"
      },
      {
        "date": "2024-11-15",
        "percentage": 74.2,
        "sprint": "Sprint 44"
      },
      {
        "date": "2024-11-29",
        "percentage": 76.5,
        "sprint": "Sprint 45"
      }
    ],
    "trend": "improving",
    "averageChange": 2.35,
    "bestCoverage": 76.5,
    "worstCoverage": 71.8
  }
}
```

**Visualization:**
```
Sprint 43: ████████████████████████████████████ 71.8%
Sprint 44: ██████████████████████████████████████ 74.2%
Sprint 45: ████████████████████████████████████████ 76.5%
           ↗ Positive trend: +2.35% per sprint
```

**Action:** Coverage trending positively - continue current testing practices

---

### Example 4: Sprint Comparison

**Scenario:** Compare coverage between two sprints to see progress

```bash
curl -X POST http://localhost:3002/compare \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "baseline": {"sprint": "Sprint 44"},
    "current": {"sprint": "Sprint 45"}
  }'
```

**Response:**
```json
{
  "success": true,
  "comparison": {
    "baseline": {
      "date": "2024-11-15",
      "percentage": 74.2
    },
    "current": {
      "date": "2024-11-29",
      "percentage": 76.5
    },
    "change": 2.3,
    "newlyTested": [
      "AppointmentService.ScheduleAppointment",
      "AppointmentService.CancelAppointment",
      "PatientService.UpdatePatientInfo"
    ],
    "newlyUntested": [],
    "summary": "Coverage improved by 2.3%. 3 previously untested methods now have coverage."
  }
}
```

**Action:** Good progress - recognize team's testing efforts

---

### Example 5: Quality Gate Enforcement

**Scenario:** Integrate coverage check into CI/CD pipeline

```bash
#!/bin/bash
# ci-coverage-check.sh

APP_NAME="App1"
THRESHOLD=80

# Run tests and generate coverage
dotnet test --collect:"XPlat Code Coverage"

# Check coverage via API
RESPONSE=$(curl -s -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d "{\"app\":\"$APP_NAME\",\"threshold\":$THRESHOLD}")

# Parse response
MEETS_THRESHOLD=$(echo $RESPONSE | jq -r '.coverage.meetsThreshold')
PERCENTAGE=$(echo $RESPONSE | jq -r '.coverage.percentage')

if [ "$MEETS_THRESHOLD" = "false" ]; then
  echo "❌ COVERAGE FAILURE: $PERCENTAGE% (threshold: $THRESHOLD%)"
  echo "Untested methods:"
  echo $RESPONSE | jq -r '.coverage.untestedMethods[] | "  - \(.className).\(.methodName)"'
  exit 1
else
  echo "✅ COVERAGE PASSED: $PERCENTAGE% (threshold: $THRESHOLD%)"
  exit 0
fi
```

**Usage in CI:**
```yaml
# .github/workflows/test.yml
- name: Check Coverage
  run: ./ci-coverage-check.sh
```

---

### Example 6: Integration with Test Generator

**Scenario:** Automatically generate tests for untested high-risk methods

```bash
# Step 1: Get high-risk gaps
GAPS=$(curl -s -X POST http://localhost:3002/test-gaps \
  -H "Content-Type: application/json" \
  -d '{"app":"App1","riskLevel":"high","limit":5}')

# Step 2: Extract method info
echo $GAPS | jq -r '.gaps.details[] | "\(.className).\(.method)"' | while read method; do
  echo "Generating test for $method..."
  
  # Step 3: Call test generator (via orchestrator)
  curl -X POST http://localhost:3000/api/tests/generate-unit \
    -H "Content-Type: application/json" \
    -d "{
      \"app\": \"App1\",
      \"method\": \"$method\",
      \"includeNegativeTests\": true
    }"
done
```

---

### Example 7: Missing Negative Tests Detection

**Scenario:** Find where positive tests exist but negative tests are missing

```bash
curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }' | jq '.coverage.missingNegativeTests'
```

**Response:**
```json
[
  "PatientService.GetPatientById - No null ID test",
  "PatientService.GetPatientById - No invalid ID test",
  "BillingService.ProcessPayment - No insufficient funds test",
  "BillingService.ProcessPayment - No invalid card test",
  "AppointmentService.Schedule - No double booking test",
  "AppointmentService.Schedule - No past date test"
]
```

**Action:** Create negative test cases for these scenarios

---

## Input/Output Schemas

### Input Schema: Coverage Analysis Request

```typescript
interface CoverageAnalysisRequest {
  app: string;                  // Application name from apps.json
  coverageFile?: string;        // Optional: Specific coverage file path
  threshold?: number;           // Optional: Coverage threshold % (default: 80)
  includeHistory?: boolean;     // Optional: Include trend data (default: true)
}
```

---

### Output Schema: Coverage Analysis Result

```typescript
interface CoverageAnalysisResult {
  success: boolean;
  coverage: {
    app: string;                // Application name
    displayName: string;        // Display name from config
    percentage: number;         // Overall coverage percentage
    threshold: number;          // Coverage threshold applied
    meetsThreshold: boolean;    // Whether coverage meets threshold
    totalMethods: number;       // Total methods in codebase
    testedMethods: number;      // Methods with test coverage
    
    untestedMethods: UntestedMethod[];  // Detailed untested method info
    missingNegativeTests: string[];     // Missing negative test scenarios
    coverageByClass: ClassCoverage[];   // Coverage breakdown by class
    recommendations: string[];           // Prioritized recommendations
    trends?: TrendData;                 // Historical trend data
  };
  cached: boolean;              // Result from cache?
  executionTime: number;        // Analysis time in ms
  timestamp: string;            // ISO 8601 timestamp
}

interface UntestedMethod {
  className: string;            // Fully qualified class name
  methodName: string;           // Method name
  namespace: string;            // Namespace
  complexity: number;           // Cyclomatic complexity
  risk: "critical" | "high" | "medium" | "low";  // Risk level
  epicIntegration: boolean;     // Epic EMR integration?
  financialTouchpoint: boolean; // Financial system touchpoint?
  lineCount: number;            // Lines of code in method
  reason: string;               // Why this is important to test
}

interface ClassCoverage {
  className: string;            // Class name
  namespace: string;            // Full namespace
  totalMethods: number;         // Total methods in class
  testedMethods: number;        // Methods with coverage
  percentage: number;           // Class coverage %
  untestedMethods: string[];    // List of untested method names
}

interface TrendData {
  previousCoverage: number;     // Previous analysis coverage %
  change: number;               // Change in percentage points
  trend: "improving" | "declining" | "stable";
  sprintComparison?: {
    lastSprint: number;
    twoSprintsAgo: number;
    trajectory: "positive" | "negative" | "stable";
  };
}
```

---

### Input Schema: Test Gap Request

```typescript
interface TestGapRequest {
  app: string;                  // Application name
  riskLevel?: "high" | "medium" | "low" | "all";  // Filter by risk level
  includeRecommendations?: boolean;  // Include test recommendations
  limit?: number;               // Max gaps to return (default: 50)
}
```

---

### Output Schema: Test Gap Result

```typescript
interface TestGapResult {
  success: boolean;
  gaps: {
    total: number;              // Total untested methods
    high: number;               // High-risk count
    medium: number;             // Medium-risk count
    low: number;                // Low-risk count
    details: TestGapDetail[];   // Detailed gap information
  };
}

interface TestGapDetail {
  method: string;               // Method name
  className: string;            // Class name
  namespace: string;            // Namespace
  risk: "critical" | "high" | "medium" | "low";
  complexity: number;           // Cyclomatic complexity
  epicIntegration: boolean;     // Epic integration?
  financialTouchpoint: boolean; // Financial touchpoint?
  recommendedTests: string[];   // Suggested test scenarios
  estimatedEffort: string;      // Estimated hours to test
  priority: number;             // Priority score (1-100)
}
```

---

### Input Schema: Coverage History Request

```typescript
interface CoverageHistoryRequest {
  app: string;                  // Application name (URL param)
  days?: number;                // Days of history (query param, default: 30)
  includeDetails?: boolean;     // Include detailed data points (default: false)
}
```

---

### Output Schema: Coverage History Result

```typescript
interface CoverageHistoryResult {
  success: boolean;
  history: {
    app: string;
    dataPoints: HistoryDataPoint[];
    trend: "improving" | "declining" | "stable";
    averageChange: number;      // Average % change per period
    bestCoverage: number;       // Highest coverage achieved
    worstCoverage: number;      // Lowest coverage in period
    currentStreak?: {
      type: "improving" | "declining";
      periods: number;
    };
  };
}

interface HistoryDataPoint {
  date: string;                 // ISO date
  percentage: number;           // Coverage %
  totalMethods: number;
  testedMethods: number;
  sprint?: string;              // Sprint name if available
  commitHash?: string;          // Git commit if tracked
}
```

---

## Data Persistence

### Storage Locations

```
./data/coverage-analyzer/
├── cache/
│   ├── App1-coverage.json           # Cached coverage for App1
│   ├── App2-coverage.json           # Cached coverage for App2
│   └── cache-metadata.json          # Cache metadata
├── history/
│   ├── App1-history.json            # Historical coverage data for App1
│   ├── App2-history.json            # Historical coverage data for App2
│   └── trends.json                  # Aggregated trend data
├── recommendations/
│   ├── App1-recommendations.json    # Testing recommendations for App1
│   └── App2-recommendations.json
└── logs/
    └── coverage-analyzer.log        # Service logs
```

### What Gets Stored

1. **Cached Coverage Results** (`cache/*.json`)
   - Full coverage analysis results per application
   - TTL-based expiration (default: 30 minutes)
   - Automatically invalidated when coverage files change

2. **Historical Coverage Data** (`history/*.json`)
   - Coverage percentages over time
   - Timestamps and sprint associations
   - Retention: 90 days (configurable via TREND_HISTORY_DAYS)

3. **Testing Recommendations** (`recommendations/*.json`)
   - Prioritized test recommendations
   - Effort estimates
   - Last generated timestamp

4. **Execution Logs** (`logs/coverage-analyzer.log`)
   - Analysis execution times
   - Errors and warnings
   - Integration calls to code-analyzer

### Cache Management

```bash
# View cache status
curl http://localhost:3002/health | jq '.cache'

# Clear cache (no direct endpoint - use file system)
docker exec qe-coverage-analyzer rm -rf /app/data/cache/*

# Or restart service to clear memory cache
docker compose restart coverage-analyzer
```

### Historical Data Management

```bash
# View historical data
docker exec qe-coverage-analyzer ls -lh /app/data/history/

# Export history for App1
docker exec qe-coverage-analyzer cat /app/data/history/App1-history.json > App1-history-backup.json

# Clean old history (older than 90 days)
# Automatic cleanup runs daily at midnight
```

### Data Backup

```bash
# Backup all coverage data
./manage-data.sh backup coverage-analyzer

# Creates: ./backups/coverage-analyzer-YYYY-MM-DD.tar.gz

# Restore from backup
./manage-data.sh restore coverage-analyzer YYYY-MM-DD
```

---

## Development

### Local Setup

```bash
# Navigate to MCP directory
cd mcps/coverage-analyzer

# Install dependencies
npm install

# Copy environment file
cp ../../.env.example .env

# Edit .env with your settings
vim .env

# Ensure code-analyzer is running (dependency)
curl http://localhost:3001/health
```

### Project Structure

```
mcps/coverage-analyzer/
├── src/
│   ├── index.js                     # Entry point
│   ├── routes/
│   │   ├── coverageRoutes.js        # Coverage endpoints
│   │   ├── gapRoutes.js             # Test gap endpoints
│   │   ├── historyRoutes.js         # History endpoints
│   │   └── healthRoutes.js          # Health check
│   ├── parsers/
│   │   ├── coverageParser.js        # XML coverage parser
│   │   └── formatDetector.js        # Coverage format detection
│   ├── analyzers/
│   │   ├── gapAnalyzer.js           # Test gap analysis
│   │   ├── riskScorer.js            # Risk scoring
│   │   └── negativeTestDetector.js  # Missing negative tests
│   ├── services/
│   │   ├── codeIntegration.js       # Code analyzer integration
│   │   ├── trendTracker.js          # Historical trend tracking
│   │   ├── recommendationEngine.js  # Test recommendations
│   │   └── cacheManager.js          # Cache operations
│   └── utils/
│       ├── configReader.js          # apps.json reader
│       ├── logger.js                # Winston logger
│       └── validator.js             # Input validation
├── tests/
│   ├── unit/
│   │   ├── coverageParser.test.js
│   │   ├── gapAnalyzer.test.js
│   │   └── riskScorer.test.js
│   └── integration/
│       └── coverage-analysis.test.js
├── fixtures/
│   ├── coverage-sample.xml          # Sample coverage file
│   └── coverage-cobertura-sample.xml
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
PORT=3002 npm start
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
      "name": "Debug Coverage Analyzer",
      "program": "${workspaceFolder}/mcps/coverage-analyzer/src/index.js",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3002",
        "DEBUG": "*",
        "CODE_ANALYZER_URL": "http://localhost:3001"
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
cd mcps/coverage-analyzer
npm test
```

**Test Coverage:**
- Coverage XML parsing (multiple formats)
- Gap analysis algorithm
- Risk scoring calculation
- Negative test detection
- Trend calculation
- Cache operations

### Integration Tests

```bash
# Start required services
cd ../..
./start.sh

# Run integration tests
cd mcps/coverage-analyzer
npm run test:integration
```

**Integration Tests Cover:**
- Full coverage analysis workflow
- Integration with code-analyzer
- Historical data persistence
- Trend calculation accuracy
- API endpoint responses

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3002/health

# Test basic coverage analysis
curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'

# Test with invalid app
curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{"app": "InvalidApp"}'

# Test gap analysis
curl -X POST http://localhost:3002/test-gaps \
  -H "Content-Type: application/json" \
  -d '{"app": "App1", "riskLevel": "high"}'

# Test history
curl "http://localhost:3002/coverage-history/App1?days=30"
```

### Test Data

Create test coverage files in `tests/fixtures/`:

```xml
<!-- fixtures/coverage-sample.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<coverage line-rate="0.765" branch-rate="0.712" version="1.0">
  <packages>
    <package name="PatientPortal.Services" line-rate="0.80">
      <classes>
        <class name="PatientService" line-rate="0.75">
          <methods>
            <method name="GetPatientById" hits="0" line-rate="0.0"/>
            <method name="GetAllPatients" hits="15" line-rate="1.0"/>
          </methods>
        </class>
      </classes>
    </package>
  </packages>
</coverage>
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INVALID_APP` | 400 | App not found in apps.json | Verify app name in config/apps.json |
| `COVERAGE_FILE_NOT_FOUND` | 404 | Coverage file doesn't exist | Run tests first: dotnet test --collect:"XPlat Code Coverage" |
| `INVALID_COVERAGE_FORMAT` | 400 | Coverage file format not recognized | Ensure file is coverage.xml or coverage.cobertura.xml |
| `PARSE_ERROR` | 500 | Failed to parse coverage XML | Check coverage file syntax |
| `CODE_ANALYZER_UNAVAILABLE` | 503 | Code analyzer service not responding | Check code-analyzer health: curl http://localhost:3001/health |
| `THRESHOLD_NOT_MET` | 200* | Coverage below threshold | This is informational - check response.coverage.meetsThreshold |
| `NO_HISTORICAL_DATA` | 404 | No historical coverage data available | Run coverage analysis first |
| `CACHE_ERROR` | 500 | Cache operation failed | Clear cache and retry |

*Note: THRESHOLD_NOT_MET returns 200 with success:true but meetsThreshold:false

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "COVERAGE_FILE_NOT_FOUND",
    "message": "Coverage file not found for App1",
    "details": {
      "app": "App1",
      "searchedPaths": [
        "/mnt/apps/app1/coverage/coverage.xml",
        "/mnt/apps/app1/TestResults/*/coverage.cobertura.xml"
      ],
      "suggestion": "Run tests first: cd /mnt/apps/app1 && dotnet test --collect:\"XPlat Code Coverage\""
    }
  },
  "timestamp": "2024-12-29T10:30:00Z"
}
```

### Error Handling Strategy

1. **Graceful Degradation** - Return partial results if some data unavailable
2. **Clear Messages** - Provide actionable error messages with solutions
3. **Detailed Context** - Include relevant details (paths, values, etc.)
4. **Logging** - Log all errors with context for debugging
5. **Retry Logic** - Automatic retry for transient errors (network, file access)

---

## Troubleshooting

### Issue: Coverage file not found

**Symptoms:** `COVERAGE_FILE_NOT_FOUND` error

**Possible Causes:**
- Tests haven't been run yet
- Coverage file in unexpected location
- Incorrect path in apps.json

**Solution:**
```bash
# Run tests with coverage
cd /path/to/app
dotnet test --collect:"XPlat Code Coverage"

# Check where coverage file was created
find . -name "coverage.*.xml"

# Update apps.json if needed
vim config/apps.json
# Add found path to coverageFiles array

# Retry analysis
curl -X POST http://localhost:3002/analyze-coverage \
  -d '{"app": "App1"}'
```

---

### Issue: Coverage percentage incorrect

**Symptoms:** Coverage % doesn't match expected value

**Possible Causes:**
- Stale coverage file
- Test files included in coverage
- Incorrect threshold comparison

**Solution:**
```bash
# Check coverage file timestamp
docker exec qe-coverage-analyzer ls -lh /mnt/apps/app1/coverage/

# Re-run tests to generate fresh coverage
cd /path/to/app
rm -rf coverage/
dotnet test --collect:"XPlat Code Coverage"

# Clear cache
docker compose restart coverage-analyzer

# Force fresh analysis
curl -X POST http://localhost:3002/analyze-coverage \
  -d '{"app": "App1"}'
```

---

### Issue: Code analyzer integration failure

**Symptoms:** `CODE_ANALYZER_UNAVAILABLE` error

**Possible Causes:**
- Code analyzer service not running
- Network connectivity issues
- Code analyzer overloaded

**Solution:**
```bash
# Check code-analyzer health
curl http://localhost:3001/health

# Check if container is running
docker compose ps qe-code-analyzer

# Check logs
docker compose logs qe-code-analyzer

# Restart code-analyzer
docker compose restart qe-code-analyzer

# Verify network connectivity
docker exec qe-coverage-analyzer ping code-analyzer

# Retry analysis
curl -X POST http://localhost:3002/analyze-coverage \
  -d '{"app": "App1"}'
```

---

### Issue: Untested methods not being detected

**Symptoms:** Coverage shows 100% but methods are clearly untested

**Possible Causes:**
- Coverage file doesn't include all assemblies
- Test project configured incorrectly
- Coverage tool not capturing all code

**Solution:**
```bash
# Check coverage file completeness
docker exec qe-coverage-analyzer cat /mnt/apps/app1/coverage/coverage.xml | grep -c "<class"

# Verify test project configuration
# In .csproj, ensure:
<CollectCoverage>true</CollectCoverage>
<CoverletOutputFormat>cobertura</CoverletOutputFormat>
<Include>[YourAssembly]*</Include>
<Exclude>[*]*.Tests*</Exclude>

# Re-run tests with explicit include
dotnet test --collect:"XPlat Code Coverage" /p:Include="[PatientPortal*]*"

# Re-analyze
curl -X POST http://localhost:3002/analyze-coverage \
  -d '{"app": "App1"}'
```

---

### Issue: Historical trends not showing

**Symptoms:** `includeHistory: true` but trends field is empty

**Possible Causes:**
- First time running coverage analysis
- Historical data not persisted
- Data retention period expired

**Solution:**
```bash
# Check if historical data exists
docker exec qe-coverage-analyzer ls -la /app/data/history/

# Verify at least 2 data points exist
docker exec qe-coverage-analyzer cat /app/data/history/App1-history.json | jq '.dataPoints | length'

# If no data, run analysis multiple times
curl -X POST http://localhost:3002/analyze-coverage -d '{"app": "App1"}'
# Wait 1 day or modify timestamp for testing
curl -X POST http://localhost:3002/analyze-coverage -d '{"app": "App1"}'

# Check trends again
curl "http://localhost:3002/coverage-history/App1"
```

---

### Issue: Risk scoring seems incorrect

**Symptoms:** Simple methods marked high-risk, complex methods marked low-risk

**Possible Causes:**
- Risk scoring algorithm needs tuning
- Complexity metrics not being enriched
- Integration detection not working

**Solution:**
```bash
# Check code analyzer integration
curl -X POST http://localhost:3001/analyze -d '{"app": "App1"}' | jq '.analysis.classes[0].methods[0]'

# Verify complexity values are present
curl -X POST http://localhost:3002/test-gaps -d '{"app": "App1", "riskLevel": "high"}' | jq '.gaps.details[0]'

# Check logs for enrichment errors
docker compose logs coverage-analyzer | grep "enrichment"

# Verify Epic/financial detection
curl -X POST http://localhost:3001/analyze -d '{"app": "App1"}' | jq '.analysis.epicIntegrations'
```

---

### Issue: Recommendations not helpful

**Symptoms:** Generic recommendations not specific to app

**Possible Causes:**
- Recommendation engine needs more context
- Code analysis not complete
- Missing app metadata

**Solution:**
```bash
# Verify code analysis is complete
curl -X POST http://localhost:3001/analyze -d '{"app": "App1", "deep": true}'

# Check apps.json for complete metadata
cat config/apps.json | jq '.applications[] | select(.name=="App1")'

# Ensure criticalPaths are defined
# In apps.json:
"criticalPaths": [
  "Services/EpicService.cs",
  "Services/BillingService.cs"
]

# Re-generate recommendations
curl "http://localhost:3002/recommendations/App1"
```

---

### Issue: Performance - analysis takes too long

**Symptoms:** Coverage analysis takes >60 seconds

**Possible Causes:**
- Large codebase
- Deep code analysis enabled
- No caching

**Solution:**
```bash
# Check execution time
time curl -X POST http://localhost:3002/analyze-coverage -d '{"app": "App1"}'

# Enable caching in .env
CACHE_TTL=1800

# Check cache usage
curl http://localhost:3002/health | jq '.cache'

# Verify second run is faster (cached)
time curl -X POST http://localhost:3002/analyze-coverage -d '{"app": "App1"}'

# Check resource usage
docker stats qe-coverage-analyzer

# Increase resources if needed (docker-compose.yml)
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
```

---

### Issue: Missing negative tests not detected

**Symptoms:** `missingNegativeTests` array always empty

**Possible Causes:**
- Test naming conventions not recognized
- Detection patterns need tuning
- Test methods not properly parsed

**Solution:**
```bash
# Check test file structure
docker exec qe-coverage-analyzer find /mnt/apps/app1 -name "*Tests.cs" -exec head -20 {} \;

# Verify test naming follows patterns:
# - Method_Scenario_Expected
# - Method_WithNullInput_ThrowsException
# - Method_InvalidData_ReturnsError

# Check logs for detection attempts
docker compose logs coverage-analyzer | grep "negative"

# Manually verify a test has negative counterpart
curl -X POST http://localhost:3002/analyze-coverage -d '{"app": "App1"}' | \
  jq '.coverage.missingNegativeTests[] | select(contains("GetPatientById"))'
```

---

### Issue: Cache not clearing

**Symptoms:** Stale coverage data returned after re-running tests

**Possible Causes:**
- Cache TTL too long
- Timestamp comparison not working
- Manual cache clear needed

**Solution:**
```bash
# Check cache status
curl http://localhost:3002/health | jq '.cache'

# Reduce cache TTL in .env
CACHE_TTL=300  # 5 minutes

# Restart service
docker compose restart coverage-analyzer

# Manually clear cache
docker exec qe-coverage-analyzer rm -rf /app/data/cache/*

# Verify fresh analysis
curl -X POST http://localhost:3002/analyze-coverage -d '{"app": "App1"}' | jq '.cached'
# Should return "cached": false
```

---

## Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:3002/health

# Expected healthy response
{
  "status": "healthy",
  "service": "coverage-analyzer",
  "uptime": 12345,
  "version": "1.0.0",
  "dependencies": {
    "codeAnalyzer": "healthy",
    "riskAnalyzer": "healthy"
  },
  "cache": {
    "enabled": true,
    "size": 3
  },
  "timestamp": "2024-12-29T10:30:00Z"
}
```

### Metrics Tracked

Automatically tracked metrics:
- Coverage analysis execution time per application
- Cache hit/miss rate
- Code analyzer integration call count and latency
- Historical data point count per application
- Trend calculation accuracy
- Recommendation generation time
- Error rate by error code

### Performance Monitoring

```bash
# View analysis metrics from logs
docker compose logs coverage-analyzer | grep "executionTime"

# Check cache effectiveness
curl http://localhost:3002/health | jq '.cache'

# Monitor Docker stats
docker stats qe-coverage-analyzer

# Check dependency health
curl http://localhost:3002/health | jq '.dependencies'
```

### Logging

```bash
# View real-time logs
docker compose logs -f coverage-analyzer

# View last 100 lines
docker compose logs --tail=100 coverage-analyzer

# View error logs only
docker compose logs coverage-analyzer | grep ERROR

# View analysis completions
docker compose logs coverage-analyzer | grep "Coverage analysis completed"

# Log format (JSON)
{
  "timestamp": "2024-12-29T10:30:00Z",
  "level": "info",
  "message": "Coverage analysis completed",
  "metadata": {
    "app": "App1",
    "percentage": 76.5,
    "executionTime": 1234,
    "cached": false,
    "untestedMethodsCount": 107
  }
}
```

### Alerts (Recommended)

Set up monitoring alerts for:
- Coverage below threshold for critical apps
- Coverage trending downward for 3+ analyses
- Analysis time > 60 seconds (performance issue)
- Error rate > 10% (service degradation)
- Code analyzer unavailable > 5 minutes
- Cache hit rate < 30% (cache not effective)
- Service unhealthy > 5 minutes

---

## Integration

### Used By

**Orchestrator:**
- `POST /api/analysis/coverage` endpoint
- `POST /api/analysis/test-gaps` endpoint
- Quality gate workflows

**Unit Test Generator:**
- Uses gap analysis to identify methods needing tests

**Risk Analyzer:**
- Uses untested method data for risk scoring

**CI/CD Pipelines:**
- Quality gate checks
- Coverage reports

### Uses

**Code Analyzer (3001):**
- Retrieves method list for gap analysis
- Gets complexity metrics for risk scoring
- Identifies Epic/financial integration points

**Risk Analyzer (3009) - Optional:**
- Enhances risk scoring with additional factors

**File System:**
- Reads coverage.xml files from `/mnt/apps/*/coverage/`
- Stores historical data in `/app/data/`

**Configuration:**
- Reads `config/apps.json` for application definitions

### Workflow Integration Examples

**Workflow 1: Coverage Analysis → Test Generation**
```
1. coverage-analyzer: Identify untested high-risk methods
2. unit-test-generator: Generate xUnit tests for those methods
3. Return: Generated test code
```

**Workflow 2: Coverage Gate → Merge Decision**
```
1. coverage-analyzer: Check coverage after test run
2. If coverage < threshold:
   - Block merge
   - Return list of untested methods
3. If coverage >= threshold:
   - Allow merge
   - Update historical trends
```

**Workflow 3: Sprint Coverage Report**
```
1. coverage-analyzer: Get current coverage
2. coverage-analyzer: Get coverage history
3. coverage-analyzer: Compare with last sprint
4. Return: Trend report with recommendations
```

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ xUnit coverage XML parsing
- ✅ Method-level coverage calculation
- ✅ Risk-based gap analysis
- ✅ Missing negative test detection
- ✅ Historical trend tracking
- ✅ Code analyzer integration
- ✅ Smart recommendations engine
- ✅ Docker containerization
- ✅ Health monitoring
- ✅ Comprehensive error handling

### v1.1.0 (Planned)
- 🚧 Support for NUnit coverage files
- 🚧 Support for MSTest coverage files
- 🚧 Visual coverage reports (HTML)
- 🚧 Coverage diff between branches
- 🚧 AI-powered recommendation improvements
- 🚧 Slack/Teams notifications for coverage drops
- 🚧 Branch coverage analysis (in addition to line coverage)
- 🚧 Custom risk scoring rules configuration

---

**Need help?** Check the troubleshooting section or view logs with `docker compose logs -f coverage-analyzer`
