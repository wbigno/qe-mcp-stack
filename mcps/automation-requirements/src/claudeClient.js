/**
 * Claude API Client for Automation Requirements Generation
 * 
 * Handles communication with Anthropic Claude API
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Claude model to use
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

/**
 * Generate automation requirements using Claude API
 * 
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Automation requirements
 */
export async function generateWithClaude(params) {
  const { 
    storyId,
    testCases,
    automationLevel
  } = params;

  // Construct generation prompt
  const prompt = buildGenerationPrompt(storyId, testCases, automationLevel);

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0.4,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text content from response
    const generatedText = response.content[0].text;

    // Parse the structured response
    const requirements = parseRequirementsResponse(generatedText);

    return requirements;

  } catch (error) {
    throw new Error(`Claude API error: ${error.message}`);
  }
}

/**
 * Build automation requirements generation prompt
 */
function buildGenerationPrompt(storyId, testCases, automationLevel) {
  const testCasesSummary = testCases.map((tc, idx) => 
    `${idx + 1}. ${tc.title || tc.testName || 'Test Case ' + (idx + 1)}\n   Category: ${tc.category || 'unknown'}\n   Priority: ${tc.priority || 'medium'}`
  ).join('\n');

  return `You are an expert test automation architect. Analyze test cases and create comprehensive automation requirements.

**Story ID:** ${storyId}
**Automation Level:** ${automationLevel} (unit, integration, e2e, or all)

**Test Cases to Automate:**
${testCasesSummary}

**Full Test Case Details:**
${JSON.stringify(testCases, null, 2)}

---

Create comprehensive automation requirements and strategy. Return ONLY a JSON object with this structure:

{
  "feasibility": {
    "overall": "high|medium|low",
    "score": 85,
    "reasoning": "Explanation of feasibility assessment"
  },
  "automationStrategy": {
    "recommendedApproach": "Playwright E2E, API integration tests, xUnit unit tests",
    "testLevels": {
      "unit": {
        "recommended": true,
        "percentage": 60,
        "reasoning": "Why unit tests recommended",
        "frameworks": ["xUnit", "NUnit"],
        "testCount": 12
      },
      "integration": {
        "recommended": true,
        "percentage": 30,
        "reasoning": "Why integration tests recommended",
        "frameworks": ["WebApplicationFactory", "RestSharp"],
        "testCount": 6
      },
      "e2e": {
        "recommended": true,
        "percentage": 10,
        "reasoning": "Why E2E tests recommended",
        "frameworks": ["Playwright"],
        "testCount": 3
      }
    },
    "prioritization": [
      {
        "priority": 1,
        "testCases": ["TC001", "TC002"],
        "reasoning": "Critical path features"
      }
    ]
  },
  "technicalRequirements": {
    "frameworks": ["Playwright", "xUnit", "Moq"],
    "infrastructure": ["CI/CD pipeline", "Test database", "Test environment"],
    "dependencies": ["Node.js", ".NET 8", "Docker"],
    "dataManagement": {
      "strategy": "Test data factory with fixtures",
      "requirements": ["User data", "Test accounts", "Sample transactions"]
    },
    "environmentSetup": [
      "Configure test database",
      "Set up authentication tokens",
      "Deploy test environment"
    ]
  },
  "automationPlan": {
    "phases": [
      {
        "phase": 1,
        "name": "Foundation",
        "duration": "1 week",
        "tasks": [
          "Set up test frameworks",
          "Create test data factories",
          "Implement Page Object Model"
        ],
        "deliverables": ["Test infrastructure", "Reusable utilities"]
      }
    ],
    "estimatedEffort": {
      "setup": "40 hours",
      "testDevelopment": "80 hours",
      "maintenance": "10 hours/month",
      "total": "120 hours initial + ongoing maintenance"
    }
  },
  "pageObjectModel": {
    "pages": [
      {
        "pageName": "LoginPage",
        "elements": ["usernameField", "passwordField", "loginButton"],
        "methods": ["login(username, password)", "isLoginSuccessful()"]
      }
    ],
    "components": [
      {
        "componentName": "NavigationBar",
        "elements": ["homeLink", "profileLink", "logoutButton"]
      }
    ]
  },
  "testDataStrategy": {
    "approach": "Test data factory pattern with builders",
    "fixtures": [
      {
        "name": "ValidUser",
        "description": "Standard test user with all permissions",
        "data": {"username": "testuser", "role": "admin"}
      }
    ],
    "generators": [
      "UserBuilder - generates user test data",
      "AppointmentBuilder - generates appointment test data"
    ],
    "cleanup": "AfterEach hook cleans test data"
  },
  "cicdIntegration": {
    "triggerStrategy": "Run on PR and nightly",
    "parallelization": "Run tests in parallel using xUnit collections",
    "reportingStrategy": "Generate HTML reports and upload to Azure DevOps",
    "failureHandling": "Retry flaky tests once, screenshot on failure"
  },
  "risksMitigations": [
    {
      "risk": "Test flakiness due to timing issues",
      "mitigation": "Use explicit waits, implement retry logic",
      "severity": "medium"
    }
  ],
  "maintenanceStrategy": {
    "updateFrequency": "Review tests with each sprint",
    "ownershipModel": "QA team owns framework, devs contribute tests",
    "documentationPlan": "Maintain README with setup instructions"
  },
  "successMetrics": {
    "coverage": "80% code coverage",
    "executionTime": "All tests complete in under 10 minutes",
    "passRate": "95% pass rate on stable builds",
    "defectDetection": "Catch 90% of bugs before production"
  }
}

**Analysis Guidelines:**

1. **Feasibility Assessment:**
   - High (80-100): Straightforward automation, clear UI elements, stable application
   - Medium (50-79): Some manual steps needed, moderate complexity
   - Low (<50): Heavy manual verification, unstable UI, limited automation value

2. **Test Level Distribution:**
   - Unit tests (60-70%): Fast, isolated, test business logic
   - Integration tests (20-30%): Test API endpoints, database operations
   - E2E tests (10-20%): Critical user flows only

3. **Framework Selection:**
   - Playwright: Modern, reliable, great for E2E
   - xUnit: Standard .NET unit testing
   - WebApplicationFactory: .NET integration testing

4. **Prioritization:**
   - Priority 1: Critical path, high business value
   - Priority 2: Important but not critical
   - Priority 3: Nice to have, low risk

5. **Page Object Model:**
   - One page class per application page
   - Encapsulate element locators
   - Provide action methods

6. **Test Data:**
   - Builder pattern for complex objects
   - Fixtures for common scenarios
   - Clean up after each test

7. **CI/CD:**
   - Run fast tests on every PR
   - Run full suite nightly
   - Parallel execution for speed

Generate comprehensive automation requirements. Return ONLY the JSON object.`;
}

/**
 * Parse Claude's requirements response
 */
function parseRequirementsResponse(text) {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed.feasibility) {
      throw new Error('feasibility is required');
    }

    if (!parsed.automationStrategy) {
      throw new Error('automationStrategy is required');
    }

    if (!parsed.technicalRequirements) {
      throw new Error('technicalRequirements is required');
    }

    // Set defaults for optional fields
    parsed.automationPlan = parsed.automationPlan || { phases: [], estimatedEffort: {} };
    parsed.pageObjectModel = parsed.pageObjectModel || { pages: [], components: [] };
    parsed.testDataStrategy = parsed.testDataStrategy || { approach: '', fixtures: [], generators: [] };
    parsed.cicdIntegration = parsed.cicdIntegration || {};
    parsed.risksMitigations = parsed.risksMitigations || [];
    parsed.maintenanceStrategy = parsed.maintenanceStrategy || {};
    parsed.successMetrics = parsed.successMetrics || {};

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse automation requirements response: ${error.message}\n\nRaw response: ${text.substring(0, 500)}...`);
  }
}

export default {
  generateWithClaude
};
