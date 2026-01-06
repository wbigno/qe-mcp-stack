/**
 * AI API Client for Integration Test Generation
 *
 * Handles communication with AI APIs for integration test generation
 */

import { generateCompletion } from '../../shared/aiClient.js';

/**
 * Generate integration tests using AI
 *
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Generated tests
 */
export async function generateWithClaude(params) {
  const {
    apiEndpoint,
    scenario,
    includeAuth,
    includeDatabase,
    model
  } = params;

  // Construct generation prompt
  const prompt = buildGenerationPrompt(
    apiEndpoint,
    scenario,
    includeAuth,
    includeDatabase
  );

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
    const tests = parseTestsResponse(generatedText);

    return tests;

  } catch (error) {
    throw new Error(`Claude API error: ${error.message}`);
  }
}

/**
 * Build integration test generation prompt
 */
function buildGenerationPrompt(apiEndpoint, scenario, includeAuth, includeDatabase) {
  return `You are an expert .NET integration test engineer. Generate comprehensive integration tests for an API endpoint.

**API Endpoint:** ${apiEndpoint}
**Test Scenario:** ${scenario || 'Full CRUD operations'}

---

Generate integration tests using:
- **xUnit** test framework
- **WebApplicationFactory** for in-memory API testing
- **Test Database** for data isolation
${includeAuth ? '- **Authentication/Authorization** testing' : ''}

Return ONLY a JSON object with this structure:

{
  "tests": [
    {
      "testName": "EndpointName_Scenario_ExpectedResult",
      "testCode": "// Complete xUnit integration test",
      "description": "What this test validates",
      "httpMethod": "GET|POST|PUT|DELETE",
      "endpoint": "/api/endpoint",
      "requiresAuth": true,
      "statusCode": 200,
      "testData": {},
      "category": "crud|authentication|validation|error-handling"
    }
  ],
  "setupCode": "// Test class setup and fixture code",
  "teardownCode": "// Cleanup code",
  "testDataSeed": {
    "description": "Test data seeding strategy",
    "seedMethods": ["// Seed method implementations"]
  },
  "testFixture": {
    "className": "ApiEndpointTests",
    "namespaces": ["using Microsoft.AspNetCore.Mvc.Testing;"],
    "baseClass": "IClassFixture<WebApplicationFactory<Program>>"
  }
}

**Test Generation Guidelines:**

1. **WebApplicationFactory Setup:**
   - Use WebApplicationFactory<Program> for hosting the API
   - Configure test services
   - Use in-memory database

2. **Test Structure:**
   - Arrange: Set up test data, create HTTP client
   - Act: Make HTTP request to endpoint
   - Assert: Verify status code, response body, database state

3. **HTTP Methods:**
   - GET: Test retrieval, filtering, pagination
   - POST: Test creation, validation, duplicates
   - PUT: Test updates, partial updates, not found
   - DELETE: Test deletion, cascade deletes, not found

4. **CRUD Scenarios:**
   - Create: Valid data, invalid data, duplicates
   - Read: Single item, list, not found, filtering
   - Update: Valid update, invalid data, not found
   - Delete: Successful delete, not found, cascade

${includeAuth ? `
5. **Authentication:**
   - Test with valid JWT token
   - Test with expired token
   - Test with missing token
   - Test with invalid token
   - Test authorization (wrong role/permissions)
` : ''}

${includeDatabase ? `
6. **Database Operations:**
   - Seed test data before each test
   - Clean up after each test
   - Use test database or in-memory database
   - Verify database state after operations
` : ''}

7. **Response Validation:**
   - Status codes (200, 201, 400, 401, 404, etc.)
   - Response body structure
   - Response headers
   - Error messages

8. **Test Naming:**
   - Format: \`HttpMethod_Scenario_ExpectedResult\`
   - Examples: \`GetUsers_ValidRequest_ReturnsUserList\`
   - Examples: \`PostUser_InvalidData_ReturnsBadRequest\`

**Code Example Template:**

\`\`\`csharp
[Fact]
public async Task GetUsers_ValidRequest_ReturnsUserList()
{
    // Arrange
    await SeedTestData();
    var client = _factory.CreateClient();
    
    // Act
    var response = await client.GetAsync("/api/users");
    
    // Assert
    response.EnsureSuccessStatusCode();
    var users = await response.Content.ReadFromJsonAsync<List<User>>();
    Assert.NotNull(users);
    Assert.True(users.Count > 0);
}
\`\`\`

Generate comprehensive integration tests covering all scenarios. Return ONLY the JSON object.`;
}

/**
 * Parse Claude's test generation response
 */
function parseTestsResponse(text) {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!Array.isArray(parsed.tests)) {
      throw new Error('tests must be an array');
    }

    if (!parsed.testFixture) {
      throw new Error('testFixture is required');
    }

    // Validate each test
    parsed.tests.forEach((test, index) => {
      if (!test.testName) throw new Error(`Test ${index} missing testName`);
      if (!test.testCode) throw new Error(`Test ${test.testName} missing testCode`);
      if (!test.description) throw new Error(`Test ${test.testName} missing description`);
      if (!test.httpMethod) throw new Error(`Test ${test.testName} missing httpMethod`);
      if (!test.endpoint) throw new Error(`Test ${test.testName} missing endpoint`);

      // Set defaults
      test.requiresAuth = test.requiresAuth !== undefined ? test.requiresAuth : false;
      test.statusCode = test.statusCode || 200;
      test.testData = test.testData || {};
      test.category = test.category || 'crud';
    });

    // Ensure other fields exist
    parsed.setupCode = parsed.setupCode || '';
    parsed.teardownCode = parsed.teardownCode || '';
    parsed.testDataSeed = parsed.testDataSeed || { description: '', seedMethods: [] };

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse integration test response: ${error.message}\n\nRaw response: ${text.substring(0, 500)}...`);
  }
}

export default {
  generateWithClaude
};
