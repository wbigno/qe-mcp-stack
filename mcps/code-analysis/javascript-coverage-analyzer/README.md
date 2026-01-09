# JavaScript Coverage Analyzer MCP

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Port](https://img.shields.io/badge/port-8205-blue.svg)]()
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)]()

## Overview

The **JavaScript Coverage Analyzer MCP** analyzes test coverage for JavaScript and TypeScript codebases using Jest, Vitest, or any Istanbul-compatible coverage tool. It identifies untested functions, components with missing tests, and provides detailed coverage metrics.

## Features

### Supported Test Frameworks
- ✅ Jest
- ✅ Vitest
- ✅ Cypress (with Istanbul plugin)
- ✅ Any tool generating Istanbul coverage reports

### Coverage Analysis
- **File Coverage**: Line, statement, function, and branch coverage per file
- **Test Detection**: Automatically finds and parses test files
- **Test Matching**: Intelligently matches tests to source files
- **Negative Test Detection**: Identifies error/edge case tests
- **Gap Identification**: Finds untested functions and components
- **Test File Filtering**: Excludes test files from coverage gaps

## API Endpoints

### Health Check
```bash
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "javascript-coverage-analyzer-mcp",
  "timestamp": "2026-01-09T15:00:00.000Z"
}
```

### Analyze Coverage
```bash
POST /analyze
Content-Type: application/json

{
  "app": "Core",
  "codeStructure": {
    "functions": [...],
    "components": [...]
  },
  "detailed": true
}
```

**Parameters**:
- `app` (required): Application name from `apps.json`
- `codeStructure` (optional): Output from JavaScript Code Analyzer for enhanced matching
- `detailed` (optional): Include detailed test file information

**Response**:
```json
{
  "success": true,
  "coverage": {
    "app": "Core",
    "timestamp": "2026-01-09T15:00:00.000Z",
    "dataSource": "istanbul",
    "coverageFilesFound": 1,
    "message": "Coverage data from 1 file(s)",
    "overallPercentage": 78,
    "functions": [
      {
        "name": "validateEmail",
        "file": "/mnt/apps/Core/src/utils/validation.js",
        "type": "function",
        "line": 15,
        "complexity": 3,
        "coverage": 100,
        "hasTests": true,
        "hasNegativeTests": true,
        "testCount": 5,
        "testFiles": ["src/utils/__tests__/validation.test.js"]
      },
      {
        "name": "formatCurrency",
        "file": "/mnt/apps/Core/src/utils/currency.js",
        "type": "function",
        "line": 8,
        "complexity": 2,
        "coverage": 0,
        "hasTests": false,
        "hasNegativeTests": false,
        "testCount": 0
      }
    ],
    "summary": {
      "totalFunctions": 210,
      "functionsWithCoverageData": 180,
      "functionsWithTests": 165,
      "untestedCount": 45,
      "partialCount": 15,
      "missingNegativeTests": 30,
      "coveragePercentage": 78
    },
    "gaps": {
      "untestedFunctions": [
        {
          "name": "formatCurrency",
          "file": "/mnt/apps/Core/src/utils/currency.js",
          "complexity": 2,
          "coverage": 0
        }
      ],
      "partialCoverage": [
        {
          "name": "calculateTax",
          "file": "/mnt/apps/Core/src/utils/tax.js",
          "complexity": 8,
          "coverage": 65
        }
      ],
      "missingNegativeTests": [
        {
          "name": "parseUserInput",
          "file": "/mnt/apps/Core/src/utils/input.js",
          "hasTests": true,
          "hasNegativeTests": false
        }
      ]
    }
  }
}
```

## Technology Stack

- **istanbul-lib-coverage**: Parse Istanbul/NYC coverage reports
- **glob**: Find coverage and test files
- **Express**: HTTP server framework

## Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=8205
CONFIG_PATH=/app/config/apps.json
```

### apps.json Structure
```json
{
  "applications": [
    {
      "name": "Core",
      "path": "/mnt/apps/Core"
    }
  ]
}
```

## Docker Setup

### Build
```bash
docker compose build javascript-coverage-analyzer
```

### Run
```bash
docker compose up -d javascript-coverage-analyzer
```

### Health Check
```bash
curl http://localhost:8205/health
```

## Usage Examples

### 1. Generate Coverage (Jest)
```bash
cd /path/to/your/app
npm test -- --coverage
```

This generates `coverage/coverage-final.json` that the analyzer reads.

### 2. Analyze Coverage
```bash
curl -X POST http://localhost:8205/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "Core",
    "detailed": true
  }'
```

### 3. Find Untested Functions
```bash
curl -X POST http://localhost:8205/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core"}' | jq '.coverage.gaps.untestedFunctions'
```

### 4. Identify Missing Negative Tests
```bash
curl -X POST http://localhost:8205/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core"}' | jq '.coverage.gaps.missingNegativeTests'
```

### 5. Get Coverage Summary
```bash
curl -X POST http://localhost:8205/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core"}' | jq '.coverage.summary'
```

## Integration with Code Analyzer

For best results, chain with the JavaScript Code Analyzer:

```bash
# Step 1: Analyze code structure
CODE_ANALYSIS=$(curl -X POST http://localhost:8204/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core"}')

# Step 2: Analyze coverage using code structure
curl -X POST http://localhost:8205/analyze \
  -H "Content-Type: application/json" \
  -d "{
    \"app\": \"Core\",
    \"codeStructure\": $CODE_ANALYSIS
  }"
```

Or use the orchestrator endpoint:
```bash
curl http://localhost:3000/api/dashboard/javascript-coverage?app=Core
```

## Coverage File Locations

The analyzer automatically searches for coverage files in:

1. `coverage/coverage-final.json` (Jest/Vitest default)
2. `coverage/coverage.json`
3. `.nyc_output/coverage.json` (NYC/Mocha)

## Test File Detection

The analyzer recognizes these test file patterns:

| Pattern | Examples |
|---------|----------|
| `*.test.js` | `validation.test.js` |
| `*.test.jsx` | `Button.test.jsx` |
| `*.test.ts` | `utils.test.ts` |
| `*.test.tsx` | `App.test.tsx` |
| `*.spec.js` | `service.spec.js` |
| `__tests__/` | `__tests__/integration.js` |
| `__mocks__/` | `__mocks__/api.js` |

## Negative Test Detection

Tests are classified as "negative" if their name includes:
- `error`, `fail`, `invalid`, `throw`, `reject`
- `null`, `undefined`, `empty`
- `negative`, `edge case`

Examples:
- ✅ `"should throw error when input is invalid"`
- ✅ `"handles null values correctly"`
- ✅ `"rejects empty strings"`

## Test Matching Logic

The analyzer matches tests to source files using:

1. **File Name Matching**: `Component.jsx` → `Component.test.jsx`
2. **Directory Matching**: Tests in same directory as source
3. **Test Name Matching**: Test names mentioning the function/component name

## Data Source Types

| Data Source | Description | Reliability |
|-------------|-------------|-------------|
| `istanbul` | Coverage from `coverage-final.json` | High - Actual execution data |
| `test-detection-only` | No coverage files, test matching only | Medium - Inferred from test names |
| `none` | No coverage or tests found | N/A |

## Troubleshooting

### No Coverage Files Found
```bash
# Verify coverage was generated
ls -la /path/to/app/coverage/

# Run tests with coverage
npm test -- --coverage

# Check if files are mounted correctly
docker exec qe-javascript-coverage-analyzer ls -la /mnt/apps/Core/coverage/
```

### Test Files Not Detected
```bash
# Verify test files exist
find /path/to/app -name "*.test.js"

# Check exclude patterns in apps.json
docker exec qe-javascript-coverage-analyzer cat /app/config/apps.json
```

### Incorrect Coverage Percentages
- Ensure `coverage-final.json` is up-to-date
- Rerun tests with `--coverage` flag
- Verify Istanbul is configured correctly in your test framework

## Performance

- Parses coverage for ~150 files in <1 second
- Matches ~500 test cases in ~2 seconds
- Memory usage: ~150MB for typical applications

## Integration Examples

### With Orchestrator (Recommended)
```bash
# Get combined .NET + JavaScript overview
curl http://localhost:3000/api/dashboard/overview?app=Core
```

### With CI/CD
```yaml
# .github/workflows/test.yml
- name: Generate Coverage
  run: npm test -- --coverage

- name: Analyze Coverage
  run: |
    curl -X POST http://localhost:8205/analyze \
      -H "Content-Type: application/json" \
      -d '{"app": "MyApp"}' \
      | jq '.coverage.summary.coveragePercentage'
```

### With Test Gap Detection
```bash
# Find all functions without tests
curl -X POST http://localhost:8205/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core"}' \
  | jq '.coverage.gaps.untestedFunctions[] | "\(.file):\(.line) - \(.name)"'
```

## Related Services

- **JavaScript Code Analyzer** (Port 8204): Provides code structure for enhanced matching
- **.NET Coverage Analyzer** (Port 8201): Analyzes xUnit/NUnit test coverage
- **Orchestrator** (Port 3000): Aggregates coverage from all analyzers

## Version History

### 1.0.0 (2026-01-09)
- Initial release
- Istanbul coverage parsing
- Jest/Vitest/Cypress support
- Test file detection and matching
- Negative test identification
- Gap analysis

## References

- [Istanbul Documentation](https://istanbul.js.org/)
- [Jest Coverage](https://jestjs.io/docs/cli#--coverageboolean)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
