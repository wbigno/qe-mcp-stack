# Playwright Planner - STDIO MCP

**Type:** STDIO MCP  
**Location:** `mcps/playwright-planner/`  
**Technology:** Node.js + Claude API  
**Status:** ✅ Production Ready

## Overview

Plans comprehensive Playwright test architecture with Page Object Model, fixtures, helpers, and complete implementation strategy.

## Input Schema

```typescript
{
  data: {
    app: string;
    userFlows: Array<{
      name: string;
      pages?: string[];
      steps?: string[];
      requiresAuth?: boolean;
      testCount?: number;
    }>;
    includeFixtures?: boolean;  // default: true
    includeHelpers?: boolean;   // default: true
  }
}
```

## Output

- **projectStructure** - Directory layout and files
- **pageObjectModel** - Complete Page Object classes with code
- **testFiles** - Test specifications with implementations
- **fixtures** - Test fixtures (authenticatedUser, testData)
- **helpers** - Helper utilities (AuthHelper, DataHelper)
- **configuration** - playwright.config.ts
- **bestPractices** - Selector strategy, waiting, isolation
- **cicdIntegration** - Docker, parallelization, reporting
- **setupGuide** - Installation and setup steps
- **implementationEstimate** - Hours breakdown and timeline

## Quick Start

```bash
cd mcps/playwright-planner
npm install
cat sample-input.json | node index.js
npm test
```

## Key Features

✅ Complete Page Object Model classes (TypeScript)  
✅ Test file implementations  
✅ Fixture setup (auth, data)  
✅ Helper utilities  
✅ Configuration files  
✅ Setup guide  
✅ Implementation estimates  
✅ Best practices  

## Example Output

```json
{
  "pageObjectModel": {
    "pages": [
      {
        "pageName": "LoginPage",
        "selectors": {
          "usernameInput": "#username",
          "passwordInput": "#password",
          "loginButton": "button[type='submit']"
        },
        "methods": [
          {
            "name": "login",
            "parameters": ["username: string", "password: string"],
            "implementation": "async login(username, password) { ... }"
          }
        ],
        "fullImplementation": "// Complete TypeScript class"
      }
    ],
    "basePage": {
      "methods": ["waitForPageLoad", "takeScreenshot"]
    }
  },
  "testFiles": [
    {
      "filename": "login.spec.ts",
      "testCases": [
        {
          "testName": "should login successfully",
          "implementation": "test('should login', async ({ page }) => { ... })"
        }
      ]
    }
  ],
  "fixtures": [
    {
      "name": "authenticatedUser",
      "purpose": "Pre-authenticated session"
    }
  ],
  "setupGuide": {
    "installation": [
      "npm init playwright@latest",
      "npx playwright install"
    ],
    "commonCommands": {
      "runAllTests": "npx playwright test",
      "runUI": "npx playwright test --ui",
      "debug": "npx playwright test --debug"
    }
  },
  "implementationEstimate": {
    "total": "45 hours",
    "duration": "2 weeks",
    "breakdown": {
      "setup": "4h",
      "pages": "12h",
      "tests": "18h",
      "fixtures": "3h"
    }
  }
}
```

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Integration

Part of complete E2E testing workflow:
1. automation-requirements → creates strategy
2. playwright-planner → plans architecture (this MCP)
3. Implementation → build tests

## Performance

- **Generation Time:** 10-15 seconds
- **Tokens:** ~5,000-7,000
- **Memory:** ~50-100 MB

---

**Need help?** See `tests/test.js` for examples.
