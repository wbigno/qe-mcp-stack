# Test Case Generation with QE Methodology

## Overview

The test case generation endpoint (`POST /api/ado/generate-test-cases`) uses QE (Quality Engineering) methodology to generate risk-prioritized test cases based on Acceptance Criteria analysis.

## Endpoint

### `POST /api/ado/generate-test-cases`

Generates manual test cases for a user story using AI, with risk-based prioritization.

---

## Request Parameters

| Parameter                  | Type    | Required | Description                                    |
| -------------------------- | ------- | -------- | ---------------------------------------------- |
| `storyId`                  | number  | Yes      | Azure DevOps work item ID                      |
| `story`                    | object  | No       | Story data (if not provided, fetched from ADO) |
| `parsedAcceptanceCriteria` | array   | No       | Pre-parsed ACs from frontend                   |
| `riskAnalysis`             | object  | No       | Risk analysis results for prioritization       |
| `integrationAnalysis`      | object  | No       | Integration mapping for context                |
| `options`                  | object  | No       | Generation options                             |
| `updateADO`                | boolean | No       | Whether to create test cases in ADO            |
| `model`                    | string  | No       | Claude model to use                            |

### Options Object

| Option               | Type    | Default   | Description                 |
| -------------------- | ------- | --------- | --------------------------- |
| `includeNegative`    | boolean | true      | Include negative test cases |
| `includeEdgeCases`   | boolean | true      | Include edge case tests     |
| `includeIntegration` | boolean | true      | Include integration tests   |
| `namingFormat`       | string  | See below | Test case naming format     |

---

## How It Works

### 1. Story Data Resolution

If `story` object is provided, it's used directly. Otherwise, the system fetches from Azure DevOps.

### 2. QE Risk Context Building

If `riskAnalysis` is provided, a risk context is built for the AI:

```
Risk Level: HIGH (Score: 75/100)
Key Risk Factors:
- Integration Risk: Multiple critical integrations affected
- Complexity Risk: Moderate code complexity
- Business Impact: Revenue-affecting feature

Test Generation Guidelines:
- Generate EXHAUSTIVE tests for high-risk areas
```

### 3. AC-to-Risk Mapping

Each Acceptance Criterion is analyzed for risk indicators:

| Pattern                     | Risk Level | Reason                         |
| --------------------------- | ---------- | ------------------------------ |
| payment, billing, financial | Critical   | Financial/Payment processing   |
| epic, ehr, patient          | Critical   | Epic/EHR integration           |
| security, authentication    | High       | Security-related functionality |
| api, integration, external  | High       | External API/Integration       |
| database, data, migration   | High       | Data/Database operations       |
| (default)                   | Medium     | Standard functionality         |

### 4. Test Depth Based on Risk

| Risk Level | Test Depth    | Positive | Negative | Edge | Integration |
| ---------- | ------------- | -------- | -------- | ---- | ----------- |
| Critical   | Exhaustive    | 3+       | 5+       | 4+   | 2+          |
| High       | Comprehensive | 2+       | 3+       | 2+   | 1+          |
| Medium     | Standard      | 2        | 2        | 1    | 0           |
| Low        | Smoke         | 1        | 1        | 0    | 0           |

---

## Naming Convention

All generated test cases follow the naming format:

```
PBI-{storyId} AC{number}: [{type}] {description}
```

**Examples:**

- `PBI-12345 AC1: [positive] Verify user can submit form with valid data`
- `PBI-12345 AC1: [negative] Verify error message for missing required fields`
- `PBI-12345 AC1: [edge] Verify form handles maximum character limit`
- `PBI-12345 AC2: [integration] Verify Epic record created on submission`

This format allows:

- Easy traceability to story (`PBI-12345`)
- AC coverage tracking (`AC1`, `AC2`)
- Quick type identification (`[positive]`, `[negative]`, `[edge]`, `[integration]`)

---

## Response Structure

```json
{
  "success": true,
  "storyId": 12345,
  "storyTitle": "...",
  "testCases": [
    {
      "id": 1,
      "name": "PBI-12345 AC1: [positive] ...",
      "acceptanceCriteriaRef": "AC1",
      "type": "positive",
      "priority": "critical",
      "preconditions": ["..."],
      "steps": ["..."],
      "expectedResults": ["..."],
      "testData": {},
      "automated": false
    }
  ],
  "summary": {
    "totalTestCases": 8,
    "byType": { "positive": 3, "negative": 3, "edge": 1, "integration": 1 },
    "byPriority": { "critical": 4, "high": 3, "medium": 1, "low": 0 }
  },
  "riskContext": {
    "level": "high",
    "score": 75,
    "acRiskMapping": { "AC1": "critical", "AC2": "critical" }
  }
}
```
