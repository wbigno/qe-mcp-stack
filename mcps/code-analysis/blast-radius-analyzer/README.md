# Blast Radius Analyzer MCP

## Overview

The Blast Radius Analyzer is a Docker-based MCP (Model Context Protocol) service that analyzes the impact of code changes by identifying affected components, integrations, and tests. It uses fuzzy file matching and dependency graph traversal to provide comprehensive change impact analysis.

## Endpoints

### `GET /health`

Health check endpoint.

### `POST /analyze`

Main analysis endpoint for blast radius calculation.

### `POST /dependencies`

Get dependencies for specific files.

### `POST /find-files`

Find files using fuzzy matching.

---

## How It Works

### 1. File Resolution with Fuzzy Matching

When analyzing changed files, the system attempts to resolve file paths using 6 matching strategies (in order):

| Strategy                 | Description                                               | Example                                                                     |
| ------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Exact Match**          | File path matches exactly                                 | `Services/PaymentService.cs`                                                |
| **Case-Insensitive**     | Matches ignoring case                                     | `services/paymentservice.cs` → `Services/PaymentService.cs`                 |
| **Filename-Only**        | Matches by filename, ignoring directory                   | `PaymentService.cs` matches any path ending with that name                  |
| **Partial Path**         | Matches last N path segments                              | `Services/PaymentService.cs` matches `/src/Core/Services/PaymentService.cs` |
| **Levenshtein Distance** | Finds similar filenames (typo tolerance, max distance: 5) | `PaymentServce.cs` → `PaymentService.cs`                                    |
| **Suggestions**          | Returns similar files for unmatched paths                 | Shows top 5 similar files                                                   |

### 2. Dependency Graph Construction

The dependency graph tracks bidirectional relationships:

```
┌─────────────────┐     depends on     ┌─────────────────┐
│   Controller    │ ──────────────────>│     Service     │
└─────────────────┘                    └─────────────────┘
        ↑                                      │
        │           depends on                 │
        └──────────────────────────────────────┘
              (reverse: "depended on by")
```

**Inference Rules:**

- Controllers → depend on → Services (inferred from naming: `PaymentController` → `PaymentService`)
- Services → depend on → Repositories (inferred from naming: `PaymentService` → `PaymentRepository`)
- Models/Entities → depended on by → Services, Controllers

**Transitive Dependencies:**

- Configurable depth (default: 2 levels)
- Level 0: The changed file itself
- Level 1: Direct dependents (files that import the changed file)
- Level 2: Second-level dependents (files that import Level 1 files)

### 3. Integration Detection

Integrations are identified by pattern matching in file paths:

| Integration Type     | Detection Patterns                    | Risk Level | Weight |
| -------------------- | ------------------------------------- | ---------- | ------ |
| **Epic/EHR**         | `epic`, `ehr`                         | Critical   | 5      |
| **Financial**        | `financial`, `billing`, `payment`     | Critical   | 5      |
| **Payment Gateway**  | `stripe`, `paypal`, `gateway`         | Critical   | 5      |
| **External API**     | `api` + `client`                      | High       | 4      |
| **Database**         | `repository`, `dbcontext`, `database` | High       | 4      |
| **Messaging**        | `message`, `queue`, `event`           | Medium     | 3      |
| **Internal Service** | Other service patterns                | Medium     | 2      |
| **UI**               | UI-related patterns                   | Low        | 1      |

### 4. Risk Score Calculation

The risk score (0-100) is calculated using:

```
Risk Score = Component Score + Integration Score + Test Score

Where:
- Component Score = min(affected_components × 5, 30)
- Integration Score = min(Σ(integration_weight × 10), 50)
- Test Score = min(directly_affected_tests × 5, 20)
```

**Risk Levels:**
| Score Range | Level | Description |
|-------------|-------|-------------|
| 70-100 | Critical | Comprehensive testing required with stakeholder notification |
| 50-69 | High | Thorough testing recommended for all affected areas |
| 30-49 | Medium | Standard regression testing recommended |
| 0-29 | Low | Basic validation sufficient |

---

## Data Sources

| Data               | Source                                 | Purpose                     |
| ------------------ | -------------------------------------- | --------------------------- |
| Changed Files      | Request body (`changedFiles` array)    | Starting point for analysis |
| Available Files    | File system scan or code-analyzer MCP  | Fuzzy matching candidates   |
| Code Structure     | Pattern inference or code-analyzer MCP | Dependency relationships    |
| Integration Points | Pattern matching on file paths         | Risk categorization         |

---

## Request/Response Examples

### Analyze Blast Radius

**Request:**

```json
POST /analyze
{
  "app": "Core",
  "changedFiles": [
    "Services/PaymentService.cs",
    "Controllers/PaymentController.cs"
  ],
  "depth": 2
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "risk": {
      "score": 75,
      "level": "high",
      "description": "High risk: 8 components affected with 2 critical integrations."
    },
    "changedFiles": [
      {
        "path": "Services/PaymentService.cs",
        "exists": true,
        "matchType": "exact"
      },
      {
        "path": "Controllers/PaymentController.cs",
        "exists": true,
        "matchType": "exact"
      }
    ],
    "impact": {
      "affectedComponents": [
        "PaymentService",
        "PaymentController",
        "BillingService"
      ],
      "affectedTests": ["PaymentTests.cs", "BillingTests.cs"],
      "affectedIntegrations": ["Financial", "Payment"],
      "directDependencies": 3,
      "transitiveDependencies": 5
    },
    "recommendations": [
      {
        "category": "Integration",
        "priority": "critical",
        "recommendation": "Test Financial integration thoroughly - critical risk area",
        "testTypes": ["integration", "e2e"]
      },
      {
        "category": "API",
        "priority": "high",
        "recommendation": "Verify all API endpoints in affected controllers",
        "testTypes": ["api", "integration"]
      }
    ]
  }
}
```

---

## Configuration

| Environment Variable | Default     | Description      |
| -------------------- | ----------- | ---------------- |
| `PORT`               | 3000        | Service port     |
| `NODE_ENV`           | development | Environment mode |

## Docker

```yaml
blast-radius-analyzer:
  build:
    context: .
    dockerfile: mcps/code-analysis/blast-radius-analyzer/Dockerfile
  ports:
    - "8202:8202"
  environment:
    - PORT=8202
```
