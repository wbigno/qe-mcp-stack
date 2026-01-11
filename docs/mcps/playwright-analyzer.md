# Playwright Analyzer MCP

**Port**: 8401
**Category**: Playwright
**Purpose**: Analyze applications to discover critical UI paths that need testing

## Overview

The Playwright Analyzer MCP automatically discovers and prioritizes critical user journeys and UI paths in your applications. It uses AI-powered code analysis to identify what needs to be tested, helping you focus your testing efforts on the most important workflows.

## Key Features

- **Path Discovery**: Automatically identify critical user workflows and UI paths
- **Risk Assessment**: Score each path based on business impact, complexity, and frequency
- **Intelligent Prioritization**: AI-powered prioritization based on risk, coverage gaps, and business value
- **Coverage Mapping**: Track which paths have tests and identify critical gaps
- **Deep & Shallow Analysis**: Choose analysis depth based on your needs

## API Endpoints

### Health Check
```bash
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "playwright-analyzer-mcp",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

### Analyze Application Paths
```bash
POST /analyze
Content-Type: application/json

{
  "app": "Payments",
  "depth": "deep",
  "model": "claude-sonnet-4-20250514"
}
```

**Parameters**:
- `app` (string, required): Application name from apps.json
- `depth` (string, optional): Analysis depth - `"shallow"` | `"deep"` (default: `"shallow"`)
- `model` (string, optional): AI model to use (default: from env CLAUDE_MODEL)

**Response**:
```json
{
  "success": true,
  "app": "Payments",
  "depth": "deep",
  "totalPaths": 15,
  "paths": [
    {
      "id": "path-1",
      "name": "Checkout with Credit Card",
      "priority": "critical",
      "riskScore": 9,
      "steps": [
        "Add item to cart",
        "Navigate to checkout",
        "Enter shipping information",
        "Enter credit card details",
        "Submit payment",
        "Verify order confirmation"
      ],
      "expectedOutcome": "Order created successfully, payment processed",
      "coverage": "missing",
      "rationale": "Primary revenue flow, high transaction volume",
      "category": "payments"
    }
  ],
  "savedTo": "Payments-analysis-1704710400000.json",
  "usage": {
    "promptTokens": 1200,
    "completionTokens": 3500,
    "totalTokens": 4700
  }
}
```

### Prioritize Paths
```bash
POST /prioritize
Content-Type: application/json

{
  "app": "Payments",
  "maxResults": 5,
  "filter": {
    "coverage": "missing"
  },
  "model": "claude-sonnet-4-20250514"
}
```

**Parameters**:
- `app` (string, required): Application name
- `maxResults` (number, optional): Maximum number of results (default: 10)
- `filter` (object, optional): Filter criteria
  - `priority`: Filter by priority level (`"critical"` | `"high"` | `"medium"` | `"low"`)
  - `coverage`: Filter by coverage status (`"covered"` | `"partial"` | `"missing"`)
- `model` (string, optional): AI model to use

**Response**:
```json
{
  "success": true,
  "app": "Payments",
  "totalPaths": 5,
  "paths": [
    {
      "id": "path-1",
      "name": "Checkout with Credit Card",
      "priority": "critical",
      "riskScore": 10,
      "steps": [...],
      "expectedOutcome": "...",
      "coverage": "missing",
      "rationale": "...",
      "category": "payments"
    }
  ],
  "reasoning": "Prioritized payment flows first due to revenue impact, followed by authentication which blocks access to all features",
  "savedTo": "Payments-prioritization-1704710500000.json",
  "usage": {
    "promptTokens": 2000,
    "completionTokens": 1500,
    "totalTokens": 3500
  }
}
```

### Get Coverage Map
```bash
GET /coverage?app=Payments
```

**Parameters**:
- `app` (string, required): Application name (query parameter)

**Response**:
```json
{
  "success": true,
  "app": "Payments",
  "coveragePercentage": 40.0,
  "stats": {
    "total": 15,
    "covered": 6,
    "partial": 3,
    "missing": 6
  },
  "byPriority": {
    "critical": {
      "total": 4,
      "covered": 1,
      "missing": 3
    },
    "high": {
      "total": 5,
      "covered": 2,
      "missing": 3
    },
    "medium": {
      "total": 4,
      "covered": 2,
      "missing": 2
    },
    "low": {
      "total": 2,
      "covered": 1,
      "missing": 1
    }
  },
  "gaps": [
    {
      "id": "path-1",
      "name": "Checkout with Credit Card",
      "priority": "critical",
      "riskScore": 10,
      "rationale": "Primary revenue flow"
    },
    {
      "id": "path-2",
      "name": "Password Reset Flow",
      "priority": "critical",
      "riskScore": 8,
      "rationale": "Account recovery is critical for user retention"
    }
  ],
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

## Usage Examples

### 1. Discover Paths for a New Application

```bash
curl -X POST http://localhost:8401/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "Payments",
    "depth": "deep"
  }'
```

### 2. Find Top 3 Most Critical Missing Tests

```bash
# First, prioritize
curl -X POST http://localhost:8401/prioritize \
  -H "Content-Type: application/json" \
  -d '{
    "app": "Payments",
    "maxResults": 3,
    "filter": {
      "coverage": "missing",
      "priority": "critical"
    }
  }'
```

### 3. Check Current Coverage

```bash
curl http://localhost:8401/coverage?app=Payments
```

### 4. Workflow: Analysis → Prioritization → Coverage Check

```bash
# Step 1: Analyze
curl -X POST http://localhost:8401/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core", "depth": "deep"}'

# Step 2: Prioritize top 10
curl -X POST http://localhost:8401/prioritize \
  -H "Content-Type: application/json" \
  -d '{"app": "Core", "maxResults": 10}'

# Step 3: Check coverage
curl http://localhost:8401/coverage?app=Core
```

## Integration with Other MCPs

### Chained Workflow: Analyzer → Generator

The Playwright Analyzer is designed to work seamlessly with the Playwright Generator:

1. **Analyzer** discovers critical paths
2. **Generator** creates Playwright tests for those paths

```bash
# Orchestrator endpoint that chains both:
curl -X POST http://localhost:3000/api/playwright/full-automation \
  -H "Content-Type: application/json" \
  -d '{
    "app": "Payments",
    "maxPaths": 5
  }'
```

This workflow:
1. Calls analyzer to discover paths
2. Calls prioritize to get top N paths
3. Calls generator to create tests
4. Returns complete test suite

## Configuration

### Environment Variables

- `PORT`: Service port (default: 8401)
- `NODE_ENV`: Environment (`production` | `development`)
- `ANTHROPIC_API_KEY`: Anthropic API key (required)
- `CLAUDE_MODEL`: Default Claude model (default: `claude-3-haiku-20240307`)

### Docker Volumes

- `/app/data`: Persistent storage for analysis results
- `/app/config`: Read-only access to apps.json
- `/mnt/apps/*`: Read-only access to application source code

## Data Persistence

All analysis and prioritization results are saved to `/app/data/` with timestamps:

```
/app/data/
├── Payments-analysis-1704710400000.json
├── Payments-prioritization-1704710500000.json
├── Core-analysis-1704710600000.json
└── Core-prioritization-1704710700000.json
```

Files are named: `{app}-{operation}-{timestamp}.json`

The service always uses the most recent analysis file when calling `/prioritize` or `/coverage`.

## Analysis Depth Comparison

### Shallow Analysis
- **Speed**: Fast (~30-60 seconds)
- **Focus**: Main happy paths only
- **Use Case**: Quick overview, smoke testing
- **Typical Output**: 5-10 critical paths

### Deep Analysis
- **Speed**: Thorough (~2-5 minutes)
- **Focus**: All critical flows, edge cases, integrations
- **Use Case**: Comprehensive test planning
- **Typical Output**: 15-30 paths across all categories

## Path Categories

Discovered paths are categorized:

- **authentication**: Login, logout, password reset, registration
- **payments**: Checkout, payment processing, refunds
- **data-crud**: Create, read, update, delete operations
- **navigation**: Menu navigation, routing, deep links
- **forms**: Form submission, validation, error handling
- **integrations**: Third-party API interactions
- **admin**: Admin panels, user management

## Risk Scoring

Risk scores (1-10) are calculated based on:

1. **Business Impact**: Revenue, compliance, user satisfaction
2. **Complexity**: Number of steps, integrations, error scenarios
3. **Frequency**: How often users execute this path
4. **Current Coverage**: Missing tests score higher
5. **Historical Issues**: Known problem areas

## Error Handling

### Common Errors

**App not found**:
```json
{
  "error": "Application 'InvalidApp' not found in apps.json"
}
```

**No analysis available**:
```json
{
  "error": "No analysis found for this app",
  "hint": "Run POST /analyze first"
}
```

**Invalid JSON response from AI**:
```json
{
  "error": "Failed to parse path analysis",
  "details": "Unexpected token at position 10",
  "rawResponse": "..."
}
```

## Development

### Local Development

```bash
cd mcps/playwright/playwright-analyzer
npm install
PORT=8401 npm start
```

### Docker Build

```bash
# From repo root
docker compose build playwright-analyzer
docker compose up -d playwright-analyzer
docker compose logs -f playwright-analyzer
```

### Testing

```bash
# Health check
curl http://localhost:8401/health

# Analyze (requires valid apps.json and ANTHROPIC_API_KEY)
curl -X POST http://localhost:8401/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Payments", "depth": "shallow"}'
```

## Troubleshooting

### Service won't start
- Check `ANTHROPIC_API_KEY` is set
- Verify apps.json exists at `/app/config/apps.json`
- Check port 8401 is not in use

### Analysis returns empty paths
- Verify app exists in apps.json
- Check app path is accessible in container
- Review logs for AI API errors

### Coverage endpoint returns 404
- Run `/analyze` first to generate analysis data
- Check data directory permissions
- Verify analysis file was saved

## Related Documentation

- [Playwright Generator MCP](../playwright-generator/README.md) - Generate tests from discovered paths
- [Playwright Healer MCP](../playwright-healer/README.md) - Fix broken tests automatically
- [Orchestrator Playwright Routes](../../../docs/api/playwright-workflows.md) - Chained workflows

## License

Part of QE MCP Stack - Internal Use
