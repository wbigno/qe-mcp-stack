# Requirements Analyzer - STDIO MCP

**Type:** STDIO MCP (On-Demand Process)  
**Location:** `mcps/requirements-analyzer/`  
**Technology:** Node.js + Anthropic Claude API  
**Communication:** JSON via stdin/stdout  
**Status:** ✅ Production Ready

---

## Overview

The **Requirements Analyzer** is a STDIO MCP that uses AI (Anthropic Claude) to analyze Azure DevOps user stories for completeness, clarity, and testability. It identifies missing requirements, ambiguous language, and provides actionable recommendations to improve story quality before development and testing begin.

### Purpose

- ✅ Analyze user stories for completeness (functional, non-functional, edge cases)
- ✅ Evaluate testability (can acceptance criteria be translated to test cases?)
- ✅ Identify missing requirements and gaps
- ✅ Flag ambiguous or unclear requirements
- ✅ Provide specific, actionable recommendations
- ✅ Score stories on 0-100 scale for completeness and testability

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
curl -X POST http://localhost:3000/api/ado/analyze-requirements \
  -H "Content-Type: application/json" \
  -d '{
    "storyIds": [12345]
  }'
```

### Direct Testing (Development)

```bash
cd mcps/requirements-analyzer

# Install dependencies
npm install

# Test with sample input
echo '{
  "data": {
    "storyId": 12345,
    "storyContent": {
      "title": "As a patient, I want to schedule appointments",
      "description": "Patients need appointment scheduling capability",
      "acceptanceCriteria": "Given I am logged in\nWhen I click schedule\nThen appointment is created"
    }
  }
}' | node index.js

# Run test suite
npm test
```

---

## Input Schema

```typescript
{
  data: {
    storyId: number;              // Required: Work item ID
    storyContent: {               // Required: Story content
      title: string;              // Required: Story title
      description?: string;       // Optional: Story description
      acceptanceCriteria?: string; // Optional: Acceptance criteria
    };
  }
}
```

---

## Output Schema

```typescript
{
  success: boolean;
  result: {
    completenessScore: number;      // 0-100
    testabilityScore: number;       // 0-100
    missingRequirements: string[];  // List of missing requirements
    ambiguousRequirements: string[]; // List of unclear requirements
    recommendations: string[];      // Actionable improvements
    gaps: Array<{
      category: string;             // functional|non-functional|data|ui|integration|edge-cases
      description: string;
      severity: "high" | "medium" | "low";
    }>;
    strengths: string[];            // What's done well
    summary: string;                // Overall assessment
    metadata: {
      storyId: number;
      analyzedAt: string;           // ISO timestamp
      version: string;
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
    "completenessScore": 72,
    "testabilityScore": 78,
    "missingRequirements": [
      "No error handling specified for invalid appointment times",
      "Missing performance requirements (response time)",
      "No requirements for concurrent appointment scheduling conflicts"
    ],
    "ambiguousRequirements": [
      "'Available time slots' is unclear - what determines availability?",
      "'Confirmation' is vague - email, SMS, in-app notification?"
    ],
    "recommendations": [
      "Add specific error handling for past dates, outside business hours, and conflicting appointments",
      "Define performance requirement: 'System should respond within 2 seconds'",
      "Specify conflict resolution: 'System should prevent double-booking by locking time slots during selection'",
      "Clarify confirmation method: 'User receives email and in-app notification'"
    ],
    "gaps": [
      {
        "category": "edge-cases",
        "description": "No handling specified for appointment cancellation or rescheduling",
        "severity": "medium"
      },
      {
        "category": "non-functional",
        "description": "Missing security requirements for patient data access",
        "severity": "high"
      }
    ],
    "strengths": [
      "Clear Given-When-Then acceptance criteria format",
      "User persona well-defined",
      "Basic happy path is well documented"
    ],
    "summary": "This user story has a solid foundation with clear acceptance criteria in Given-When-Then format. However, it lacks error handling specifications, performance requirements, and edge case coverage. Adding these elements would improve testability and reduce ambiguity during implementation.",
    "metadata": {
      "storyId": 12345,
      "analyzedAt": "2024-12-29T10:30:00Z",
      "version": "1.0.0"
    }
  }
}
```

---

## Analysis Criteria

### Completeness Score (0-100)

Evaluates if all necessary requirements are present:
- ✅ Functional requirements clearly specified
- ✅ Non-functional requirements (performance, security, scalability)
- ✅ Data requirements (what data is needed, format, validation)
- ✅ UI/UX requirements (layout, interactions, accessibility)
- ✅ Integration requirements (external systems, APIs)
- ✅ Edge cases and error scenarios

### Testability Score (0-100)

Evaluates if requirements can be translated to test cases:
- ✅ Acceptance criteria are specific and measurable
- ✅ Expected behaviors clearly defined
- ✅ Success criteria can be verified
- ✅ Preconditions and postconditions are clear
- ✅ Test data requirements are specified

---

## Environment Requirements

### Required Environment Variables

```bash
# .env file (root directory)
ANTHROPIC_API_KEY=sk-ant-...     # Required: Anthropic API key
CLAUDE_MODEL=claude-sonnet-4-20250514  # Optional: Model to use (default shown)
NODE_ENV=production              # Optional: Environment
```

---

## Testing

### Run Test Suite

```bash
cd mcps/requirements-analyzer
npm test
```

### Manual Testing

```bash
# Test with complete story
cat > test-input.json << EOF
{
  "data": {
    "storyId": 12345,
    "storyContent": {
      "title": "As a patient, I want to schedule appointments",
      "description": "Patients should be able to schedule appointments with providers",
      "acceptanceCriteria": "Given I am logged in\nWhen I select a provider and time\nThen appointment is created"
    }
  }
}
EOF

cat test-input.json | node index.js

# Test with incomplete story
echo '{
  "data": {
    "storyId": 12346,
    "storyContent": {
      "title": "User login"
    }
  }
}' | node index.js
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

**Invalid Input:**
```json
{
  "success": false,
  "error": "storyContent.title is required and must be a string"
}
```

**API Timeout:**
```json
{
  "success": false,
  "error": "Claude API error: Request timeout"
}
```

---

## Integration with Orchestrator

The orchestrator calls this MCP by:

1. Spawning process: `node mcps/requirements-analyzer/index.js`
2. Sending JSON via stdin
3. Reading JSON result from stdout
4. Terminating process

### Orchestrator Example

```javascript
// In orchestrator
const { spawn } = require('child_process');

const child = spawn('node', ['mcps/requirements-analyzer/index.js']);

child.stdin.write(JSON.stringify({
  data: {
    storyId: 12345,
    storyContent: { ... }
  }
}));
child.stdin.end();

let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
});

child.on('close', () => {
  const result = JSON.parse(output);
  // Use result
});
```

---

## Performance

- **Typical Analysis Time:** 3-8 seconds
- **API Tokens Used:** ~1,000-2,000 tokens per analysis
- **Memory Usage:** ~50-100 MB per process

---

## Best Practices

1. **Always provide acceptance criteria** - Stories without acceptance criteria score poorly
2. **Use Given-When-Then format** - Improves testability scores
3. **Be specific** - Avoid vague terms like "fast", "user-friendly", "easy"
4. **Include edge cases** - Mention error scenarios, boundary conditions
5. **Specify non-functionals** - Performance, security, scalability requirements

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Claude API integration
- ✅ Completeness and testability scoring
- ✅ Gap analysis
- ✅ Recommendation generation

---

**Need help?** Check the test suite in `tests/test.js` for examples.
