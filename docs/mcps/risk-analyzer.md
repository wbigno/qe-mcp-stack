# Risk Analyzer MCP

## Overview

The Risk Analyzer MCP provides AI-powered risk assessment for code changes and features using Anthropic Claude and OpenAI APIs.

**Port**: 8300  
**Swagger UI**: http://localhost:8300/api-docs  
**Category**: Quality Analysis MCP

## Features

- AI-powered risk scoring (0-10 scale)
- Change impact analysis
- Historical trend analysis
- Recommendation engine
- Integration with multiple AI providers

## API Endpoints

### Assess Risk

```
POST /api/assess
```

**Request Body**:
```json
{
  "workItemId": 12345,
  "title": "Add payment validation",
  "changedFiles": ["src/payments/validation.cs"],
  "codeMetrics": {
    "complexity": 15,
    "linesChanged": 250
  },
  "coverage": {
    "percentage": 45
  }
}
```

**Response**:
```json
{
  "workItemId": 12345,
  "riskScore": 7.5,
  "riskLevel": "high",
  "factors": {
    "complexity": "high",
    "coverage": "low",
    "changeSize": "medium",
    "criticalPath": true
  },
  "recommendations": [
    "Increase test coverage to at least 70%",
    "Consider refactoring methods with complexity > 10",
    "Add integration tests for payment flow"
  ],
  "confidenceScore": 0.85
}
```

## Configuration

Required environment variables:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...  # Optional
```

## AI Analysis Process

1. **Data Aggregation**: Collect metrics from multiple sources
2. **Context Building**: Create prompt with code context
3. **AI Analysis**: Send to Claude/GPT for assessment
4. **Risk Calculation**: Compute weighted risk score
5. **Recommendation Generation**: Generate actionable items

## Risk Scoring Algorithm

```
Risk Score = (
  complexityWeight * complexityScore +
  coverageWeight * coverageScore +
  changeSizeWeight * changeSizeScore +
  criticalPathWeight * criticalPathScore
) / totalWeight

Where:
- complexityScore: 0-10 based on cyclomatic complexity
- coverageScore: 0-10 based on test coverage %
- changeSizeScore: 0-10 based on lines changed
- criticalPathScore: 0-10 if in critical path
```

## Usage Example

```typescript
const assessmentData = {
  workItemId: 12345,
  title: "Add payment validation",
  changedFiles: ["src/payments/validation.cs"],
  codeMetrics: { complexity: 15, linesChanged: 250 },
  coverage: { percentage: 45 }
};

const response = await fetch('http://localhost:8300/api/assess', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(assessmentData)
});

const risk = await response.json();
console.log(`Risk Level: ${risk.riskLevel} (${risk.riskScore}/10)`);
risk.recommendations.forEach(rec => console.log(`- ${rec}`));
```

## Related MCPs

- **Code Analyzer**: Provides complexity metrics
- **Coverage Analyzer**: Provides test coverage data
- **Azure DevOps**: Provides work item context
