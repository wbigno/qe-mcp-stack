/**
 * Claude API Client for Test Case Generation
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
 * Generate test cases using Claude API
 * 
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Generated test cases
 */
export async function generateWithClaude(params) {
  const { 
    storyId, 
    requirements, 
    acceptanceCriteria,
    includeNegative,
    includeEdgeCases 
  } = params;

  // Construct generation prompt
  const prompt = buildGenerationPrompt(
    storyId, 
    requirements, 
    acceptanceCriteria,
    includeNegative,
    includeEdgeCases
  );

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192, // Higher token limit for generating multiple test cases
      temperature: 0.4, // Slightly higher for creative test scenarios
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
    const testCases = parseTestCasesResponse(generatedText);

    return testCases;

  } catch (error) {
    throw new Error(`Claude API error: ${error.message}`);
  }
}

/**
 * Build test case generation prompt
 */
function buildGenerationPrompt(storyId, requirements, acceptanceCriteria, includeNegative, includeEdgeCases) {
  return `You are an expert QA test case designer. Generate comprehensive test cases for the following user story.

**Story ID:** ${storyId}

**Requirements:**
${requirements || 'See acceptance criteria below'}

**Acceptance Criteria:**
${acceptanceCriteria || 'No acceptance criteria provided'}

---

Generate comprehensive test cases in JSON format. Include:
- Positive test cases (happy path scenarios)
${includeNegative ? '- Negative test cases (error handling, invalid inputs)' : ''}
${includeEdgeCases ? '- Edge case test cases (boundary conditions, unusual scenarios)' : ''}

Return ONLY a JSON object with this exact structure:

{
  "testCases": [
    {
      "id": "TC001",
      "title": "Test case title",
      "description": "Detailed description of what this test validates",
      "preconditions": ["Precondition 1", "Precondition 2"],
      "steps": [
        {
          "stepNumber": 1,
          "action": "User action to perform",
          "expectedResult": "What should happen"
        }
      ],
      "postconditions": ["State after test execution"],
      "testData": {
        "field1": "value1",
        "field2": "value2"
      },
      "priority": "high",
      "category": "positive",
      "estimatedDuration": "5 minutes",
      "tags": ["tag1", "tag2"]
    }
  ]
}

**Guidelines:**

1. **Test Case IDs:** Use sequential IDs: TC001, TC002, TC003, etc.

2. **Categories:**
   - "positive" - Happy path scenarios
   - "negative" - Error handling, invalid inputs
   - "edge-case" - Boundary conditions, unusual scenarios

3. **Priority Levels:**
   - "high" - Critical functionality, must pass
   - "medium" - Important but not critical
   - "low" - Nice to have, edge scenarios

4. **Steps:**
   - Each step should be clear and actionable
   - Include specific data values where relevant
   - Expected results should be measurable/verifiable

5. **Test Data:**
   - Provide realistic sample data
   - Include both valid and invalid data for negative tests
   - Consider boundary values for edge cases

6. **Preconditions:**
   - System state required before test
   - User permissions/roles needed
   - Data setup requirements

7. **Postconditions:**
   - Expected system state after test
   - Data changes that should occur
   - Cleanup considerations

8. **Tags:**
   - Feature area (e.g., "authentication", "scheduling")
   - Test type (e.g., "smoke", "regression")
   - Platform (e.g., "web", "mobile", "api")

**Coverage Requirements:**
- Generate 3-5 positive test cases for main scenarios
${includeNegative ? '- Generate 2-3 negative test cases for error handling' : ''}
${includeEdgeCases ? '- Generate 1-2 edge case tests for boundary conditions' : ''}

Return ONLY the JSON object, no additional text.`;
}

/**
 * Parse Claude's test case response
 */
function parseTestCasesResponse(text) {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!Array.isArray(parsed.testCases)) {
      throw new Error('testCases must be an array');
    }

    // Validate each test case
    parsed.testCases.forEach((tc, index) => {
      if (!tc.id) throw new Error(`Test case ${index} missing id`);
      if (!tc.title) throw new Error(`Test case ${tc.id} missing title`);
      if (!tc.description) throw new Error(`Test case ${tc.id} missing description`);
      if (!Array.isArray(tc.steps)) throw new Error(`Test case ${tc.id} missing steps array`);
      if (!tc.category) throw new Error(`Test case ${tc.id} missing category`);
      if (!tc.priority) throw new Error(`Test case ${tc.id} missing priority`);

      // Ensure arrays exist
      tc.preconditions = tc.preconditions || [];
      tc.postconditions = tc.postconditions || [];
      tc.testData = tc.testData || {};
      tc.tags = tc.tags || [];
      tc.estimatedDuration = tc.estimatedDuration || '5 minutes';
    });

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse test cases response: ${error.message}\n\nRaw response: ${text.substring(0, 500)}...`);
  }
}

export default {
  generateWithClaude
};
