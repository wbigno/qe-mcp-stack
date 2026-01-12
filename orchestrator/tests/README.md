# Orchestrator Test Suite

## Overview

Comprehensive unit and integration test suite for the QE MCP Stack Orchestrator using Jest with ES6 module support.

## Test Coverage Status

| Component         | Statements | Branches | Functions | Lines  | Status              |
| ----------------- | ---------- | -------- | --------- | ------ | ------------------- |
| **Overall**       | TBD        | TBD      | TBD       | TBD    | ✅ Phase 3 complete |
| mcpManager.js     | 86.95%     | 75%      | 96.55%    | 86.86% | ✅ Exceeds 80%      |
| aiHelper.js       | 100%       | 100%     | 100%      | 100%   | ✅ Perfect coverage |
| logger.js         | 87.5%      | 62.5%    | 100%      | 87.5%  | ✅ Good coverage    |
| **Routes**        |            |          |           |        | **9/9 complete**    |
| tests.js          | 38.88%     | 19.13%   | 17.24%    | 39.66% | ✅ 24 tests         |
| mcp.js            | TBD        | TBD      | TBD       | TBD    | ✅ 19 tests         |
| swagger.js        | TBD        | TBD      | TBD       | TBD    | ✅ 24 tests         |
| docs.js           | TBD        | TBD      | TBD       | TBD    | ✅ 20 tests         |
| infrastructure.js | TBD        | TBD      | TBD       | TBD    | ✅ 27 tests         |
| analysis.js       | TBD        | TBD      | TBD       | TBD    | ✅ 41 tests         |
| playwright.js     | TBD        | TBD      | TBD       | TBD    | ✅ 35 tests         |
| dashboard.js      | TBD        | TBD      | TBD       | TBD    | ✅ 34 tests         |
| ado.js            | TBD        | TBD      | TBD       | TBD    | ✅ 30 tests         |

**Targets:** 60% global, 80% for services/utils, 35% for routes
**Current:** Phase 3 complete - All 9 route files have comprehensive API tests (196 route tests)

## Test Statistics

- **Total Test Suites:** 11
- **Total Tests:** 311
- **Passing Tests:** 311 (100%)
- **Failing Tests:** 0
- **Test Execution Time:** ~3-4 seconds

### Test Breakdown

#### Unit Tests (57 tests)

**aiHelper.js (17 tests)**

- ✅ Default model configuration
- ✅ Custom model parameter handling
- ✅ Environment variable overrides
- ✅ Error handling (missing API key, invalid models, timeouts)
- ✅ Edge cases (empty prompts, malformed responses, concurrent calls)

**mcpManager.js (40 tests)**

- ✅ MCP initialization and configuration
- ✅ Docker MCP communication (HTTP via axios)
- ✅ STDIO MCP spawning and communication
- ✅ Health checks and status aggregation
- ✅ Swagger documentation fetching
- ✅ Error handling across all operations
- ✅ Shutdown and cleanup procedures

#### Integration Tests (24 tests)

**test-generation-flow.test.js (24 tests)**

- ✅ Complete test generation workflow (file → AI → test code)
- ✅ File path resolution (relative and absolute Docker paths)
- ✅ Validation error handling (missing required fields)
- ✅ File system error handling (ENOENT, EACCES, I/O errors)
- ✅ Claude API error handling (404, rate limits, timeouts)
- ✅ Multiple file type support (C#, JavaScript, TypeScript)
- ✅ Framework detection (xUnit, MSTest, Jest)
- ✅ Edge cases (large files, special characters, Unicode, concurrent requests)

#### API Route Tests (196 tests - Phase 3 COMPLETE ✅)

**mcp.test.js (19 tests)**

- ✅ GET /api/mcp/status - Status monitoring for all 15 MCPs
- ✅ GET /api/mcp/health/:mcpName - Individual MCP health checks
- ✅ Error handling (unknown MCP, unhealthy MCP, timeouts)

**swagger.test.js (24 tests)**

- ✅ GET /api/swagger/docs - List all MCP documentation
- ✅ GET /api/swagger/aggregated.json - Combined OpenAPI spec
- ✅ GET /api/swagger/:mcpName - Individual MCP Swagger docs
- ✅ Route precedence testing

**docs.test.js (20 tests)**

- ✅ GET /api/docs/:category/:mcpName - Markdown documentation serving
- ✅ File system operations and error handling
- ✅ Security (path traversal prevention)
- ✅ Unicode and special character handling

**infrastructure.test.js (27 tests)**

- ✅ GET /api/infrastructure/status - Infrastructure data retrieval
- ✅ GET /api/infrastructure/applications/:appKey - Application details
- ✅ POST /api/infrastructure/scan - Repository rescanning
- ✅ GET /api/infrastructure/changes - File watcher integration

**analysis.test.js (41 tests)**

- ✅ POST /api/analysis/coverage - Code coverage analysis
- ✅ POST /api/analysis/code-scan - Code structure scanning
- ✅ POST /api/analysis/test-gaps - Test coverage gap identification
- ✅ POST /api/analysis/risk/analyze-story - Story risk analysis
- ✅ POST /api/analysis/integrations/map - Integration mapping
- ✅ POST /api/analysis/blast-radius/analyze - Change impact analysis

**playwright.test.js (35 tests)**

- ✅ POST /api/playwright/full-automation - Complete test generation workflow
- ✅ POST /api/playwright/heal-tests - Test healing workflow
- ✅ POST /api/playwright/detect-flaky - Flaky test detection

**dashboard.test.js (34 tests)**

- ✅ GET /api/dashboard/applications - Get applications list
- ✅ GET /api/dashboard/code-analysis - .NET code analysis data
- ✅ GET /api/dashboard/coverage - .NET coverage data
- ✅ GET /api/dashboard/javascript-analysis - JavaScript analysis data
- ✅ GET /api/dashboard/javascript-coverage - JavaScript coverage data
- ✅ GET /api/dashboard/overview - Combined .NET and JS overview
- ✅ GET /api/dashboard/aod-summary - ADO summary data
- ✅ GET /api/dashboard/config/apps - Applications configuration

**ado.test.js (30 tests)**

- ✅ POST /api/ado/pull-stories - Pull stories from Azure DevOps
- ✅ POST /api/ado/analyze-requirements - AI-powered requirements analysis
- ✅ POST /api/ado/generate-test-cases - AI-generated manual test cases
- ✅ GET /api/ado/defects - List all defects
- ✅ GET /api/ado/defects/by-story/:storyId - Defects for specific story
- ✅ GET /api/ado/defects/metrics - Defect metrics by environment
- ✅ GET /api/ado/test-plans - List test plans
- ✅ GET /api/ado/test-plans/:planId/suites - Test suites for plan
- ✅ GET /api/ado/test-cases/by-story/:storyId - Test cases for story
- ✅ GET /api/ado/test-runs - List test runs
- ✅ GET /api/ado/test-runs/:runId/results - Results for specific run
- ✅ GET /api/ado/test-execution/metrics - Test execution metrics
- ✅ GET /api/ado/test-execution/by-story - Execution data by story
- ✅ GET /api/ado/quality-metrics - Quality metrics
- ✅ GET /api/ado/iterations/projects - List projects
- ✅ GET /api/ado/iterations/teams - List teams
- ✅ GET /api/ado/iterations/sprints - List sprints
- ✅ POST /api/ado/update-story/preview - Preview story updates
- ✅ POST /api/ado/update-story - Update story
- ✅ POST /api/ado/add-comment - Add comment to story
- ✅ POST /api/ado/batch-update/preview - Preview batch updates
- ✅ POST /api/ado/batch-update - Execute batch updates

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### Watch Mode (for development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

This generates:

- Console coverage summary
- HTML coverage report in `coverage/` directory
- LCOV format for CI/CD integration

### HTML Test Reports

**Interactive HTML test reports** are automatically generated on every test run, providing a beautiful visual interface for viewing test results.

#### Generate and View Report

```bash
# Run tests and automatically open the HTML report in your browser
npm run test:report
```

This command:

1. Runs the complete test suite
2. Generates an interactive HTML report
3. Automatically opens the report in your default browser

#### Manual Viewing

If you just want to view an existing report without re-running tests:

```bash
# macOS
open test-reports/orchestrator-test-report.html

# Linux
xdg-open test-reports/orchestrator-test-report.html

# Windows
start test-reports\orchestrator-test-report.html
```

#### Report Location

**Path:** `orchestrator/test-reports/orchestrator-test-report.html`

**Note:** The HTML report is automatically generated on every `npm test` run. The `test-reports/` directory is excluded from git via `.gitignore`.

#### Report Features

The HTML report provides:

- ✅ **Visual Pass/Fail Indicators** - Color-coded results (green for pass, red for fail)
- ✅ **Summary Statistics** - Total tests, passed, failed, pending at a glance
- ✅ **Expandable Test Suites** - Drill down into specific test files and cases
- ✅ **Detailed Error Messages** - Full error text with syntax highlighting
- ✅ **Stack Traces** - Complete stack traces for failed tests
- ✅ **Console Output** - Captured console logs from tests
- ✅ **Test Duration** - Execution time for each test and suite
- ✅ **Search & Filter** - Find specific tests or filter by status
- ✅ **Performance Metrics** - Identify slow tests quickly

#### Example Report Structure

```
Orchestrator Test Report
├── Summary: 354 tests (354 passed, 0 failed) - 3.4s
│
├── tests/unit/routes/
│   ├── ado.test.js ✅ (67 tests, 890ms)
│   ├── analysis.test.js ✅ (16 tests, 120ms)
│   ├── coverage.test.js ✅ (14 tests, 95ms)
│   ├── dashboard.test.js ✅ (30 tests, 456ms)
│   ├── docs.test.js ✅ (16 tests, 178ms)
│   ├── infrastructure.test.js ✅ (39 tests, 2732ms)
│   ├── mcp.test.js ✅ (34 tests, 234ms)
│   ├── playwright.test.js ✅ (56 tests, 678ms)
│   └── tests.test.js ✅ (47 tests, 890ms)
│
├── tests/unit/services/
│   └── mcpManager.test.js ✅ (17 tests, 345ms)
│
└── tests/unit/utils/
    └── aiHelper.test.js ✅ (18 tests, 567ms)
```

#### Use Cases

**For Development:**

- Quick visual feedback on test status after code changes
- Easy identification of which tests are failing
- Detailed error information without scrolling through console output

**For Code Reviews:**

- Share HTML report with team members
- Demonstrate test coverage and results
- Evidence of thorough testing

**For CI/CD:**

- Archive reports as build artifacts
- Track test results over time
- Share with non-technical stakeholders

**For Debugging:**

- Full stack traces for failed tests
- Console output captured during test execution
- Test duration metrics to identify slow tests

#### Troubleshooting

**Report not generated:**

- Ensure jest-html-reporters is installed: `npm install`
- Check that `jest.config.js` has the reporters configuration

**Report won't open automatically:**

- The `open` command is macOS-specific
- On Linux, manually run: `xdg-open test-reports/orchestrator-test-report.html`
- On Windows, manually run: `start test-reports\orchestrator-test-report.html`

**Report shows blank page:**

- Ensure the `jest-html-reporters-attach` directory exists alongside the HTML file
- Re-run tests to regenerate the report

**Old results showing:**

- Delete the `test-reports/` directory and run tests again
- The report is regenerated on each test run

## Test Structure

```
tests/
├── unit/                          # Unit tests (mock all dependencies)
│   ├── routes/                    # API route tests
│   ├── services/                  # Service layer tests
│   │   └── mcpManager.test.js    # 40 tests for MCP management
│   └── utils/                     # Utility function tests
│       └── aiHelper.test.js      # 17 tests for Claude AI integration
├── integration/                   # Integration tests (test complete flows)
│   └── test-generation-flow.test.js  # 24 tests for test generation workflow
├── fixtures/                      # Test data and mock responses
│   └── test-data.js              # Reusable fixtures (sample code, responses)
└── helpers/                       # Test utilities
    ├── setup.js                  # Global test configuration
    └── mocks.js                  # Mock factories (MCP manager, requests, responses)

```

## Key Testing Patterns

### ES6 Module Mocking

This project uses ES6 modules (`"type": "module"` in package.json), which requires special mocking patterns:

```javascript
import { jest } from "@jest/globals";

describe("MyModule", () => {
  let MyModule, mockDependency;

  beforeEach(async () => {
    jest.resetModules();

    // Mock dependencies BEFORE importing
    await jest.unstable_mockModule("dependency", () => ({
      default: jest.fn(),
    }));

    // Import AFTER mocking
    const module = await import("../src/myModule.js");
    MyModule = module.MyModule;
  });
});
```

### Mock Factories

Reusable mock factories are available in `tests/helpers/mocks.js`:

```javascript
import {
  createMockMcpManager,
  createMockRequest,
  createMockResponse,
} from "./helpers/mocks.js";

// In tests
const mcpManager = createMockMcpManager();
const req = createMockRequest({ body: { test: "data" } });
const res = createMockResponse();
```

### Async Process Mocking

For testing child processes (STDIO MCPs):

```javascript
const mockChild = {
  stdout: {
    on: jest.fn((event, callback) => {
      if (event === "data") {
        setImmediate(() => callback(Buffer.from('{"result": "success"}')));
      }
    }),
  },
  on: jest.fn((event, callback) => {
    if (event === "close") {
      setImmediate(() => callback(0));
    }
  }),
  stdin: { write: jest.fn(), end: jest.fn() },
};
```

### Integration Test Patterns

Integration tests verify end-to-end workflows by testing HTTP endpoints with minimal mocking:

```javascript
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

describe('Test Generation Flow Integration', () => {
  let app;
  let mockReadFile;
  let mockCallClaude;

  beforeEach(async () => {
    jest.resetModules();

    // Mock external dependencies only (file system, AI API)
    await jest.unstable_mockModule('fs/promises', () => ({
      readFile: jest.fn()
    }));

    await jest.unstable_mockModule('../../src/utils/aiHelper.js', () => ({
      callClaude: jest.fn()
    }));

    // Import mocked modules
    const fsPromises = await import('fs/promises');
    mockReadFile = fsPromises.readFile;

    const aiHelper = await import('../../src/utils/aiHelper.js');
    mockCallClaude = aiHelper.callClaude;

    // Import routes AFTER mocking
    const testsRouterModule = await import('../../src/routes/tests.js');

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/tests', testsRouterModule.default);

    // Setup default mock responses
    mockReadFile.mockImplementation((filePath) => {
      if (filePath.includes('apps.json')) {
        return Promise.resolve(JSON.stringify({ applications: [...] }));
      }
      return Promise.resolve('source code content');
    });

    mockCallClaude.mockResolvedValue('generated test code');
  });

  it('should generate tests for C# service file', async () => {
    const response = await request(app)
      .post('/api/tests/generate-for-file')
      .send({
        app: 'App1',
        file: '/Services/UserService.cs',
        className: 'UserService'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.result.testCode).toBeDefined();
  });
});
```

**Key Integration Test Principles:**

- Test complete HTTP request/response cycles
- Mock only external dependencies (file system, APIs, databases)
- Test actual route logic and middleware
- Verify error handling and validation
- Use supertest for HTTP assertions

## Critical Test Cases

### MCP Communication

**Docker MCPs (HTTP):**

- ✅ Successful API calls with POST/GET/PUT methods
- ✅ Error handling for unknown MCPs
- ✅ Health check validation before calls
- ✅ Network error propagation

**STDIO MCPs (Child Processes):**

- ✅ Process spawning with correct arguments
- ✅ JSON output parsing
- ✅ Non-JSON output handling
- ✅ Error code handling

### AI Integration

**Claude API:**

- ✅ Default model usage (claude-sonnet-4-20250514)
- ✅ Custom model parameter override
- ✅ Environment variable configuration
- ✅ API key validation
- ✅ Error handling (404, timeouts, rate limits)
- ✅ Concurrent request handling

### Health Monitoring

- ✅ Initial MCP health checks during startup
- ✅ Periodic health check scheduling
- ✅ Status aggregation across 15 MCPs
- ✅ Dashboard availability monitoring

## Configuration

### Jest Config (`jest.config.js`)

```javascript
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {}, // No transform for ES6 modules
  setupFilesAfterEnv: ["<rootDir>/tests/helpers/setup.js"],
  coverageThreshold: {
    global: { statements: 60, branches: 50, functions: 60, lines: 60 },
    "./src/services/": {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    "./src/utils/": { statements: 80, branches: 75, functions: 80, lines: 80 },
    "./src/routes/": { statements: 35, branches: 15, functions: 15, lines: 35 },
  },
};
```

### Test Environment Variables

Set automatically in `tests/helpers/setup.js`:

- `NODE_ENV=test`
- `ANTHROPIC_API_KEY=test-api-key-12345`
- `LOG_LEVEL=error` (suppress logs during tests)

## Troubleshooting

### ES6 Module Import Errors

**Problem:** `Cannot use import statement outside a module`
**Solution:** Ensure `"type": "module"` is set in package.json and use `NODE_OPTIONS='--experimental-vm-modules'`

### Mock Not Working

**Problem:** `mockImplementation is not a function`
**Solution:** Use `jest.unstable_mockModule()` and import AFTER mocking (see ES6 Module Mocking pattern above)

### Tests Timing Out

**Problem:** Async tests exceed 30s timeout
**Solution:** Ensure all async callbacks are properly triggered using `setImmediate()` or adjust test timeout

### Worker Process Warnings

**Problem:** "Worker process has failed to exit gracefully"
**Solution:** Clean up intervals and timers in tests:

```javascript
afterEach(async () => {
  if (mcpManager.healthCheckInterval) {
    await mcpManager.shutdown();
  }
});
```

## CI/CD Integration

Tests are configured to run in GitHub Actions:

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Contributing

When adding new tests:

1. **Follow the ES6 mocking pattern** - Use `jest.unstable_mockModule()`
2. **Use mock factories** - Leverage existing helpers in `tests/helpers/mocks.js`
3. **Maintain coverage** - Ensure new code has 80%+ coverage
4. **Test error paths** - Don't just test happy paths
5. **Clean up resources** - Use `afterEach()` to cleanup intervals/processes

## Resources

- [Jest ES Modules](https://jestjs.io/docs/ecmascript-modules)
- [jest.unstable_mockModule API](https://jestjs.io/docs/jest-object#jestunstable_mockmodulemodulename-factory-options)
- [Testing ES6 Modules Guide](/docs/TESTING_ES6_MOCKING_FIX.md)
