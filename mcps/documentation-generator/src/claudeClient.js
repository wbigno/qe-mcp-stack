/**
 * AI API Client for Documentation Generation
 */

import { generateCompletion } from '../../shared/aiClient.js';

/**
 * Generate documentation using AI
 */
export async function generateWithClaude(params) {
  const { docType, content, format, model } = params;

  const prompt = buildDocumentationPrompt(docType, content, format);

  try {
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

    const generatedText = response.text;
    const documentation = parseDocumentationResponse(generatedText);

    return documentation;

  } catch (error) {
    throw new Error(`AI API error: ${error.message}`);
  }
}

/**
 * Build documentation prompt
 */
function buildDocumentationPrompt(docType, content, format) {
  const templates = {
    api: buildApiDocPrompt,
    architecture: buildArchitectureDocPrompt,
    setup: buildSetupDocPrompt,
    deployment: buildDeploymentDocPrompt,
    troubleshooting: buildTroubleshootingDocPrompt
  };

  const builder = templates[docType] || buildGenericDocPrompt;
  return builder(content, format);
}

function buildApiDocPrompt(content, format) {
  return `Generate comprehensive API documentation.

**Content:**
${JSON.stringify(content, null, 2)}

Return JSON with this structure:
{
  "title": "API Documentation",
  "sections": [
    {
      "heading": "Overview",
      "content": "API purpose and capabilities"
    },
    {
      "heading": "Endpoints",
      "content": "Detailed endpoint documentation",
      "subsections": [
        {
          "heading": "GET /api/users",
          "content": "Endpoint details",
          "details": {
            "method": "GET",
            "path": "/api/users",
            "description": "Retrieves user list",
            "parameters": [{"name": "page", "type": "int", "required": false}],
            "responses": [{"status": 200, "description": "Success"}],
            "examples": [{"request": "GET /api/users?page=1", "response": "..."}]
          }
        }
      ]
    },
    {
      "heading": "Authentication",
      "content": "Auth requirements"
    },
    {
      "heading": "Error Handling",
      "content": "Error codes and handling"
    }
  ],
  "markdown": "Complete formatted documentation"
}`;
}

function buildArchitectureDocPrompt(content, format) {
  return `Generate architecture documentation.

**Content:**
${JSON.stringify(content, null, 2)}

Return JSON with:
{
  "title": "Architecture Documentation",
  "sections": [
    {
      "heading": "System Overview",
      "content": "High-level architecture"
    },
    {
      "heading": "Components",
      "content": "Component descriptions",
      "subsections": [
        {
          "heading": "Component Name",
          "content": "Component details",
          "details": {
            "purpose": "What it does",
            "technologies": ["tech1"],
            "interfaces": ["interface1"],
            "dependencies": ["dep1"]
          }
        }
      ]
    },
    {
      "heading": "Data Flow",
      "content": "How data moves through system"
    },
    {
      "heading": "Security",
      "content": "Security architecture"
    }
  ],
  "markdown": "Complete documentation"
}`;
}

function buildSetupDocPrompt(content, format) {
  return `Generate setup/installation documentation.

**Content:**
${JSON.stringify(content, null, 2)}

Return JSON with:
{
  "title": "Setup Guide",
  "sections": [
    {
      "heading": "Prerequisites",
      "content": "Required software/tools"
    },
    {
      "heading": "Installation",
      "content": "Step-by-step installation",
      "subsections": [
        {
          "heading": "Step 1: Install Dependencies",
          "content": "Detailed instructions",
          "details": {
            "commands": ["npm install"],
            "notes": ["Additional notes"]
          }
        }
      ]
    },
    {
      "heading": "Configuration",
      "content": "Configuration steps"
    },
    {
      "heading": "Verification",
      "content": "How to verify setup"
    }
  ],
  "markdown": "Complete documentation"
}`;
}

function buildDeploymentDocPrompt(content, format) {
  return `Generate deployment documentation.

**Content:**
${JSON.stringify(content, null, 2)}

Return JSON with:
{
  "title": "Deployment Guide",
  "sections": [
    {
      "heading": "Pre-Deployment",
      "content": "Checklist and preparation"
    },
    {
      "heading": "Deployment Steps",
      "content": "Step-by-step deployment"
    },
    {
      "heading": "Post-Deployment",
      "content": "Verification and monitoring"
    },
    {
      "heading": "Rollback",
      "content": "Rollback procedures"
    }
  ],
  "markdown": "Complete documentation"
}`;
}

function buildTroubleshootingDocPrompt(content, format) {
  return `Generate troubleshooting documentation.

**Content:**
${JSON.stringify(content, null, 2)}

Return JSON with:
{
  "title": "Troubleshooting Guide",
  "sections": [
    {
      "heading": "Common Issues",
      "content": "Frequent problems and solutions",
      "subsections": [
        {
          "heading": "Issue: Cannot connect to database",
          "content": "Problem description",
          "details": {
            "symptoms": ["Error messages"],
            "causes": ["Possible causes"],
            "solutions": ["Step-by-step fixes"],
            "prevention": ["How to prevent"]
          }
        }
      ]
    },
    {
      "heading": "Logs and Diagnostics",
      "content": "Where to find logs"
    }
  ],
  "markdown": "Complete documentation"
}`;
}

function buildGenericDocPrompt(content, format) {
  return `Generate technical documentation.

**Type:** General Documentation
**Content:**
${JSON.stringify(content, null, 2)}

Create comprehensive documentation with clear structure, examples, and best practices. Return JSON with sections array and markdown field.`;
}

/**
 * Parse documentation response
 */
function parseDocumentationResponse(text) {
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed.title) {
      throw new Error('title is required');
    }

    if (!Array.isArray(parsed.sections)) {
      throw new Error('sections must be an array');
    }

    parsed.markdown = parsed.markdown || '';

    return parsed;

  } catch (error) {
    throw new Error(`Failed to parse documentation response: ${error.message}\n\nRaw: ${text.substring(0, 500)}...`);
  }
}

export default {
  generateWithClaude
};
