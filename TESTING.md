# Testing Guide

This document provides comprehensive guidance on testing within the QE MCP Stack project.

## Table of Contents

- [Overview](#overview)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Testing Patterns](#testing-patterns)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [Coverage Requirements](#coverage-requirements)
- [Troubleshooting](#troubleshooting)

---

## Overview

The QE MCP Stack has **889 comprehensive tests** covering all components:

- **Orchestrator:** 354 tests (82% coverage)
- **MCPs:** 406 tests across 16 MCPs
- **Shared Utilities:** 129 tests (aiClient, dotnetAnalyzer, modelMapper)

**Test Framework:** Jest 30.2.0 with ES6 module support

**Key Metrics:**

- ✅ 100% pass rate (889/889 tests passing)
- ✅ Fast execution (~4 seconds for all tests)
- ✅ Comprehensive coverage across all critical paths

---

## Test Infrastructure

### Directory Structure

```
qe-mcp-stack/
├── orchestrator/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── routes/          # API endpoint tests
│   │   │   ├── services/        # Business logic tests
│   │   │   └── utils/           # Utility function tests
│   │   ├── integration/         # Cross-service tests
│   │   ├── fixtures/            # Test data
│   │   └── helpers/             # Test utilities
│   └── jest.config.js
├── mcps/
│   ├── integration/
│   │   └── azure-devops/
│   │       ├── src/
│   │       ├── tests/
│   │       └── jest.config.js
│   ├── shared/
│   │   ├── tests/
│   │   │   ├── aiClient.test.js
│   │   │   ├── dotnetAnalyzer.test.js
│   │   │   └── modelMapper.test.js
│   │   └── jest.config.js
│   └── [other MCPs follow same pattern]
└── [this file: TESTING.md]
```

### Configuration Files

Each testable component has a `jest.config.js`:

```javascript
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  transform: {}, // No transform for ES6
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ["src/**/*.js", "!src/index.js"],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70,
    },
  },
};
```

---

## Running Tests

### Run All Tests

```bash
# From project root - run all tests
npm test

# From orchestrator directory
cd orchestrator && npm test

# From shared utilities
cd mcps/shared && npm test

# From specific MCP
cd mcps/integration/azure-devops && npm test
```

### Run Specific Tests

```bash
# Run tests for a specific file
npm test -- tests/unit/routes/tests.test.js

# Run tests matching a pattern
npm test -- tests/unit/routes/*.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch
```

### Run Tests for Changed Files Only

```bash
# Run tests related to changed files (useful during development)
npm test -- --onlyChanged
```

### Generate HTML Test Reports

**Interactive HTML reports** are automatically generated on every test run. These reports provide a beautiful, visual summary of test results with pass/fail indicators, error details, and execution times.

```bash
# Run tests and automatically open the HTML report in your browser
cd orchestrator && npm run test:report

# Run shared utilities tests and open the report
cd mcps/shared && npm run test:report
```

**Report Locations:**

- **Orchestrator:** `orchestrator/test-reports/orchestrator-test-report.html`
- **Shared Utilities:** `mcps/shared/test-reports/shared-utilities-test-report.html`

**Features:**

- ✅ Clear pass/fail visualization with color coding
- ✅ Detailed error messages and stack traces
- ✅ Test duration metrics
- ✅ Filtering and search capabilities
- ✅ Expandable test suites and test cases
- ✅ Console log output for failed tests

**Manual Access:**

```bash
# View existing report in browser (macOS)
open orchestrator/test-reports/orchestrator-test-report.html

# View existing report in browser (Linux)
xdg-open orchestrator/test-reports/orchestrator-test-report.html

# View existing report in browser (Windows)
start orchestrator/test-reports/orchestrator-test-report.html
```

**Note:** HTML reports are generated automatically and stored in `test-reports/` directories (excluded from git via `.gitignore`).

---

## Testing Patterns

The QE MCP Stack uses several established testing patterns. Choose the appropriate pattern based on your component type.

### Pattern 1: Express API Testing (HTTP Routes)

**Use for:** Orchestrator routes, MCP HTTP endpoints

**Example:** `orchestrator/tests/unit/routes/tests.test.js`

```javascript
import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// Mock dependencies BEFORE importing router
const mockReadFile = jest.fn();
const mockCallClaude = jest.fn();

jest.unstable_mockModule("fs/promises", () => ({
  readFile: mockReadFile,
}));

jest.unstable_mockModule("../../../src/utils/aiHelper.js", () => ({
  callClaude: mockCallClaude,
}));

// Import router AFTER mocking
const { default: testsRouter } = await import("../../../src/routes/tests.js");

describe("Tests Route", () => {
  let app;
  let mockMcpManager;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/tests", testsRouter);

    jest.clearAllMocks();
  });

  it("should generate tests for a class successfully", async () => {
    mockReadFile.mockResolvedValue("public class UserService { }");
    mockCallClaude.mockResolvedValue("Generated test code");

    const response = await request(app)
      .post("/api/tests/generate-for-file")
      .send({
        app: "App1",
        file: "/Services/UserService.cs",
        className: "UserService",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

**Key Points:**

- Use `jest.unstable_mockModule` for ES6 modules
- Mock dependencies BEFORE importing the module under test
- Use `supertest` for HTTP request testing
- Create fresh app instance in `beforeEach`
- Clear mocks between tests

---

### Pattern 2: Service Layer Testing (Business Logic)

**Use for:** Service classes, business logic, data processing

**Example:** `orchestrator/tests/unit/services/mcpManager.test.js`

```javascript
import { jest } from "@jest/globals";
import axios from "axios";
import { MCPManager } from "../../../src/services/mcpManager.js";

jest.mock("axios");

describe("MCPManager", () => {
  let mcpManager;

  beforeEach(() => {
    mcpManager = new MCPManager();
    jest.clearAllMocks();
  });

  it("should successfully call healthy MCP endpoint", async () => {
    mcpManager.dockerMcps.azureDevOps.status = "healthy";
    axios.mockResolvedValue({ data: { result: "success" } });

    const result = await mcpManager.callDockerMcp(
      "azureDevOps",
      "/api/work-items",
      { query: "test" },
    );

    expect(axios).toHaveBeenCalledWith({
      method: "POST",
      url: "http://azure-devops:8100/api/work-items",
      data: { query: "test" },
      timeout: 30000,
    });
    expect(result).toEqual({ result: "success" });
  });
});
```

**Key Points:**

- Create new instance in `beforeEach`
- Mock external dependencies (axios, SDKs)
- Test happy path and error scenarios
- Verify function calls and return values

---

### Pattern 3: Pure Function Testing (Utilities)

**Use for:** Utility functions, data transformations, calculations

**Example:** `mcps/shared/tests/modelMapper.test.js`

```javascript
import { getTierMapping, isValidModel } from "../modelMapper.js";

describe("Model Mapper", () => {
  describe("getTierMapping()", () => {
    it("should return tier-equivalent model for Claude Haiku", () => {
      const mapping = getTierMapping("claude-haiku-4-20250610");
      expect(mapping).toBe("gpt-4o-mini");
    });

    it("should return null for invalid model", () => {
      const mapping = getTierMapping("invalid-model");
      expect(mapping).toBeNull();
    });
  });

  describe("isValidModel()", () => {
    it("should return true for valid Claude model", () => {
      expect(isValidModel("claude-sonnet-4-20250514")).toBe(true);
    });

    it("should return false for invalid model", () => {
      expect(isValidModel("invalid-model")).toBe(false);
    });
  });
});
```

**Key Points:**

- No mocking needed for pure functions
- Test with various inputs
- Test edge cases (null, undefined, empty strings)
- Fast execution (no I/O)

---

### Pattern 4: STDIO MCP Testing (Process Communication)

**Use for:** STDIO-based MCPs that communicate via stdin/stdout

**Example:** `mcps/test/dotnet-unit-test-generator/tests/index.test.js`

```javascript
const { spawn } = require("child_process");
const path = require("path");

describe(".NET Unit Test Generator STDIO MCP", () => {
  const indexPath = path.join(__dirname, "..", "index.js");

  function runStdioMcp(inputData, env = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn("node", [indexPath], {
        env: { ...process.env, ...env },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });

      child.stdin.write(JSON.stringify(inputData));
      child.stdin.end();
    });
  }

  it("should handle basic test generation request structure", async () => {
    const input = {
      data: {
        app: "TestApp",
        className: "UserService",
        sourceCode: "public class UserService { }",
      },
    };

    const result = await runStdioMcp(input, {
      ANTHROPIC_API_KEY: "test-key",
    });

    expect([0, 1]).toContain(result.code);
  });
});
```

**Key Points:**

- Use `child_process.spawn` to test process
- Capture stdin, stdout, stderr
- Test with valid and invalid inputs
- Verify exit codes

---

### Pattern 5: Integration Testing with Mocked Dependencies

**Use for:** Testing component interactions without hitting real services

**Example:** `mcps/playwright/playwright-generator/tests/unit/routes.test.js`

```javascript
import { jest } from "@jest/globals";

// Create mock function
let mockGenerateCompletion;

beforeEach(() => {
  // Reset and recreate mock
  mockGenerateCompletion = jest.fn();

  // Mock the shared module
  jest.unstable_mockModule("../../../shared/aiClient.js", () => ({
    generateCompletion: mockGenerateCompletion,
  }));

  // Setup default response
  mockGenerateCompletion.mockResolvedValue({
    text: "Generated test code",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  });
});

it("should generate test successfully", async () => {
  const response = await request(app)
    .post("/generate")
    .send({
      app: "TestApp",
      paths: [{ name: "User Login", steps: ["Navigate", "Login"] }],
    });

  expect(response.status).toBe(200);
  expect(mockGenerateCompletion).toHaveBeenCalled();
});
```

**Key Points:**

- Mock external dependencies (AI clients, databases, APIs)
- Test integration logic without external calls
- Verify correct parameters passed to dependencies
- Fast execution

---

### Pattern 6: TypeScript MCP Testing

**Use for:** TypeScript-based MCPs (azure-devops, browser-control)

**Example:** `mcps/integration/azure-devops/tests/ado-service.test.ts`

```typescript
import { jest } from "@jest/globals";
import { AdoService } from "../src/ado-service";

describe("AdoService", () => {
  let service: AdoService;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
    };

    service = new AdoService({
      organization: "test-org",
      project: "test-project",
      pat: "test-pat",
    });
  });

  it("should fetch work items", async () => {
    mockAxios.get.mockResolvedValue({
      data: {
        value: [{ id: 1, fields: { "System.Title": "Test" } }],
      },
    });

    const items = await service.getWorkItems({ wiql: "SELECT [System.Id]" });

    expect(items).toHaveLength(1);
    expect(mockAxios.get).toHaveBeenCalled();
  });
});
```

**Key Points:**

- Use ts-jest for TypeScript compilation
- Type safety in tests
- Mock external HTTP clients
- Test with TypeScript types

---

## Writing New Tests

### Step 1: Determine Testing Pattern

Choose the appropriate pattern based on your component:

- **HTTP routes?** → Use Pattern 1 (Express API Testing)
- **Service class?** → Use Pattern 2 (Service Layer Testing)
- **Utility function?** → Use Pattern 3 (Pure Function Testing)
- **STDIO MCP?** → Use Pattern 4 (STDIO MCP Testing)
- **Complex integration?** → Use Pattern 5 (Integration Testing)
- **TypeScript?** → Use Pattern 6 (TypeScript MCP Testing)

### Step 2: Create Test File

```bash
# Create test file in appropriate directory
touch tests/unit/routes/myroute.test.js

# Or for MCPs
touch tests/unit/myfeature.test.js
```

### Step 3: Write Test Structure

```javascript
import { jest } from "@jest/globals";

// Mock dependencies (if needed)
const mockDependency = jest.fn();

jest.unstable_mockModule("dependency-module", () => ({
  dependency: mockDependency,
}));

// Import module under test
const { default: MyModule } = await import("../../../src/mymodule.js");

describe("MyModule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Feature 1", () => {
    it("should handle happy path", () => {
      // Arrange
      const input = "test";

      // Act
      const result = MyModule.process(input);

      // Assert
      expect(result).toBe("expected");
    });

    it("should handle error case", () => {
      expect(() => MyModule.process(null)).toThrow("Expected error");
    });
  });
});
```

### Step 4: Run Tests

```bash
npm test -- tests/unit/mymodule.test.js
```

### Step 5: Verify Coverage

```bash
npm run test:coverage
```

---

## Best Practices

### 1. Test Structure (AAA Pattern)

Always follow the Arrange-Act-Assert pattern:

```javascript
it("should do something", () => {
  // Arrange - Set up test data and mocks
  const input = "test";
  mockDependency.mockResolvedValue("mocked result");

  // Act - Execute the code under test
  const result = functionUnderTest(input);

  // Assert - Verify the outcome
  expect(result).toBe("expected");
  expect(mockDependency).toHaveBeenCalledWith(input);
});
```

### 2. Clear Test Names

Use descriptive test names that explain what is being tested:

```javascript
// ✅ Good
it("should return 404 when application not found", () => {});
it("should generate tests for C# service file", () => {});
it("should handle MCP connection errors gracefully", () => {});

// ❌ Bad
it("should work", () => {});
it("test1", () => {});
it("handles error", () => {});
```

### 3. Mock External Dependencies

Always mock external dependencies:

```javascript
// ✅ Good - Mocked
jest.unstable_mockModule("axios", () => ({
  default: mockAxios,
}));

jest.unstable_mockModule("@anthropic-ai/sdk", () => ({
  default: jest.fn(() => ({ messages: { create: mockCreate } })),
}));

// ❌ Bad - Real calls (slow, flaky, requires real API keys)
import axios from "axios";
import Anthropic from "@anthropic-ai/sdk";
```

### 4. Test Edge Cases

Don't just test the happy path:

```javascript
describe("validateInput()", () => {
  it("should validate correct input", () => {}); // Happy path
  it("should reject null input", () => {}); // Null check
  it("should reject undefined input", () => {}); // Undefined check
  it("should reject empty string", () => {}); // Empty check
  it("should reject invalid format", () => {}); // Format validation
  it("should handle very long input", () => {}); // Boundary test
});
```

### 5. Keep Tests Independent

Each test should be independent and not rely on other tests:

```javascript
// ✅ Good
describe("UserService", () => {
  let service;

  beforeEach(() => {
    service = new UserService(); // Fresh instance each test
  });

  it("test 1", () => {
    /* uses fresh service */
  });
  it("test 2", () => {
    /* uses fresh service */
  });
});

// ❌ Bad - tests depend on each other
describe("UserService", () => {
  const service = new UserService(); // Shared instance

  it("should create user", () => {
    service.createUser("Alice"); // Modifies service state
  });

  it("should get user", () => {
    // This test depends on the previous test running first!
    const user = service.getUser("Alice");
  });
});
```

### 6. Use beforeEach/afterEach for Setup/Cleanup

```javascript
describe("MyComponent", () => {
  beforeEach(() => {
    // Setup runs before EACH test
    jest.clearAllMocks();
    mockDependency.mockResolvedValue("default");
  });

  afterEach(() => {
    // Cleanup runs after EACH test
    jest.restoreAllMocks();
  });

  // Tests...
});
```

### 7. Mock Only What You Need

Don't over-mock. Only mock external dependencies:

```javascript
// ✅ Good - Mock external dependencies only
jest.unstable_mockModule("axios", () => ({
  default: mockAxios,
}));
// Internal functions are tested for real

// ❌ Bad - Mocking everything makes tests meaningless
jest.unstable_mockModule("../utils/helper.js", () => ({
  processData: jest.fn(() => "mocked"),
}));
jest.unstable_mockModule("../services/validator.js", () => ({
  validate: jest.fn(() => true),
}));
// Now you're not testing anything!
```

### 8. Avoid Test Logic

Tests should be simple and straightforward:

```javascript
// ✅ Good - Simple, clear
it("should return even numbers", () => {
  const result = getEvenNumbers([1, 2, 3, 4]);
  expect(result).toEqual([2, 4]);
});

// ❌ Bad - Has logic in test
it("should return even numbers", () => {
  const input = [1, 2, 3, 4];
  const result = getEvenNumbers(input);
  const expected = input.filter((n) => n % 2 === 0); // Logic in test!
  expect(result).toEqual(expected);
});
```

### 9. Test Error Handling

Always test error scenarios:

```javascript
describe("callApi()", () => {
  it("should return data on success", async () => {
    mockAxios.get.mockResolvedValue({ data: "result" });
    const result = await callApi();
    expect(result).toBe("result");
  });

  it("should throw error on network failure", async () => {
    mockAxios.get.mockRejectedValue(new Error("Network error"));
    await expect(callApi()).rejects.toThrow("Network error");
  });

  it("should throw error on 404", async () => {
    mockAxios.get.mockRejectedValue({ response: { status: 404 } });
    await expect(callApi()).rejects.toThrow();
  });
});
```

### 10. Fast Tests

Keep tests fast by avoiding:

- Real network calls
- Real database operations
- Real file system operations
- Long timeouts
- Sleep/wait operations

```javascript
// ✅ Good - Fast (mocked)
mockAxios.get.mockResolvedValue({ data: "result" });

// ❌ Bad - Slow (real call)
await axios.get("https://real-api.com/data");
```

---

## Coverage Requirements

### Target Coverage

- **Overall Project:** 70%+
- **Critical Services:** 80%+ (mcpManager, aiHelper)
- **Utilities:** 80%+
- **Routes:** 70%+
- **Pure Functions:** 90%+

### Current Coverage

| Component        | Coverage | Status |
| ---------------- | -------- | ------ |
| Orchestrator     | 82.04%   | ✅     |
| MCPs (average)   | 85%+     | ✅     |
| Shared Utilities | 90%+     | ✅     |
| Overall          | 80%+     | ✅     |

### Checking Coverage

```bash
# Run tests with coverage
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    statements: 70,
    branches: 65,
    functions: 70,
    lines: 70
  },
  './src/services/': {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  }
}
```

---

## Troubleshooting

### Issue: Module Not Found

**Error:** `Cannot find module '../src/mymodule.js'`

**Solution:** Ensure you're using the correct relative path and ES6 import syntax:

```javascript
// Use .js extension for ES6 modules
import { MyModule } from "../src/mymodule.js";
```

### Issue: Mocks Not Working

**Error:** Mock is not being used, real module is called

**Solution:** Ensure you mock BEFORE importing:

```javascript
// ✅ Correct order
jest.unstable_mockModule("axios", () => ({ default: mockAxios }));
const { default: myModule } = await import("../src/mymodule.js");

// ❌ Wrong order
const { default: myModule } = await import("../src/mymodule.js");
jest.unstable_mockModule("axios", () => ({ default: mockAxios })); // Too late!
```

### Issue: Tests Fail Randomly

**Possible causes:**

1. Tests sharing state (not independent)
2. Not clearing mocks between tests
3. Async operations not properly awaited

**Solution:**

```javascript
beforeEach(() => {
  jest.clearAllMocks(); // Clear mock call counts
  jest.resetModules(); // Reset module cache if needed
});

// Always await async operations
const result = await asyncFunction();
```

### Issue: Slow Tests

**Cause:** Real I/O operations (network, file system, database)

**Solution:** Mock all external dependencies:

```javascript
// Mock file system
jest.unstable_mockModule("fs/promises", () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

// Mock network calls
jest.unstable_mockModule("axios", () => ({
  default: { get: jest.fn(), post: jest.fn() },
}));
```

### Issue: Coverage Not Collected

**Error:** Coverage report is empty

**Solution:** Ensure `collectCoverageFrom` is configured in `jest.config.js`:

```javascript
collectCoverageFrom: ["src/**/*.js", "!src/index.js", "!src/swagger/**"];
```

### Issue: ES6 Module Errors

**Error:** `Cannot use import statement outside a module`

**Solution:**

1. Ensure `"type": "module"` in `package.json`
2. Use `NODE_OPTIONS=--experimental-vm-modules jest`
3. Set `transform: {}` in `jest.config.js`

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [ES6 Module Mocking](https://jestjs.io/docs/ecmascript-modules)

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check existing tests for similar patterns
2. Review test output carefully for error messages
3. Check Jest documentation for specific features
4. Create an issue in the project repository

---

**Last Updated:** 2026-01-12
**Test Count:** 889 tests
**Pass Rate:** 100%
