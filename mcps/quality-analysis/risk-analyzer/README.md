# Risk Analyzer MCP

## Overview

The Risk Analyzer is a Docker-based MCP service that performs comprehensive risk analysis for user stories using QE (Quality Engineering) methodology. It calculates risk scores based on multiple factors and provides a Probability × Impact risk matrix for test prioritization.

## Endpoints

### `GET /health`

Health check endpoint.

### `POST /analyze-risk`

Comprehensive risk analysis for a story.

### `POST /risk-matrix`

QE Risk Matrix with Probability × Impact scoring and AC-to-Risk mapping.

---

## QE Methodology

The Risk Analyzer implements QE (Quality Engineering) methodology focused on:

1. **Where will defects most likely occur?** (Probability)
2. **What is the impact if a defect escapes?** (Impact)
3. **How should we prioritize testing?** (Risk Matrix)

---

## Risk Scoring Methodology

### Factor Weights

| Factor               | Weight | Description                                                    |
| -------------------- | ------ | -------------------------------------------------------------- |
| **Complexity**       | 20%    | Code complexity metrics (cyclomatic complexity, nesting depth) |
| **Coverage**         | 15%    | Test coverage gaps (lower coverage = higher risk)              |
| **Integration**      | 25%    | Number and criticality of integration points                   |
| **Change Frequency** | 10%    | Historical change rate, refactoring indicators                 |
| **Business Impact**  | 20%    | Business criticality assessed by AI                            |
| **Defect History**   | 10%    | Past defects in affected areas                                 |

### Risk Calculation Formula

```
Total Risk Score = Σ(Factor Score × Factor Weight)

Where each Factor Score is 0-100
```

### Risk Levels

| Score Range | Level    | Recommended Action                             |
| ----------- | -------- | ---------------------------------------------- |
| 100+        | Critical | Stakeholder approval required, full regression |
| 60-99       | High     | Thorough testing, senior review                |
| 30-59       | Medium   | Standard testing procedures                    |
| 0-29        | Low      | Basic validation sufficient                    |

---

## Factor Analysis Details

### 1. Complexity Analysis

**Data Sources:**

- Code analyzer MCP (cyclomatic complexity metrics)
- File path extraction from story description

**Scoring:**

```
Score = min(100, Average_Complexity × 5)

Where:
- High complexity file: complexity > 15
- Moderate complexity: 10-15
- Low complexity: < 10
```

### 2. Coverage Analysis

**Data Sources:**

- Coverage analyzer MCP (overall coverage percentage)

**Scoring:**

```
Score = 100 - Coverage_Percentage

Example: 30% coverage → 70 risk score
```

### 3. Integration Risk Analysis

**Data Sources:**

- Integration mapper MCP
- Pattern matching in file paths

**Integration Risk Hierarchy:**

| Integration Type | Risk Weight | Examples                         |
| ---------------- | ----------- | -------------------------------- |
| Epic/EHR         | 15 points   | Patient data, clinical workflows |
| Financial        | 15 points   | Billing, payments, transactions  |
| External API     | 10 points   | Third-party services             |
| Database         | 10 points   | Data persistence, migrations     |
| Messaging        | 5 points    | Event queues, notifications      |
| Internal Service | 3 points    | Inter-service communication      |

**Scoring:**

```
Base Score = min(50, integration_count × 3)
Critical Bonus = critical_integrations × 15
Total = min(100, Base Score + Critical Bonus)
```

### 4. Change Frequency Analysis

**Data Sources:**

- Story description keywords
- (Future: Git history analysis)

**Keyword Indicators:**

| Keyword            | Score Addition |
| ------------------ | -------------- |
| refactor, redesign | +20            |
| legacy, old code   | +15            |
| migration, upgrade | +15            |

### 5. Business Impact Analysis

**Data Sources:**

- Claude AI analysis of story content
- Fallback: Keyword-based scoring

**AI Prompt Assessment:**

- 0-20: Minimal impact (internal tooling)
- 21-40: Low impact (single feature)
- 41-60: Moderate impact (core feature)
- 61-80: High impact (revenue-affecting)
- 81-100: Critical impact (security, compliance)

**Fallback Keywords:**

| Keyword               | Score |
| --------------------- | ----- |
| security, compliance  | 90    |
| payment, billing      | 85    |
| critical, production  | 75    |
| customer, user-facing | 70    |
| internal, admin       | 30    |

### 6. Defect History Analysis

**Data Sources:**

- Story description keywords
- (Future: ADO defect queries)

**Keyword Indicators:**

| Keyword            | Score Addition |
| ------------------ | -------------- |
| bug, defect, issue | +30            |
| fix, hotfix        | +20            |
| regression, broken | +25            |

---

## QE Risk Matrix (Probability × Impact)

### Probability Factors

| Factor                 | Weight | Description                             |
| ---------------------- | ------ | --------------------------------------- |
| Code Complexity        | 25%    | Likelihood of defects from complex code |
| Change Volume          | 20%    | Risk from amount of changes             |
| Integration Complexity | 25%    | Risk from external dependencies         |
| Test Coverage Gaps     | 15%    | Uncovered code paths                    |
| Defect History         | 15%    | Historical problem areas                |

### Impact Factors

| Factor               | Weight | Description                        |
| -------------------- | ------ | ---------------------------------- |
| Business Criticality | 30%    | Revenue, compliance, safety impact |
| User Exposure        | 25%    | Number of affected users           |
| Data Integrity       | 25%    | PHI, PII, financial data           |
| Recoverability       | 20%    | Ability to rollback/recover        |

### Risk Matrix Visualization

```
                    IMPACT
           Low    Medium    High    Critical
         ┌──────┬──────┬──────┬──────┐
    High │  M   │  H   │  C   │  C   │
P        ├──────┼──────┼──────┼──────┤
R   Med  │  L   │  M   │  H   │  C   │
O        ├──────┼──────┼──────┼──────┤
B   Low  │  L   │  L   │  M   │  H   │
         └──────┴──────┴──────┴──────┘

L = Low, M = Medium, H = High, C = Critical
```

---

## AC-to-Risk Mapping

Each Acceptance Criterion is analyzed for risk indicators:

| Keyword Pattern                         | Risk Level | Test Depth    |
| --------------------------------------- | ---------- | ------------- |
| payment, billing, financial             | Critical   | Exhaustive    |
| epic, ehr, patient                      | Critical   | Exhaustive    |
| security, authentication, authorization | High       | Comprehensive |
| api, integration, external              | High       | Comprehensive |
| database, data, migration               | High       | Comprehensive |
| (default)                               | Medium     | Standard      |

### Test Depth Recommendations

| Risk Level | Positive | Negative | Edge | Integration |
| ---------- | -------- | -------- | ---- | ----------- |
| Critical   | 3+       | 5+       | 4+   | 2+          |
| High       | 2+       | 3+       | 2+   | 1+          |
| Medium     | 2        | 2        | 1    | 0           |
| Low        | 1        | 1        | 0    | 0           |

---

## Request/Response Examples

### Analyze Risk

**Request:**

```json
POST /analyze-risk
{
  "app": "Core",
  "story": {
    "id": 12345,
    "title": "Implement payment processing for Epic patients",
    "description": "Add ability to process payments through Stripe integration",
    "acceptanceCriteria": "1. User can submit payment\n2. Payment syncs to Epic billing"
  }
}
```

**Response:**

```json
{
  "success": true,
  "app": "Core",
  "storyId": 12345,
  "result": {
    "risk": {
      "score": 85,
      "level": "high",
      "factors": {
        "complexity": {
          "score": 50,
          "description": "Moderate code complexity"
        },
        "coverage": {
          "score": 70,
          "description": "Low test coverage"
        },
        "integration": {
          "score": 90,
          "description": "Multiple critical integrations affected"
        },
        "businessImpact": {
          "score": 85,
          "description": "Payment processing - revenue critical"
        }
      },
      "recommendations": [
        {
          "priority": "critical",
          "category": "testing",
          "text": "Perform full integration testing with external systems"
        }
      ]
    }
  }
}
```

### QE Risk Matrix

**Request:**

```json
POST /risk-matrix
{
  "app": "Core",
  "story": { "id": 12345, "title": "Payment processing" },
  "acceptanceCriteria": [
    { "id": "AC1", "number": 1, "text": "User can submit payment with valid card" },
    { "id": "AC2", "number": 2, "text": "Payment syncs to Epic billing system" }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "riskMatrix": {
    "probability": { "score": 65, "level": "High" },
    "impact": { "score": 85, "level": "Critical" },
    "overall": { "score": 85, "level": "high" }
  },
  "acRiskMapping": [
    {
      "ac": "AC1",
      "riskLevel": "critical",
      "testingDepth": "exhaustive",
      "recommendedTests": {
        "positive": 3,
        "negative": 5,
        "edge": 4,
        "integration": 2
      }
    }
  ],
  "testPrioritization": {
    "critical": ["AC1: User can submit payment..."],
    "high": ["Integration point testing"]
  }
}
```

---

## Configuration

| Environment Variable | Default                 | Description                  |
| -------------------- | ----------------------- | ---------------------------- |
| `PORT`               | 3009                    | Service port                 |
| `DEFAULT_FAST_MODEL` | claude-haiku-4-20250610 | AI model for business impact |
