# Automation Requirements - STDIO MCP

**Type:** STDIO MCP (On-Demand Process)  
**Location:** `mcps/automation-requirements/`  
**Technology:** Node.js + Anthropic Claude API  
**Communication:** JSON via stdin/stdout  
**Status:** ✅ Production Ready

---

## Overview

The **Automation Requirements** MCP uses AI (Anthropic Claude) to analyze test cases and create comprehensive automation strategies, technical requirements, and implementation plans. It provides feasibility assessments, framework recommendations, Page Object Models, test data strategies, and ROI calculations.

### Purpose

- ✅ Assess automation feasibility
- ✅ Create comprehensive automation strategy
- ✅ Recommend test levels (unit/integration/e2e)
- ✅ Generate Page Object Model structure
- ✅ Define test data strategy
- ✅ Plan CI/CD integration
- ✅ Calculate ROI and break-even
- ✅ Provide implementation roadmap

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
curl -X POST http://localhost:3000/api/ado/automation-requirements \
  -H "Content-Type: application/json" \
  -d '{
    "storyId": 12345
  }'
```

### Direct Testing (Development)

```bash
cd mcps/automation-requirements

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
    storyId: number;                      // Required: Work item ID
    testCases: Array<object>;             // Required: Test cases to automate
    automationLevel?: string;             // Optional: "unit"|"integration"|"e2e"|"all" (default: "all")
  }
}
```

---

## Output Schema

```typescript
{
  success: boolean;
  result: {
    feasibility: {
      overall: "high" | "medium" | "low";
      score: number;                       // 0-100
      reasoning: string;
    };
    automationStrategy: {
      recommendedApproach: string;
      testLevels: {
        unit: {
          recommended: boolean;
          percentage: number;
          reasoning: string;
          frameworks: string[];
          testCount: number;
        };
        integration: { /* same structure */ };
        e2e: { /* same structure */ };
      };
      prioritization: Array<{
        priority: number;
        testCases: string[];
        reasoning: string;
      }>;
    };
    technicalRequirements: {
      frameworks: string[];
      infrastructure: string[];
      dependencies: string[];
      dataManagement: {
        strategy: string;
        requirements: string[];
      };
      environmentSetup: string[];
    };
    automationPlan: {
      phases: Array<{
        phase: number;
        name: string;
        duration: string;
        tasks: string[];
        deliverables: string[];
      }>;
      estimatedEffort: {
        setup: string;
        testDevelopment: string;
        maintenance: string;
        total: string;
      };
    };
    pageObjectModel: {
      pages: Array<{
        pageName: string;
        elements: string[];
        methods: string[];
      }>;
      components: Array<{
        componentName: string;
        elements: string[];
      }>;
    };
    testDataStrategy: {
      approach: string;
      fixtures: Array<{
        name: string;
        description: string;
        data: object;
      }>;
      generators: string[];
      cleanup: string;
    };
    cicdIntegration: {
      triggerStrategy: string;
      parallelization: string;
      reportingStrategy: string;
      failureHandling: string;
    };
    risksMitigations: Array<{
      risk: string;
      mitigation: string;
      severity: string;
    }>;
    maintenanceStrategy: {
      updateFrequency: string;
      ownershipModel: string;
      documentationPlan: string;
    };
    successMetrics: {
      coverage: string;
      executionTime: string;
      passRate: string;
      defectDetection: string;
    };
    implementationGuide: {
      gettingStarted: string[];
      frameworkSetup: object;
      quickStart: string;
      bestPractices: string[];
    };
    roi: {
      initialInvestment: string;
      annualManualCost: string;
      annualMaintenanceCost: string;
      annualSavings: string;
      breakEvenPeriod: string;
      threeYearROI: string;
      recommendation: string;
    };
    testCaseAnalysis: {
      totalTests: number;
      byCategory: object;
      byPriority: object;
      automationSuitability: {
        high: number;
        medium: number;
        low: number;
      };
      estimatedManualEffort: object;
      estimatedAutomationEffort: object;
      identifiedPages: string[];
      identifiedApiEndpoints: string[];
    };
    metadata: {
      storyId: number;
      testCasesCount: number;
      automationLevel: string;
      generatedAt: string;
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
    "feasibility": {
      "overall": "high",
      "score": 85,
      "reasoning": "Test cases are well-structured with clear steps, involve standard UI interactions, and have minimal manual verification requirements. The application appears stable with identifiable elements."
    },
    "automationStrategy": {
      "recommendedApproach": "Playwright for E2E critical paths, xUnit for business logic, WebApplicationFactory for API integration tests",
      "testLevels": {
        "unit": {
          "recommended": true,
          "percentage": 60,
          "reasoning": "Majority of test effort should focus on unit tests for business logic validation, input validation, and error handling",
          "frameworks": ["xUnit", "NUnit", "Moq"],
          "testCount": 18
        },
        "integration": {
          "recommended": true,
          "percentage": 30,
          "reasoning": "API endpoints and database operations require integration testing",
          "frameworks": ["WebApplicationFactory", "RestSharp"],
          "testCount": 9
        },
        "e2e": {
          "recommended": true,
          "percentage": 10,
          "reasoning": "Critical user flows like login and appointment scheduling need E2E validation",
          "frameworks": ["Playwright"],
          "testCount": 3
        }
      },
      "prioritization": [
        {
          "priority": 1,
          "testCases": ["TC001", "TC003"],
          "reasoning": "Critical path features - login and core functionality"
        },
        {
          "priority": 2,
          "testCases": ["TC002"],
          "reasoning": "Important error handling scenarios"
        }
      ]
    },
    "technicalRequirements": {
      "frameworks": ["Playwright", "xUnit", "Moq", "WebApplicationFactory"],
      "infrastructure": ["CI/CD pipeline", "Test database", "Test environment"],
      "dependencies": ["Node.js 18+", ".NET 8", "Docker"],
      "dataManagement": {
        "strategy": "Test data factory pattern with builders and fixtures",
        "requirements": ["User test data", "Appointment test data", "Provider test data"]
      },
      "environmentSetup": [
        "Configure test database (SQL Server LocalDB or Docker)",
        "Set up authentication tokens for API testing",
        "Deploy test environment with test configuration"
      ]
    },
    "automationPlan": {
      "phases": [
        {
          "phase": 1,
          "name": "Foundation Setup",
          "duration": "1 week",
          "tasks": [
            "Install Playwright and xUnit frameworks",
            "Set up test project structure",
            "Configure test database",
            "Create base test classes"
          ],
          "deliverables": ["Test infrastructure", "Base classes", "Configuration files"]
        },
        {
          "phase": 2,
          "name": "Page Objects & Utilities",
          "duration": "1 week",
          "tasks": [
            "Implement Page Object Model classes",
            "Create test data factories",
            "Build reusable utilities",
            "Set up authentication helpers"
          ],
          "deliverables": ["Page Objects", "Test data builders", "Helper libraries"]
        },
        {
          "phase": 3,
          "name": "Test Implementation",
          "duration": "2 weeks",
          "tasks": [
            "Write unit tests for business logic",
            "Implement integration tests for APIs",
            "Create E2E tests for critical paths",
            "Add assertions and validations"
          ],
          "deliverables": ["30 automated tests", "Test documentation"]
        },
        {
          "phase": 4,
          "name": "CI/CD Integration",
          "duration": "1 week",
          "tasks": [
            "Integrate tests with CI/CD pipeline",
            "Configure parallel execution",
            "Set up reporting",
            "Implement retry logic"
          ],
          "deliverables": ["CI/CD integration", "Test reports", "Monitoring"]
        }
      ],
      "estimatedEffort": {
        "setup": "40 hours",
        "testDevelopment": "89 hours",
        "maintenance": "10 hours/month",
        "total": "129 hours initial + 10 hours/month ongoing"
      }
    },
    "pageObjectModel": {
      "pages": [
        {
          "pageName": "LoginPage",
          "elements": ["usernameField", "passwordField", "loginButton", "errorMessage"],
          "methods": ["login(username, password)", "isLoginSuccessful()", "getErrorMessage()"]
        },
        {
          "pageName": "AppointmentPage",
          "elements": ["providerDropdown", "dateTimePicker", "scheduleButton", "confirmationMessage"],
          "methods": ["selectProvider(name)", "selectDateTime(date, time)", "scheduleAppointment()", "getConfirmation()"]
        }
      ],
      "components": [
        {
          "componentName": "NavigationBar",
          "elements": ["homeLink", "appointmentsLink", "profileLink", "logoutButton"]
        }
      ]
    },
    "testDataStrategy": {
      "approach": "Builder pattern for complex objects, fixtures for common scenarios",
      "fixtures": [
        {
          "name": "ValidPatient",
          "description": "Standard test patient with complete profile",
          "data": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@test.com",
            "phone": "555-0100"
          }
        }
      ],
      "generators": [
        "UserBuilder - generates user test data with fluent interface",
        "AppointmentBuilder - generates appointment test data",
        "Faker integration for realistic data generation"
      ],
      "cleanup": "AfterEach hook removes test data using DbContext"
    },
    "cicdIntegration": {
      "triggerStrategy": "Run smoke tests on every PR, full suite nightly and on main branch",
      "parallelization": "Use xUnit collections for parallel test execution across 4 workers",
      "reportingStrategy": "Generate HTML reports with Allure, upload to Azure DevOps, send Slack notifications on failure",
      "failureHandling": "Retry flaky tests once automatically, capture screenshots and traces on failure"
    },
    "risksMitigations": [
      {
        "risk": "Test flakiness due to timing issues and async operations",
        "mitigation": "Use Playwright's auto-waiting, implement explicit waits, avoid hard-coded sleeps",
        "severity": "medium"
      },
      {
        "risk": "Test data conflicts when running tests in parallel",
        "mitigation": "Use unique test data per test, implement proper isolation with database transactions",
        "severity": "high"
      }
    ],
    "maintenanceStrategy": {
      "updateFrequency": "Review and update tests each sprint, refactor quarterly",
      "ownershipModel": "QA team owns framework and utilities, developers contribute domain-specific tests",
      "documentationPlan": "Maintain README with setup instructions, document Page Objects with JSDoc"
    },
    "successMetrics": {
      "coverage": "80% code coverage for business logic",
      "executionTime": "Full test suite completes in under 10 minutes",
      "passRate": "95% pass rate on stable builds",
      "defectDetection": "Catch 90% of bugs before production deployment"
    },
    "implementationGuide": {
      "gettingStarted": [
        "1. Review the automation strategy and feasibility assessment",
        "2. Set up the required frameworks and infrastructure",
        "3. Create the Page Object Model classes",
        "4. Implement test data factories and fixtures",
        "5. Write automated tests following the prioritization plan",
        "6. Integrate with CI/CD pipeline",
        "7. Establish maintenance and monitoring processes"
      ],
      "frameworkSetup": {
        "playwright": "npm install @playwright/test",
        "xunit": "dotnet add package xunit",
        "moq": "dotnet add package Moq"
      },
      "quickStart": "// See implementation guide in output",
      "bestPractices": [
        "Use Page Object Model for maintainability",
        "Implement test data builders for flexibility",
        "Use explicit waits instead of hard-coded delays",
        "Clean up test data after each test",
        "Run tests in parallel where possible",
        "Monitor test execution times and flakiness"
      ]
    },
    "roi": {
      "initialInvestment": "129h",
      "annualManualCost": "169h",
      "annualMaintenanceCost": "120h",
      "annualSavings": "49h",
      "breakEvenPeriod": "32 months",
      "threeYearROI": "18h saved",
      "recommendation": "Automation recommended"
    },
    "testCaseAnalysis": {
      "totalTests": 3,
      "byCategory": {
        "positive": 2,
        "negative": 1
      },
      "byPriority": {
        "high": 3
      },
      "automationSuitability": {
        "high": 2,
        "medium": 1,
        "low": 0
      },
      "identifiedPages": ["LoginPage", "AppointmentPage"],
      "identifiedApiEndpoints": []
    }
  }
}
```

---

## Key Components

### Feasibility Assessment
- **High (80-100):** Straightforward automation, clear elements
- **Medium (50-79):** Some complexity, moderate effort
- **Low (<50):** Heavy manual steps, limited automation value

### Test Level Distribution
- **Unit (60-70%):** Fast, isolated business logic tests
- **Integration (20-30%):** API and database tests
- **E2E (10-20%):** Critical user flows only

### Page Object Model
Automatically identifies pages and generates structure:
```typescript
class LoginPage {
  usernameField: Locator;
  passwordField: Locator;
  loginButton: Locator;
  
  async login(username: string, password: string) { }
}
```

### ROI Calculation
- Initial investment vs. annual savings
- Break-even period
- 3-year ROI projection

---

## Environment Requirements

```bash
# .env file (root directory)
ANTHROPIC_API_KEY=sk-ant-...     # Required
CLAUDE_MODEL=claude-sonnet-4-20250514  # Optional
```

---

## Testing

```bash
cd mcps/automation-requirements
npm test
```

---

## Integration with Orchestrator

Part of the complete test automation workflow:

1. **requirements-analyzer** - Analyze story quality
2. **test-case-planner** - Generate test cases
3. **automation-requirements** - Create automation plan (this MCP)
4. **unit-test-generator** - Generate unit tests
5. **integration-test-generator** - Generate integration tests

---

## Performance

- **Generation Time:** 10-20 seconds
- **API Tokens:** ~4,000-6,000 per analysis
- **Memory:** ~50-100 MB

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Feasibility assessment
- ✅ Automation strategy generation
- ✅ Page Object Model planning
- ✅ ROI calculation

---

**Need help?** Check `tests/test.js` for examples.
