/**
 * AI API Client for Change Impact Analysis
 *
 * Handles communication with AI APIs for change impact analysis
 */

import { generateCompletion } from '../../shared/aiClient.js';

/**
 * Analyze change impact using AI
 *
 * @param {Object} params - Analysis parameters
 * @returns {Promise<Object>} Impact analysis
 */
export async function analyzeWithClaude(params) {
  const { changes, context, model } = params;

  // Construct analysis prompt
  const prompt = buildAnalysisPrompt(changes, context);

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
    const analysis = parseAnalysisResponse(generatedText);

    return analysis;

  } catch (error) {
    throw new Error(`AI API error: ${error.message}`);
  }
}

/**
 * Build analysis prompt
 */
function buildAnalysisPrompt(changes, context) {
  return `You are an expert software architect and code reviewer. Analyze the impact of code changes and provide comprehensive recommendations.

**Changes:**
${JSON.stringify(changes, null, 2)}

${context ? `**Additional Context:**
${context}` : ''}

---

Analyze these code changes and provide a comprehensive impact assessment. Return ONLY a JSON object with this structure:

{
  "summary": "Brief 2-3 sentence summary of changes and overall impact",
  "impactAreas": [
    {
      "area": "Authentication",
      "severity": "high",
      "description": "Changes affect login flow and token validation",
      "affectedComponents": ["LoginService", "AuthMiddleware"],
      "potentialIssues": [
        "Existing sessions may be invalidated",
        "Token refresh logic may break"
      ]
    }
  ],
  "breakingChanges": [
    {
      "change": "Modified User model - removed 'middleName' field",
      "impact": "Database migration required, API contract changed",
      "severity": "critical",
      "mitigation": "Update API version, create migration script"
    }
  ],
  "securityImplications": [
    {
      "concern": "Password validation logic changed",
      "severity": "high",
      "description": "New regex pattern may accept weaker passwords",
      "recommendation": "Review password strength requirements"
    }
  ],
  "performanceImplications": [
    {
      "concern": "Added N+1 query in user listing",
      "severity": "medium",
      "description": "Loop queries database for each user",
      "recommendation": "Use eager loading or projection"
    }
  ],
  "testingRecommendations": {
    "unitTests": [
      "Test password validation with edge cases",
      "Test User model serialization without middleName"
    ],
    "integrationTests": [
      "Test login flow end-to-end",
      "Test token refresh after changes"
    ],
    "e2eTests": [
      "Test complete user registration and login flow"
    ],
    "manualTests": [
      "Verify existing users can still log in",
      "Test password reset flow"
    ]
  },
  "deploymentConsiderations": {
    "prerequisites": [
      "Run database migration",
      "Update API documentation"
    ],
    "rollbackPlan": "Revert migration, restore previous User model",
    "monitoring": [
      "Watch for authentication failures",
      "Monitor API response times"
    ],
    "order": "Deploy database changes first, then application code"
  },
  "dataImpact": {
    "migrations": [
      "ALTER TABLE Users DROP COLUMN middleName"
    ],
    "dataLoss": "middleName data will be lost",
    "backupRequired": true,
    "estimatedDowntime": "5 minutes for migration"
  },
  "apiChanges": {
    "endpoints": ["/api/users"],
    "breaking": true,
    "versioningRequired": true,
    "clientImpact": "Mobile apps and external integrations need updates"
  },
  "recommendations": [
    {
      "priority": "critical",
      "category": "deployment",
      "action": "Create database backup before deployment",
      "reason": "Data changes are irreversible"
    },
    {
      "priority": "high",
      "category": "testing",
      "action": "Run full regression suite",
      "reason": "Authentication changes affect entire system"
    }
  ],
  "riskAssessment": {
    "overallRisk": "high",
    "riskScore": 75,
    "factors": [
      "Breaking API changes",
      "Database schema modification",
      "Authentication system changes"
    ],
    "mitigations": [
      "Staged rollout",
      "Feature flag for new password validation",
      "Comprehensive testing"
    ]
  }
}

**Analysis Guidelines:**

1. **Impact Areas:** Identify all system areas affected by changes
2. **Breaking Changes:** List any changes that break existing functionality or contracts
3. **Security:** Analyze security implications (authentication, authorization, data exposure)
4. **Performance:** Identify performance concerns (queries, loops, caching)
5. **Testing:** Provide specific test recommendations at each level
6. **Deployment:** Include prerequisites, order, rollback plan, monitoring
7. **Data Impact:** Analyze database/data changes and implications
8. **API Changes:** Identify API contract changes and client impact
9. **Risk Assessment:** Overall risk with score (0-100) and mitigations

Be thorough and specific. Focus on actionable recommendations. Return ONLY the JSON object.`;
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
    if (!parsed.summary) {
      throw new Error('summary is required');
    }

    if (!Array.isArray(parsed.impactAreas)) {
      throw new Error('impactAreas must be an array');
    }

    // Set defaults for optional fields
    parsed.breakingChanges = parsed.breakingChanges || [];
    parsed.securityImplications = parsed.securityImplications || [];
    parsed.performanceImplications = parsed.performanceImplications || [];
    parsed.testingRecommendations = parsed.testingRecommendations || {};
    parsed.deploymentConsiderations = parsed.deploymentConsiderations || {};
    parsed.dataImpact = parsed.dataImpact || {};
    parsed.apiChanges = parsed.apiChanges || {};
    parsed.recommendations = parsed.recommendations || [];
    parsed.riskAssessment = parsed.riskAssessment || { overallRisk: 'medium', riskScore: 50 };

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse analysis response: ${error.message}\n\nRaw response: ${text.substring(0, 500)}...`);
  }
}

export default {
  analyzeWithClaude
};
