/**
 * AI API Client for Unit Test Generation
 *
 * Handles communication with AI APIs for generating xUnit tests
 */

import { generateCompletion } from '../../shared/aiClient.js';

/**
 * Generate unit tests using AI
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
    includeMocks,
    onlyNegativeTests,
    model
  } = params;

  // Construct generation prompt
  const prompt = buildGenerationPrompt(
    className,
    methodName,
    sourceCode,
    includeNegativeTests,
    includeMocks,
    onlyNegativeTests
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
      maxTokens: 4000,
      temperature: 0.3 // Lower temp for code generation
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
 * Build test generation prompt
 */
function buildGenerationPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks, onlyNegativeTests) {
  const methodScope = methodName ? `specifically the "${methodName}" method` : 'all public methods';

  // If generating only negative tests, customize the prompt
  if (onlyNegativeTests) {
    return `You are an expert .NET test engineer. Generate ONLY negative/error scenario xUnit tests for methods that are missing negative test coverage.

**Class Name:** ${className}
**Test Scope:** ${methodScope}

**Source Code:**
\`\`\`csharp
${sourceCode}
\`\`\`

---

**CRITICAL**: Generate ONLY negative/error scenario tests. DO NOT generate positive tests or happy path tests.

Generate xUnit unit tests following these requirements:

1. **Test Framework:** xUnit for .NET
2. **Naming Convention:** MethodName_InvalidScenario_ExpectedBehavior
3. **Pattern:** Arrange-Act-Assert (AAA)
4. **Focus ONLY on:**
   - ❌ Null argument tests → ArgumentNullException
   - ❌ Invalid input tests → ArgumentException
   - ❌ Business rule violations → Custom exceptions
   - ❌ Boundary violations (negative numbers, empty strings, etc.)
   - ❌ Error conditions and failure scenarios

${includeMocks ? `5. **Mocking:** Use Moq for dependencies when needed.` : ''}`;
  }

  // Original prompt for full test generation
  return `You are an expert .NET test engineer. Generate 2-3 essential xUnit unit tests for a C# class.

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

**IMPORTANT**: Return ONLY a valid, properly-escaped JSON object. All string values (especially testCode and mockCode) must use \\n for newlines, not actual line breaks. The response must be parseable by JSON.parse().

Return a JSON object with this structure:

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

Generate 2-3 focused, high-value tests. Return ONLY the JSON object in compact format (no pretty-printing, all code as escaped single-line strings with \\n for line breaks).`;
}

/**
 * Parse Claude's test generation response
 */
function parseTestsResponse(text) {
  try {
    // Extract JSON from the response (handles markdown blocks and surrounding text)
    let jsonText = text;

    // Try to find JSON within markdown code blocks first
    const codeBlockMatch = text.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    } else {
      // If no code block, try to find JSON object directly
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    // Parse JSON
    const parsed = JSON.parse(jsonText);

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
