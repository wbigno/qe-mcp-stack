# Playwright Healer MCP

**Port**: 8402
**Category**: Playwright
**Purpose**: Automatically detect and fix broken Playwright tests

## Overview

The Playwright Healer MCP provides AI-powered test repair and flakiness detection. It analyzes test failures, diagnoses root causes, generates fixes, and identifies flaky tests that need stabilization.

## Key Features

- **Failure Analysis**: Deep dive into test failures to identify root causes
- **Automated Healing**: Generate fixes for broken tests automatically
- **Flaky Test Detection**: Identify unreliable tests from historical runs
- **Selector Improvement**: Replace fragile selectors with stable alternatives
- **Stability Recommendations**: Suggest improvements for better test reliability

## API Endpoints

### Health Check
```bash
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "playwright-healer-mcp",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

### Analyze Test Failures
```bash
POST /analyze-failures
Content-Type: application/json

{
  "testFile": "tests/checkout.spec.ts",
  "errorLog": "Error: locator.click: Timeout 30000ms exceeded...",
  "screenshot": "base64-encoded-image-data",
  "model": "claude-sonnet-4-20250514"
}
```

**Parameters**:
- `testFile` (string, required): Path to the test file
- `errorLog` (string, required): Complete error log from test failure
- `screenshot` (string, optional): Base64-encoded screenshot of failure
- `model` (string, optional): AI model to use

**Response**:
```json
{
  "success": true,
  "testFile": "tests/checkout.spec.ts",
  "failureAnalysis": {
    "failureType": "selector-not-found",
    "rootCause": "The submit button selector '.submit-btn' is no longer valid after recent UI changes",
    "affectedSelector": ".submit-btn",
    "suggestedFix": "Replace CSS class selector with stable data-testid attribute",
    "confidence": "high",
    "isFlaky": false,
    "flakinessReason": null,
    "preventionTips": [
      "Use data-testid attributes for critical buttons",
      "Add visual regression tests for UI changes",
      "Implement selector validation in pre-commit hooks"
    ],
    "relatedIssues": [
      "Other tests using .submit-btn may also fail",
      "Check if CSS class naming convention changed"
    ]
  },
  "savedTo": "failure-analysis-1704710400000.json",
  "usage": {
    "promptTokens": 800,
    "completionTokens": 400,
    "totalTokens": 1200
  }
}
```

### Heal Broken Test
```bash
POST /heal
Content-Type: application/json

{
  "testFile": "tests/checkout.spec.ts",
  "testCode": "test('Complete checkout', async ({ page }) => {\n  await page.click('.submit-btn');\n  ...\n})",
  "errorLog": "Error: locator.click: Timeout 30000ms exceeded...",
  "model": "claude-sonnet-4-20250514"
}
```

**Parameters**:
- `testFile` (string, required): Path to the test file
- `testCode` (string, required): Complete test code that needs fixing
- `errorLog` (string, required): Error log from the test failure
- `model` (string, optional): AI model to use

**Response**:
```json
{
  "success": true,
  "testFile": "tests/checkout.spec.ts",
  "fixedCode": "test('Complete checkout', async ({ page }) => {\n  // Fixed: Use stable data-testid instead of CSS class\n  await page.click('[data-testid=\"submit-button\"]');\n  // Added explicit wait for success message\n  await page.waitForSelector('[data-testid=\"success-message\"]', { state: 'visible' });\n  ...\n})",
  "changes": [
    {
      "line": 15,
      "before": "await page.click('.submit-btn')",
      "after": "await page.click('[data-testid=\"submit-button\"]')",
      "reason": "Replaced fragile CSS class selector with stable data-testid"
    },
    {
      "line": 16,
      "before": "await page.waitForTimeout(1000)",
      "after": "await page.waitForSelector('[data-testid=\"success-message\"]', { state: 'visible' })",
      "reason": "Replaced hardcoded timeout with explicit wait for success element"
    }
  ],
  "confidence": "high",
  "additionalNotes": "Consider adding retry logic if API calls are involved",
  "testabilityImprovements": [
    "Add data-testid to all interactive elements",
    "Implement loading states for async operations",
    "Add error boundary for better error messages"
  ],
  "savedTo": "heal-tests-checkout-spec-ts-1704710500000.json",
  "usage": {
    "promptTokens": 1500,
    "completionTokens": 1200,
    "totalTokens": 2700
  }
}
```

### Detect Flaky Tests
```bash
POST /detect-flaky
Content-Type: application/json

{
  "testResults": [
    {
      "testName": "User can login",
      "testFile": "tests/auth.spec.ts",
      "status": "passed",
      "duration": 1234,
      "timestamp": "2025-01-08T10:00:00Z"
    },
    {
      "testName": "User can login",
      "testFile": "tests/auth.spec.ts",
      "status": "failed",
      "error": "TimeoutError: waiting for selector",
      "duration": 30000,
      "timestamp": "2025-01-08T11:00:00Z"
    }
  ],
  "model": "claude-sonnet-4-20250514"
}
```

**Parameters**:
- `testResults` (array, required): Array of test result objects from multiple runs
- `model` (string, optional): AI model to use

**Response**:
```json
{
  "success": true,
  "flakyTests": [
    {
      "testName": "User can login",
      "testFile": "tests/auth.spec.ts",
      "flakinessScore": 7,
      "passRate": 0.65,
      "totalRuns": 20,
      "passes": 13,
      "failures": 7,
      "failurePatterns": [
        {
          "pattern": "TimeoutError: waiting for selector",
          "occurrences": 4
        },
        {
          "pattern": "Element not visible",
          "occurrences": 3
        }
      ],
      "rootCauses": [
        "Race condition with network requests",
        "Element visibility timing varies",
        "Animation delays not accounted for"
      ],
      "suggestedFixes": [
        "Add explicit wait for network idle before interacting",
        "Use waitForSelector with visible state",
        "Wait for animations to complete before assertions"
      ],
      "confidence": "high"
    }
  ],
  "summary": {
    "totalTestsAnalyzed": 50,
    "flakyTestsFound": 3,
    "criticalFlaky": 1,
    "recommendations": [
      "Implement retry logic for network-dependent tests",
      "Add explicit waits instead of timeouts",
      "Use Playwright's auto-waiting features",
      "Consider using test.setTimeout() for slow operations"
    ]
  },
  "savedTo": "flaky-detection-1704710600000.json",
  "usage": {
    "promptTokens": 3000,
    "completionTokens": 1500,
    "totalTokens": 4500
  }
}
```

## Usage Examples

### 1. Analyze a Single Test Failure

```bash
curl -X POST http://localhost:8402/analyze-failures \
  -H "Content-Type: application/json" \
  -d '{
    "testFile": "tests/checkout.spec.ts",
    "errorLog": "Error: locator.click: Timeout 30000ms exceeded.\n=========================== logs ===========================\nwaiting for selector \".submit-btn\"\n============================================================"
  }'
```

### 2. Heal a Broken Test

```bash
curl -X POST http://localhost:8402/heal \
  -H "Content-Type: application/json" \
  -d '{
    "testFile": "tests/checkout.spec.ts",
    "testCode": "test('\''Complete checkout'\'', async ({ page }) => {\n  await page.goto('\''/checkout'\'');\n  await page.click('\''.submit-btn'\'');\n  await expect(page.locator('\''.success-msg'\'')).toBeVisible();\n});",
    "errorLog": "Error: locator.click: Timeout 30000ms exceeded."
  }'
```

### 3. Detect Flaky Tests from CI Runs

```bash
# Collect test results from multiple CI runs, then:
curl -X POST http://localhost:8402/detect-flaky \
  -H "Content-Type: application/json" \
  -d @test-results.json
```

### 4. Workflow: Failure Analysis → Healing

```bash
# Step 1: Analyze the failure
ANALYSIS=$(curl -X POST http://localhost:8402/analyze-failures \
  -H "Content-Type: application/json" \
  -d '{"testFile": "tests/checkout.spec.ts", "errorLog": "..."}')

# Step 2: Heal the test
curl -X POST http://localhost:8402/heal \
  -H "Content-Type: application/json" \
  -d "{\"testFile\": \"tests/checkout.spec.ts\", \"testCode\": \"...\", \"errorLog\": \"...\"}"
```

## Integration with Other MCPs

### Chained Workflow via Orchestrator

The Playwright Healer integrates with the orchestrator for automated healing:

```bash
# Orchestrator endpoint that chains analyzer → healer
curl -X POST http://localhost:3000/api/playwright/heal-tests \
  -H "Content-Type: application/json" \
  -d '{
    "testFile": "tests/checkout.spec.ts",
    "testCode": "...",
    "errorLog": "...",
    "screenshot": "..."
  }'
```

This workflow:
1. Calls `analyze-failures` to diagnose the issue
2. Calls `heal` to generate fixes
3. Returns both analysis and fixed code

## Configuration

### Environment Variables

- `PORT`: Service port (default: 8402)
- `NODE_ENV`: Environment (`production` | `development`)
- `ANTHROPIC_API_KEY`: Anthropic API key (required)
- `CLAUDE_MODEL`: Default Claude model (default: `claude-3-haiku-20240307`)

### Docker Volumes

- `/app/data`: Persistent storage for healing history
- `/app/config`: Read-only access to apps.json

## Data Persistence

All healing history and flaky detection reports are saved to `/app/data/`:

```
/app/data/
├── failure-analysis-1704710400000.json
├── heal-tests-checkout-spec-ts-1704710500000.json
├── flaky-detection-1704710600000.json
└── ...
```

## Failure Types

The healer can diagnose and fix various failure types:

### 1. Selector Not Found
**Cause**: Element selector is invalid or changed
**Fix**: Update selector using data-testid, role, or text

### 2. Timeout
**Cause**: Element takes too long to appear
**Fix**: Increase timeout, add explicit waits, check network delays

### 3. Assertion Failed
**Cause**: Expected value doesn't match actual
**Fix**: Update expectation or fix application logic

### 4. Element Not Visible
**Cause**: Element exists but isn't visible
**Fix**: Wait for visibility state, check CSS display/opacity

### 5. Network Error
**Cause**: API call failed or timed out
**Fix**: Add retry logic, mock API responses, check network conditions

### 6. Race Condition
**Cause**: Test interacts with element before it's ready
**Fix**: Add explicit waits, use Playwright's auto-waiting

### 7. Flaky Test
**Cause**: Test passes/fails intermittently
**Fix**: Identify timing issues, add stability improvements

## Healing Confidence Levels

- **High (80-100%)**: Clear diagnosis, straightforward fix
- **Medium (50-79%)**: Probable cause, fix may need adjustment
- **Low (0-49%)**: Multiple possible causes, manual review recommended

## Best Practices

### 1. Provide Complete Error Logs
Include full Playwright error output with stack traces:
```
Error: locator.click: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for selector ".submit-btn"
  selector resolved to hidden <button class="submit-btn">Submit</button>
============================================================
```

### 2. Include Screenshots for Visual Issues
When available, include base64-encoded screenshots:
```json
{
  "screenshot": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 3. Batch Flaky Detection
Collect at least 10-20 test runs for accurate flaky detection:
```json
{
  "testResults": [
    /* 20+ test run results */
  ]
}
```

### 4. Review AI Fixes Before Applying
Always review generated fixes for:
- Correctness
- Code style consistency
- Test coverage preservation

### 5. Track Healing History
Use saved healing history to:
- Identify recurring issues
- Measure healing effectiveness
- Learn common failure patterns

## Common Healing Patterns

### Pattern 1: Fragile CSS Selectors
**Before**:
```typescript
await page.click('.btn-primary');
```

**After**:
```typescript
await page.click('[data-testid="submit-button"]');
```

### Pattern 2: Hardcoded Timeouts
**Before**:
```typescript
await page.waitForTimeout(2000);
```

**After**:
```typescript
await page.waitForSelector('[data-testid="success-message"]', { state: 'visible' });
```

### Pattern 3: Missing Error Handling
**Before**:
```typescript
await page.click('#login-btn');
```

**After**:
```typescript
try {
  await page.click('#login-btn');
} catch (error) {
  // Take screenshot for debugging
  await page.screenshot({ path: 'login-failure.png' });
  throw error;
}
```

### Pattern 4: Race Conditions
**Before**:
```typescript
await page.goto('/dashboard');
await page.click('#user-menu');
```

**After**:
```typescript
await page.goto('/dashboard');
await page.waitForLoadState('networkidle');
await page.click('#user-menu');
```

## Error Handling

### Missing Required Fields
```json
{
  "error": "testFile and errorLog are required"
}
```

### Empty Test Results
```json
{
  "error": "testResults array cannot be empty"
}
```

### AI Parsing Error
```json
{
  "error": "Failed to parse heal result",
  "details": "Unexpected token at position 10",
  "rawResponse": "..."
}
```

## Development

### Local Development

```bash
cd mcps/playwright/playwright-healer
npm install
PORT=8402 npm start
```

### Docker Build

```bash
# From repo root
docker compose build playwright-healer
docker compose up -d playwright-healer
docker compose logs -f playwright-healer
```

### Testing

```bash
# Health check
curl http://localhost:8402/health

# Analyze failure
curl -X POST http://localhost:8402/analyze-failures \
  -H "Content-Type: application/json" \
  -d '{"testFile": "test.spec.ts", "errorLog": "Error: timeout"}'
```

## Troubleshooting

### Service won't start
- Check `ANTHROPIC_API_KEY` is set
- Verify port 8402 is not in use
- Check Docker logs for errors

### Healing produces incorrect fixes
- Provide more detailed error logs
- Include test context and related code
- Try different AI models (Sonnet for better quality)

### Flaky detection misses tests
- Ensure at least 10+ test runs in dataset
- Include complete test result metadata
- Check that test names are consistent

## Metrics and Monitoring

Track healing effectiveness:
- **Healing Success Rate**: % of healed tests that pass
- **Confidence Distribution**: High/Medium/Low fix confidence
- **Failure Type Distribution**: Most common failure types
- **Time to Heal**: Average time from failure to fix

## Related Documentation

- [Playwright Analyzer MCP](../playwright-analyzer/README.md) - Discover critical UI paths
- [Playwright Generator MCP](../playwright-generator/README.md) - Generate tests from paths
- [Orchestrator Playwright Routes](../../../docs/api/playwright-workflows.md) - Chained workflows

## License

Part of QE MCP Stack - Internal Use
