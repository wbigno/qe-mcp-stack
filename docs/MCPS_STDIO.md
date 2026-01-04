# STDIO MCPs - Quick Reference

STDIO MCPs are on-demand, process-based services that are started by the orchestrator when needed. They communicate via JSON-RPC over stdin/stdout.

## 📋 Table of Contents

- [Quick Overview](#quick-overview)
- [How STDIO MCPs Work](#how-stdio-mcps-work)
- [Test Generation Services](#test-generation-services)
- [Requirements Services](#requirements-services)
- [Planning Services](#planning-services)
- [Impact Analysis Services](#impact-analysis-services)
- [Documentation Services](#documentation-services)
- [Analysis Services](#analysis-services)
- [Usage Patterns](#usage-patterns)
- [Testing STDIO MCPs](#testing-stdio-mcps)

---

## Quick Overview

| Service | Purpose | AI-Powered | Via Orchestrator |
|---------|---------|------------|------------------|
| [unit-test-generator](#unit-test-generator) | Generate xUnit tests | ✅ Yes | `/api/tests/generate-unit-tests` |
| [integration-test-generator](#integration-test-generator) | Generate integration tests | ✅ Yes | `/api/tests/generate-integration-tests` |
| [requirements-analyzer](#requirements-analyzer) | Analyze requirements | ✅ Yes | `/api/ado/analyze-requirements` |
| [test-case-planner](#test-case-planner) | Generate test cases | ✅ Yes | `/api/ado/generate-test-cases` |
| [automation-requirements](#automation-requirements) | Plan automation | ✅ Yes | `/api/ado/automation-requirements` |
| [playwright-planner](#playwright-planner) | Plan Playwright architecture | ✅ Yes | `/api/tests/plan-playwright` |
| [blast-radius-analyzer](#blast-radius-analyzer) | Analyze blast radius | ⚪ No | `/api/risk/blast-radius` |
| [change-impact-analyzer](#change-impact-analyzer) | Analyze change impact | ✅ Yes | `/api/risk/change-impact` |
| [business-logic-documenter](#business-logic-documenter) | Document business logic | ✅ Yes | `/api/docs/business-logic` |
| [documentation-generator](#documentation-generator) | Generate technical docs | ✅ Yes | `/api/docs/generate` |
| [state-machine-analyzer](#state-machine-analyzer) | Analyze state machines | ⚪ No | `/api/analysis/state-machines` |
| [smell-detector](#smell-detector) | Detect code smells | ⚪ No | `/api/quality/code-smells` |
| [trend-analyzer](#trend-analyzer) | Analyze trends | ⚪ No | `/api/quality/trends` |
| [performance-analyzer](#performance-analyzer) | Analyze performance | ⚪ No | `/api/quality/performance` |

---

## How STDIO MCPs Work

### Lifecycle

```
1. Orchestrator receives API request
2. Orchestrator spawns STDIO MCP process: node mcps/service/index.js
3. Orchestrator sends JSON data via stdin
4. MCP processes data
5. MCP returns JSON via stdout
6. Orchestrator reads result
7. Process terminates
```

### Communication Protocol

**Input (via stdin):**
```json
{
  "action": "generate",
  "data": {
    "app": "App1",
    "className": "UserService"
  }
}
```

**Output (via stdout):**
```json
{
  "success": true,
  "result": {
    "generatedCode": "...",
    "metadata": {}
  }
}
```

### Key Characteristics

- ✅ **Lightweight**: No always-running processes
- ✅ **Stateless**: No persistent memory between calls
- ✅ **Fast**: Start in milliseconds
- ✅ **Isolated**: Each call is independent
- ❌ **No HTTP**: Can't be called directly via browser
- ❌ **No persistence**: Must return all data immediately

---

## Test Generation Services

### unit-test-generator

**Purpose:** Generate xUnit unit tests for .NET methods

**Location:** `mcps/unit-test-generator/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  app: string;              // Required: App name from apps.json
  className: string;        // Required: Class to test
  methodName?: string;      // Optional: Specific method
  includeNegativeTests?: boolean;  // Default: true
  includeMocks?: boolean;   // Default: true
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  tests: Array<{
    testName: string;
    testCode: string;
    description: string;
    category: "positive" | "negative" | "edge-case";
  }>;
  mocks: Array<{
    interfaceName: string;
    mockCode: string;
  }>;
  metadata: {
    generatedAt: string;
    testsCount: number;
  };
}
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/tests/generate-unit-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "className": "UserService",
    "methodName": "CreateUser"
  }'
```

**Direct Testing:**
```bash
cd mcps/unit-test-generator
echo '{
  "action": "generate",
  "data": {
    "app": "App1",
    "className": "UserService"
  }
}' | node index.js
```

**What It Generates:**
- Positive test cases
- Negative test cases (invalid inputs)
- Edge cases (null, empty, boundary conditions)
- Mock setup for dependencies
- Arrange-Act-Assert structure

**Details:** [→ README](../mcps/unit-test-generator/README.md)

---

### integration-test-generator

**Purpose:** Generate integration tests for APIs and services

**Location:** `mcps/integration-test-generator/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  app: string;              // Required: App name
  apiEndpoint: string;      // Required: API endpoint to test
  scenario?: string;        // Optional: Specific scenario
  includeAuth?: boolean;    // Default: true
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  tests: Array<{
    testName: string;
    testCode: string;
    description: string;
    httpMethod: string;
    endpoint: string;
  }>;
  setupCode: string;         // Setup/teardown code
  testDataSeed: object;      // Test data seeding
}
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/tests/generate-integration-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "apiEndpoint": "/api/users",
    "scenario": "CRUD operations"
  }'
```

**What It Generates:**
- API endpoint tests
- Service integration tests
- Database integration tests
- External system integration tests
- Authentication/authorization tests

**Details:** [→ README](../mcps/integration-test-generator/README.md)

---

## Requirements Services

### requirements-analyzer

**Purpose:** Analyze Azure DevOps stories for completeness

**Location:** `mcps/requirements-analyzer/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  storyId: number;          // Required: Work item ID
  storyContent: {           // Required: Story content
    title: string;
    description: string;
    acceptanceCriteria: string;
  };
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  analysis: {
    completenessScore: number;      // 0-100
    missingRequirements: string[];
    ambiguousRequirements: string[];
    testabilityScore: number;       // 0-100
    recommendations: string[];
    gaps: Array<{
      category: string;
      description: string;
      severity: "high" | "medium" | "low";
    }>;
  };
}
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/ado/analyze-requirements \
  -H "Content-Type: application/json" \
  -d '{"storyIds": [12345]}'
```

**What It Analyzes:**
- Acceptance criteria completeness
- Requirement clarity
- Testability
- Missing edge cases
- Ambiguous language
- Dependencies

**Details:** [→ README](../mcps/requirements-analyzer/README.md)

---

### test-case-planner

**Purpose:** Generate comprehensive test cases from requirements

**Location:** `mcps/test-case-planner/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  storyId: number;
  requirements: string;
  acceptanceCriteria: string;
  includeNegative?: boolean;  // Default: true
  includeEdgeCases?: boolean; // Default: true
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  testCases: Array<{
    id: string;
    title: string;
    description: string;
    preconditions: string[];
    steps: Array<{
      stepNumber: number;
      action: string;
      expectedResult: string;
    }>;
    postconditions: string[];
    testData: object;
    priority: "high" | "medium" | "low";
    category: "positive" | "negative" | "edge-case";
  }>;
  summary: {
    totalTestCases: number;
    positiveTests: number;
    negativeTests: number;
    edgeCases: number;
  };
}
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/ado/generate-test-cases \
  -H "Content-Type: application/json" \
  -d '{"storyId": 12345}'
```

**What It Generates:**
- Positive test scenarios
- Negative test scenarios
- Edge case scenarios
- Test data requirements
- Preconditions/postconditions
- Step-by-step test instructions

**Details:** [→ README](../mcps/test-case-planner/README.md)

---

### automation-requirements

**Purpose:** Create automation requirements from test cases

**Location:** `mcps/automation-requirements/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  storyId: number;
  testCases: Array<object>;
  automationLevel?: "unit" | "integration" | "e2e" | "all";
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  automationRequirements: {
    feasibility: "high" | "medium" | "low";
    estimatedEffort: string;
    requiredFrameworks: string[];
    dependencies: string[];
    risks: string[];
    recommendations: string[];
    testCategories: {
      unit: Array<{testCaseId: string; feasibility: string}>;
      integration: Array<{testCaseId: string; feasibility: string}>;
      e2e: Array<{testCaseId: string; feasibility: string}>;
    };
    priority: Array<{
      testCaseId: string;
      priority: number;
      reasoning: string;
    }>;
  };
}
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/ado/automation-requirements \
  -H "Content-Type: application/json" \
  -d '{"storyId": 12345}'
```

**What It Generates:**
- Automation feasibility assessment
- Framework recommendations
- Effort estimation
- Priority ranking
- Risk identification
- Implementation roadmap

**Details:** [→ README](../mcps/automation-requirements/README.md)

---

## Planning Services

### playwright-planner

**Purpose:** Plan Playwright test architecture and strategy

**Location:** `mcps/playwright-planner/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  app: string;
  criticalPaths: Array<{
    name: string;
    steps: Array<object>;
  }>;
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  plan: {
    architecture: {
      pageObjects: string[];
      utilities: string[];
      fixtures: string[];
    };
    testOrganization: {
      testSuites: string[];
      testStructure: object;
    };
    bestPractices: string[];
    recommendations: string[];
  };
}
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/tests/plan-playwright \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'
```

**What It Generates:**
- Page object model structure
- Test organization strategy
- Fixture recommendations
- Best practices application
- Reusability patterns

**Details:** [→ README](../mcps/playwright-planner/README.md)

---

## Impact Analysis Services

### blast-radius-analyzer

**Purpose:** Analyze blast radius of code changes

**Location:** `mcps/blast-radius-analyzer/`

**AI-Powered:** ⚪ No (Static analysis)

**Input Schema:**
```typescript
{
  app: string;
  files: string[];          // Changed files
  changes: Array<{
    file: string;
    linesChanged: number[];
  }>;
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  blastRadius: {
    affectedFiles: string[];
    affectedClasses: string[];
    affectedMethods: string[];
    riskLevel: "high" | "medium" | "low";
    impactedFeatures: string[];
    recommendedTests: string[];
  };
}
```

**Usage via Orchestrator:**
```bash
curl -X POST http://localhost:3000/api/risk/blast-radius \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "files": ["UserService.cs", "UserRepository.cs"]
  }'
```

**Details:** [→ README](../mcps/blast-radius-analyzer/README.md)

---

### change-impact-analyzer

**Purpose:** Detailed change impact analysis across systems

**Location:** `mcps/change-impact-analyzer/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  app: string;
  changedFiles: string[];
  changedMethods: string[];
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  impact: {
    directImpact: string[];
    indirectImpact: string[];
    crossSystemImpact: Array<{
      system: string;
      affectedComponents: string[];
    }>;
    regressionRisk: number;        // 0-100
    testingRecommendations: string[];
  };
}
```

**Details:** [→ README](../mcps/change-impact-analyzer/README.md)

---

## Documentation Services

### business-logic-documenter

**Purpose:** Generate business logic documentation from code

**Location:** `mcps/business-logic-documenter/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  app: string;
  className: string;
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  documentation: {
    overview: string;
    businessRules: Array<{
      rule: string;
      description: string;
      codeReference: string;
    }>;
    workflows: Array<{
      name: string;
      steps: string[];
      decisionPoints: string[];
    }>;
    plainLanguage: string;
  };
}
```

**Details:** [→ README](../mcps/business-logic-documenter/README.md)

---

### documentation-generator

**Purpose:** Generate technical documentation from code

**Location:** `mcps/documentation-generator/`

**AI-Powered:** ✅ Yes (Anthropic Claude)

**Input Schema:**
```typescript
{
  app: string;
  scope: "api" | "architecture" | "integration" | "all";
}
```

**Output Schema:**
```typescript
{
  success: boolean;
  documentation: {
    markdown: string;
    sections: Array<{
      title: string;
      content: string;
    }>;
  };
}
```

**Details:** [→ README](../mcps/documentation-generator/README.md)

---

## Analysis Services

### state-machine-analyzer

**Purpose:** Analyze state machines and workflows in code

**Location:** `mcps/state-machine-analyzer/`

**AI-Powered:** ⚪ No (Static analysis)

**Details:** [→ README](../mcps/state-machine-analyzer/README.md)

---

### smell-detector

**Purpose:** Detect code smells and anti-patterns

**Location:** `mcps/smell-detector/`

**AI-Powered:** ⚪ No (Static analysis with rules)

**Details:** [→ README](../mcps/smell-detector/README.md)

---

### trend-analyzer

**Purpose:** Analyze trends in metrics over time

**Location:** `mcps/trend-analyzer/`

**AI-Powered:** ⚪ No (Statistical analysis)

**Details:** [→ README](../mcps/trend-analyzer/README.md)

---

### performance-analyzer

**Purpose:** Analyze code performance and bottlenecks

**Location:** `mcps/performance-analyzer/`

**AI-Powered:** ⚪ No (Profiling analysis)

**Details:** [→ README](../mcps/performance-analyzer/README.md)

---

## Usage Patterns

### Pattern 1: Via Orchestrator API (Production)
```bash
# Always use orchestrator in production
curl -X POST http://localhost:3000/api/tests/generate-unit-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "className": "UserService"
  }'
```

**Behind the scenes:**
1. Orchestrator receives request
2. Spawns `unit-test-generator` process
3. Sends data via stdin
4. Reads result from stdout
5. Returns to client
6. Process terminates

### Pattern 2: Direct Testing (Development)
```bash
cd mcps/unit-test-generator

# Test with echo
echo '{
  "action": "generate",
  "data": {"app": "App1", "className": "UserService"}
}' | node index.js

# Or with a test file
cat test-input.json | node index.js
```

### Pattern 3: Chained STDIO MCPs
```bash
# Example: Requirements → Test Cases → Automation Requirements
# Orchestrator handles this orchestration
curl -X POST http://localhost:3000/api/ado/complete-workflow \
  -d '{"storyId": 12345}'

# Behind the scenes:
# 1. azure-devops (Docker) → pulls story
# 2. requirements-analyzer (STDIO) → analyzes requirements
# 3. test-case-planner (STDIO) → generates test cases
# 4. automation-requirements (STDIO) → creates automation plan
# 5. Orchestrator aggregates and returns results
```

---

## Testing STDIO MCPs

### Manual Testing

```bash
# Navigate to MCP directory
cd mcps/unit-test-generator

# Create test input file
cat > test-input.json << EOF
{
  "action": "generate",
  "data": {
    "app": "App1",
    "className": "UserService",
    "methodName": "CreateUser"
  }
}
EOF

# Run MCP
cat test-input.json | node index.js

# Or use echo
echo '{"action":"generate","data":{"app":"App1"}}' | node index.js
```

### Debugging

```bash
# Enable debug logging (if implemented)
DEBUG=* echo '{"action":"generate","data":{...}}' | node index.js

# View errors
echo '{"action":"generate","data":{...}}' | node index.js 2>&1 | tee output.log
```

### Automated Testing

```bash
# If package.json has test script
cd mcps/unit-test-generator
npm test
```

---

## AI-Powered vs Static Analysis

### AI-Powered MCPs (Use Anthropic Claude)
- unit-test-generator
- integration-test-generator
- requirements-analyzer
- test-case-planner
- automation-requirements
- playwright-planner
- change-impact-analyzer
- business-logic-documenter
- documentation-generator

**Require:** `ANTHROPIC_API_KEY` in `.env`

### Static Analysis MCPs (No AI)
- blast-radius-analyzer
- state-machine-analyzer
- smell-detector
- trend-analyzer
- performance-analyzer

**Require:** Only code access

---

## Environment Requirements

All STDIO MCPs need:

```bash
# In .env (root directory)
ANTHROPIC_API_KEY=sk-ant-...   # For AI-powered MCPs
# OR
OPENAI_API_KEY=sk-...           # Alternative

# App configuration
# in config/apps.json
```

---

## Next Steps

- [View Docker MCPs](DOCKER_MCPS.md)
- [Back to Overview](MCP_OVERVIEW.md)
- [Getting Started](GETTING_STARTED.md)

---

**Last Updated:** December 29, 2024
