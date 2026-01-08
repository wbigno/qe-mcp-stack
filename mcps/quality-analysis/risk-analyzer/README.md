# Risk Analyzer - Comprehensive Risk Assessment & Scoring

**Type:** Docker MCP (Always Running)  
**Port:** 3009  
**Container:** `qe-risk-analyzer`  
**Location:** `mcps/risk-analyzer/`  
**Technology:** Node.js 18 + Express + Multi-Factor Risk Algorithm  
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

The **Risk Analyzer** is a specialized MCP designed to calculate comprehensive risk scores for code components, features, integrations, and changes across .NET C# applications. It combines multiple risk factors including code complexity, test coverage gaps, integration dependencies (Epic, financial), change frequency, business criticality, and defect history to produce actionable risk assessments with priority levels (critical/high/medium/low). The service helps QA teams prioritize testing efforts, focus on high-risk areas, allocate resources effectively, and make data-driven decisions about where to invest testing time.

This MCP serves as the intelligence layer for test planning and resource allocation by understanding that not all code is equally risky. A simple utility function with 100% test coverage is low risk. A complex payment processing method with Epic integration, no test coverage, and frequent changes is critical risk. The Risk Analyzer quantifies these factors into a single, actionable risk score that drives testing strategy.

The Risk Analyzer is essential for sprint planning (which features need the most testing), regression test selection (which areas are highest risk for regression), resource allocation (where to assign senior vs junior testers), and release risk assessment (is this release safe to deploy).

### Key Features

- ✅ **Multi-Factor Risk Scoring** - Combines complexity, coverage, integration, change frequency, and business impact
- ✅ **Code Complexity Analysis** - Weights cyclomatic complexity in risk calculations
- ✅ **Coverage Gap Assessment** - Factors untested code into risk scores
- ✅ **Integration Risk** - Elevates risk for Epic EMR and financial system touchpoints
- ✅ **Change Frequency Analysis** - Tracks frequent changes as risk indicator
- ✅ **Business Impact Weighting** - Adjusts risk based on business criticality
- ✅ **Defect History Tracking** - Considers past bug density in risk calculation
- ✅ **Blast Radius Calculation** - Assesses impact scope of potential failures
- ✅ **Risk Trending** - Tracks risk changes over time (improving/declining)
- ✅ **Priority Recommendations** - Generates actionable testing priorities

### Use Cases

1. **Sprint Planning** - Identify highest risk features for testing focus
2. **Test Case Prioritization** - Order test execution by risk score
3. **Resource Allocation** - Assign testers based on risk levels
4. **Release Risk Assessment** - Calculate overall release risk score
5. **Regression Test Selection** - Select regression tests based on risk
6. **Code Review Prioritization** - Focus reviews on high-risk code
7. **Technical Debt Tracking** - Monitor risk accumulation over time
8. **Change Impact Analysis** - Assess risk of proposed changes

### What It Does NOT Do

- ❌ Does not execute tests (delegates to test frameworks)
- ❌ Does not generate tests (delegates to test generators)
- ❌ Does not fix issues (provides assessment only)
- ❌ Does not make deployment decisions (advisory only)
- ❌ Does not track live production issues (code analysis only)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Calculate risk for entire application
curl -X POST http://localhost:3000/api/risk/assess \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get high-risk components only
curl -X POST http://localhost:3000/api/risk/assess \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "riskThreshold": "high"
  }'

# Calculate risk for specific feature
curl -X POST http://localhost:3000/api/risk/feature-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "feature": "Payment Processing"
  }'
```

### Direct Access (Testing Only)

```bash
# Calculate application risk
curl -X POST http://localhost:3009/calculate-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeHistory": true
  }'

# Get method-level risk
curl -X POST http://localhost:3009/method-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "className": "BillingService",
    "methodName": "ProcessPayment"
  }'

# Calculate release risk
curl -X POST http://localhost:3009/release-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "changedFiles": [
      "Services/BillingService.cs",
      "Controllers/PaymentController.cs"
    ]
  }'

# Get risk trends
curl -X POST http://localhost:3009/risk-trends \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "days": 30
  }'

# Health check
curl http://localhost:3009/health
```

### Expected Output

```json
{
  "success": true,
  "app": "App1",
  "riskAssessment": {
    "overallRisk": {
      "score": 72,
      "level": "high",
      "trend": "stable",
      "recommendation": "Focus testing on critical and high-risk components before release"
    },
    "components": [
      {
        "name": "BillingService.ProcessPayment",
        "type": "method",
        "location": "Services/BillingService.cs:45",
        "riskScore": 95,
        "riskLevel": "critical",
        "factors": {
          "complexity": {
            "value": 16,
            "weight": 20,
            "contribution": 19,
            "assessment": "High cyclomatic complexity increases risk"
          },
          "coverage": {
            "value": 0,
            "weight": 25,
            "contribution": 25,
            "assessment": "No test coverage - critical gap"
          },
          "integration": {
            "hasEpic": false,
            "hasFinancial": true,
            "weight": 20,
            "contribution": 20,
            "assessment": "Financial integration - high risk if fails"
          },
          "changeFrequency": {
            "changesLast30Days": 8,
            "weight": 15,
            "contribution": 12,
            "assessment": "Frequently changed - instability risk"
          },
          "businessImpact": {
            "value": 10,
            "weight": 15,
            "contribution": 15,
            "assessment": "Critical to revenue - high business impact"
          },
          "defectHistory": {
            "bugsLast90Days": 3,
            "weight": 5,
            "contribution": 4,
            "assessment": "Multiple recent bugs - quality concern"
          }
        },
        "blastRadius": {
          "affectedFeatures": [
            "Payment Processing",
            "Billing",
            "Invoice Generation"
          ],
          "affectedUsers": "all patients",
          "impactLevel": "critical"
        },
        "recommendations": [
          "URGENT: Add comprehensive integration tests",
          "URGENT: Add unit tests with mocked financial API",
          "Consider refactoring to reduce complexity",
          "Add circuit breaker for financial API calls",
          "Increase code review scrutiny for changes"
        ],
        "testingPriority": 1
      },
      {
        "name": "PatientService.GetPatientById",
        "type": "method",
        "location": "Services/PatientService.cs:28",
        "riskScore": 88,
        "riskLevel": "high",
        "factors": {
          "complexity": {
            "value": 8,
            "weight": 20,
            "contribution": 10,
            "assessment": "Moderate complexity"
          },
          "coverage": {
            "value": 0,
            "weight": 25,
            "contribution": 25,
            "assessment": "No test coverage"
          },
          "integration": {
            "hasEpic": true,
            "hasFinancial": false,
            "weight": 20,
            "contribution": 20,
            "assessment": "Epic integration - clinical data risk"
          },
          "changeFrequency": {
            "changesLast30Days": 2,
            "weight": 15,
            "contribution": 5,
            "assessment": "Stable - few recent changes"
          },
          "businessImpact": {
            "value": 10,
            "weight": 15,
            "contribution": 15,
            "assessment": "Core clinical workflow"
          },
          "defectHistory": {
            "bugsLast90Days": 1,
            "weight": 5,
            "contribution": 2,
            "assessment": "Generally stable"
          }
        },
        "blastRadius": {
          "affectedFeatures": [
            "Patient Search",
            "Chart Access",
            "Appointment Scheduling"
          ],
          "affectedUsers": "all clinicians",
          "impactLevel": "high"
        },
        "recommendations": [
          "HIGH: Add integration tests with Epic sandbox",
          "HIGH: Add unit tests with mocked Epic API",
          "Test null/invalid patient ID scenarios",
          "Test Epic API timeout handling"
        ],
        "testingPriority": 2
      },
      {
        "name": "AppointmentService.Schedule",
        "type": "method",
        "location": "Services/AppointmentService.cs:67",
        "riskScore": 76,
        "riskLevel": "high",
        "factors": {
          "complexity": {
            "value": 12,
            "weight": 20,
            "contribution": 15,
            "assessment": "High complexity"
          },
          "coverage": {
            "value": 45,
            "weight": 25,
            "contribution": 14,
            "assessment": "Partial coverage - gaps exist"
          },
          "integration": {
            "hasEpic": true,
            "hasFinancial": false,
            "weight": 20,
            "contribution": 20,
            "assessment": "Epic integration"
          },
          "changeFrequency": {
            "changesLast30Days": 5,
            "weight": 15,
            "contribution": 10,
            "assessment": "Moderate change frequency"
          },
          "businessImpact": {
            "value": 9,
            "weight": 15,
            "contribution": 14,
            "assessment": "High business value"
          },
          "defectHistory": {
            "bugsLast90Days": 2,
            "weight": 5,
            "contribution": 3,
            "assessment": "Some bugs"
          }
        },
        "recommendations": [
          "Improve test coverage to 80%+",
          "Add negative test cases",
          "Test double-booking prevention",
          "Test Epic appointment sync"
        ],
        "testingPriority": 3
      }
    ],
    "summary": {
      "totalComponents": 245,
      "byRiskLevel": {
        "critical": 5,
        "high": 23,
        "medium": 89,
        "low": 128
      },
      "averageRiskScore": 42,
      "highestRiskComponent": "BillingService.ProcessPayment",
      "testCoverageGap": 127,
      "epicIntegrationCount": 12,
      "financialIntegrationCount": 3
    },
    "trends": {
      "previousScore": 68,
      "currentScore": 72,
      "change": 4,
      "trend": "increasing",
      "analysis": "Risk increased by 4 points due to recent changes in payment processing without corresponding test coverage"
    },
    "releaseRecommendation": {
      "safe": false,
      "blockers": [
        "BillingService.ProcessPayment has critical risk with no test coverage",
        "5 critical-risk components without adequate testing"
      ],
      "conditions": [
        "Add integration tests for payment processing",
        "Add unit tests for all critical-risk methods",
        "Conduct manual testing of payment flows"
      ]
    }
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
│              Risk Analyzer (Port 3009)                           │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Risk         │──▶│ Score          │         │
│  │ Router   │   │ Calculator   │   │ Aggregator     │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      Multi-Factor        Weighted Scoring            │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Trend        │   │ Blast Radius │   │ Recommenda-  │      │
│  │ Analyzer     │   │ Calculator   │   │ tion Engine  │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Risk Trends         Impact Analysis    Prioritized Actions
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /calculate-risk` - Calculate application risk
   - `POST /method-risk` - Calculate method-level risk
   - `POST /release-risk` - Calculate release risk
   - `POST /risk-trends` - Get risk trends over time
   - `GET /health` - Health check endpoint

2. **Risk Calculator** (`src/services/riskCalculator.js`)
   - **Complexity Scorer** - Scores based on cyclomatic complexity
   - **Coverage Scorer** - Scores based on test coverage gaps
   - **Integration Scorer** - Weights Epic/financial integrations
   - **Change Scorer** - Scores based on change frequency
   - **Business Impact Scorer** - Weights business criticality
   - **Defect Scorer** - Considers bug history

3. **Score Aggregator** (`src/services/scoreAggregator.js`)
   - **Weight Manager** - Manages factor weights
   - **Score Normalizer** - Normalizes scores to 0-100 scale
   - **Level Assigner** - Assigns risk levels (critical/high/medium/low)
   - **Confidence Calculator** - Calculates scoring confidence

4. **Trend Analyzer** (`src/analyzers/trendAnalyzer.js`)
   - **Historical Loader** - Loads past risk scores
   - **Trend Calculator** - Calculates increasing/decreasing trends
   - **Change Analyzer** - Identifies what changed risk
   - **Forecaster** - Predicts future risk trajectory

5. **Blast Radius Calculator** (`src/services/blastRadiusCalculator.js`)
   - **Dependency Mapper** - Maps component dependencies
   - **Impact Tracer** - Traces failure impact
   - **User Impact Assessor** - Estimates affected users
   - **Feature Impact** - Identifies affected features

6. **Recommendation Engine** (`src/services/recommendationEngine.js`)
   - **Priority Ranker** - Ranks components by test priority
   - **Action Generator** - Generates specific test recommendations
   - **Resource Estimator** - Estimates testing effort required
   - **Strategy Suggester** - Suggests overall testing strategy

### Dependencies

**Internal:**
- code-analyzer (3001) - For complexity metrics
- coverage-analyzer (3002) - For test coverage data
- integration-mapper (3008) - For integration risk factors
- architecture-analyzer (3007) - For dependency analysis

**External Services:**
- File system access for historical data
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- lodash - Data manipulation
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /calculate-risk)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name
   └─▶ Load app configuration
       │
       ▼
3. Data Gathering
   ├─▶ Call code-analyzer for complexity metrics
   ├─▶ Call coverage-analyzer for test coverage
   ├─▶ Call integration-mapper for integrations
   └─▶ Load historical risk data
       │
       ▼
4. Component-Level Risk Calculation
   ├─▶ For each method/class:
   │   ├─ Calculate complexity factor (0-20 points)
   │   ├─ Calculate coverage factor (0-25 points)
   │   ├─ Calculate integration factor (0-20 points)
   │   ├─ Calculate change frequency factor (0-15 points)
   │   ├─ Calculate business impact factor (0-15 points)
   │   └─ Calculate defect history factor (0-5 points)
   └─▶ Sum factors = Risk Score (0-100)
       │
       ▼
5. Risk Level Assignment
   ├─▶ 90-100 = Critical
   ├─▶ 70-89 = High
   ├─▶ 40-69 = Medium
   └─▶ 0-39 = Low
       │
       ▼
6. Blast Radius Calculation
   ├─▶ Identify component dependencies
   ├─▶ Map to features
   ├─▶ Estimate user impact
   └─▶ Calculate impact level
       │
       ▼
7. Trend Analysis
   ├─▶ Load previous risk scores
   ├─▶ Calculate change delta
   ├─▶ Determine trend direction
   └─▶ Analyze contributing factors
       │
       ▼
8. Recommendation Generation
   ├─▶ Rank components by priority
   ├─▶ Generate specific test recommendations
   ├─▶ Estimate testing effort
   └─▶ Create release recommendation
       │
       ▼
9. Response Assembly
   └─▶ Return JSON with risk scores, trends, recommendations
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3009 | Risk analyzer HTTP port |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `CODE_ANALYZER_URL` | ❌ No | http://code-analyzer:3001 | Code analyzer service URL |
| `COVERAGE_ANALYZER_URL` | ❌ No | http://coverage-analyzer:3002 | Coverage analyzer service URL |
| `INTEGRATION_MAPPER_URL` | ❌ No | http://integration-mapper:3008 | Integration mapper service URL |

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
      "riskWeights": {
        "complexity": 20,
        "coverage": 25,
        "integration": 20,
        "changeFrequency": 15,
        "businessImpact": 15,
        "defectHistory": 5
      },
      "businessImpact": {
        "patientSearch": 10,
        "appointments": 9,
        "billing": 10,
        "charts": 10,
        "labs": 7,
        "prescriptions": 8
      }
    }
  ]
}
```

**Field Descriptions:**

- `riskWeights` - Factor weights (must sum to 100)
- `businessImpact` - Business criticality scores per feature (1-10)

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
risk-analyzer:
  build: ./mcps/risk-analyzer
  container_name: qe-risk-analyzer
  ports:
    - "3009:3009"
  environment:
    - NODE_ENV=production
    - PORT=3009
    - CODE_ANALYZER_URL=http://code-analyzer:3001
    - COVERAGE_ANALYZER_URL=http://coverage-analyzer:3002
    - INTEGRATION_MAPPER_URL=http://integration-mapper:3008
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/risk-analyzer:/app/data   # Risk history
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
  networks:
    - qe-network
  restart: unless-stopped
  depends_on:
    - code-analyzer
    - coverage-analyzer
    - integration-mapper
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3009/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read configuration
- `./data/risk-analyzer` - Store risk history
- `/mnt/apps/*` - Read application code

---

## API Reference

### Risk Assessment Endpoints

#### POST /calculate-risk

Calculate comprehensive risk assessment for application

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
  includeHistory?: boolean;       // Optional: Include risk trends (default: true)
  riskThreshold?: "critical" | "high" | "medium" | "low";  // Optional: Min risk level
  maxComponents?: number;         // Optional: Max components to return
}
```

**Response:**
```typescript
{
  success: boolean;
  app: string;
  riskAssessment: {
    overallRisk: OverallRisk;
    components: RiskComponent[];
    summary: Summary;
    trends?: Trends;
    releaseRecommendation: ReleaseRecommendation;
  };
  cached: boolean;
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3009/calculate-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeHistory": true,
    "riskThreshold": "high"
  }'
```

---

#### POST /method-risk

Calculate risk for specific method

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  className: string;              // Required: Class name
  methodName: string;             // Required: Method name
}
```

**Response:**
```typescript
{
  success: boolean;
  method: string;
  riskScore: number;
  riskLevel: string;
  factors: RiskFactors;
  recommendations: string[];
}
```

**Example:**
```bash
curl -X POST http://localhost:3009/method-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "className": "BillingService",
    "methodName": "ProcessPayment"
  }'
```

---

#### POST /release-risk

Calculate risk for specific release/change set

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  changedFiles: string[];         // Required: Files changed in release
}
```

**Response:**
```typescript
{
  success: boolean;
  releaseRisk: {
    overallScore: number;
    level: string;
    changedComponents: RiskComponent[];
    recommendation: string;
    blockers: string[];
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3009/release-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "changedFiles": [
      "Services/BillingService.cs",
      "Controllers/PaymentController.cs"
    ]
  }'
```

---

#### POST /risk-trends

Get risk trends over time

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  days?: number;                  // Optional: Days of history (default: 30)
}
```

**Response:**
```typescript
{
  success: boolean;
  trends: {
    dataPoints: Array<{
      date: string;
      score: number;
      level: string;
    }>;
    trend: "increasing" | "decreasing" | "stable";
    analysis: string;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3009/risk-trends \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "days": 60
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
    coverageAnalyzer: "healthy" | "unhealthy";
    integrationMapper: "healthy" | "unhealthy";
  };
  timestamp: string;
}
```

**Example:**
```bash
curl http://localhost:3009/health
```

---

## Usage Examples

### Example 1: Sprint Planning - Identify High-Risk Features

**Scenario:** Sprint planning - need to identify which features need most testing

```bash
curl -X POST http://localhost:3009/calculate-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "riskThreshold": "high"
  }' | jq '.riskAssessment.components[0:5] | map({name, riskScore, testingPriority})'
```

**Output:**
```json
[
  {
    "name": "BillingService.ProcessPayment",
    "riskScore": 95,
    "testingPriority": 1
  },
  {
    "name": "PatientService.GetPatientById",
    "riskScore": 88,
    "testingPriority": 2
  }
]
```

**Action:** Allocate senior testers to priority 1 & 2 components

---

### Example 2: Release Risk Assessment

**Scenario:** About to deploy - assess overall release risk

```bash
# Get changed files from git
CHANGED=$(git diff --name-only main..develop | jq -R . | jq -s .)

# Calculate release risk
curl -X POST http://localhost:3009/release-risk \
  -H "Content-Type: application/json" \
  -d "{
    \"app\": \"App1\",
    \"changedFiles\": $CHANGED
  }"
```

**Response:**
```json
{
  "releaseRisk": {
    "overallScore": 78,
    "level": "high",
    "recommendation": "Recommend additional testing before release",
    "blockers": [
      "BillingService.ProcessPayment changed with critical risk"
    ]
  }
}
```

**Action:** Add integration tests before deploying

---

### Example 3: Track Risk Over Time

**Scenario:** Weekly status - show risk trend

```bash
curl -X POST http://localhost:3009/risk-trends \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "days": 30
  }'
```

**Response:**
```json
{
  "trends": {
    "dataPoints": [
      {"date": "2024-11-29", "score": 68},
      {"date": "2024-12-06", "score": 70},
      {"date": "2024-12-13", "score": 72},
      {"date": "2024-12-20", "score": 75}
    ],
    "trend": "increasing",
    "analysis": "Risk increasing due to new features without test coverage"
  }
}
```

**Visualization:**
```
Week 1: ████████████████████████████████████ 68
Week 2: █████████████████████████████████████ 70
Week 3: ██████████████████████████████████████ 72
Week 4: ███████████████████████████████████████ 75
        ↗ Risk trending up - action needed
```

**Action:** Implement testing sprint to reduce risk

---

### Example 4: Method-Level Risk Deep Dive

**Scenario:** Code review - assess risk of specific method

```bash
curl -X POST http://localhost:3009/method-risk \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "className": "BillingService",
    "methodName": "ProcessPayment"
  }'
```

**Response:**
```json
{
  "riskScore": 95,
  "riskLevel": "critical",
  "factors": {
    "complexity": {
      "value": 16,
      "contribution": 19,
      "assessment": "High complexity"
    },
    "coverage": {
      "value": 0,
      "contribution": 25,
      "assessment": "No test coverage"
    }
  },
  "recommendations": [
    "URGENT: Add integration tests",
    "URGENT: Add unit tests with mocks"
  ]
}
```

**Action:** Block PR until tests added

---

### Example 5: Integration with CI/CD

**Scenario:** Gate deployment based on risk score

```bash
#!/bin/bash
# ci-risk-check.sh

RISK=$(curl -s -X POST http://localhost:3009/calculate-risk \
  -d '{"app":"App1"}' | jq '.riskAssessment.overallRisk.score')

if [ "$RISK" -gt 80 ]; then
  echo "❌ RISK TOO HIGH: $RISK"
  echo "Cannot deploy with risk > 80"
  exit 1
elif [ "$RISK" -gt 60 ]; then
  echo "⚠️  WARNING: Risk is $RISK"
  echo "Requires manager approval"
  exit 2
else
  echo "✅ RISK OK: $RISK"
  exit 0
fi
```

---

### Example 6: Prioritized Testing Backlog

**Scenario:** Create prioritized test backlog

```bash
curl -X POST http://localhost:3009/calculate-risk \
  -d '{"app":"App1"}' | \
  jq '.riskAssessment.components | 
    sort_by(-.riskScore) | 
    .[0:10] | 
    map({
      priority: .testingPriority,
      component: .name,
      risk: .riskScore,
      actions: .recommendations[0]
    })'
```

**Output:**
```json
[
  {
    "priority": 1,
    "component": "BillingService.ProcessPayment",
    "risk": 95,
    "actions": "URGENT: Add integration tests"
  }
]
```

**Action:** Create JIRA tickets in priority order

---

### Example 7: Risk Dashboard Data

**Scenario:** Generate data for risk dashboard

```bash
# Get overall metrics
curl -s -X POST http://localhost:3009/calculate-risk \
  -d '{"app":"App1"}' | \
  jq '{
    overallRisk: .riskAssessment.overallRisk.score,
    critical: .riskAssessment.summary.byRiskLevel.critical,
    high: .riskAssessment.summary.byRiskLevel.high,
    testCoverageGap: .riskAssessment.summary.testCoverageGap,
    trend: .riskAssessment.trends.trend
  }'
```

---

## Input/Output Schemas

### Input Schema: Calculate Risk Request

```typescript
interface CalculateRiskRequest {
  app: string;
  includeHistory?: boolean;
  riskThreshold?: "critical" | "high" | "medium" | "low";
  maxComponents?: number;
}
```

---

### Output Schema: Risk Assessment Result

```typescript
interface RiskAssessmentResult {
  success: boolean;
  app: string;
  riskAssessment: {
    overallRisk: OverallRisk;
    components: RiskComponent[];
    summary: Summary;
    trends?: Trends;
    releaseRecommendation: ReleaseRecommendation;
  };
  cached: boolean;
  executionTime: number;
  timestamp: string;
}

interface OverallRisk {
  score: number;                  // 0-100
  level: "critical" | "high" | "medium" | "low";
  trend: "increasing" | "decreasing" | "stable";
  recommendation: string;
}

interface RiskComponent {
  name: string;
  type: "method" | "class" | "feature";
  location: string;
  riskScore: number;
  riskLevel: string;
  factors: RiskFactors;
  blastRadius: BlastRadius;
  recommendations: string[];
  testingPriority: number;
}

interface RiskFactors {
  complexity: Factor;
  coverage: Factor;
  integration: IntegrationFactor;
  changeFrequency: Factor;
  businessImpact: Factor;
  defectHistory: Factor;
}

interface Factor {
  value: number;
  weight: number;
  contribution: number;
  assessment: string;
}

interface BlastRadius {
  affectedFeatures: string[];
  affectedUsers: string;
  impactLevel: string;
}
```

---

## Data Persistence

### Storage Locations

```
./data/risk-analyzer/
├── history/
│   ├── App1-risk-history.json
│   └── App2-risk-history.json
├── snapshots/
│   ├── 2024-12-29-App1.json
│   └── 2024-12-29-App2.json
└── logs/
    └── risk-analyzer.log
```

### What Gets Stored

1. **Risk History** - Historical risk scores over time
2. **Daily Snapshots** - Complete risk assessment snapshots
3. **Execution Logs** - Service logs

---

## Development

### Local Setup

```bash
cd mcps/risk-analyzer
npm install
cp ../../.env.example .env
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
| `INVALID_APP` | 400 | App not found | Verify app name in apps.json |
| `DEPENDENCIES_UNAVAILABLE` | 503 | Required services unavailable | Check code/coverage analyzer health |

---

## Troubleshooting

### Issue: Risk scores seem incorrect

**Solution:** Verify factor weights in apps.json sum to 100

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3009/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/risk/assess`

### Uses

**Code Analyzer:** For complexity metrics
**Coverage Analyzer:** For test coverage
**Integration Mapper:** For integration risk

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Multi-factor risk scoring
- ✅ Trend analysis
- ✅ Release risk assessment

---

**Need help?** View logs with `docker compose logs -f risk-analyzer`
