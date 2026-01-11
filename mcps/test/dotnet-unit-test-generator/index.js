#!/usr/bin/env node

/**
 * .NET Unit Test Generator STDIO MCP
 * Generates xUnit/NUnit/MSTest unit tests for .NET code using Claude AI
 */

const Anthropic = require("@anthropic-ai/sdk");

// Read input from stdin
let inputData = "";

process.stdin.on("data", (chunk) => {
  inputData += chunk.toString();
});

process.stdin.on("end", async () => {
  try {
    const input = JSON.parse(inputData);
    const result = await generateUnitTests(input.data);

    process.stdout.write(
      JSON.stringify({
        success: true,
        result,
      }),
    );
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n${error.stack}\n`);
    process.exit(1);
  }
});

async function generateUnitTests(data) {
  const {
    app,
    className,
    sourceCode,
    includeNegativeTests = true,
    includeMocks = true,
    onlyNegativeTests = false,
    testFramework = "xUnit",
    model = "claude-3-5-sonnet-20241022",
  } = data;

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 2,
    timeout: 60000,
  });

  // Build prompt
  const testType = onlyNegativeTests
    ? "negative/error scenario"
    : "comprehensive";
  const mockInfo = includeMocks
    ? "\n- Use Moq for mocking dependencies"
    : "\n- Do not use mocking frameworks";
  const negativeInfo = includeNegativeTests
    ? "\n- Include negative test cases (null checks, invalid inputs, exceptions)"
    : "";

  const prompt = `You are a senior .NET test engineer. Generate ${testType} unit tests for the following C# class using ${testFramework}.

**Requirements:**
- Generate complete, production-ready test class${mockInfo}${negativeInfo}
- Follow ${testFramework} best practices and conventions
- Use clear, descriptive test method names
- Include Arrange-Act-Assert pattern
- Add helpful comments for complex test scenarios
- Ensure tests are isolated and independent
${onlyNegativeTests ? "- ONLY generate tests for error scenarios, edge cases, and exception handling\n- Focus on null checks, invalid inputs, boundary conditions" : "- Cover happy path and edge cases\n- Test all public methods"}

**Source Code:**
\`\`\`csharp
${sourceCode}
\`\`\`

Generate the complete test file. Include:
1. All necessary using statements
2. Test class with proper naming (${className}Tests)
3. Test methods with proper attributes (${testFramework === "xUnit" ? "[Fact]" : testFramework === "NUnit" ? "[Test]" : "[TestMethod]"})
4. Setup/cleanup if needed

Return ONLY the complete C# test file code, no explanations or markdown.`;

  // Call Claude API
  let response;
  try {
    response = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
  } catch (apiError) {
    throw new Error(
      `Anthropic API error: ${apiError.message}\nStatus: ${apiError.status}\nDetails: ${JSON.stringify(apiError)}`,
    );
  }

  const testCode = response.content[0].text;

  return {
    className,
    testFramework,
    testCode,
    completeTestFile: testCode,
    metadata: {
      includeNegativeTests,
      includeMocks,
      onlyNegativeTests,
      model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}
