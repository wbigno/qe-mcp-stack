# Quality Metrics Analyzer - Comprehensive Quality Tracking & Reporting

**Type:** Docker MCP (Always Running)  
**Port:** 3011  
**Container:** `qe-quality-metrics-analyzer`  
**Location:** `mcps/quality-metrics-analyzer/`  
**Technology:** Node.js 18 + Express + Time-Series Analysis  
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

The **Quality Metrics Analyzer** is a specialized MCP designed to collect, analyze, and visualize comprehensive quality metrics across .NET C# applications. It tracks test coverage trends over time, monitors code quality metrics (complexity, maintainability), calculates defect density and escape rates, measures test execution performance, analyzes test flakiness and stability, generates quality scorecards and dashboards, and provides executive-level quality reporting. The service acts as the central quality metrics repository and analysis engine for the QE MCP Stack.

This MCP addresses the reality that quality is difficult to measure without consolidated metrics. When leadership asks "How is quality trending?", when you need to justify QA headcount, when release decisions need data backing, or when quality improvements need measurement, the Quality Metrics Analyzer provides objective, data-driven answers. It aggregates metrics from all other MCPs, tracks trends over time, identifies quality degradation early, and presents metrics in executive-friendly formats.

The Quality Metrics Analyzer is essential for executive quality reporting, sprint retrospectives with data, release go/no-go decisions, QA team performance tracking, and continuous quality improvement initiatives.

### Key Features

- ✅ **Test Coverage Tracking** - Monitors line, branch, and method coverage over time
- ✅ **Code Quality Metrics** - Tracks complexity, maintainability, technical debt
- ✅ **Defect Metrics** - Calculates defect density, escape rate, mean time to repair
- ✅ **Test Performance** - Tracks test execution time, pass rates, flakiness
- ✅ **Trend Analysis** - Identifies improving/declining quality trends
- ✅ **Quality Scorecards** - Generates overall quality scores (A-F grades)
- ✅ **Dashboard Generation** - Creates visual dashboards for stakeholders
- ✅ **Benchmark Comparison** - Compares metrics against industry standards
- ✅ **Alert Thresholds** - Notifies when metrics cross warning thresholds
- ✅ **Historical Tracking** - Maintains long-term quality history

### Use Cases

1. **Executive Reporting** - Generate quality reports for leadership
2. **Sprint Retrospectives** - Show quality metrics for sprint review
3. **Release Decisions** - Provide data for go/no-go decisions
4. **Team Performance** - Track QA team productivity and effectiveness
5. **Quality Initiatives** - Measure impact of quality improvement efforts
6. **Benchmarking** - Compare quality against industry standards
7. **Early Warning** - Detect quality degradation before release
8. **Continuous Improvement** - Track quality trends to guide investments

### What It Does NOT Do

- ❌ Does not execute tests (uses test results from other tools)
- ❌ Does not generate tests (delegates to test generators)
- ❌ Does not fix quality issues (provides measurement only)
- ❌ Does not make decisions (advisory metrics only)
- ❌ Does not replace manual testing (complements with data)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Get current quality metrics
curl -X POST http://localhost:3000/api/metrics/quality \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get quality trends
curl -X POST http://localhost:3000/api/metrics/trends \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "days": 30
  }'

# Generate quality scorecard
curl -X POST http://localhost:3000/api/metrics/scorecard \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

### Direct Access (Testing Only)

```bash
# Get current metrics
curl -X POST http://localhost:3011/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get historical trends
curl -X POST http://localhost:3011/trends \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "days": 30
  }'

# Generate scorecard
curl -X POST http://localhost:3011/scorecard \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get defect metrics
curl -X POST http://localhost:3011/defects \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "days": 90
  }'

# Get test performance
curl -X POST http://localhost:3011/test-performance \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Health check
curl http://localhost:3011/health
```

### Expected Output

```json
{
  "success": true,
  "app": "App1",
  "metrics": {
    "overall": {
      "qualityScore": 78,
      "grade": "B",
      "trend": "improving",
      "assessment": "Good quality with room for improvement in test coverage"
    },
    "testCoverage": {
      "line": {
        "current": 72,
        "previous": 68,
        "change": 4,
        "trend": "improving",
        "target": 80,
        "grade": "B-"
      },
      "branch": {
        "current": 65,
        "previous": 62,
        "change": 3,
        "trend": "improving",
        "target": 75,
        "grade": "C+"
      },
      "method": {
        "current": 78,
        "previous": 75,
        "change": 3,
        "trend": "improving",
        "target": 85,
        "grade": "B"
      },
      "uncoveredCriticalMethods": 8,
      "coverageGaps": [
        "BillingService.ProcessPayment (0% coverage, critical risk)",
        "PatientService.GetPatientById (0% coverage, high risk)"
      ]
    },
    "codeQuality": {
      "averageComplexity": {
        "current": 6.2,
        "previous": 6.8,
        "change": -0.6,
        "trend": "improving",
        "target": 5.0,
        "grade": "B"
      },
      "maintainabilityIndex": {
        "current": 68,
        "previous": 65,
        "change": 3,
        "trend": "improving",
        "target": 75,
        "grade": "B-"
      },
      "technicalDebt": {
        "hours": 245,
        "cost": "$18,375",
        "trend": "stable"
      },
      "codeSmells": {
        "critical": 3,
        "high": 12,
        "medium": 45,
        "low": 89
      }
    },
    "defects": {
      "defectDensity": {
        "current": 0.8,
        "previous": 1.2,
        "change": -0.4,
        "trend": "improving",
        "unit": "defects per KLOC",
        "benchmark": "0.5 (industry average)",
        "grade": "B"
      },
      "escapeRate": {
        "current": 12,
        "previous": 18,
        "change": -6,
        "trend": "improving",
        "unit": "% bugs found in production",
        "target": 5,
        "grade": "C"
      },
      "meanTimeToRepair": {
        "current": 4.2,
        "previous": 5.8,
        "change": -1.6,
        "trend": "improving",
        "unit": "days",
        "target": 3.0,
        "grade": "B-"
      },
      "activeDefects": {
        "critical": 2,
        "high": 8,
        "medium": 23,
        "low": 45
      },
      "defectsByCategory": {
        "functional": 45,
        "performance": 8,
        "security": 3,
        "usability": 12,
        "integration": 10
      }
    },
    "testPerformance": {
      "executionTime": {
        "total": "18 minutes",
        "unit": 245,
        "integration": 832,
        "e2e": 243,
        "trend": "stable"
      },
      "passRate": {
        "current": 94.5,
        "previous": 92.8,
        "change": 1.7,
        "trend": "improving",
        "target": 98.0,
        "grade": "A-"
      },
      "flakiness": {
        "flakyTests": 12,
        "flakinessRate": 4.2,
        "trend": "improving",
        "target": 2.0,
        "grade": "C"
      },
      "testStability": {
        "consecutivePassRate": 87,
        "grade": "B+"
      }
    },
    "productivity": {
      "automatedTestsCreated": {
        "last30Days": 45,
        "trend": "increasing"
      },
      "testMaintenanceTime": {
        "hoursPerWeek": 8,
        "trend": "decreasing"
      },
      "testExecutionsPerDay": 24
    }
  },
  "trends": {
    "qualityScore": {
      "dataPoints": [
        {"date": "2024-11-29", "score": 72},
        {"date": "2024-12-06", "score": 74},
        {"date": "2024-12-13", "score": 76},
        {"date": "2024-12-20", "score": 77},
        {"date": "2024-12-29", "score": 78}
      ],
      "trendLine": "improving",
      "projection": "80 by end of Q1 2025"
    },
    "testCoverage": {
      "dataPoints": [
        {"date": "2024-11-29", "line": 65, "branch": 58},
        {"date": "2024-12-06", "line": 68, "branch": 60},
        {"date": "2024-12-13", "line": 70, "branch": 63},
        {"date": "2024-12-20", "line": 71, "branch": 64},
        {"date": "2024-12-29", "line": 72, "branch": 65}
      ],
      "trendLine": "improving"
    }
  },
  "benchmarks": {
    "testCoverage": {
      "yourCoverage": 72,
      "industryAverage": 75,
      "topPerformers": 85,
      "assessment": "Slightly below industry average"
    },
    "defectDensity": {
      "yourDensity": 0.8,
      "industryAverage": 0.5,
      "topPerformers": 0.2,
      "assessment": "Above industry average (needs improvement)"
    }
  },
  "alerts": [
    {
      "severity": "warning",
      "metric": "escapeRate",
      "message": "Escape rate at 12% exceeds warning threshold of 10%",
      "action": "Increase integration and E2E test coverage"
    },
    {
      "severity": "critical",
      "metric": "criticalDefects",
      "message": "2 critical defects active for more than 5 days",
      "action": "Prioritize critical bug fixes"
    }
  ],
  "recommendations": [
    "PRIORITY 1: Add tests for 8 uncovered critical methods",
    "PRIORITY 2: Reduce escape rate by improving integration tests",
    "PRIORITY 3: Address 12 flaky tests to improve stability",
    "Continue current trajectory - quality is improving"
  ],
  "executionTime": 1230,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│        Quality Metrics Analyzer (Port 3011)                      │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Metrics      │──▶│ Trend          │         │
│  │ Router   │   │ Collector    │   │ Analyzer       │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      Aggregate Data      Time Series Analysis        │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Scorecard    │   │ Benchmark    │   │ Alert        │      │
│  │ Generator    │   │ Comparator   │   │ Manager      │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Quality Grades      Industry Comparison   Threshold Alerts
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /metrics` - Get current quality metrics
   - `POST /trends` - Get historical trends
   - `POST /scorecard` - Generate quality scorecard
   - `POST /defects` - Get defect metrics
   - `POST /test-performance` - Get test performance metrics
   - `GET /health` - Health check endpoint

2. **Metrics Collector** (`src/collectors/metricsCollector.js`)
   - **Coverage Collector** - Collects test coverage data
   - **Quality Collector** - Collects code quality metrics
   - **Defect Collector** - Collects defect data
   - **Test Collector** - Collects test execution data

3. **Trend Analyzer** (`src/analyzers/trendAnalyzer.js`)
   - **Time Series Analyzer** - Analyzes metrics over time
   - **Trend Calculator** - Calculates improving/declining trends
   - **Forecaster** - Projects future metric values
   - **Correlation Analyzer** - Finds metric correlations

4. **Scorecard Generator** (`src/generators/scorecardGenerator.js`)
   - **Score Calculator** - Calculates overall quality score
   - **Grader** - Assigns letter grades (A-F)
   - **Weight Manager** - Manages metric weights
   - **Report Builder** - Builds executive reports

5. **Benchmark Comparator** (`src/services/benchmarkComparator.js`)
   - **Industry Standards** - Loads industry benchmark data
   - **Comparison Engine** - Compares against benchmarks
   - **Gap Analyzer** - Identifies gaps vs standards
   - **Percentile Calculator** - Calculates performance percentile

6. **Alert Manager** (`src/services/alertManager.js`)
   - **Threshold Monitor** - Monitors metric thresholds
   - **Alert Generator** - Generates alerts for violations
   - **Severity Assigner** - Assigns alert severity
   - **Action Recommender** - Recommends corrective actions

7. **Storage Manager** (`src/storage/storageManager.js`)
   - **Time Series Storage** - Stores historical metrics
   - **Snapshot Manager** - Creates daily snapshots
   - **Retention Policy** - Manages data retention
   - **Query Optimizer** - Optimizes metric queries

### Dependencies

**Internal:**
- code-analyzer (3001) - For code quality metrics
- coverage-analyzer (3002) - For test coverage data
- risk-analyzer (3009) - For risk metrics

**External Services:**
- File system access for historical data storage
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- lodash - Data manipulation
- moment - Date/time handling
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /metrics)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name
   └─▶ Load app configuration
       │
       ▼
3. Metrics Collection
   ├─▶ Call coverage-analyzer for test coverage
   ├─▶ Call code-analyzer for quality metrics
   ├─▶ Call risk-analyzer for risk data
   ├─▶ Load defect data from ADO
   └─▶ Load test execution results
       │
       ▼
4. Metric Calculation
   ├─▶ Calculate test coverage percentages
   ├─▶ Calculate code quality scores
   ├─▶ Calculate defect density
   ├─▶ Calculate test performance metrics
   └─▶ Calculate derived metrics
       │
       ▼
5. Historical Analysis
   ├─▶ Load previous metric values
   ├─▶ Calculate change deltas
   ├─▶ Determine trend directions
   └─▶ Project future values
       │
       ▼
6. Benchmark Comparison
   ├─▶ Load industry benchmarks
   ├─▶ Compare current metrics
   ├─▶ Calculate performance gap
   └─▶ Generate assessment
       │
       ▼
7. Scorecard Generation
   ├─▶ Calculate weighted quality score
   ├─▶ Assign letter grade
   ├─▶ Generate overall assessment
   └─▶ Create recommendations
       │
       ▼
8. Alert Processing
   ├─▶ Check threshold violations
   ├─▶ Generate alerts
   ├─▶ Assign severity levels
   └─▶ Recommend actions
       │
       ▼
9. Storage
   ├─▶ Store current metrics
   ├─▶ Create daily snapshot
   └─▶ Update time series data
       │
       ▼
10. Response
    └─▶ Return JSON with metrics, trends, scorecard, alerts
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3011 | Quality metrics analyzer HTTP port |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `COVERAGE_ANALYZER_URL` | ❌ No | http://coverage-analyzer:3002 | Coverage analyzer URL |
| `CODE_ANALYZER_URL` | ❌ No | http://code-analyzer:3001 | Code analyzer URL |
| `RISK_ANALYZER_URL` | ❌ No | http://risk-analyzer:3009 | Risk analyzer URL |

### Configuration Files

#### `config/apps.json`

Applications with quality targets:

```json
{
  "applications": [
    {
      "name": "App1",
      "displayName": "Patient Portal",
      "qualityTargets": {
        "testCoverage": {
          "line": 80,
          "branch": 75,
          "method": 85
        },
        "codeQuality": {
          "averageComplexity": 5.0,
          "maintainabilityIndex": 75
        },
        "defects": {
          "defectDensity": 0.5,
          "escapeRate": 5,
          "meanTimeToRepair": 3.0
        },
        "testPerformance": {
          "passRate": 98.0,
          "flakinessRate": 2.0
        }
      },
      "metricWeights": {
        "testCoverage": 30,
        "codeQuality": 25,
        "defects": 30,
        "testPerformance": 15
      }
    }
  ]
}
```

**Field Descriptions:**

- `qualityTargets` - Target values for each metric
- `metricWeights` - Weights for scorecard calculation (must sum to 100)

#### `config/benchmarks.json`

Industry benchmark data:

```json
{
  "testCoverage": {
    "industryAverage": 75,
    "topPerformers": 85,
    "minimumAcceptable": 60
  },
  "defectDensity": {
    "industryAverage": 0.5,
    "topPerformers": 0.2,
    "maximumAcceptable": 1.0
  }
}
```

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
quality-metrics-analyzer:
  build: ./mcps/quality-metrics-analyzer
  container_name: qe-quality-metrics-analyzer
  ports:
    - "3011:3011"
  environment:
    - NODE_ENV=production
    - PORT=3011
    - COVERAGE_ANALYZER_URL=http://coverage-analyzer:3002
    - CODE_ANALYZER_URL=http://code-analyzer:3001
    - RISK_ANALYZER_URL=http://risk-analyzer:3009
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/quality-metrics:/app/data # Metrics storage
  networks:
    - qe-network
  restart: unless-stopped
  depends_on:
    - coverage-analyzer
    - code-analyzer
    - risk-analyzer
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3011/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read configuration and benchmarks
- `./data/quality-metrics` - Store historical metrics

---

## API Reference

### Quality Metrics Endpoints

#### POST /metrics

Get current quality metrics

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
}
```

**Response:**
```typescript
{
  success: boolean;
  app: string;
  metrics: QualityMetrics;
  trends?: Trends;
  benchmarks?: Benchmarks;
  alerts: Alert[];
  recommendations: string[];
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3011/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

---

#### POST /trends

Get historical quality trends

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  days?: number;                  // Optional: Days of history (default: 30)
  metrics?: string[];             // Optional: Specific metrics to trend
}
```

**Response:**
```typescript
{
  success: boolean;
  trends: {
    qualityScore: TrendData;
    testCoverage: TrendData;
    defectDensity: TrendData;
    [key: string]: TrendData;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3011/trends \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "days": 90
  }'
```

---

#### POST /scorecard

Generate quality scorecard

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  format?: "json" | "html" | "pdf";  // Optional: Output format
}
```

**Response:**
```typescript
{
  success: boolean;
  scorecard: {
    overallScore: number;
    grade: string;
    categories: CategoryScore[];
    summary: string;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3011/scorecard \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

---

#### POST /defects

Get defect metrics

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  days?: number;                  // Optional: Days of history (default: 90)
}
```

**Response:**
```typescript
{
  success: boolean;
  defects: DefectMetrics;
}
```

---

#### POST /test-performance

Get test performance metrics

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
}
```

**Response:**
```typescript
{
  success: boolean;
  performance: TestPerformanceMetrics;
}
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
    coverageAnalyzer: "healthy" | "unhealthy";
    codeAnalyzer: "healthy" | "unhealthy";
    riskAnalyzer: "healthy" | "unhealthy";
  };
  timestamp: string;
}
```

---

## Usage Examples

### Example 1: Weekly Quality Report

**Scenario:** Generate weekly quality report for team meeting

```bash
curl -X POST http://localhost:3011/metrics \
  -d '{"app":"App1"}' | \
  jq '{
    qualityScore: .metrics.overall.qualityScore,
    grade: .metrics.overall.grade,
    trend: .metrics.overall.trend,
    coverage: .metrics.testCoverage.line.current,
    defects: .metrics.defects.activeDefects
  }'
```

**Output:**
```json
{
  "qualityScore": 78,
  "grade": "B",
  "trend": "improving",
  "coverage": 72,
  "defects": {
    "critical": 2,
    "high": 8
  }
}
```

---

### Example 2: Track Coverage Trends

**Scenario:** Show test coverage improvement over quarter

```bash
curl -X POST http://localhost:3011/trends \
  -d '{"app":"App1","days":90,"metrics":["testCoverage"]}' | \
  jq '.trends.testCoverage.dataPoints'
```

**Visualization:**
```
90 days ago:  ████████████████████████████ 65%
60 days ago:  ███████████████████████████████ 68%
30 days ago:  ██████████████████████████████████ 70%
Today:        ████████████████████████████████████ 72%
              ↗ Improving trend
```

---

### Example 3: Release Go/No-Go Decision

**Scenario:** Decide if quality is acceptable for release

```bash
QUALITY=$(curl -s -X POST http://localhost:3011/metrics \
  -d '{"app":"App1"}' | jq '.metrics.overall.qualityScore')

CRITICAL=$(curl -s -X POST http://localhost:3011/metrics \
  -d '{"app":"App1"}' | jq '.metrics.defects.activeDefects.critical')

if [ "$QUALITY" -lt 70 ] || [ "$CRITICAL" -gt 0 ]; then
  echo "❌ NO-GO: Quality score too low or critical defects present"
  exit 1
else
  echo "✅ GO: Quality acceptable for release"
  exit 0
fi
```

---

### Example 4: Executive Dashboard Data

**Scenario:** Generate data for executive dashboard

```bash
curl -X POST http://localhost:3011/scorecard \
  -d '{"app":"App1"}' | \
  jq '{
    score: .scorecard.overallScore,
    grade: .scorecard.grade,
    categories: .scorecard.categories | map({name, score, grade})
  }'
```

---

### Example 5: Alert Monitoring

**Scenario:** Check for quality alerts

```bash
curl -X POST http://localhost:3011/metrics \
  -d '{"app":"App1"}' | \
  jq '.alerts[] | select(.severity == "critical")'
```

**Output:**
```json
{
  "severity": "critical",
  "metric": "criticalDefects",
  "message": "2 critical defects active for more than 5 days",
  "action": "Prioritize critical bug fixes"
}
```

---

## Input/Output Schemas

### Input Schema: Metrics Request

```typescript
interface MetricsRequest {
  app: string;
}
```

---

### Output Schema: Quality Metrics

```typescript
interface QualityMetricsResponse {
  success: boolean;
  app: string;
  metrics: QualityMetrics;
  trends?: Trends;
  benchmarks?: Benchmarks;
  alerts: Alert[];
  recommendations: string[];
  executionTime: number;
  timestamp: string;
}

interface QualityMetrics {
  overall: OverallQuality;
  testCoverage: TestCoverageMetrics;
  codeQuality: CodeQualityMetrics;
  defects: DefectMetrics;
  testPerformance: TestPerformanceMetrics;
  productivity: ProductivityMetrics;
}

interface Metric {
  current: number;
  previous: number;
  change: number;
  trend: "improving" | "stable" | "declining";
  target?: number;
  grade: string;
}
```

---

## Data Persistence

### Storage Locations

```
./data/quality-metrics/
├── timeseries/
│   ├── App1-metrics.json
│   └── App2-metrics.json
├── snapshots/
│   ├── 2024-12-29-App1.json
│   └── 2024-12-29-App2.json
└── logs/
    └── quality-metrics-analyzer.log
```

---

## Development

### Local Setup

```bash
cd mcps/quality-metrics-analyzer
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
| `NO_DATA` | 404 | No historical data | Wait for data collection |

---

## Troubleshooting

### Issue: No historical data

**Solution:** Metrics are collected over time - wait for data accumulation

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3011/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/metrics/quality`

### Uses

**Coverage Analyzer:** For test coverage data
**Code Analyzer:** For code quality metrics
**Risk Analyzer:** For risk data

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Quality metrics collection
- ✅ Trend analysis
- ✅ Scorecard generation

---

**Need help?** View logs with `docker compose logs -f quality-metrics-analyzer`
