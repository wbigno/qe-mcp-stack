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
    model,
    testFramework = 'xUnit' // Default to xUnit for backwards compatibility
  } = params;

  // Construct generation prompt
  const prompt = buildGenerationPrompt(
    className,
    methodName,
    sourceCode,
    includeNegativeTests,
    includeMocks,
    onlyNegativeTests,
    testFramework
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
function buildGenerationPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks, onlyNegativeTests, testFramework) {
  // Delegate to framework-specific prompt builder
  switch (testFramework.toLowerCase()) {
    case 'xunit':
      return buildXUnitPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks, onlyNegativeTests);
    case 'mstest':
      return buildMSTestPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks, onlyNegativeTests);
    case 'nunit':
      return buildNUnitPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks, onlyNegativeTests);
    default:
      throw new Error(`Unsupported test framework: ${testFramework}. Supported frameworks: xUnit, MSTest, NUnit`);
  }
}

/**
 * Build xUnit test generation prompt
 */
function buildXUnitPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks, onlyNegativeTests) {
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

${includeMocks ? `5. **Mocking:** Use Moq for dependencies when needed.` : ''}

**IMPORTANT**: Return ONLY a valid, properly-escaped JSON object. All string values (especially testCode and mockCode) must use \\n for newlines, not actual line breaks. The response must be parseable by JSON.parse().

Return a JSON object with this structure:

{
  "tests": [
    {
      "testName": "MethodName_NullArgument_ThrowsArgumentNullException",
      "testCode": "// Full xUnit negative test method code",
      "description": "Validates that null arguments are properly rejected",
      "category": "negative",
      "dependencies": ["Interface1"],
      "assertions": ["Assert.Throws<ArgumentNullException>"]
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

Focus on comprehensive negative test coverage for error scenarios.`;
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
 * Build MSTest test generation prompt
 */
function buildMSTestPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks, onlyNegativeTests) {
  const methodScope = methodName ? `specifically the "${methodName}" method` : 'all public methods';

  // If generating only negative tests, customize the prompt
  if (onlyNegativeTests) {
    return `You are an expert .NET test engineer. Generate ONLY negative/error scenario MSTest tests for methods that are missing negative test coverage.

**Class Name:** ${className}
**Test Scope:** ${methodScope}

**Source Code:**
\`\`\`csharp
${sourceCode}
\`\`\`

---

**CRITICAL**: Generate ONLY negative/error scenario tests. DO NOT generate positive tests or happy path tests.

Generate MSTest unit tests following these requirements:

1. **Test Framework:** MSTest for .NET
2. **Naming Convention:** MethodName_InvalidScenario_ExpectedBehavior
3. **Pattern:** Arrange-Act-Assert (AAA)
4. **Focus ONLY on:**
   - ❌ Null argument tests → ArgumentNullException
   - ❌ Invalid input tests → ArgumentException
   - ❌ Business rule violations → Custom exceptions
   - ❌ Boundary violations (negative numbers, empty strings, etc.)
   - ❌ Error conditions and failure scenarios

${includeMocks ? `5. **Mocking:** Use Moq for dependencies when needed.` : ''}

**IMPORTANT**: Return ONLY a valid, properly-escaped JSON object. All string values (especially testCode and mockCode) must use \\n for newlines, not actual line breaks. The response must be parseable by JSON.parse().

Return a JSON object with this structure:

{
  "tests": [
    {
      "testName": "MethodName_NullArgument_ThrowsArgumentNullException",
      "testCode": "// Full MSTest negative test method code with [TestMethod] attribute",
      "description": "Validates that null arguments are properly rejected",
      "category": "negative",
      "dependencies": ["Interface1"],
      "assertions": ["Assert.ThrowsException<ArgumentNullException>"]
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
    "namespaces": ["using Microsoft.VisualStudio.TestTools.UnitTesting;", "using Moq;"],
    "setupCode": "// Constructor or [TestInitialize] setup if needed"
  }
}

Focus on comprehensive negative test coverage for error scenarios. Use MSTest assertions like Assert.ThrowsException<T>, Assert.AreEqual, Assert.IsTrue, Assert.IsNotNull.`;
  }

  // Original prompt for full test generation
  return `You are an expert .NET test engineer. Generate 2-3 essential MSTest unit tests for a C# class.

**Class Name:** ${className}
**Test Scope:** ${methodScope}

**Source Code:**
\`\`\`csharp
${sourceCode}
\`\`\`

---

Generate MSTest unit tests following these requirements:

1. **Test Framework:** MSTest for .NET
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
      "testCode": "// Full MSTest test method code with [TestMethod] attribute",
      "description": "What this test validates",
      "category": "positive",
      "dependencies": ["Interface1", "Interface2"],
      "assertions": ["Assert.IsNotNull", "Assert.AreEqual"]
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
    "namespaces": ["using Microsoft.VisualStudio.TestTools.UnitTesting;", "using Moq;"],
    "setupCode": "// Constructor or [TestInitialize] setup if needed"
  }
}

**Test Generation Guidelines:**

1. **Test Class:** Must have [TestClass] attribute
2. **Test Methods:** Must have [TestMethod] attribute
3. **Arrange Section:**
   - Set up test data
   - Create mock objects
   - Configure mock behavior
   - Initialize system under test

4. **Act Section:**
   - Call the method being tested
   - Capture return value or exception

5. **Assert Section:**
   - Use MSTest assertions: Assert.AreEqual, Assert.IsNotNull, Assert.IsTrue, Assert.IsFalse
   - Verify mock interactions (VerifyAll, Verify)
   - Check state changes

6. **Positive Tests:** Cover main success scenarios
7. **Negative Tests:**
   - Null arguments → Assert.ThrowsException<ArgumentNullException>
   - Invalid inputs → Assert.ThrowsException<ArgumentException>
   - Business rule violations → Assert.ThrowsException<CustomException>

8. **Edge Cases:**
   - Empty strings/collections
   - Boundary values (min, max)
   - Special characters

9. **Naming:**
   - Test class: \`{ClassName}Tests\` with [TestClass] attribute
   - Test methods: \`MethodName_Scenario_ExpectedResult\` with [TestMethod] attribute

**Code Quality:**
- Include all necessary using statements
- Add comments explaining complex setups
- Use proper MSTest assertions (Assert.AreEqual, Assert.IsNotNull, etc.)
- Follow C# coding conventions
- Mark test class with [TestClass] and test methods with [TestMethod]

Generate 2-3 focused, high-value tests. Return ONLY the JSON object in compact format (no pretty-printing, all code as escaped single-line strings with \\n for line breaks).`;
}

/**
 * Build NUnit test generation prompt
 */
function buildNUnitPrompt(className, methodName, sourceCode, includeNegativeTests, includeMocks, onlyNegativeTests) {
  const methodScope = methodName ? `specifically the "${methodName}" method` : 'all public methods';

  // If generating only negative tests, customize the prompt
  if (onlyNegativeTests) {
    return `You are an expert .NET test engineer. Generate ONLY negative/error scenario NUnit tests for methods that are missing negative test coverage.

**Class Name:** ${className}
**Test Scope:** ${methodScope}

**Source Code:**
\`\`\`csharp
${sourceCode}
\`\`\`

---

**CRITICAL**: Generate ONLY negative/error scenario tests. DO NOT generate positive tests or happy path tests.

Generate NUnit unit tests following these requirements:

1. **Test Framework:** NUnit for .NET
2. **Naming Convention:** MethodName_InvalidScenario_ExpectedBehavior
3. **Pattern:** Arrange-Act-Assert (AAA)
4. **Focus ONLY on:**
   - ❌ Null argument tests → ArgumentNullException
   - ❌ Invalid input tests → ArgumentException
   - ❌ Business rule violations → Custom exceptions
   - ❌ Boundary violations (negative numbers, empty strings, etc.)
   - ❌ Error conditions and failure scenarios

${includeMocks ? `5. **Mocking:** Use Moq for dependencies when needed.` : ''}

**IMPORTANT**: Return ONLY a valid, properly-escaped JSON object. All string values (especially testCode and mockCode) must use \\n for newlines, not actual line breaks. The response must be parseable by JSON.parse().

Return a JSON object with this structure:

{
  "tests": [
    {
      "testName": "MethodName_NullArgument_ThrowsArgumentNullException",
      "testCode": "// Full NUnit negative test method code with [Test] attribute",
      "description": "Validates that null arguments are properly rejected",
      "category": "negative",
      "dependencies": ["Interface1"],
      "assertions": ["Assert.Throws<ArgumentNullException>"]
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
    "namespaces": ["using NUnit.Framework;", "using Moq;"],
    "setupCode": "// [SetUp] method if needed"
  }
}

Focus on comprehensive negative test coverage for error scenarios. Use NUnit assertions like Assert.Throws<T>, Assert.That, Assert.AreEqual, Assert.IsTrue, Assert.IsNotNull.`;
  }

  // Original prompt for full test generation
  return `You are an expert .NET test engineer. Generate 2-3 essential NUnit unit tests for a C# class.

**Class Name:** ${className}
**Test Scope:** ${methodScope}

**Source Code:**
\`\`\`csharp
${sourceCode}
\`\`\`

---

Generate NUnit unit tests following these requirements:

1. **Test Framework:** NUnit for .NET
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
      "testCode": "// Full NUnit test method code with [Test] attribute",
      "description": "What this test validates",
      "category": "positive",
      "dependencies": ["Interface1", "Interface2"],
      "assertions": ["Assert.IsNotNull", "Assert.AreEqual"]
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
    "namespaces": ["using NUnit.Framework;", "using Moq;"],
    "setupCode": "// [SetUp] method if needed"
  }
}

**Test Generation Guidelines:**

1. **Test Class:** Must have [TestFixture] attribute
2. **Test Methods:** Must have [Test] attribute
3. **Arrange Section:**
   - Set up test data
   - Create mock objects
   - Configure mock behavior
   - Initialize system under test

4. **Act Section:**
   - Call the method being tested
   - Capture return value or exception

5. **Assert Section:**
   - Use NUnit assertions: Assert.AreEqual, Assert.That, Assert.IsNotNull, Assert.IsTrue
   - Use constraint model: Assert.That(actual, Is.EqualTo(expected))
   - Verify mock interactions (VerifyAll, Verify)
   - Check state changes

6. **Positive Tests:** Cover main success scenarios
7. **Negative Tests:**
   - Null arguments → Assert.Throws<ArgumentNullException>
   - Invalid inputs → Assert.Throws<ArgumentException>
   - Business rule violations → Assert.Throws<CustomException>

8. **Edge Cases:**
   - Empty strings/collections
   - Boundary values (min, max)
   - Special characters

9. **Naming:**
   - Test class: \`{ClassName}Tests\` with [TestFixture] attribute
   - Test methods: \`MethodName_Scenario_ExpectedResult\` with [Test] attribute

**Code Quality:**
- Include all necessary using statements
- Add comments explaining complex setups
- Use proper NUnit assertions (Assert.That, Assert.AreEqual, etc.)
- Follow C# coding conventions
- Mark test class with [TestFixture] and test methods with [Test]

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
