/**
 * AI API Client for Business Logic Documentation
 *
 * Handles communication with AI APIs for business logic documentation generation
 */

import { generateCompletion } from '../../shared/aiClient.js';

/**
 * Generate documentation using AI
 *
 * @param {Object} params - Documentation parameters
 * @returns {Promise<Object>} Generated documentation
 */
export async function generateWithClaude(params) {
  const { className, sourceCode, format, model } = params;

  // Construct documentation prompt
  const prompt = buildDocumentationPrompt(className, sourceCode, format);

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
    const documentation = parseDocumentationResponse(generatedText);

    return documentation;

  } catch (error) {
    throw new Error(`AI API error: ${error.message}`);
  }
}

/**
 * Build documentation prompt
 */
function buildDocumentationPrompt(className, sourceCode, format) {
  return `You are an expert software documentation writer. Analyze this code and create comprehensive business logic documentation.

**Class Name:** ${className}

**Source Code:**
\`\`\`
${sourceCode}
\`\`\`

---

Create comprehensive business logic documentation. Return ONLY a JSON object with this structure:

{
  "overview": {
    "purpose": "What this class does from a business perspective",
    "responsibilities": ["List of key responsibilities"],
    "businessValue": "Why this exists, what business problem it solves"
  },
  "businessRules": [
    {
      "rule": "Business rule description",
      "implementation": "How it's implemented in code",
      "location": "Method/property where implemented",
      "rationale": "Why this rule exists"
    }
  ],
  "workflows": [
    {
      "name": "Workflow name (e.g., User Registration)",
      "trigger": "What initiates this workflow",
      "steps": [
        {
          "step": 1,
          "action": "What happens",
          "businessReason": "Why this step is needed",
          "method": "Method name"
        }
      ],
      "outcomes": ["Possible outcomes"],
      "edgeCases": ["Edge cases handled"]
    }
  ],
  "validationRules": [
    {
      "field": "Field or parameter name",
      "rule": "Validation rule",
      "errorMessage": "What user sees if validation fails",
      "businessJustification": "Why this validation exists"
    }
  ],
  "integrations": [
    {
      "system": "External system or service name",
      "purpose": "Why we integrate",
      "methods": ["Methods that interact with this system"],
      "dataExchanged": "What data is sent/received"
    }
  ],
  "securityConsiderations": [
    {
      "area": "Security area (authentication, authorization, data protection)",
      "implementation": "How it's secured",
      "sensitivity": "high|medium|low"
    }
  ],
  "dataFlow": {
    "inputs": [
      {
        "name": "Input name",
        "source": "Where it comes from",
        "purpose": "What it's used for"
      }
    ],
    "outputs": [
      {
        "name": "Output name",
        "destination": "Where it goes",
        "format": "Data format"
      }
    ],
    "transformations": ["How data is transformed"]
  },
  "businessExceptions": [
    {
      "exception": "Exception type",
      "businessScenario": "When this happens from business perspective",
      "userImpact": "What user experiences",
      "handlingStrategy": "How it's handled"
    }
  ],
  "decisionPoints": [
    {
      "decision": "What decision is being made",
      "criteria": "How decision is made",
      "outcomes": ["Possible outcomes"],
      "businessImpact": "Why this decision matters"
    }
  ],
  "performanceConsiderations": [
    {
      "area": "Performance area",
      "approach": "How performance is handled",
      "tradeoffs": "Any tradeoffs made"
    }
  ],
  "documentation": {
    "markdown": "Complete markdown documentation",
    "summary": "2-3 sentence executive summary"
  }
}

**Documentation Guidelines:**

1. **Focus on Business Logic:** Explain WHAT and WHY, not just HOW
2. **Business Perspective:** Use business terminology, not just technical terms
3. **User Impact:** Explain how code affects users and business operations
4. **Business Rules:** Extract and document all business rules clearly
5. **Workflows:** Describe complete business processes
6. **Validation:** Explain business reasons for validations
7. **Integrations:** Explain business need for external integrations
8. **Exceptions:** Explain business scenarios that cause exceptions
9. **Decisions:** Document business decision points and criteria
10. **Markdown:** Create comprehensive, well-formatted documentation

**Example Business Rule:**
{
  "rule": "Users must be 18 or older to register",
  "implementation": "Age validation in CreateUser method",
  "location": "UserService.CreateUser()",
  "rationale": "Legal requirement for handling personal data and contractual agreements"
}

Generate comprehensive business logic documentation. Return ONLY the JSON object.`;
}

/**
 * Parse Claude's documentation response
 */
function parseDocumentationResponse(text) {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed.overview) {
      throw new Error('overview is required');
    }

    // Set defaults for optional fields
    parsed.businessRules = parsed.businessRules || [];
    parsed.workflows = parsed.workflows || [];
    parsed.validationRules = parsed.validationRules || [];
    parsed.integrations = parsed.integrations || [];
    parsed.securityConsiderations = parsed.securityConsiderations || [];
    parsed.dataFlow = parsed.dataFlow || { inputs: [], outputs: [], transformations: [] };
    parsed.businessExceptions = parsed.businessExceptions || [];
    parsed.decisionPoints = parsed.decisionPoints || [];
    parsed.performanceConsiderations = parsed.performanceConsiderations || [];
    parsed.documentation = parsed.documentation || { markdown: '', summary: '' };

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse documentation response: ${error.message}\n\nRaw response: ${text.substring(0, 500)}...`);
  }
}

export default {
  generateWithClaude
};
