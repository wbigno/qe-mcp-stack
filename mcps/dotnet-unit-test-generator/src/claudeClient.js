/**
 * Claude API Client for Unit Test Generation
 * 
 * Handles communication with Anthropic Claude API for generating xUnit tests
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Claude model to use
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

/**
 * Generate unit tests using Claude API
 * 
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Generated tests
 */
export async function generateWithClaude(params) {
  const { 
    className,
    methodName,
    sourceCode,
    includeNegativeTests,
    includeMocks
  } = params;

  // Construct generation prompt
  const prompt = buildGenerationPrompt(
    className,
    methodName,
    sourceCode,
    includeNegativeTests,
    includeMocks
  );

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0.3, // Lower temp for code generation
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
    const tests = parseTestsResponse(generatedText);

    return tests;

  } catch (error) {
    throw new Error(`Claude API error: ${error.message}`);
  }
}

/**
 * Build test generation prompt
 */
function buildGenerationPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks) {
  const methodScope = methodName ? `specifically the "${methodName}" method` : 'all public methods';
  
  return `You are an expert .NET test engineer. Generate comprehensive xUnit unit tests for a C# class.

**Class Name:** ${className}
**Test Scope:** ${methodScope}

**Source Code:**
\`\`\`csharp
${sourceCode}
\`\`\`

---

Generate xUnit unit tests following these requirements:

1. **Test Framework:** xUnit for .NET
2. **Naming Convention:** MethodName_Scenario_ExpectedBehavior
3. **Pattern:** Arrange-Act-Assert (AAA)
4. **Test Categories:**
   - Positive tests (happy path)
   ${includeNegativeTests ? '- Negative tests (error cases, invalid inputs)' : ''}
   - Edge cases (null, empty, boundary values)

${includeMocks ? `5. **Mocking:** Use Moq for dependencies. Create mock setup code for interfaces.` : ''}

Return ONLY a JSON object with this structure:

{
  "tests": [
    {
      "testName": "MethodName_ValidInput_ReturnsExpectedResult",
      "testCode": "// Full xUnit test method code",
      "description": "What this test validates",
      "category": "positive",
      "dependencies": ["Interface1", "Interface2"],
      "assertions": ["Assert.NotNull", "Assert.Equal"]
    }
  ],
  "mocks": [
    {
      "interfaceName": "IUserRepository",
      "mockCode": "// Mock setup code",
      "purpose": "Why this mock is needed"
    }
  ],
  "testFixture": {
    "className": "ClassNameTests",
    "namespaces": ["using Xunit;", "using Moq;"],
    "setupCode": "// Constructor or IClassFixture setup if needed"
  }
}

**Test Generation Guidelines:**

1. **Arrange Section:**
   - Set up test data
   - Create mock objects
   - Configure mock behavior
   - Initialize system under test

2. **Act Section:**
   - Call the method being tested
   - Capture return value or exception

3. **Assert Section:**
   - Verify return value
   - Verify mock interactions (VerifyAll, Verify)
   - Check state changes

4. **Positive Tests:** Cover main success scenarios
5. **Negative Tests:** 
   - Null arguments → ArgumentNullException
   - Invalid inputs → ArgumentException
   - Business rule violations → Custom exceptions
   
6. **Edge Cases:**
   - Empty strings/collections
   - Boundary values (min, max)
   - Special characters

7. **Mock Setup:**
   - Create mocks for all injected dependencies
   - Configure Returns() for method calls
   - Use Setup() for property access
   - Use Verify() to ensure methods were called

8. **Naming:**
   - Test class: \`{ClassName}Tests\`
   - Test methods: \`MethodName_Scenario_ExpectedResult\`

**Code Quality:**
- Include all necessary using statements
- Add comments explaining complex setups
- Use proper xUnit assertions (Assert.Equal, Assert.NotNull, etc.)
- Follow C# coding conventions

Generate comprehensive tests covering all scenarios. Return ONLY the JSON object.`;
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
      if (!test.category) throw new Error(`Test ${test.testName} missing category`);

      // Ensure arrays exist
      test.dependencies = test.dependencies || [];
      test.assertions = test.assertions || [];
    });

    // Ensure mocks array exists
    parsed.mocks = parsed.mocks || [];

    // Validate test fixture
    if (!parsed.testFixture.className) {
      throw new Error('testFixture.className is required');
    }

    parsed.testFixture.namespaces = parsed.testFixture.namespaces || [];
    parsed.testFixture.setupCode = parsed.testFixture.setupCode || '';

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse test generation response: ${error.message}\n\nRaw response: ${text.substring(0, 500)}...`);
  }
}

export default {
  generateWithClaude
};
