# Test Case Planner - STDIO MCP

**Type:** STDIO MCP (On-Demand Process)  
**Location:** `mcps/test-case-planner/`  
**Technology:** Node.js + Anthropic Claude API  
**Communication:** JSON via stdin/stdout  
**Status:** ✅ Production Ready

---

## Overview

The **Test Case Planner** is a STDIO MCP that uses AI (Anthropic Claude) to generate comprehensive test cases from Azure DevOps requirements and acceptance criteria. It creates detailed, step-by-step test cases with preconditions, test data, expected results, and automation feasibility assessments.

### Purpose

- ✅ Generate positive test cases (happy path scenarios)
- ✅ Generate negative test cases (error handling, invalid inputs)
- ✅ Generate edge case tests (boundary conditions, unusual scenarios)
- ✅ Provide detailed step-by-step instructions
- ✅ Include test data requirements
- ✅ Assess automation feasibility
- ✅ Estimate execution time
- ✅ Prioritize test cases by risk

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
curl -X POST http://localhost:3000/api/ado/generate-test-cases \
  -H "Content-Type: application/json" \
  -d '{
    "storyId": 12345
  }'
```

### Direct Testing (Development)

```bash
cd mcps/test-case-planner

# Install dependencies
npm install

# Test with sample input
cat sample-input.json | node index.js

# Run test suite
npm test
```

---

## Input Schema

```typescript
{
  data: {
    storyId: number;              // Required: Work item ID
    requirements?: string;        // Optional: Requirements text
    acceptanceCriteria?: string;  // Optional: Acceptance criteria
    includeNegative?: boolean;    // Default: true - Include negative tests
    includeEdgeCases?: boolean;   // Default: true - Include edge cases
  }
}
```

**Note:** At least one of `requirements` or `acceptanceCriteria` must be provided.

---

## Output Schema

```typescript
{
  success: boolean;
  result: {
    testCases: Array<{
      id: string;                   // e.g., "TC001"
      storyId: number;
      title: string;
      description: string;
      preconditions: string[];
      steps: Array<{
        stepNumber: number;
        action: string;
        expectedResult: string;
      }>;
      postconditions: string[];
      testData: object;             // Sample test data
      priority: "high" | "medium" | "low";
      category: "positive" | "negative" | "edge-case";
      estimatedDuration: string;    // e.g., "5 minutes"
      tags: string[];
      automationFeasibility: {
        feasibility: "high" | "medium" | "low";
        score: number;              // 0-100
        reasons: string[];
      };
      riskLevel: string;            // critical|high|medium|low
      traceability: {
        storyId: number;
        requirementsCoverage: object;
      };
    }>;
    summary: {
      totalTestCases: number;
      byCategory: {
        positive: number;
        negative: number;
        edgeCases: number;
      };
      byPriority: {
        high: number;
        medium: number;
        low: number;
      };
      automationFeasibility: {
        high: number;
        medium: number;
        low: number;
      };
      estimatedExecutionTime: string;
      coverage: {
        functionalScenarios: number;
        errorHandling: number;
        boundaryConditions: number;
      };
    };
    metadata: {
      storyId: number;
      generatedAt: string;
      version: string;
      includeNegative: boolean;
      includeEdgeCases: boolean;
    };
  }
}
```

---

## Example Output

```json
{
  "success": true,
  "result": {
    "testCases": [
      {
        "id": "TC001",
        "storyId": 12345,
        "title": "Successfully schedule appointment with available provider",
        "description": "Verify that a logged-in patient can schedule an appointment by selecting a provider and available time slot",
        "preconditions": [
          "User is logged in as a patient",
          "At least one provider has available appointment slots",
          "User has active patient account"
        ],
        "steps": [
          {
            "stepNumber": 1,
            "action": "Navigate to the appointment scheduling page",
            "expectedResult": "Appointment scheduling page loads successfully with provider dropdown visible"
          },
          {
            "stepNumber": 2,
            "action": "Select 'Dr. John Smith' from the provider dropdown",
            "expectedResult": "Available time slots for Dr. Smith are displayed"
          },
          {
            "stepNumber": 3,
            "action": "Select time slot '2024-01-15 10:00 AM'",
            "expectedResult": "Time slot is highlighted and 'Schedule Appointment' button is enabled"
          },
          {
            "stepNumber": 4,
            "action": "Click 'Schedule Appointment' button",
            "expectedResult": "Confirmation message appears: 'Appointment scheduled successfully'"
          },
          {
            "stepNumber": 5,
            "action": "Check email inbox",
            "expectedResult": "Confirmation email received with appointment details"
          },
          {
            "stepNumber": 6,
            "action": "Navigate to 'My Appointments' page",
            "expectedResult": "Newly scheduled appointment appears in the list"
          }
        ],
        "postconditions": [
          "Appointment is created in the system",
          "Appointment appears in patient's appointment list",
          "Provider's calendar is updated with the appointment"
        ],
        "testData": {
          "patientEmail": "john.doe@example.com",
          "providerName": "Dr. John Smith",
          "appointmentDate": "2024-01-15",
          "appointmentTime": "10:00 AM"
        },
        "priority": "high",
        "category": "positive",
        "estimatedDuration": "8 minutes",
        "tags": ["scheduling", "appointments", "smoke", "critical-path"],
        "automationFeasibility": {
          "feasibility": "high",
          "score": 90,
          "reasons": ["Fully automatable"]
        },
        "riskLevel": "critical",
        "traceability": {
          "storyId": 12345,
          "requirementsCoverage": {
            "concepts": ["schedule", "appointment"],
            "fullCoverage": true
          }
        }
      },
      {
        "id": "TC002",
        "title": "Error when scheduling appointment without selecting provider",
        "description": "Verify system shows error when user attempts to schedule without selecting a provider",
        "category": "negative",
        "priority": "high",
        "steps": [
          {
            "stepNumber": 1,
            "action": "Navigate to appointment scheduling page",
            "expectedResult": "Page loads with empty provider dropdown"
          },
          {
            "stepNumber": 2,
            "action": "Click 'Schedule Appointment' button without selecting provider",
            "expectedResult": "Error message displays: 'Please select a provider'"
          }
        ],
        "testData": {
          "providerSelected": false
        },
        "automationFeasibility": {
          "feasibility": "high",
          "score": 95,
          "reasons": ["Fully automatable"]
        }
      }
    ],
    "summary": {
      "totalTestCases": 7,
      "byCategory": {
        "positive": 3,
        "negative": 3,
        "edgeCases": 1
      },
      "byPriority": {
        "high": 5,
        "medium": 2,
        "low": 0
      },
      "automationFeasibility": {
        "high": 6,
        "medium": 1,
        "low": 0
      },
      "estimatedExecutionTime": "45m",
      "coverage": {
        "functionalScenarios": 3,
        "errorHandling": 3,
        "boundaryConditions": 1
      }
    }
  }
}
```

---

## Test Case Categories

### Positive Tests (Happy Path)
- Main user flows
- Expected successful operations
- Standard use cases
- **Priority:** Usually high

### Negative Tests (Error Handling)
- Invalid inputs
- Missing required data
- Permission violations
- System errors
- **Priority:** High for critical errors

### Edge Cases (Boundary Conditions)
- Minimum/maximum values
- Empty data
- Special characters
- Concurrent operations
- **Priority:** Medium to low

---

## Automation Feasibility

Each test case is assessed for automation feasibility:

### High Feasibility (80-100)
- Clear, repeatable steps
- No manual verification required
- Deterministic outcomes
- Suitable for CI/CD

### Medium Feasibility (50-79)
- Some manual steps
- Complex setup required
- File operations needed
- May require mocking

### Low Feasibility (<50)
- Heavy manual verification
- Visual validation required
- Complex external dependencies
- Better suited for manual testing

---

## Environment Requirements

### Required Environment Variables

```bash
# .env file (root directory)
ANTHROPIC_API_KEY=sk-ant-...     # Required: Anthropic API key
CLAUDE_MODEL=claude-sonnet-4-20250514  # Optional: Model to use
NODE_ENV=production              # Optional: Environment
```

---

## Testing

### Run Test Suite

```bash
cd mcps/test-case-planner
npm test
```

### Manual Testing

```bash
# Test with sample input
cat > test-input.json << EOF
{
  "data": {
    "storyId": 12345,
    "acceptanceCriteria": "Given user is logged in\nWhen user clicks logout\nThen user is logged out",
    "includeNegative": true,
    "includeEdgeCases": true
  }
}
EOF

cat test-input.json | node index.js
```

---

## Error Handling

### Common Errors

**Missing API Key:**
```json
{
  "success": false,
  "error": "Claude API error: Missing API key"
}
```

**Missing Required Fields:**
```json
{
  "success": false,
  "error": "At least one of requirements or acceptanceCriteria is required"
}
```

**Invalid Story ID:**
```json
{
  "success": false,
  "error": "storyId must be a number"
}
```

---

## Integration with Orchestrator

Called by orchestrator to generate test cases from requirements analysis.

### Typical Workflow

1. **requirements-analyzer** analyzes story quality
2. **test-case-planner** generates test cases (this MCP)
3. **automation-requirements** creates automation plan

---

## Performance

- **Typical Generation Time:** 5-15 seconds
- **API Tokens Used:** ~2,000-4,000 tokens per generation
- **Memory Usage:** ~50-100 MB per process
- **Test Cases Generated:** 5-10 per execution

---

## Best Practices

1. **Provide detailed acceptance criteria** - More detail = better test cases
2. **Include both requirements and acceptance criteria** - Gives AI more context
3. **Enable negative tests** - Critical for quality
4. **Review generated tests** - AI is good but not perfect
5. **Customize test data** - Replace generic data with realistic values

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Positive, negative, and edge case generation
- ✅ Automation feasibility assessment
- ✅ Risk level calculation
- ✅ Comprehensive test data

---

**Need help?** Check the test suite in `tests/test.js` for examples.
