/**
 * Claude API Client
 * 
 * Handles communication with Anthropic Claude API for requirements analysis
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Claude model to use
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

/**
 * Analyze requirements using Claude API
 * 
 * @param {Object} params - Analysis parameters
 * @param {number} params.storyId - Story ID
 * @param {Object} params.storyContent - Story content
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeWithClaude({ storyId, storyContent }) {
  const { title, description, acceptanceCriteria } = storyContent;

  // Construct analysis prompt
  const prompt = buildAnalysisPrompt(storyId, title, description, acceptanceCriteria);

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent analysis
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text content from response
    const analysisText = response.content[0].text;

    // Parse the structured response
    const analysis = parseAnalysisResponse(analysisText);

    return analysis;

  } catch (error) {
    throw new Error(`Claude API error: ${error.message}`);
  }
}

/**
 * Build analysis prompt for Claude
 */
function buildAnalysisPrompt(storyId, title, description, acceptanceCriteria) {
  return `You are an expert QA analyst reviewing a user story for completeness, clarity, and testability.

**User Story ID:** ${storyId}

**Title:**
${title}

**Description:**
${description || 'No description provided'}

**Acceptance Criteria:**
${acceptanceCriteria || 'No acceptance criteria provided'}

---

Please analyze this user story and provide a comprehensive assessment. Your analysis must be returned as valid JSON with the following structure:

{
  "completenessScore": <number 0-100>,
  "testabilityScore": <number 0-100>,
  "missingRequirements": [<array of strings>],
  "ambiguousRequirements": [<array of strings>],
  "recommendations": [<array of strings>],
  "gaps": [
    {
      "category": "<string: functional|non-functional|data|ui|integration|edge-cases>",
      "description": "<string>",
      "severity": "<high|medium|low>"
    }
  ],
  "strengths": [<array of strings>],
  "summary": "<string: 2-3 sentence overall assessment>"
}

**Analysis Guidelines:**

1. **Completeness Score (0-100):**
   - Are all functional requirements clearly specified?
   - Are non-functional requirements (performance, security, etc.) addressed?
   - Are data requirements specified?
   - Are UI/UX requirements clear?
   - Are integration requirements documented?
   - Are edge cases and error scenarios covered?

2. **Testability Score (0-100):**
   - Can acceptance criteria be translated directly into test cases?
   - Are expected behaviors clearly defined?
   - Are measurable outcomes specified?
   - Are preconditions and postconditions clear?

3. **Missing Requirements:**
   - List specific requirements that should be included but are missing
   - Examples: "Missing error handling for invalid input", "No performance requirements specified"

4. **Ambiguous Requirements:**
   - List requirements that are unclear, vague, or open to interpretation
   - Examples: "Fast response time" (how fast?), "User-friendly interface" (what does this mean?)

5. **Recommendations:**
   - Specific, actionable improvements to make the story better
   - Prioritize high-impact recommendations

6. **Gaps:**
   - Categorize gaps by type (functional, non-functional, data, ui, integration, edge-cases)
   - Assign severity (high = blocks testing, medium = impacts quality, low = nice to have)

7. **Strengths:**
   - What is done well in this story?
   - Positive aspects to reinforce

**Important:** Return ONLY the JSON object, no additional text or markdown formatting.`;
}

/**
 * Parse Claude's analysis response
 */
function parseAnalysisResponse(text) {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (typeof parsed.completenessScore !== 'number') {
      throw new Error('Invalid completenessScore');
    }

    if (typeof parsed.testabilityScore !== 'number') {
      throw new Error('Invalid testabilityScore');
    }

    // Ensure arrays exist
    parsed.missingRequirements = parsed.missingRequirements || [];
    parsed.ambiguousRequirements = parsed.ambiguousRequirements || [];
    parsed.recommendations = parsed.recommendations || [];
    parsed.gaps = parsed.gaps || [];
    parsed.strengths = parsed.strengths || [];

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse Claude response: ${error.message}\n\nRaw response: ${text}`);
  }
}

export default {
  analyzeWithClaude
};
