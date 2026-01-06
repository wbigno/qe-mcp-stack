/**
 * AI API Client for Playwright Planning
 *
 * Handles communication with AI APIs for Playwright test architecture planning
 */

import { generateCompletion } from '../../shared/aiClient.js';

/**
 * Generate Playwright architecture plan using AI
 *
 * @param {Object} params - Planning parameters
 * @returns {Promise<Object>} Playwright architecture plan
 */
export async function generateWithClaude(params) {
  const {
    app,
    userFlows,
    includeFixtures,
    includeHelpers,
    model
  } = params;

  // Construct planning prompt
  const prompt = buildPlanningPrompt(app, userFlows, includeFixtures, includeHelpers);

  try {
    // Call AI API via unified client
    const response = await generateCompletion({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      maxTokens: 8192,
      temperature: 0.3
    });

    // Extract text content from response
    const generatedText = response.text;

    // Parse the structured response
    const plan = parsePlanResponse(generatedText);

    return plan;

  } catch (error) {
    throw new Error(`AI API error: ${error.message}`);
  }
}

/**
 * Build Playwright planning prompt
 */
function buildPlanningPrompt(app, userFlows, includeFixtures, includeHelpers) {
  const flowsSummary = userFlows.map((flow, idx) => 
    `${idx + 1}. ${flow.name || 'Flow ' + (idx + 1)}\n   Pages: ${flow.pages?.join(', ') || 'Unknown'}`
  ).join('\n');

  return `You are an expert Playwright test architect. Plan a comprehensive Playwright test architecture with Page Object Model.

**Application:** ${app}

**User Flows to Automate:**
${flowsSummary}

**Full Flow Details:**
${JSON.stringify(userFlows, null, 2)}

---

Create a comprehensive Playwright test architecture plan. Return ONLY a JSON object with this structure:

{
  "projectStructure": {
    "directories": [
      {
        "path": "tests/",
        "purpose": "Test files",
        "files": ["login.spec.ts", "appointment.spec.ts"]
      },
      {
        "path": "pages/",
        "purpose": "Page Object Model classes",
        "files": ["LoginPage.ts", "HomePage.ts"]
      }
    ],
    "configFiles": [
      {
        "filename": "playwright.config.ts",
        "purpose": "Playwright configuration",
        "content": "// Config file content"
      }
    ]
  },
  "pageObjectModel": {
    "pages": [
      {
        "pageName": "LoginPage",
        "path": "pages/LoginPage.ts",
        "selectors": {
          "usernameInput": "#username",
          "passwordInput": "#password",
          "loginButton": "button[type='submit']",
          "errorMessage": ".error-message"
        },
        "methods": [
          {
            "name": "login",
            "parameters": ["username: string", "password: string"],
            "returnType": "Promise<void>",
            "description": "Performs login with credentials",
            "implementation": "// Method implementation"
          }
        ],
        "fullImplementation": "// Complete TypeScript class code"
      }
    ],
    "components": [
      {
        "componentName": "NavigationComponent",
        "path": "components/NavigationComponent.ts",
        "selectors": {
          "homeLink": "a[href='/home']",
          "profileLink": "a[href='/profile']"
        },
        "methods": [
          {
            "name": "navigateToHome",
            "returnType": "Promise<void>",
            "implementation": "// Method implementation"
          }
        ]
      }
    ],
    "basePage": {
      "filename": "BasePage.ts",
      "purpose": "Common page functionality",
      "methods": ["waitForPageLoad", "takeScreenshot", "scrollIntoView"]
    }
  },
  "testFiles": [
    {
      "filename": "login.spec.ts",
      "description": "Login functionality tests",
      "testCases": [
        {
          "testName": "should login successfully with valid credentials",
          "description": "Verifies successful login flow",
          "implementation": "// Test implementation"
        }
      ],
      "fullImplementation": "// Complete test file code"
    }
  ],
  "fixtures": [
    {
      "name": "authenticatedUser",
      "type": "fixture",
      "purpose": "Pre-authenticated user session",
      "implementation": "// Fixture implementation"
    }
  ],
  "helpers": [
    {
      "name": "AuthHelper",
      "path": "helpers/AuthHelper.ts",
      "purpose": "Authentication utilities",
      "methods": [
        {
          "name": "loginWithAPI",
          "description": "Login via API to save time",
          "implementation": "// Helper implementation"
        }
      ]
    }
  ],
  "configuration": {
    "browsers": ["chromium", "firefox", "webkit"],
    "baseURL": "http://localhost:3000",
    "timeout": 30000,
    "retries": 1,
    "workers": 4,
    "reporter": ["html", "json"],
    "screenshots": "only-on-failure",
    "videos": "retain-on-failure"
  },
  "bestPractices": {
    "selectorStrategy": "Use data-testid attributes for stability",
    "waitingStrategy": "Use Playwright's auto-waiting, avoid hard-coded timeouts",
    "testIsolation": "Each test should be independent and clean up after itself",
    "dataManagement": "Use fixtures for test data, avoid hardcoded values",
    "errorHandling": "Take screenshots on failure, log detailed error messages"
  },
  "cicdIntegration": {
    "dockerSupport": true,
    "parallelExecution": "Run tests across 4 workers",
    "sharding": "Shard tests across 2 machines in CI",
    "reporting": "Generate HTML report and upload to Azure DevOps"
  }
}

**Planning Guidelines:**

1. **Project Structure:**
   - tests/ - Test specification files
   - pages/ - Page Object classes
   - components/ - Reusable component objects
   - fixtures/ - Test fixtures and utilities
   - helpers/ - Helper functions

2. **Page Object Model:**
   - One class per page
   - Encapsulate selectors as private
   - Provide public methods for actions
   - Use TypeScript for type safety
   - Inherit from BasePage

3. **Selector Strategy:**
   - Prefer data-testid attributes
   - Use role-based selectors (getByRole)
   - Avoid CSS selectors that can break
   - Use text content for links/buttons

4. **Test File Organization:**
   - Group tests by feature/page
   - Use describe blocks for scenarios
   - Keep tests focused and isolated
   - One assertion per test preferred

${includeFixtures ? `
5. **Fixtures:**
   - authenticatedUser - Pre-logged in user
   - testData - Sample data for tests
   - mockAPI - Mock API responses
` : ''}

${includeHelpers ? `
6. **Helpers:**
   - AuthHelper - Login/logout utilities
   - DataHelper - Test data generation
   - APIHelper - API call utilities
` : ''}

7. **Configuration:**
   - Support multiple browsers
   - Configure timeouts appropriately
   - Set up retry logic
   - Enable parallel execution
   - Configure screenshots/videos

8. **Best Practices:**
   - Use auto-waiting (no sleeps)
   - Test isolation (independent tests)
   - Use fixtures for setup/teardown
   - Implement retry logic for flaky tests
   - Generate comprehensive reports

Generate complete Playwright architecture plan with actual code implementations. Return ONLY the JSON object.`;
}

/**
 * Parse Claude's plan response
 */
function parsePlanResponse(text) {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed.projectStructure) {
      throw new Error('projectStructure is required');
    }

    if (!parsed.pageObjectModel) {
      throw new Error('pageObjectModel is required');
    }

    if (!parsed.testFiles || !Array.isArray(parsed.testFiles)) {
      throw new Error('testFiles must be an array');
    }

    // Set defaults for optional fields
    parsed.fixtures = parsed.fixtures || [];
    parsed.helpers = parsed.helpers || [];
    parsed.configuration = parsed.configuration || {};
    parsed.bestPractices = parsed.bestPractices || {};
    parsed.cicdIntegration = parsed.cicdIntegration || {};

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse Playwright plan response: ${error.message}\n\nRaw response: ${text.substring(0, 500)}...`);
  }
}

export default {
  generateWithClaude
};
