import express from "express";
import { logger } from "../utils/logger.js";
import { callClaude } from "../utils/aiHelper.js";

const router = express.Router();

// Helper function to unwrap nested data property from MCP responses
// MCP returns: {success: true, data: {projects: [...]}}
// Frontend expects: {success: true, projects: [...]}
function unwrapMcpResponse(result) {
  if (result && result.success && result.data) {
    return { success: true, ...result.data };
  }
  return result;
}

// ============================================
// EXISTING ENDPOINTS (keep all existing)
// ============================================

// Pull stories from Azure DevOps
router.post("/pull-stories", async (req, res) => {
  try {
    const { sprint, workItemIds, query, organization, project, team } =
      req.body;
    logger.info("Pulling stories from Azure DevOps", {
      sprint,
      workItemIds: workItemIds?.length,
      organization,
      project,
      team,
    });

    const storiesResponse = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/query",
      { sprint, workItemIds, query, organization, project, team },
    );

    // Unwrap MCP response - it returns { success: true, data: [...] }
    const stories = storiesResponse?.data || [];

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: stories.length,
      stories,
    });
  } catch (error) {
    logger.error("Pull stories error:", error);
    res.status(500).json({
      error: "Failed to pull stories",
      message: error.message,
    });
  }
});

// Get a single work item by ID (supports cross-project via orgWide query param)
router.get("/work-item/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { orgWide } = req.query;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "Invalid work item ID",
      });
    }

    // Default to org-wide queries to support cross-project work items
    const useOrgWide = orgWide !== "false";

    logger.info("Fetching work item by ID", { id, orgWide: useOrgWide });

    const response = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/get",
      { ids: [parseInt(id)], orgWide: useOrgWide },
    );

    // Unwrap MCP response - it returns { success: true, data: [...] }
    const workItems = response?.data || [];

    if (workItems.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Work item ${id} not found`,
      });
    }

    res.json({
      success: true,
      workItem: workItems[0],
    });
  } catch (error) {
    logger.error("Get work item error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch work item",
      message: error.message,
    });
  }
});

// Analyze requirements using AI (Claude)
router.post("/analyze-requirements", async (req, res) => {
  try {
    const { storyIds, includeGapAnalysis = true, model } = req.body;

    logger.info(
      `Analyzing requirements for ${storyIds?.length || 0} stories with AI`,
    );

    if (!storyIds || storyIds.length === 0) {
      return res.status(400).json({
        error: "Story IDs required",
        message: "Please provide at least one story ID",
      });
    }

    // Get stories from Azure DevOps
    const storiesResponse = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/get",
      { ids: storyIds.map((id) => parseInt(id)) },
    );

    // Unwrap MCP response - it returns { success: true, data: [...] }
    const stories = storiesResponse?.data || [];

    if (!stories || stories.length === 0) {
      return res.status(404).json({
        error: "Stories not found",
        message: "No stories found for the provided IDs",
      });
    }

    // Analyze each story using AI and risk-analyzer
    const analysisResults = await Promise.all(
      stories.map(async (story) => {
        try {
          const title = story.fields["System.Title"];
          const description = story.fields["System.Description"] || "";
          const acceptanceCriteria =
            story.fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "";
          const technicalDetails =
            story.fields["Custom.TechnicalDetails"] || "";

          // Extract child tasks from relations
          const childTasks = [];
          if (story.relations && Array.isArray(story.relations)) {
            for (const relation of story.relations) {
              if (relation.rel === "System.LinkTypes.Hierarchy-Forward") {
                // This is a child work item
                const childIdMatch = relation.url.match(/\/(\d+)$/);
                if (childIdMatch) {
                  childTasks.push({
                    id: parseInt(childIdMatch[1]),
                    url: relation.url,
                  });
                }
              }
            }
          }

          // Strip HTML tags
          const cleanDescription = description.replace(/<[^>]*>/g, "").trim();
          const cleanCriteria = acceptanceCriteria
            .replace(/<[^>]*>/g, "")
            .trim();

          // Build AI prompt for requirements analysis
          const prompt = `You are a QA analyst reviewing a user story for test planning.

Story ID: ${story.id}
Title: ${title}
Description: ${cleanDescription || "No description provided"}
Acceptance Criteria: ${cleanCriteria || "No acceptance criteria provided"}

Please analyze this story and provide a structured requirements analysis in JSON format:

{
  "acceptanceCriteria": [
    {
      "criterion": "parsed requirement text",
      "testable": true/false,
      "testScenarios": ["scenario 1", "scenario 2"],
      "ambiguities": ["any unclear points"]
    }
  ],
  "requirementGaps": [
    "missing requirement 1",
    "missing requirement 2"
  ],
  "suggestedEdgeCases": [
    "edge case 1",
    "edge case 2"
  ],
  "integrationPoints": [
    "external system 1",
    "API endpoint 2"
  ],
  "testCoverageRecommendation": {
    "functional": 5,
    "integration": 3,
    "negative": 4,
    "edgeCase": 3,
    "total": 15,
    "rationale": "explanation of test count"
  },
  "prioritizedTestAreas": [
    {"area": "test area", "priority": "High/Medium/Low", "reason": "why"}
  ]
}

Return ONLY the JSON object, no markdown formatting.`;

          // Call Claude AI
          const aiResponse = await callClaude(prompt, model, 3000);

          // Parse AI response
          let requirementsAnalysis;
          try {
            // Remove markdown code blocks if present
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? jsonMatch[0] : aiResponse;
            requirementsAnalysis = JSON.parse(jsonText);
          } catch (parseError) {
            logger.error(`Failed to parse AI response for story ${story.id}`);
            requirementsAnalysis = {
              acceptanceCriteria: [],
              requirementGaps: ["AI response could not be parsed"],
              suggestedEdgeCases: [],
              integrationPoints: [],
              testCoverageRecommendation: { total: 0 },
              prioritizedTestAreas: [],
            };
          }

          // Also get risk analysis from risk-analyzer MCP
          let riskAnalysis = {
            level: "Medium",
            score: 50,
            recommendations: [],
          };
          try {
            const riskResponse = await req.mcpManager.callDockerMcp(
              "riskAnalyzer",
              "/analyze-risk",
              {
                app: "ADO",
                story: {
                  id: story.id,
                  title: title,
                  description: cleanDescription,
                  acceptanceCriteria: cleanCriteria,
                  tags: story.fields["System.Tags"] || "",
                  workItemType: story.fields["System.WorkItemType"],
                  state: story.fields["System.State"],
                  priority: story.fields["Microsoft.VSTS.Common.Priority"],
                },
              },
            );
            riskAnalysis = riskResponse.result?.risk || riskAnalysis;
          } catch (riskError) {
            logger.warn(
              `Risk analysis unavailable for story ${story.id}: ${riskError.message}`,
            );
          }

          return {
            storyId: story.id,
            title: title,
            description: description, // Include raw HTML description
            acceptanceCriteria: acceptanceCriteria, // Include raw HTML acceptance criteria
            technicalDetails: technicalDetails, // Include raw HTML technical details
            childTasks: childTasks, // Include related child tasks
            workItemType: story.fields["System.WorkItemType"],
            state: story.fields["System.State"],
            assignedTo:
              story.fields["System.AssignedTo"]?.displayName || "Unassigned",
            requirementsAnalysis: requirementsAnalysis,
            riskAnalysis: {
              riskLevel: riskAnalysis.level || "Medium",
              riskScore: riskAnalysis.score || 50,
              recommendations: riskAnalysis.recommendations || [],
            },
          };
        } catch (error) {
          logger.error(`Error analyzing story ${story.id}:`, error);
          return {
            storyId: story.id,
            title: story.fields["System.Title"],
            error: error.message,
            requirementsAnalysis: null,
            riskAnalysis: null,
          };
        }
      }),
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: analysisResults.length,
      results: analysisResults,
      summary: {
        analyzed: analysisResults.filter((r) => r.requirementsAnalysis).length,
        failed: analysisResults.filter((r) => r.error).length,
      },
    });
  } catch (error) {
    logger.error("Requirements analysis error:", error);
    res.status(500).json({
      error: "Requirements analysis failed",
      message: error.message,
    });
  }
});

/**
 * Generate MANUAL test cases for a user story with QE Risk Methodology
 * POST /api/ado/generate-test-cases
 * Body: {
 *   storyId: number,
 *   story?: object,
 *   parsedAcceptanceCriteria?: array,
 *   riskAnalysis?: object,
 *   integrationAnalysis?: object,
 *   options?: { includeNegative, includeEdgeCases, includeIntegration, namingFormat }
 *   updateADO?: boolean,
 *   model?: string
 * }
 */
router.post("/generate-test-cases", async (req, res) => {
  try {
    const {
      storyId,
      story,
      parsedAcceptanceCriteria,
      riskAnalysis,
      integrationAnalysis,
      blastRadiusAnalysis,
      options = {},
      updateADO = false,
      includeNegativeTests = options.includeNegative ?? true,
      includeEdgeCases = options.includeEdgeCases ?? true,
      includeIntegration = options.includeIntegration ?? true,
      includePRContext = true, // Phase 2: Fetch PR files for enhanced test generation
      model,
    } = req.body;

    if (!storyId) {
      return res.status(400).json({
        error: "Story ID is required",
        message: "Please provide a storyId in the request body",
      });
    }

    logger.info(`Generating MANUAL test cases for story ${storyId}`);

    // Use provided story data or fetch from ADO
    let storyData = story;
    if (!storyData) {
      const storiesResponse = await req.mcpManager.callDockerMcp(
        "azureDevOps",
        "/work-items/get",
        { ids: [parseInt(storyId)] },
      );

      const stories = storiesResponse?.data || [];
      if (!stories || stories.length === 0) {
        return res.status(404).json({
          error: "Story not found",
          message: `Work item ${storyId} not found in Azure DevOps`,
        });
      }
      storyData = {
        id: stories[0].id,
        title: stories[0].fields["System.Title"],
        description: stories[0].fields["System.Description"] || "",
        acceptanceCriteria:
          stories[0].fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "",
      };
    }

    const title = storyData.title;
    const cleanDescription = (storyData.description || "")
      .replace(/<[^>]*>/g, "")
      .trim();
    const cleanCriteria = (storyData.acceptanceCriteria || "")
      .replace(/<[^>]*>/g, "")
      .trim();

    // Build QE Risk Methodology context if risk analysis is provided
    let qeRiskContext = "";
    let acRiskMapping = {};
    let prioritizedACs = []; // ACs sorted by risk (Critical first)

    if (riskAnalysis) {
      const riskLevel = riskAnalysis.level || "medium";
      const riskScore = riskAnalysis.score || 50;
      const riskFactors = riskAnalysis.factors || {};

      // Use the actual AC risk mapping from risk analysis if available
      if (
        riskAnalysis.acRiskMapping &&
        Array.isArray(riskAnalysis.acRiskMapping)
      ) {
        riskAnalysis.acRiskMapping.forEach((ac) => {
          acRiskMapping[ac.ac] = ac.riskLevel || "medium";
        });
        // Sort ACs by risk level (critical > high > medium > low)
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        prioritizedACs = [...riskAnalysis.acRiskMapping].sort(
          (a, b) =>
            (riskOrder[a.riskLevel] || 2) - (riskOrder[b.riskLevel] || 2),
        );
      }

      // Use testing priority order if available
      if (riskAnalysis.formattedOutput?.testingPriority?.order) {
        prioritizedACs = riskAnalysis.formattedOutput.testingPriority.order.map(
          (item) => ({
            ac: item.ac,
            riskLevel: item.riskLevel,
            reason: item.reason,
          }),
        );
      }

      qeRiskContext = `
## QE Risk Analysis Context
Overall Risk Level: ${riskLevel.toUpperCase()} (Score: ${riskScore}/100)
Key Risk Factors:
- Integration Risk: ${riskFactors.integration?.description || "Unknown"}
- Complexity Risk: ${riskFactors.complexity?.description || "Unknown"}
- Business Impact: ${riskFactors.businessImpact?.description || "Unknown"}

Test Generation Guidelines based on Risk Level:
${
  riskLevel === "critical" || riskLevel === "high"
    ? "- Generate EXHAUSTIVE tests: all positive paths, all negative scenarios, edge cases, and integration tests"
    : riskLevel === "medium"
      ? "- Generate COMPREHENSIVE tests: happy paths, key negative scenarios, important edge cases"
      : "- Generate STANDARD tests: primary happy path, obvious negative cases"
}`;
    }

    // Build AC-specific context if parsed ACs are provided
    let acContext = "";
    if (parsedAcceptanceCriteria && parsedAcceptanceCriteria.length > 0) {
      // If we don't have risk analysis AC mapping, do keyword-based analysis
      if (Object.keys(acRiskMapping).length === 0) {
        parsedAcceptanceCriteria.forEach((ac) => {
          const acText = ac.text.toLowerCase();
          let acRisk = "medium";

          if (
            acText.includes("payment") ||
            acText.includes("billing") ||
            acText.includes("financial")
          ) {
            acRisk = "critical";
          } else if (
            acText.includes("epic") ||
            acText.includes("ehr") ||
            acText.includes("patient")
          ) {
            acRisk = "critical";
          } else if (
            acText.includes("security") ||
            acText.includes("authentication") ||
            acText.includes("authorization")
          ) {
            acRisk = "high";
          } else if (
            acText.includes("api") ||
            acText.includes("integration") ||
            acText.includes("external")
          ) {
            acRisk = "high";
          } else if (acText.includes("database") || acText.includes("data")) {
            acRisk = "high";
          }

          acRiskMapping[ac.id] = acRisk;
        });

        // Build prioritizedACs from keyword analysis
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        prioritizedACs = parsedAcceptanceCriteria
          .map((ac) => ({
            ac: ac.id,
            text: ac.text,
            riskLevel: acRiskMapping[ac.id] || "medium",
          }))
          .sort(
            (a, b) =>
              (riskOrder[a.riskLevel] || 2) - (riskOrder[b.riskLevel] || 2),
          );
      } else {
        // Merge text from parsedAcceptanceCriteria into prioritizedACs
        prioritizedACs = prioritizedACs.map((pAc) => {
          const matchedAc = parsedAcceptanceCriteria.find(
            (ac) => ac.id === pAc.ac,
          );
          return { ...pAc, text: matchedAc?.text || "" };
        });
      }

      // Check if we have hierarchical ACs (with steps)
      const hasHierarchicalACs = parsedAcceptanceCriteria.some(
        (ac) => ac.steps && ac.steps.length > 0,
      );

      // Build AC list in RISK PRIORITY ORDER (Critical first)
      if (hasHierarchicalACs) {
        // Use hierarchical format for smarter test generation
        acContext = `
## Acceptance Criteria - HIERARCHICAL STRUCTURE (Generate tests using steps as test steps):

${prioritizedACs
  .map((ac, idx) => {
    const matchedAc = parsedAcceptanceCriteria.find((pAc) => pAc.id === ac.ac);
    const steps = matchedAc?.steps || [];
    let acText = `${idx + 1}. [${ac.riskLevel.toUpperCase()}] ${ac.ac}: ${matchedAc?.title || ac.text}`;

    if (steps.length > 0) {
      acText += `\n   STEPS (use these as test steps):`;
      steps.forEach((step, stepIdx) => {
        acText += `\n     Step ${stepIdx + 1}: ${step.action}`;
        if (step.details && step.details.length > 0) {
          acText += `\n       Validate: ${step.details.join(", ")}`;
        }
      });
    }
    return acText;
  })
  .join("\n\n")}

HIERARCHICAL TEST GENERATION INSTRUCTIONS:
- Each AC represents a COMPLETE flow/scenario that should be tested together
- The "Steps" under each AC should become the STEPS in your test case
- The "Validate" items are the specific assertions/validations to check
- Generate FEWER, MORE COMPREHENSIVE test cases that cover the full AC flow
- For an AC with 3 steps, create test cases that verify all 3 steps work together
- Use this naming convention: TC{nn} PBI-${storyId} AC{originalAcNumber}: [{type}] {test description}

Types: positive (happy path), negative (error scenarios), edge (boundary cases), integration (API/external system tests)`;
      } else {
        // Fallback to flat format
        acContext = `
## Acceptance Criteria - LISTED IN RISK PRIORITY ORDER (Generate tests in this order):
${prioritizedACs.map((ac, idx) => `${idx + 1}. [${ac.riskLevel.toUpperCase()}] ${ac.ac}: ${ac.text}`).join("\n")}

CRITICAL INSTRUCTION - TEST GENERATION ORDER:
- Generate test cases starting with the HIGHEST RISK ACs first (Critical, then High, then Medium, then Low)
- The first test cases in your output should be for Critical risk ACs
- Use this naming convention: TC{nn} PBI-${storyId} AC{originalAcNumber}: [{type}] {test description}
- TC numbers are sequential (TC01, TC02, TC03...) based on generation order (risk priority)
- The AC number in the name should match the ORIGINAL AC number (AC1, AC2, etc.), not the priority order

Types: positive, negative, edge, integration`;
      }

      acContext += `

AC Risk Summary:
${prioritizedACs.map((ac) => `- ${ac.ac}: ${ac.riskLevel.toUpperCase()} risk`).join("\n")}`;
    }

    // Add integration context if available
    let integrationContext = "";
    if (integrationAnalysis && integrationAnalysis.result) {
      const integrations = integrationAnalysis.result.integrations || [];
      if (integrations.length > 0) {
        integrationContext = `
## Integration Points to Test:
${integrations
  .slice(0, 10)
  .map((i) => `- ${i.type}: ${i.name || i.file || "Unknown"}`)
  .join("\n")}`;
      }
    }

    // Add blast radius context if available
    let blastRadiusContext = "";
    if (blastRadiusAnalysis && blastRadiusAnalysis.result) {
      const blast = blastRadiusAnalysis.result;
      const affectedFiles =
        blast.affectedFiles || blast.impact?.affectedComponents || [];
      const affectedTests =
        blast.affectedTests || blast.impact?.affectedTests || [];

      if (affectedFiles.length > 0 || affectedTests.length > 0) {
        blastRadiusContext = `
## Blast Radius Analysis - Areas Requiring Extra Testing:
${blast.risk ? `Risk Level: ${blast.risk.level?.toUpperCase()} (Score: ${blast.risk.score}/100)` : ""}
${
  affectedFiles.length > 0
    ? `
Affected Components (${affectedFiles.length}):
${affectedFiles
  .slice(0, 10)
  .map((f) => `- ${typeof f === "string" ? f : f.file || f.name || "Unknown"}`)
  .join("\n")}`
    : ""
}
${
  affectedTests.length > 0
    ? `
Existing Tests That May Need Updates:
${affectedTests
  .slice(0, 10)
  .map((t) => `- ${typeof t === "string" ? t : t.file || t.name || "Unknown"}`)
  .join("\n")}`
    : ""
}
${
  blast.recommendations
    ? `
Recommendations:
${blast.recommendations
  .slice(0, 5)
  .map((r) => `- ${r.recommendation || r}`)
  .join("\n")}`
    : ""
}`;
      }
    }

    // Phase 2: Fetch PR files for enhanced test generation context
    let prContext = "";
    let prFiles = [];
    let pullRequests = [];

    if (includePRContext) {
      try {
        logger.info(`Fetching PR files for story ${storyId}`);
        const prFilesResponse = await req.mcpManager.callDockerMcp(
          "azureDevOps",
          `/work-items/${storyId}/files-changed`,
          {},
          "GET",
        );

        const prData = prFilesResponse?.data || {};
        prFiles = prData.files || [];
        pullRequests = prData.pullRequests || [];

        if (prFiles.length > 0) {
          // Group files by type for better context
          const filesByType = prFiles.reduce((acc, file) => {
            const ext = file.split(".").pop()?.toLowerCase() || "other";
            if (!acc[ext]) acc[ext] = [];
            acc[ext].push(file);
            return acc;
          }, {});

          // Identify components being changed for component-based testing
          const componentPatterns = {
            Redis: /redis|cache|session/i,
            Hangfire: /hangfire|job|batch|queue/i,
            Payment: /payment|fiserv|ach|credit/i,
            Portal: /portal|carelink|provider|member/i,
            API: /api|client|proxy|service/i,
            Database: /repository|entity|migration|sql/i,
            Integration: /marketing|transunion|revspring|nice|satmetrix/i,
          };

          const detectedComponents = [];
          prFiles.forEach((file) => {
            Object.entries(componentPatterns).forEach(
              ([component, pattern]) => {
                if (
                  pattern.test(file) &&
                  !detectedComponents.includes(component)
                ) {
                  detectedComponents.push(component);
                }
              },
            );
          });

          prContext = `
## PR-Based Code Changes (${prFiles.length} files changed across ${pullRequests.length} PR(s)):
${
  pullRequests.length > 0
    ? `
Pull Requests:
${pullRequests.map((pr) => `- PR #${pr.pullRequestId}: ${pr.title} (${pr.status})`).join("\n")}
`
    : ""
}
Files Changed by Type:
${Object.entries(filesByType)
  .map(
    ([ext, files]) =>
      `- ${ext.toUpperCase()} (${files.length}): ${files.slice(0, 5).join(", ")}${files.length > 5 ? ` ... and ${files.length - 5} more` : ""}`,
  )
  .join("\n")}

${
  detectedComponents.length > 0
    ? `
DETECTED COMPONENTS REQUIRING TESTING:
${detectedComponents.map((c) => `- ${c}`).join("\n")}

COMPONENT-BASED TEST GENERATION:
For each detected component, generate tests that cover:
- Unit/Functional tests for the component
- Integration tests with dependent components
- Performance/Load tests if applicable (especially for Redis, Payment, API)
- Negative/Error handling tests
`
    : ""
}

IMPORTANT: These files have been modified in the linked PR. Ensure test cases cover:
1. Direct functionality changes in these files
2. Regression testing for existing features in modified files
3. Integration testing if multiple components are affected`;

          logger.info(
            `PR context added: ${prFiles.length} files from ${pullRequests.length} PRs, detected components: ${detectedComponents.join(", ")}`,
          );
        }
      } catch (prError) {
        logger.warn(`Could not fetch PR files for context: ${prError.message}`);
        // Continue without PR context
      }
    }

    // Phase 3: Fetch attachment content for enhanced context (QA guides, test plans, etc.)
    let attachmentContext = "";
    try {
      logger.info(`Fetching attachments for story ${storyId}`);
      const attachmentsResponse = await req.mcpManager.callDockerMcp(
        "azureDevOps",
        `/work-items/${storyId}/attachments`,
        {},
        "GET",
      );

      const attachmentsData = attachmentsResponse?.data || {};
      const textAttachments = attachmentsData.textAttachments || [];

      if (textAttachments.length > 0) {
        // Truncate content if too large (max 50KB total for attachments)
        let totalSize = 0;
        const maxTotalSize = 50000;
        const includedAttachments = [];

        for (const att of textAttachments) {
          if (totalSize + att.content.length <= maxTotalSize) {
            includedAttachments.push(att);
            totalSize += att.content.length;
          }
        }

        if (includedAttachments.length > 0) {
          attachmentContext = `
## QA Documentation Attachments (${includedAttachments.length} files):
${includedAttachments
  .map(
    (att) => `
### ${att.name}
\`\`\`
${att.content.substring(0, 15000)}${att.content.length > 15000 ? "\n... (truncated)" : ""}
\`\`\`
`,
  )
  .join("\n")}

IMPORTANT: Use the attached QA documentation to:
1. Identify specific test scenarios mentioned in the documents
2. Include TestDataController endpoints mentioned for triggering jobs
3. Follow the component breakdown if provided
4. Include performance/load testing scenarios if mentioned
5. Include rollback indicators and monitoring points`;

          logger.info(
            `Attachment context added: ${includedAttachments.length} files, ${totalSize} bytes`,
          );
        }
      }
    } catch (attachError) {
      logger.warn(
        `Could not fetch attachments for context: ${attachError.message}`,
      );
      // Continue without attachment context
    }

    // Build AI prompt for manual test case generation using QE Component-Based Methodology
    const prompt = `You are a Senior QA Engineer using QE (Quality Engineering) methodology. Your task is to generate COMPREHENSIVE manual test cases by breaking down the story into distinct QE STORIES (components), not just acceptance criteria.

## CRITICAL PARADIGM SHIFT - QE STORY-BASED APPROACH

DO NOT just generate tests per Acceptance Criteria. Instead:
1. ANALYZE the story, PR files, attachments, and context to identify ALL distinct COMPONENTS/QE STORIES
2. Generate tests for EACH QE story/component, ensuring comprehensive business flow coverage
3. ACs are guidelines, but components drive test coverage

## QE Story Categories - MANDATORY TEST GENERATION

Analyze the provided context and generate tests for ALL applicable QE stories. Each QE story has REQUIRED sub-categories - you MUST generate tests for each sub-category listed.

### CRITICAL PRIORITY - Business Revenue Flows

**QE-PAY: Payment Processing** (MINIMUM 15 tests required)
Generate tests for ALL of these sub-categories:

*Sub-category PAY-1: Member Portal Payments (3 tests minimum)*
- TC: One-time CC payment via /Pages/ManagePayments/make-a-payment-tab
- TC: One-time ACH payment
- TC: Payment with invalid card number (negative)

*Sub-category PAY-2: Provider Portal Payments (3 tests minimum)*
- TC: CC payment via /TakeAPayment.aspx
- TC: ACH payment
- TC: Payment with insufficient funds (negative)

*Sub-category PAY-3: Recurring Payments (3 tests minimum)*
- TC: Setup recurring CC payment via /Pages/ManagePayments/automatic-payments-tab
- TC: Setup recurring ACH payment
- TC: Cancel recurring payment

*Sub-category PAY-4: Tokenization & FiServ (3 tests minimum)*
- TC: Get tokenization auth session
- TC: Use token for payment
- TC: FiServ CC payment integration
- TC: FiServ ACH payment integration

*Sub-category PAY-5: CONCURRENT LOAD TESTS (MANDATORY - 4 tests minimum)*
- TC: 10 simultaneous CC payments - verify no socket exhaustion
- TC: 25 simultaneous CC payments - verify connection pooling
- TC: 50 simultaneous mixed payments - verify system stability
- TC: 10 simultaneous ACH payments

### HIGH PRIORITY - User-Facing Functionality

**QE-SESS: Session Storage** (MINIMUM 9 tests required)
Generate tests for ALL of these sub-categories:

*Sub-category SESS-1: CareLink Sessions (3 tests minimum)*
- TC: Login to CareLink - verify session stored in Redis DB 0
- TC: Navigate between pages - verify session maintained
- TC: Session timeout - verify session expires correctly

*Sub-category SESS-2: Provider Portal Sessions (3 tests minimum)*
- TC: Login to Provider Portal - verify session in DB 0
- TC: Access multiple accounts - verify session isolation
- TC: Re-login after timeout - verify new session created

*Sub-category SESS-3: Concurrent Sessions (3 tests minimum)*
- TC: 50 concurrent CareLink users
- TC: 50 concurrent Provider Portal users
- TC: Mixed portal concurrent access

**QE-PORTAL: Portal Functionality** (MINIMUM 12 tests required)
Generate tests for ALL of these sub-categories:

*Sub-category PORT-1: PreCare (3 tests minimum)*
- TC: Submit PreCare enrollment
- TC: Update PreCare info
- TC: Get PreCare status via /PreCare/PreCareStatus.aspx

*Sub-category PORT-2: Text-to-Pay (3 tests minimum)*
- TC: Send confirmation code via /Pages/ManagePayments/text-to-pay-tab
- TC: Verify valid confirmation code
- TC: Verify invalid confirmation code (negative)

*Sub-category PORT-3: Digital Member Cards (2 tests minimum)*
- TC: View member card
- TC: Download card PDF

*Sub-category PORT-4: CareLink & Provider Portal (4 tests minimum)*
- TC: CareLink lookup by Patient Account Number
- TC: CareLink lookup by First and Last Name
- TC: Provider Portal account search
- TC: Provider Portal view account overview

**QE-3P: Third-Party Integrations** (MINIMUM 15 tests required)
Generate tests for ALL of these sub-categories:

*Sub-category 3P-1: Smart Terms (2 tests minimum)*
- TC: Apply Smart Terms via POST /api/testdata/SmartTerms/{accountId}
- TC: Find eligible accounts

*Sub-category 3P-2: RevSpring (3 tests minimum)*
- TC: Download correspondence PDF
- TC: Get RevSpring correspondences list
- TC: Process confirmation files batch job

*Sub-category 3P-3: Marketing Cloud (3 tests minimum)*
- TC: Sync card account via POST /api/testdata/SendCardAccountToMarketingCloud/{accountId}
- TC: Sync PreCare contact
- TC: Send offer event

*Sub-category 3P-4: TransUnion (3 tests minimum)*
- TC: +Acuity credit check
- TC: CarePayment Realtime check via /CarePaymentRealtime.aspx
- TC: Bankruptcy job via POST /api/testdata/TransUnion/StartTransUnionBankruptcyJob

*Sub-category 3P-5: NICE (2 tests minimum)*
- TC: Retrieve call details via POST /api/testdata/Nice/activate/retrieveCompletedCallDetailsHangfireJob
- TC: Get unlinked dispositions

*Sub-category 3P-6: Satmetrix (2 tests minimum)*
- TC: Retrieve member surveys job
- TC: Survey data processing verification

### MEDIUM PRIORITY - Infrastructure

**QE-REDIS: Redis Database Operations** (MINIMUM 8 tests required)
*Sub-category REDIS-1: Database Isolation (3 tests minimum)*
- TC: Verify sessions in DB 0 only
- TC: Verify Hangfire in DB 1 only
- TC: Clear one DB, verify others unaffected (cross-contamination test)

*Sub-category REDIS-2: Connection Management (3 tests minimum)*
- TC: Monitor connection count under load
- TC: Connection pool reuse verification
- TC: Redis failover/resilience

*Sub-category REDIS-3: Performance (2 tests minimum)*
- TC: Memory usage monitoring
- TC: 1000 concurrent Redis operations

**QE-HF: Hangfire Job Processing** (MINIMUM 8 tests required)
*Sub-category HF-1: Job Retention (3 tests minimum)*
- TC: Non-batch job expires after 6 hours
- TC: Batch job retained for 24 hours
- TC: Job inside batch not affected by 6-hour expiration

*Sub-category HF-2: Job Execution (3 tests minimum)*
- TC: Trigger recurring job
- TC: Batch job with multiple steps
- TC: Job failure handling

*Sub-category HF-3: Config Validation (2 tests minimum)*
- TC: Verify QA environment config
- TC: Verify Production environment config

**QE-PERF: Performance Testing** (MINIMUM 8 tests required)
*Sub-category PERF-1: Connection Pool (4 tests minimum)*
- TC: Static HttpClient verification
- TC: MaxConnectionsPerServer <= 20
- TC: Socket exhaustion = 0 errors
- TC: Connection reuse rate > 90%

*Sub-category PERF-2: Concurrent Operations (4 tests minimum)*
- TC: 100 concurrent Member Portal page loads
- TC: 50 concurrent Provider Portal searches
- TC: 50 concurrent CareLink lookups
- TC: 25 concurrent correspondence downloads

### LOW PRIORITY - Operations

**QE-TEAMS: Teams Notifications** (MINIMUM 4 tests required)
*Sub-category TEAMS-1: Job Notifications (2 tests minimum)*
- TC: Hangfire job failure triggers Teams notification
- TC: Notification contains job name, error, timestamp

*Sub-category TEAMS-2: Integration Notifications (2 tests minimum)*
- TC: FiServ file processing notification
- TC: Alteon incident notification

## Story Information
Story ID: ${storyId}
Title: ${title}
Description: ${cleanDescription || "No description provided"}
Acceptance Criteria: ${cleanCriteria || "No acceptance criteria provided"}
${acContext}
${integrationContext}
${blastRadiusContext}
${prContext}
${attachmentContext}

## Test Generation Rules

### MANDATORY MINIMUM TEST COUNTS (STRICT ENFORCEMENT):

| QE Story | Minimum Tests | Sub-categories |
|----------|---------------|----------------|
| QE-PAY | 15 | PAY-1(3), PAY-2(3), PAY-3(3), PAY-4(3), PAY-5(4) |
| QE-SESS | 9 | SESS-1(3), SESS-2(3), SESS-3(3) |
| QE-PORTAL | 12 | PORT-1(3), PORT-2(3), PORT-3(2), PORT-4(4) |
| QE-3P | 15 | 3P-1(2), 3P-2(3), 3P-3(3), 3P-4(3), 3P-5(2), 3P-6(2) |
| QE-REDIS | 8 | REDIS-1(3), REDIS-2(3), REDIS-3(2) |
| QE-HF | 8 | HF-1(3), HF-2(3), HF-3(2) |
| QE-PERF | 8 | PERF-1(4), PERF-2(4) |
| QE-TEAMS | 4 | TEAMS-1(2), TEAMS-2(2) |
| **TOTAL** | **79** | Must generate at least 79 test cases |

### MANDATORY REQUIREMENTS:
1. **SUB-CATEGORY COVERAGE**: You MUST generate tests for EVERY sub-category listed above
2. **CONCURRENT/LOAD TESTS**: PAY-5, SESS-3, PERF-2 are MANDATORY - these validate the socket exhaustion fix
3. **STEP-SPECIFIC EXPECTED RESULTS**: EACH step MUST have its own unique expected result
4. **INCLUDE SPECIFIC DETAILS**: URLs, TestDataController endpoints, Redis CLI commands

### Test Types per QE Story:
- Positive (happy path) - REQUIRED for every sub-category
- Negative (error handling) - required for CRITICAL/HIGH priority stories
- Load/Concurrency - MANDATORY for PAY-5, SESS-3, PERF-2 sub-categories
- Integration - for third-party systems (QE-3P)

### CRITICAL: Step-Specific Expected Results
BAD (DO NOT DO THIS):
  Step 1 Expected: "Payment succeeds"
  Step 2 Expected: "Payment succeeds"
  Step 3 Expected: "Payment succeeds"

GOOD (DO THIS):
  Step 1 Expected: "Payment form displays with CC/ACH options"
  Step 2 Expected: "Entered payment details are validated, no errors shown"
  Step 3 Expected: "Confirmation dialog shows amount and payment method"
  Step 4 Expected: "Success message displayed with confirmation number"
  Step 5 Expected: "Payment appears in account history within 30 seconds"

## Output Format

### CRITICAL: Test Case Naming Convention

Use different naming formats based on AC alignment:

**1. AC-Aligned Test** (test directly validates an acceptance criterion):
   name: "TC{nn} PBI-${storyId} {QE-STORY}/AC{n}: [{type}] {description}"
   Example: "TC01 PBI-${storyId} QE-REDIS/AC2: [positive] Verify Redis job expiration"

**2. GAP Coverage Test** (test covers functionality NOT in any AC - CRITICAL for comprehensive coverage):
   name: "TC{nn} PBI-${storyId} {QE-STORY} [GAP]: [{type}] {description}"
   Example: "TC15 PBI-${storyId} QE-PAY [GAP]: [positive] Member Portal CC payment"

**3. Cross-AC Test** (test validates multiple ACs):
   name: "TC{nn} PBI-${storyId} {QE-STORY}/AC{n},AC{m}: [{type}] {description}"
   Example: "TC08 PBI-${storyId} QE-PERF/AC1,AC2: [load] Concurrent API load test"

### When to Use [GAP]:
- Payment flows not explicitly mentioned in ACs
- Portal functionality not covered by ACs
- Third-party integrations implied but not stated in ACs
- Business-critical flows that MUST be tested but aren't in ACs
- Any test where you cannot identify a specific AC it validates

This is IMPORTANT because it helps QA identify:
1. Tests that validate stated requirements (AC-aligned)
2. Tests that cover gaps in requirements (GAP) - these often catch production bugs

Examples:
- TC01 PBI-${storyId} QE-REDIS/AC2: [positive] Redis database isolation verification
- TC02 PBI-${storyId} QE-HF/AC2: [positive] Hangfire job expiration (6h non-batch)
- TC10 PBI-${storyId} QE-PAY [GAP]: [positive] Member Portal CC payment
- TC11 PBI-${storyId} QE-PAY [GAP]: [positive] Member Portal ACH payment
- TC12 PBI-${storyId} QE-PAY [GAP]: [negative] Invalid CC number handling
- TC20 PBI-${storyId} QE-PORTAL [GAP]: [positive] PreCare enrollment submission
- TC30 PBI-${storyId} QE-3P [GAP]: [integration] TransUnion credit check

Return the response in this JSON format:
{
  "qeStories": [
    {
      "storyId": "QE-PAY",
      "name": "Payment Processing",
      "riskLevel": "critical",
      "testCount": 11,
      "gapTests": 11,
      "acAlignedTests": 0
    }
  ],
  "testCases": [
    {
      "name": "TC01 PBI-${storyId} QE-REDIS/AC2: [positive] Redis database isolation",
      "qeStory": "QE-REDIS",
      "acceptanceCriteriaRef": "AC2",
      "isGapCoverage": false,
      "type": "positive",
      "priority": "medium",
      "steps": [
        {"action": "Connect to Redis and check DB 0", "expected": "DB 0 contains only session keys"},
        {"action": "Check DB 1 for Hangfire data", "expected": "DB 1 contains only hangfire:* keys"},
        {"action": "Check DB 2 for cache data", "expected": "DB 2 contains only cache keys"}
      ],
      "expectedResult": "Redis databases are properly isolated"
    },
    {
      "name": "TC10 PBI-${storyId} QE-PAY [GAP]: [positive] Member Portal CC payment",
      "qeStory": "QE-PAY",
      "acceptanceCriteriaRef": null,
      "isGapCoverage": true,
      "gapReason": "Payment flows are critical business functionality impacted by HttpClient changes but not explicitly covered in ACs",
      "type": "positive",
      "priority": "critical",
      "steps": [
        {"action": "Navigate to Member Portal /Pages/ManagePayments/make-a-payment-tab", "expected": "Payment tab loads with CC and ACH payment options visible"},
        {"action": "Select Credit Card payment option", "expected": "Credit card form expands with fields for card number, expiry, CVV"},
        {"action": "Enter valid test CC details", "expected": "All fields validate successfully"},
        {"action": "Submit payment", "expected": "Payment processes within 10 seconds"},
        {"action": "Verify confirmation", "expected": "Success message with confirmation number"}
      ],
      "expectedResult": "CC payment completes successfully"
    }
  ]
}

## FINAL VERIFICATION CHECKLIST (MANDATORY - CHECK EACH BOX)

Before returning, verify you have met ALL these requirements:

### Minimum Test Count Verification:
1. [ ] QE-PAY: At least 15 tests (including 4 concurrent payment tests in PAY-5)
2. [ ] QE-SESS: At least 9 tests (including 3 concurrent session tests in SESS-3)
3. [ ] QE-PORTAL: At least 12 tests
4. [ ] QE-3P: At least 15 tests (covering all 6 third-party systems)
5. [ ] QE-REDIS: At least 8 tests
6. [ ] QE-HF: At least 8 tests
7. [ ] QE-PERF: At least 8 tests (including 4 concurrent operation tests)
8. [ ] QE-TEAMS: At least 4 tests
9. [ ] **TOTAL: At least 79 test cases**

### Quality Verification:
10. [ ] EACH step has a UNIQUE expected result (NOT the same result repeated)
11. [ ] Test steps include specific URLs from the QE story templates
12. [ ] Concurrent/load tests specify user counts (10, 25, 50, etc.)
13. [ ] TC numbers are sequential (TC01, TC02... TC79+)

### Gap Coverage:
14. [ ] Payment concurrent tests are marked as [GAP] if not in ACs
15. [ ] Session tests are marked as [GAP] if not in ACs
16. [ ] Teams notification tests are marked as [GAP]

If you cannot generate 79+ tests, explain which sub-categories are not applicable and why.

Return ONLY the JSON object, no markdown.`;

    try {
      logger.info(
        `Calling Claude AI to generate comprehensive QE story-based test cases`,
      );

      // Call Claude AI - use higher token limit to support comprehensive QE story-based generation (30+ tests)
      const aiResponse = await callClaude(prompt, model, 16384);

      // Parse AI response
      let testCasesData;
      try {
        // Remove markdown code blocks if present
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : aiResponse;
        testCasesData = JSON.parse(jsonText);
      } catch (parseError) {
        logger.error(`Failed to parse AI response for story ${storyId}`);
        return res.status(500).json({
          error: "AI response parsing failed",
          message: "Could not parse test cases from AI response",
          storyId: parseInt(storyId),
          storyTitle: title,
        });
      }

      const testCases = testCasesData.testCases || [];
      const qeStories = testCasesData.qeStories || [];

      // Add IDs and automated flag, ensure proper format
      testCases.forEach((tc, index) => {
        tc.id = index + 1;
        tc.automated = false; // These are MANUAL test cases
        tc.storyId = parseInt(storyId);

        // Handle new step format with action/expected pairs
        if (tc.steps && Array.isArray(tc.steps)) {
          tc.steps = tc.steps.map((step, stepIdx) => {
            if (typeof step === "object" && step.action) {
              // New format: {action: "...", expected: "..."}
              return {
                stepNumber: stepIdx + 1,
                action: step.action,
                expectedResult:
                  step.expected ||
                  tc.expectedResult ||
                  "Verify operation completes successfully",
              };
            } else if (typeof step === "string") {
              // Legacy format: plain string
              return {
                stepNumber: stepIdx + 1,
                action: step,
                expectedResult:
                  tc.expectedResult ||
                  "Verify operation completes successfully",
              };
            }
            return step;
          });
        }

        // Extract QE story from name if present
        if (!tc.qeStory && tc.name) {
          const qeMatch = tc.name.match(/QE-([A-Z0-9]+)/i);
          if (qeMatch) {
            tc.qeStory = `QE-${qeMatch[1].toUpperCase()}`;
          }
        }

        // Detect [GAP] coverage from name
        if (tc.name && tc.name.includes("[GAP]")) {
          tc.isGapCoverage = true;
          // Clear AC ref for gap tests since they don't map to ACs
          if (!tc.acceptanceCriteriaRef) {
            tc.acceptanceCriteriaRef = null;
          }
        } else if (tc.isGapCoverage === undefined) {
          tc.isGapCoverage = false;
        }

        // Ensure acceptanceCriteriaRef is present (extract from name if needed)
        // Only for non-gap tests
        if (!tc.isGapCoverage && !tc.acceptanceCriteriaRef && tc.name) {
          const acMatch = tc.name.match(/\/AC(\d+)/i);
          if (acMatch) {
            tc.acceptanceCriteriaRef = `AC${acMatch[1]}`;
            tc.acRef = `AC${acMatch[1]}`; // Alias for compatibility
          }
        }
        // Ensure type is lowercase for consistency
        if (tc.type) {
          tc.type = tc.type.toLowerCase();
        }
      });

      // Count by new type categories
      const typeCounts = {
        positive: testCases.filter(
          (tc) => tc.type === "positive" || tc.type === "functional",
        ).length,
        negative: testCases.filter((tc) => tc.type === "negative").length,
        edge: testCases.filter(
          (tc) =>
            tc.type === "edge" ||
            tc.type === "edgecase" ||
            tc.type === "edge case",
        ).length,
        integration: testCases.filter((tc) => tc.type === "integration").length,
      };

      // Count by priority
      const priorityCounts = {
        critical: testCases.filter(
          (tc) => tc.priority === "critical" || tc.priority === 1,
        ).length,
        high: testCases.filter(
          (tc) => tc.priority === "high" || tc.priority === 2,
        ).length,
        medium: testCases.filter(
          (tc) => tc.priority === "medium" || tc.priority === 3,
        ).length,
        low: testCases.filter(
          (tc) => tc.priority === "low" || tc.priority === 4,
        ).length,
      };

      // Count by QE Story
      const qeStoryCounts = testCases.reduce((acc, tc) => {
        const qeStory = tc.qeStory || "UNCATEGORIZED";
        if (!acc[qeStory]) acc[qeStory] = 0;
        acc[qeStory]++;
        return acc;
      }, {});

      // Count gap coverage vs AC-aligned tests
      const gapCoverageCounts = {
        gapTests: testCases.filter((tc) => tc.isGapCoverage === true).length,
        acAlignedTests: testCases.filter(
          (tc) => tc.isGapCoverage === false && tc.acceptanceCriteriaRef,
        ).length,
        uncategorized: testCases.filter(
          (tc) => tc.isGapCoverage === false && !tc.acceptanceCriteriaRef,
        ).length,
      };

      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        storyId: parseInt(storyId),
        storyTitle: title,
        testCases: testCases,
        qeStories: qeStories, // Include QE story breakdown from AI
        summary: {
          totalTestCases: testCases.length,
          byType: typeCounts,
          byPriority: priorityCounts,
          byQEStory: qeStoryCounts, // Tests grouped by QE story
          byCoverage: gapCoverageCounts, // Gap vs AC-aligned breakdown
          // Legacy fields for backward compatibility
          functionalTests: typeCounts.positive,
          integrationTests: typeCounts.integration,
          negativeTests: typeCounts.negative,
          edgeCaseTests: typeCounts.edge,
          highPriority: priorityCounts.critical + priorityCounts.high,
          mediumPriority: priorityCounts.medium,
          lowPriority: priorityCounts.low,
        },
        // Include risk context if available
        riskContext: riskAnalysis
          ? {
              level: riskAnalysis.level,
              score: riskAnalysis.score,
              acRiskMapping: acRiskMapping,
            }
          : null,
        // Phase 2: Include PR context if available
        prContext:
          prFiles.length > 0
            ? {
                fileCount: prFiles.length,
                prCount: pullRequests.length,
                pullRequests: pullRequests.map((pr) => ({
                  id: pr.pullRequestId,
                  title: pr.title,
                  status: pr.status,
                })),
                files: prFiles.slice(0, 20), // Limit to first 20 for response size
                usedForGeneration: true,
              }
            : null,
      };

      // If updateADO is true, add test cases to Azure DevOps
      if (updateADO) {
        try {
          // Note: This would require implementing test case creation in Azure DevOps MCP
          logger.info(
            `Would update ADO with ${testCases.length} test cases for story ${storyId}`,
          );
          response.adoUpdateStatus =
            "Feature not yet implemented - test cases not added to ADO";
          response.adoUpdateMessage =
            "Azure DevOps Test Case creation API not yet implemented";
        } catch (adoError) {
          logger.error("Failed to update ADO:", adoError);
          response.adoUpdateStatus = "Failed";
          response.adoUpdateError = adoError.message;
        }
      }

      res.json(response);
    } catch (genError) {
      logger.error("Test generation failed:", genError);
      return res.status(500).json({
        error: "Test generation failed",
        message: genError.message,
        storyId: parseInt(storyId),
        storyTitle: title,
      });
    }
  } catch (error) {
    logger.error("Test case generation error:", error);
    res.status(500).json({
      error: "Test case generation failed",
      message: error.message,
    });
  }
});

/**
 * Helper function to parse test cases from Playwright test code
 */
function parseTestCasesFromPlaywrightTest(code, storyTitle) {
  const testCases = [];
  let testId = 1;

  // Match test() blocks
  const testRegex = /test\(['"`](.+?)['"`]/g;
  let match;

  while ((match = testRegex.exec(code)) !== null) {
    const testName = match[1];
    let type = "positive";

    // Determine test type based on name
    if (
      testName.toLowerCase().includes("error") ||
      testName.toLowerCase().includes("invalid") ||
      testName.toLowerCase().includes("fail") ||
      testName.toLowerCase().includes("negative")
    ) {
      type = "negative";
    } else if (
      testName.toLowerCase().includes("edge") ||
      testName.toLowerCase().includes("boundary") ||
      testName.toLowerCase().includes("empty") ||
      testName.toLowerCase().includes("null")
    ) {
      type = "edge-case";
    }

    testCases.push({
      id: testId++,
      title: testName,
      type: type,
      description: `Automated test generated from story: ${storyTitle}`,
      priority: type === "positive" ? 1 : 2,
      automated: true,
    });
  }

  // If no tests found, create a default test case
  if (testCases.length === 0) {
    testCases.push({
      id: 1,
      title: `Verify ${storyTitle}`,
      type: "positive",
      description: `Test case for: ${storyTitle}`,
      priority: 1,
      automated: true,
    });
  }

  return testCases;
}

// ... (keep all other existing endpoints: analyze-requirements, generate-test-cases, etc.)

// ============================================
// TEST PLAN MANAGEMENT ENDPOINTS
// ============================================

/**
 * Get all test plans
 * GET /api/ado/test-plans?project=ProjectName
 * Query params:
 *   - project: Optional project name (uses default if not specified)
 */
router.get("/test-plans", async (req, res) => {
  try {
    const { project } = req.query;
    logger.info("Fetching test plans from Azure DevOps", {
      project: project || "default",
    });

    // Pass project as query param to MCP
    const url = project
      ? `/work-items/test-plans?project=${encodeURIComponent(project)}`
      : "/work-items/test-plans";

    const result = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      url,
      {},
      "GET",
    );

    const testPlans = result?.data || [];

    res.json({
      success: true,
      project: project || null,
      count: testPlans.length,
      testPlans: testPlans.map((tp) => ({
        id: tp.id,
        name: tp.name,
        state: tp.state,
        iteration: tp.iteration,
        rootSuiteId: tp.rootSuite?.id,
      })),
    });
  } catch (error) {
    logger.error("Get test plans error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get test suites for a plan (for hierarchy exploration)
 * GET /api/ado/test-plans/:planId/suites
 */
router.get("/test-plans/:planId/suites", async (req, res) => {
  try {
    const { planId } = req.params;
    logger.info(`Fetching test suites for plan ${planId}`);

    const result = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      `/work-items/test-plans/${planId}/suites`,
      {},
      "GET",
    );

    const suites = result?.data || [];

    res.json({
      success: true,
      planId: parseInt(planId),
      count: suites.length,
      suites: suites.map((s) => ({
        id: s.id,
        name: s.name,
        suiteType: s.suiteType,
        parentSuiteId: s.parentSuite?.id,
        requirementId: s.requirementId,
      })),
    });
  } catch (error) {
    logger.error("Get test suites error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// CREATE TEST CASES IN ADO
// ============================================

/**
 * Create test cases in Azure DevOps with proper Test Plan hierarchy
 * POST /api/ado/create-test-cases
 * Body: {
 *   storyId: number,
 *   storyTitle: string,
 *   testPlanId?: number,        // Optional: If provided, organizes test cases in Test Plan hierarchy
 *   featureId?: number,         // Optional: Parent feature ID for grouping
 *   featureTitle?: string,      // Optional: Parent feature title
 *   testCases: [{ title, steps, expectedResult, priority, type, acceptanceCriteriaRef }]
 * }
 *
 * If testPlanId is provided:
 *   Creates hierarchy: Test Plan > Feature Suite (if featureId provided) > PBI Suite > Test Cases
 * If testPlanId is not provided:
 *   Creates test cases without Test Plan organization (legacy behavior)
 */
router.post("/create-test-cases", async (req, res) => {
  try {
    const {
      storyId,
      storyTitle,
      testPlanId,
      featureId,
      featureTitle,
      testCases,
      project,
    } = req.body;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: "storyId is required",
      });
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: "testCases array is required and cannot be empty",
      });
    }

    logger.info(
      `Creating ${testCases.length} test cases for story ${storyId}`,
      {
        testPlanId: testPlanId || "none",
        featureId: featureId || "none",
      },
    );

    // Transform test cases to MCP format
    const mcpTestCases = testCases.map((tc, index) => ({
      title: tc.title || tc.name,
      steps: (tc.steps || []).map((step, stepIdx) => ({
        action: typeof step === "string" ? step : step.action || step,
        expectedResult: tc.expectedResult || "Verify expected behavior",
        stepNumber: stepIdx + 1,
      })),
    }));

    let result;
    let createdTestCases = [];
    let suiteInfo = null;

    // If testPlanId is provided, use the hierarchy endpoint
    if (testPlanId) {
      // Need story title for the PBI suite name
      let resolvedStoryTitle = storyTitle;
      if (!resolvedStoryTitle) {
        // Try to fetch it from ADO
        try {
          const storyResponse = await req.mcpManager.callDockerMcp(
            "azureDevOps",
            "/work-items/get",
            { ids: [parseInt(storyId)], orgWide: true },
          );
          const storyData = storyResponse?.data?.[0];
          resolvedStoryTitle =
            storyData?.fields?.["System.Title"] || `PBI ${storyId}`;
        } catch (fetchErr) {
          logger.warn(
            `Could not fetch story title for ${storyId}, using default`,
          );
          resolvedStoryTitle = `PBI ${storyId}`;
        }
      }

      logger.info(
        `Using Test Plan hierarchy: Plan ${testPlanId} > Feature ${featureId || "none"} > PBI ${storyId}`,
      );

      result = await req.mcpManager.callDockerMcp(
        "azureDevOps",
        "/work-items/create-test-cases-in-plan",
        {
          testPlanId: parseInt(testPlanId),
          storyId: parseInt(storyId),
          storyTitle: resolvedStoryTitle,
          testCases: mcpTestCases,
          featureId: featureId ? parseInt(featureId) : undefined,
          featureTitle: featureTitle || undefined,
          project: project || undefined,
        },
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || "Failed to create test cases in plan",
        );
      }

      createdTestCases = result.data?.testCases || [];
      suiteInfo = result.data?.suite || null;

      logger.info(
        `Successfully created ${createdTestCases.length} test cases in Test Plan ${testPlanId}`,
        {
          suiteId: suiteInfo?.id,
          suiteName: suiteInfo?.name,
        },
      );
    } else {
      // Legacy behavior: create test cases without Test Plan organization
      result = await req.mcpManager.callDockerMcp(
        "azureDevOps",
        "/work-items/create-test-cases",
        {
          parentId: parseInt(storyId),
          testCases: mcpTestCases,
        },
      );

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to create test cases");
      }

      createdTestCases = result.data?.created || [];
      logger.info(
        `Successfully created ${createdTestCases.length} test cases (no Test Plan)`,
      );
    }

    res.json({
      success: true,
      createdCount: createdTestCases.length,
      testPlanId: testPlanId ? parseInt(testPlanId) : null,
      suite: suiteInfo
        ? {
            id: suiteInfo.id,
            name: suiteInfo.name,
            type: suiteInfo.suiteType,
          }
        : null,
      testCases: createdTestCases.map((tc) => ({
        id: tc.id,
        title: tc.fields?.["System.Title"],
        url: tc._links?.html?.href,
      })),
    });
  } catch (error) {
    logger.error("Create test cases error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// NEW DEFECT MANAGEMENT ENDPOINTS
// ============================================

/**
 * Get all defects with optional filters
 * GET /api/ado/defects?environment=UAT&severity=High&state=Active
 */
router.get("/defects", async (req, res) => {
  try {
    const { environment, severity, priority, state, sprint, assignedTo } =
      req.query;

    logger.info("Pulling defects from Azure DevOps", { filters: req.query });

    // Call Azure DevOps MCP - just pass sprint, let it build default query
    const defectsResponse = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/query",
      {
        sprint,
      },
    );

    // Unwrap MCP response
    const defects = defectsResponse?.data || [];

    // Filter to only bugs
    let filteredDefects = defects.filter((wi) => {
      return wi.fields?.["System.WorkItemType"] === "Bug";
    });

    // Apply client-side filters
    if (state) {
      filteredDefects = filteredDefects.filter((defect) => {
        return defect.fields?.["System.State"] === state;
      });
    }

    if (severity) {
      filteredDefects = filteredDefects.filter((defect) => {
        return defect.fields?.["Microsoft.VSTS.Common.Severity"] === severity;
      });
    }

    if (priority) {
      filteredDefects = filteredDefects.filter((defect) => {
        return (
          defect.fields?.["Microsoft.VSTS.Common.Priority"] ===
          parseInt(priority)
        );
      });
    }

    if (environment) {
      filteredDefects = filteredDefects.filter((defect) => {
        const tags = defect.fields["System.Tags"] || "";
        return tags.toLowerCase().includes(environment.toLowerCase());
      });
    }

    if (assignedTo) {
      filteredDefects = filteredDefects.filter((defect) => {
        const assigned = defect.fields["System.AssignedTo"]?.displayName || "";
        return assigned.toLowerCase().includes(assignedTo.toLowerCase());
      });
    }

    // Calculate metrics
    const metrics = calculateDefectMetrics(filteredDefects);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: filteredDefects.length,
      metrics,
      defects: filteredDefects,
    });
  } catch (error) {
    logger.error("Get defects error:", error);
    res.status(500).json({
      error: "Failed to get defects",
      message: error.message,
    });
  }
});

/**
 * Get defects by story
 * GET /api/ado/defects/by-story/:storyId
 */
router.get("/defects/by-story/:storyId", async (req, res) => {
  try {
    const { storyId } = req.params;

    logger.info(`Getting defects for story ${storyId}`);

    // Query defects linked to story
    const wiql = `SELECT [System.Id], [System.Title], [System.State], [System.Tags],
                  [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority]
                  FROM WorkItemLinks
                  WHERE ([Source].[System.Id] = ${storyId} 
                         AND [Target].[System.WorkItemType] = 'Bug')
                  OR ([Target].[System.Id] = ${storyId} 
                      AND [Source].[System.WorkItemType] = 'Bug')
                  ORDER BY [Microsoft.VSTS.Common.Priority] ASC`;

    const defects = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/query",
      { wiql },
    );

    const metrics = calculateDefectMetrics(defects);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId,
      count: defects.length,
      metrics,
      defects,
    });
  } catch (error) {
    logger.error("Get defects by story error:", error);
    res.status(500).json({
      error: "Failed to get defects",
      message: error.message,
    });
  }
});

/**
 * Get defect metrics by environment
 * GET /api/ado/defects/metrics
 */
router.get("/defects/metrics", async (req, res) => {
  try {
    const { sprint } = req.query;

    logger.info("Getting defect metrics");

    // Get all defects
    let wiql = `SELECT [System.Id], [System.Title], [System.State], [System.Tags],
                [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority],
                [System.CreatedDate], [Microsoft.VSTS.Common.ResolvedDate]
                FROM WorkItems 
                WHERE [System.WorkItemType] = 'Bug'`;

    if (sprint) {
      wiql += ` AND [System.IterationPath] UNDER '${sprint}'`;
    }

    const defects = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/query",
      { wiql },
    );

    // Calculate comprehensive metrics
    const metrics = {
      total: defects.length,
      byEnvironment: calculateByEnvironment(defects),
      bySeverity: calculateBySeverity(defects),
      byPriority: calculateByPriority(defects),
      byState: calculateByState(defects),
      trends: calculateDefectTrends(defects),
      avgResolutionTime: calculateAvgResolutionTime(defects),
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (error) {
    logger.error("Get defect metrics error:", error);
    res.status(500).json({
      error: "Failed to get metrics",
      message: error.message,
    });
  }
});

// ============================================
// TEST EXECUTION ENDPOINTS
// ============================================

/**
 * Get all test plans
 * GET /api/ado/test-plans
 */
router.get("/test-plans", async (req, res) => {
  try {
    logger.info("Getting test plans");

    const testPlans = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/test/plans",
      {},
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: testPlans.length,
      testPlans,
    });
  } catch (error) {
    logger.error("Get test plans error:", error);
    res.status(500).json({
      error: "Failed to get test plans",
      message: error.message,
    });
  }
});

/**
 * Get test suites for a plan
 * GET /api/ado/test-plans/:planId/suites
 */
router.get("/test-plans/:planId/suites", async (req, res) => {
  try {
    const { planId } = req.params;

    logger.info(`Getting test suites for plan ${planId}`);

    const testSuites = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/test/suites",
      { planId },
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      planId,
      count: testSuites.length,
      testSuites,
    });
  } catch (error) {
    logger.error("Get test suites error:", error);
    res.status(500).json({
      error: "Failed to get test suites",
      message: error.message,
    });
  }
});

/**
 * Get test cases by story
 * GET /api/ado/test-cases/by-story/:storyId
 */
router.get("/test-cases/by-story/:storyId", async (req, res) => {
  try {
    const { storyId } = req.params;

    logger.info(`Getting test cases for story ${storyId}`);

    // Query test cases linked to story
    const wiql = `SELECT [System.Id], [System.Title], [System.State], 
                  [Microsoft.VSTS.TCM.AutomatedTestName], [Microsoft.VSTS.Common.Priority]
                  FROM WorkItemLinks
                  WHERE ([Source].[System.Id] = ${storyId} 
                         AND [Target].[System.WorkItemType] = 'Test Case')
                  OR ([Target].[System.Id] = ${storyId} 
                      AND [Source].[System.WorkItemType] = 'Test Case')
                  ORDER BY [Microsoft.VSTS.Common.Priority] ASC`;

    const testCases = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/query",
      { wiql },
    );

    // Calculate test case metrics
    const metrics = {
      total: testCases.length,
      automated: testCases.filter(
        (tc) => tc.fields["Microsoft.VSTS.TCM.AutomatedTestName"],
      ).length,
      manual: testCases.filter(
        (tc) => !tc.fields["Microsoft.VSTS.TCM.AutomatedTestName"],
      ).length,
      byState: calculateByState(testCases),
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId,
      count: testCases.length,
      metrics,
      testCases,
    });
  } catch (error) {
    logger.error("Get test cases error:", error);
    res.status(500).json({
      error: "Failed to get test cases",
      message: error.message,
    });
  }
});

/**
 * Get test runs with results
 * GET /api/ado/test-runs?planId=123&outcome=Failed
 */
router.get("/test-runs", async (req, res) => {
  try {
    const { planId, outcome, automated } = req.query;

    logger.info("Getting test runs", { filters: req.query });

    const testRuns = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/test/runs",
      { planId, outcome, automated },
    );

    // Calculate execution metrics
    const metrics = calculateTestExecutionMetrics(testRuns);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: testRuns.length,
      metrics,
      testRuns,
    });
  } catch (error) {
    logger.error("Get test runs error:", error);
    res.status(500).json({
      error: "Failed to get test runs",
      message: error.message,
    });
  }
});

/**
 * Get test results for a specific run
 * GET /api/ado/test-runs/:runId/results
 */
router.get("/test-runs/:runId/results", async (req, res) => {
  try {
    const { runId } = req.params;

    logger.info(`Getting test results for run ${runId}`);

    const results = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/test/results",
      { runId },
    );

    // Calculate pass rate
    const passed = results.filter((r) => r.outcome === "Passed").length;
    const failed = results.filter((r) => r.outcome === "Failed").length;
    const notExecuted = results.filter(
      (r) => r.outcome === "NotExecuted",
    ).length;
    const passRate = results.length > 0 ? (passed / results.length) * 100 : 0;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      runId,
      count: results.length,
      summary: {
        passed,
        failed,
        notExecuted,
        passRate: passRate.toFixed(2),
      },
      results,
    });
  } catch (error) {
    logger.error("Get test results error:", error);
    res.status(500).json({
      error: "Failed to get test results",
      message: error.message,
    });
  }
});

/**
 * Get test execution metrics
 * GET /api/ado/test-execution/metrics
 */
router.get("/test-execution/metrics", async (req, res) => {
  try {
    const { sprint, planId } = req.query;

    logger.info("Getting test execution metrics");

    // Try to get test runs, but handle gracefully if endpoint doesn't exist
    let testRuns = [];
    try {
      testRuns = await req.mcpManager.callDockerMcp(
        "azureDevOps",
        "/test/runs",
        { sprint, planId, limit: 50 },
      );
    } catch (testError) {
      // Test execution endpoints not implemented yet - return empty data
      logger.warn(
        "Test execution endpoints not available yet:",
        testError.message,
      );
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        available: false,
        message: "Test execution tracking not yet implemented",
        metrics: {
          totalRuns: 0,
          passRate: 0,
          executionTrends: [],
          byEnvironment: {},
          automationRate: 0,
        },
      });
    }

    const metrics = {
      totalRuns: testRuns.length,
      passRate: calculateOverallPassRate(testRuns),
      executionTrends: calculateExecutionTrends(testRuns),
      byEnvironment: calculateTestResultsByEnvironment(testRuns),
      automationRate: calculateAutomationRate(testRuns),
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      available: true,
      metrics,
    });
  } catch (error) {
    logger.error("Get test execution metrics error:", error);
    res.status(500).json({
      error: "Failed to get metrics",
      message: error.message,
    });
  }
});

/**
 * Get test execution organized by story
 * GET /api/ado/test-execution/by-story?sprint=Sprint%2042
 */
router.get("/test-execution/by-story", async (req, res) => {
  try {
    const { sprint } = req.query;

    logger.info("Getting test execution by story", { sprint });

    // Get all stories (Product Backlog Items) for the sprint
    const storiesResponse = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/query",
      {
        sprint,
        query: `SELECT * FROM WorkItems WHERE [System.WorkItemType] IN ('User Story', 'Product Backlog Item') ${sprint ? `AND [System.IterationPath] UNDER '${sprint}'` : "AND 1=0"} ORDER BY [System.Id] DESC`,
      },
    );

    // Unwrap MCP response
    const stories = storiesResponse?.data || [];

    logger.info(`Found ${stories.length} stories`);

    // For each story, get linked test cases
    const storiesWithTests = await Promise.all(
      stories.map(async (story) => {
        try {
          // Query test cases linked to this story
          const wiql = `SELECT [System.Id], [System.Title], [System.State],
                      [Microsoft.VSTS.TCM.AutomatedTestName], [Microsoft.VSTS.Common.Priority]
                      FROM WorkItemLinks
                      WHERE ([Source].[System.Id] = ${story.id}
                             AND [Target].[System.WorkItemType] = 'Test Case')
                      OR ([Target].[System.Id] = ${story.id}
                          AND [Source].[System.WorkItemType] = 'Test Case')
                      ORDER BY [Microsoft.VSTS.Common.Priority] ASC`;

          const testCasesResponse = await req.mcpManager
            .callDockerMcp("azureDevOps", "/work-items/query", {
              query: wiql,
            })
            .catch((err) => {
              logger.warn(
                `Failed to get test cases for story ${story.id}:`,
                err.message,
              );
              return { data: [] };
            });

          // Unwrap MCP response
          const testCases = testCasesResponse?.data || [];

          // For each test case, try to get latest test results (will be empty until test endpoints implemented)
          const testCasesWithResults = testCases.map((tc) => {
            const isAutomated =
              !!tc.fields["Microsoft.VSTS.TCM.AutomatedTestName"];

            return {
              id: tc.id,
              title: tc.fields["System.Title"],
              state: tc.fields["System.State"],
              priority: tc.fields["Microsoft.VSTS.Common.Priority"] || 3,
              automated: isAutomated,
              automatedTestName:
                tc.fields["Microsoft.VSTS.TCM.AutomatedTestName"],
              lastRun: null, // Will be populated when test/runs endpoint exists
              runHistory: {
                totalRuns: 0,
                passed: 0,
                failed: 0,
                blocked: 0,
                notExecuted: 0,
                passRate: 0,
              },
            };
          });

          // Calculate story summary
          const summary = {
            totalCases: testCasesWithResults.length,
            automatedCases: testCasesWithResults.filter((tc) => tc.automated)
              .length,
            manualCases: testCasesWithResults.filter((tc) => !tc.automated)
              .length,
            runCases: 0, // Will be calculated from test results
            pendingCases: testCasesWithResults.length,
            passRate: 0,
            automationRate:
              testCasesWithResults.length > 0
                ? (
                    (testCasesWithResults.filter((tc) => tc.automated).length /
                      testCasesWithResults.length) *
                    100
                  ).toFixed(1)
                : 0,
          };

          return {
            storyId: story.id,
            storyTitle: story.fields["System.Title"],
            storyState: story.fields["System.State"],
            storyType: story.fields["System.WorkItemType"],
            testCases: testCasesWithResults,
            summary,
          };
        } catch (error) {
          logger.error(`Error processing story ${story.id}:`, error);
          return {
            storyId: story.id,
            storyTitle: story.fields["System.Title"],
            storyState: story.fields["System.State"],
            storyType: story.fields["System.WorkItemType"],
            testCases: [],
            summary: {
              totalCases: 0,
              automatedCases: 0,
              manualCases: 0,
              runCases: 0,
              pendingCases: 0,
              passRate: 0,
              automationRate: 0,
            },
          };
        }
      }),
    );

    // Calculate overall metrics
    const overallMetrics = {
      totalStories: storiesWithTests.length,
      storiesWithTests: storiesWithTests.filter((s) => s.summary.totalCases > 0)
        .length,
      storiesWithoutTests: storiesWithTests.filter(
        (s) => s.summary.totalCases === 0,
      ).length,
      totalTestCases: storiesWithTests.reduce(
        (sum, s) => sum + s.summary.totalCases,
        0,
      ),
      automatedTestCases: storiesWithTests.reduce(
        (sum, s) => sum + s.summary.automatedCases,
        0,
      ),
      manualTestCases: storiesWithTests.reduce(
        (sum, s) => sum + s.summary.manualCases,
        0,
      ),
      overallAutomationRate: 0,
    };

    if (overallMetrics.totalTestCases > 0) {
      overallMetrics.overallAutomationRate = (
        (overallMetrics.automatedTestCases / overallMetrics.totalTestCases) *
        100
      ).toFixed(1);
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sprint,
      metrics: overallMetrics,
      stories: storiesWithTests,
      message:
        "Test results will be available once test execution endpoints are implemented",
    });
  } catch (error) {
    logger.error("Get test execution by story error:", error);
    res.status(500).json({
      error: "Failed to get test execution by story",
      message: error.message,
    });
  }
});

// ============================================
// QUALITY METRICS ENDPOINTS
// ============================================

/**
 * Get combined quality metrics
 * GET /api/ado/quality-metrics?sprint=Sprint%2042
 */
router.get("/quality-metrics", async (req, res) => {
  try {
    const { sprint } = req.query;

    logger.info("Getting quality metrics");

    // Get defects and stories (work items endpoints that exist)
    // Use sprint parameter instead of WIQL to let the MCP handle path formatting
    const [defectsResponse, storiesResponse] = await Promise.all([
      req.mcpManager.callDockerMcp("azureDevOps", "/work-items/query", {
        sprint,
        query: `SELECT * FROM WorkItems WHERE [System.WorkItemType] = 'Bug' ${sprint ? `AND [System.IterationPath] UNDER '${sprint}'` : "AND 1=0"} ORDER BY [System.Id] DESC`,
      }),
      req.mcpManager.callDockerMcp("azureDevOps", "/work-items/query", {
        sprint,
        query: `SELECT * FROM WorkItems WHERE [System.WorkItemType] = 'User Story' ${sprint ? `AND [System.IterationPath] UNDER '${sprint}'` : "AND 1=0"} ORDER BY [System.Id] DESC`,
      }),
    ]);

    // Unwrap MCP responses - data property contains the work items array
    const defects = defectsResponse?.data || [];
    const stories = storiesResponse?.data || [];

    // Try to get test runs, but handle gracefully if endpoint doesn't exist
    let testRuns = [];
    let testingAvailable = false;
    try {
      const testRunsResponse = await req.mcpManager.callDockerMcp(
        "azureDevOps",
        "/test/runs",
        { sprint, limit: 100 },
      );
      testRuns = testRunsResponse?.data || [];
      testingAvailable = true;
    } catch (testError) {
      logger.warn(
        "Test execution endpoints not available yet:",
        testError.message,
      );
      testRuns = [];
    }

    const metrics = {
      defects: {
        total: defects.length,
        byEnvironment: calculateByEnvironment(defects),
        bySeverity: calculateBySeverity(defects),
        open: defects.filter(
          (d) =>
            d.fields["System.State"] !== "Closed" &&
            d.fields["System.State"] !== "Resolved",
        ).length,
      },
      testing: {
        passRate: testingAvailable ? calculateOverallPassRate(testRuns) : 0,
        totalRuns: testRuns.length,
        automationRate: testingAvailable
          ? calculateAutomationRate(testRuns)
          : 0,
        available: testingAvailable,
      },
      coverage: {
        storiesWithTests: testingAvailable
          ? calculateStoriesWithTests(stories)
          : 0,
        storiesWithDefects: calculateStoriesWithDefects(stories),
        totalStories: stories.length,
      },
      qualityScore: calculateQualityScore(defects, testRuns, stories),
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sprint,
      metrics,
      message: !testingAvailable
        ? "Test execution tracking not yet implemented"
        : undefined,
    });
  } catch (error) {
    logger.error("Get quality metrics error:", error);
    res.status(500).json({
      error: "Failed to get quality metrics",
      message: error.message,
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDefectMetrics(defects) {
  return {
    total: defects.length,
    open: defects.filter(
      (d) =>
        d.fields["System.State"] === "Active" ||
        d.fields["System.State"] === "New",
    ).length,
    closed: defects.filter((d) => d.fields["System.State"] === "Closed").length,
    resolved: defects.filter((d) => d.fields["System.State"] === "Resolved")
      .length,
    byEnvironment: calculateByEnvironment(defects),
    bySeverity: calculateBySeverity(defects),
    byPriority: calculateByPriority(defects),
  };
}

function calculateByEnvironment(defects) {
  const envs = { dev: 0, uat: 0, prod: 0, other: 0 };

  defects.forEach((defect) => {
    const tags = (defect.fields["System.Tags"] || "").toLowerCase();
    if (tags.includes("dev")) envs.dev++;
    else if (tags.includes("uat")) envs.uat++;
    else if (tags.includes("prod")) envs.prod++;
    else envs.other++;
  });

  return envs;
}

function calculateBySeverity(defects) {
  const severity = { critical: 0, high: 0, medium: 0, low: 0 };

  defects.forEach((defect) => {
    const sev = (
      defect.fields["Microsoft.VSTS.Common.Severity"] || ""
    ).toLowerCase();
    if (sev.includes("1") || sev.includes("critical")) severity.critical++;
    else if (sev.includes("2") || sev.includes("high")) severity.high++;
    else if (sev.includes("3") || sev.includes("medium")) severity.medium++;
    else severity.low++;
  });

  return severity;
}

function calculateByPriority(defects) {
  const priority = { p1: 0, p2: 0, p3: 0, p4: 0 };

  defects.forEach((defect) => {
    const pri = defect.fields["Microsoft.VSTS.Common.Priority"];
    if (pri === 1) priority.p1++;
    else if (pri === 2) priority.p2++;
    else if (pri === 3) priority.p3++;
    else priority.p4++;
  });

  return priority;
}

function calculateByState(items) {
  const states = {};

  items.forEach((item) => {
    const state = item.fields["System.State"] || "Unknown";
    states[state] = (states[state] || 0) + 1;
  });

  return states;
}

function calculateDefectTrends(defects) {
  // Group defects by week for trend analysis
  const weeks = {};

  defects.forEach((defect) => {
    const createdDate = new Date(defect.fields["System.CreatedDate"]);
    const weekKey = getWeekKey(createdDate);
    weeks[weekKey] = (weeks[weekKey] || 0) + 1;
  });

  return weeks;
}

function calculateAvgResolutionTime(defects) {
  const resolved = defects.filter(
    (d) => d.fields["Microsoft.VSTS.Common.ResolvedDate"],
  );

  if (resolved.length === 0) return 0;

  const totalDays = resolved.reduce((sum, defect) => {
    const created = new Date(defect.fields["System.CreatedDate"]);
    const resolved = new Date(
      defect.fields["Microsoft.VSTS.Common.ResolvedDate"],
    );
    const days = (resolved - created) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return (totalDays / resolved.length).toFixed(1);
}

function calculateTestExecutionMetrics(testRuns) {
  const total = testRuns.length;
  const passed = testRuns.filter((r) => r.outcome === "Passed").length;
  const failed = testRuns.filter((r) => r.outcome === "Failed").length;

  return {
    total,
    passed,
    failed,
    passRate: total > 0 ? ((passed / total) * 100).toFixed(2) : 0,
  };
}

function calculateOverallPassRate(testRuns) {
  let totalTests = 0;
  let passedTests = 0;

  testRuns.forEach((run) => {
    totalTests += run.totalTests || 0;
    passedTests += run.passedTests || 0;
  });

  return totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;
}

function calculateExecutionTrends(testRuns) {
  // Group by date for trend analysis
  const dates = {};

  testRuns.forEach((run) => {
    const date = new Date(run.startedDate).toISOString().split("T")[0];
    if (!dates[date]) {
      dates[date] = { total: 0, passed: 0 };
    }
    dates[date].total += run.totalTests || 0;
    dates[date].passed += run.passedTests || 0;
  });

  return dates;
}

function calculateTestResultsByEnvironment(testRuns) {
  const envs = {
    dev: { passed: 0, failed: 0 },
    uat: { passed: 0, failed: 0 },
    prod: { passed: 0, failed: 0 },
  };

  testRuns.forEach((run) => {
    const tags = (run.tags || "").toLowerCase();
    let env = "dev";
    if (tags.includes("uat")) env = "uat";
    else if (tags.includes("prod")) env = "prod";

    envs[env].passed += run.passedTests || 0;
    envs[env].failed += run.failedTests || 0;
  });

  return envs;
}

function calculateAutomationRate(testRuns) {
  const automated = testRuns.filter((r) => r.isAutomated).length;
  return testRuns.length > 0
    ? ((automated / testRuns.length) * 100).toFixed(2)
    : 0;
}

function calculateStoriesWithTests(stories) {
  // Would need to query test case links - simplified here
  return Math.floor(stories.length * 0.75); // Placeholder
}

function calculateStoriesWithDefects(stories) {
  // Would need to query defect links - simplified here
  return Math.floor(stories.length * 0.15); // Placeholder
}

function calculateQualityScore(defects, testRuns, stories) {
  // Simple quality score calculation with safety checks
  const defectScore = Math.max(0, 100 - defects.length * 2);
  const testScore = parseFloat(calculateOverallPassRate(testRuns)) || 0;
  const coverageScore =
    stories.length > 0
      ? (calculateStoriesWithTests(stories) / stories.length) * 100
      : 0;

  const totalScore = (defectScore + testScore + coverageScore) / 3;
  return isNaN(totalScore) ? "0.0" : totalScore.toFixed(1);
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = Math.ceil(date.getDate() / 7);
  return `${year}-W${week}`;
}

// ============================================
// ITERATION HIERARCHY ENDPOINTS
// ============================================

// Get all projects
router.get("/iterations/projects", async (req, res) => {
  try {
    logger.info("Getting projects from Azure DevOps");

    const result = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/iterations/projects",
      {},
      "GET",
    );

    // Unwrap nested data property for cleaner frontend API
    if (result.success && result.data) {
      res.json({ success: true, ...result.data });
    } else {
      res.json(result);
    }
  } catch (error) {
    logger.error("Get projects error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get teams for a project
router.get("/iterations/teams", async (req, res) => {
  try {
    const { project } = req.query;
    logger.info("Getting teams for project:", project);

    if (!project) {
      return res
        .status(400)
        .json({ success: false, error: "project query parameter required" });
    }

    const result = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      `/iterations/teams?project=${encodeURIComponent(project)}`,
      {},
      "GET",
    );

    // Unwrap nested data property for cleaner frontend API
    if (result.success && result.data) {
      res.json({ success: true, ...result.data });
    } else {
      res.json(result);
    }
  } catch (error) {
    logger.error("Get teams error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sprints for a team
router.get("/iterations/sprints", async (req, res) => {
  try {
    const { project, team } = req.query;
    logger.info("Getting sprints for project/team:", { project, team });

    if (!project || !team) {
      return res.status(400).json({
        success: false,
        error: "project and team query parameters required",
      });
    }

    const result = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      `/iterations/sprints?project=${encodeURIComponent(project)}&team=${encodeURIComponent(team)}`,
      {},
      "GET",
    );

    // Unwrap nested data property for cleaner frontend API
    if (result.success && result.data) {
      res.json({ success: true, ...result.data });
    } else {
      res.json(result);
    }
  } catch (error) {
    logger.error("Get sprints error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WRITE-BACK ENDPOINTS (Analysis to ADO)
// ============================================

/**
 * Preview what will be updated in a story (doesn't actually write)
 * POST /api/ado/update-story/preview
 * Body: { storyId: number, updates: { fieldName: value } }
 */
router.post("/update-story/preview", async (req, res) => {
  try {
    const { storyId, updates } = req.body;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: "storyId is required",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        error: "updates object is required",
      });
    }

    logger.info(`Previewing updates for story ${storyId}`);

    // Get current story state
    const stories = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/get",
      { ids: [parseInt(storyId)] },
    );

    if (!stories || stories.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Story ${storyId} not found`,
      });
    }

    const currentStory = stories[0];
    const preview = {
      storyId: parseInt(storyId),
      storyTitle: currentStory.fields["System.Title"],
      changes: [],
    };

    // Show what will change
    for (const [field, newValue] of Object.entries(updates)) {
      const currentValue = currentStory.fields[field];

      if (currentValue !== newValue) {
        preview.changes.push({
          field,
          fieldName: getFieldDisplayName(field),
          currentValue: currentValue || "(empty)",
          newValue,
          changeType: currentValue ? "update" : "add",
        });
      }
    }

    logger.info(
      `Preview generated: ${preview.changes.length} changes for story ${storyId}`,
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      preview,
    });
  } catch (error) {
    logger.error("Preview update error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate preview",
      message: error.message,
    });
  }
});

/**
 * Actually update a story (requires confirmation)
 * POST /api/ado/update-story
 * Body: { storyId: number, updates: { fieldName: value }, confirmed: true }
 */
router.post("/update-story", async (req, res) => {
  try {
    const { storyId, updates, confirmed } = req.body;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: "storyId is required",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        error: "updates object is required",
      });
    }

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error:
          "Update must be confirmed. Call /update-story/preview first and set confirmed: true",
      });
    }

    logger.info(`Updating story ${storyId} with confirmed changes`);

    // Call Azure DevOps MCP to update the work item
    const result = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/update",
      {
        id: parseInt(storyId),
        fields: updates,
      },
    );

    // Audit log
    logger.info(`[AUDIT] Story ${storyId} updated by orchestrator:`, {
      fields: Object.keys(updates),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId: parseInt(storyId),
      updatedFields: Object.keys(updates),
      result,
    });
  } catch (error) {
    logger.error("Update story error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update story",
      message: error.message,
    });
  }
});

/**
 * Add a comment to a story
 * POST /api/ado/add-comment
 * Body: { storyId: number, comment: string }
 */
router.post("/add-comment", async (req, res) => {
  try {
    const { storyId, comment } = req.body;

    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: "storyId is required",
      });
    }

    if (!comment || typeof comment !== "string") {
      return res.status(400).json({
        success: false,
        error: "comment string is required",
      });
    }

    logger.info(`Adding comment to story ${storyId}`);

    // In ADO, comments are added via the System.History field
    const result = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/update",
      {
        id: parseInt(storyId),
        fields: {
          "System.History": comment,
        },
      },
    );

    // Audit log
    logger.info(`[AUDIT] Comment added to story ${storyId}:`, {
      commentLength: comment.length,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storyId: parseInt(storyId),
      commentAdded: true,
      result,
    });
  } catch (error) {
    logger.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add comment",
      message: error.message,
    });
  }
});

/**
 * Preview batch updates to multiple stories
 * POST /api/ado/batch-update/preview
 * Body: { storyIds: number[], updates: { fieldName: value } }
 */
router.post("/batch-update/preview", async (req, res) => {
  try {
    const { storyIds, updates } = req.body;

    if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "storyIds array is required",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        error: "updates object is required",
      });
    }

    logger.info(`Previewing batch update for ${storyIds.length} stories`);

    const previews = [];

    // Generate preview for each story
    for (const storyId of storyIds) {
      try {
        // Get current story state
        const stories = await req.mcpManager.callDockerMcp(
          "azureDevOps",
          "/work-items/get",
          { ids: [parseInt(storyId)] },
        );

        if (stories && stories.length > 0) {
          const currentStory = stories[0];
          const preview = {
            storyId: parseInt(storyId),
            storyTitle: currentStory.fields["System.Title"],
            changes: [],
          };

          for (const [field, newValue] of Object.entries(updates)) {
            const currentValue = currentStory.fields[field];

            if (currentValue !== newValue) {
              preview.changes.push({
                field,
                fieldName: getFieldDisplayName(field),
                currentValue: currentValue || "(empty)",
                newValue,
                changeType: currentValue ? "update" : "add",
              });
            }
          }

          previews.push(preview);
        } else {
          previews.push({
            storyId: parseInt(storyId),
            error: "Story not found",
          });
        }
      } catch (error) {
        previews.push({
          storyId: parseInt(storyId),
          error: error.message,
        });
      }
    }

    logger.info(`Batch preview generated for ${previews.length} stories`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalStories: storyIds.length,
      previews,
    });
  } catch (error) {
    logger.error("Batch preview error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate batch preview",
      message: error.message,
    });
  }
});

/**
 * Execute batch updates to multiple stories
 * POST /api/ado/batch-update
 * Body: { storyIds: number[], updates: { fieldName: value }, confirmed: true }
 */
router.post("/batch-update", async (req, res) => {
  try {
    const { storyIds, updates, confirmed } = req.body;

    if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "storyIds array is required",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        error: "updates object is required",
      });
    }

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error:
          "Batch update must be confirmed. Call /batch-update/preview first and set confirmed: true",
      });
    }

    logger.info(`Executing batch update for ${storyIds.length} stories`);

    const results = [];

    // Update each story
    for (const storyId of storyIds) {
      try {
        const result = await req.mcpManager.callDockerMcp(
          "azureDevOps",
          "/work-items/update",
          {
            id: parseInt(storyId),
            fields: updates,
          },
        );

        results.push({
          storyId: parseInt(storyId),
          success: true,
          updatedFields: Object.keys(updates),
        });

        // Audit log
        logger.info(`[AUDIT] Story ${storyId} batch updated:`, {
          fields: Object.keys(updates),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        results.push({
          storyId: parseInt(storyId),
          success: false,
          error: error.message,
        });

        logger.error(`Failed to update story ${storyId}:`, error);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    logger.info(
      `Batch update complete: ${successCount} succeeded, ${failureCount} failed`,
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: storyIds.length,
        succeeded: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error) {
    logger.error("Batch update error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to execute batch update",
      message: error.message,
    });
  }
});

// ============================================
// ENHANCED WORK ITEM ENDPOINTS (Phase 2)
// Development Links, PR Files, Test Case Comparison
// ============================================

/**
 * Get enhanced work item with development links, attachments, and related items
 * GET /api/ado/work-item/:id/enhanced
 * Returns: work item with parsed developmentLinks, attachments, relatedWorkItems, etc.
 */
router.get("/work-item/:id/enhanced", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "Invalid work item ID",
      });
    }

    logger.info(`Fetching enhanced work item ${id} with development links`);

    const response = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      "/work-items/enhanced",
      { ids: [parseInt(id)] },
    );

    const workItems = response?.data || [];

    if (workItems.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Work item ${id} not found`,
      });
    }

    const enhancedItem = workItems[0];

    // Build summary
    const summary = {
      hasPullRequests: (enhancedItem.developmentLinks || []).some(
        (l) => l.type === "PullRequest",
      ),
      hasCommits: (enhancedItem.developmentLinks || []).some(
        (l) => l.type === "Commit",
      ),
      hasBuilds: (enhancedItem.developmentLinks || []).some(
        (l) => l.type === "Build",
      ),
      attachmentCount: (enhancedItem.attachments || []).length,
      relatedWorkItemCount: (enhancedItem.relatedWorkItems || []).length,
      hasParent: !!enhancedItem.parentWorkItem,
      childCount: (enhancedItem.childWorkItems || []).length,
      pullRequestCount: (enhancedItem.developmentLinks || []).filter(
        (l) => l.type === "PullRequest",
      ).length,
    };

    res.json({
      success: true,
      workItem: enhancedItem,
      summary,
    });
  } catch (error) {
    logger.error("Get enhanced work item error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch enhanced work item",
      message: error.message,
    });
  }
});

/**
 * Get all files changed in PRs linked to a work item
 * GET /api/ado/work-item/:id/pr-files
 * Returns: Array of file paths changed across all linked PRs
 * This is used to expand blast radius analysis beyond the Impact field
 */
router.get("/work-item/:id/pr-files", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "Invalid work item ID",
      });
    }

    logger.info(`Fetching PR files for work item ${id}`);

    const response = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      `/work-items/${id}/files-changed`,
      {},
      "GET",
    );

    const data = response?.data || {};
    const files = data.files || [];

    res.json({
      success: true,
      workItemId: parseInt(id),
      fileCount: files.length,
      files,
      pullRequests: data.pullRequests || [],
    });
  } catch (error) {
    logger.error("Get PR files error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch PR files",
      message: error.message,
    });
  }
});

/**
 * Get existing test cases linked to a work item
 * GET /api/ado/work-item/:id/existing-test-cases
 * Returns: Array of existing test cases with their steps
 */
router.get("/work-item/:id/existing-test-cases", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "Invalid work item ID",
      });
    }

    logger.info(`Fetching existing test cases for work item ${id}`);

    const response = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      `/work-items/${id}/existing-test-cases`,
      {},
      "GET",
    );

    const testCases = response?.data || [];

    res.json({
      success: true,
      workItemId: parseInt(id),
      testCaseCount: testCases.length,
      testCases,
    });
  } catch (error) {
    logger.error("Get existing test cases error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch existing test cases",
      message: error.message,
    });
  }
});

/**
 * Compare generated test cases with existing ones
 * POST /api/ado/work-item/:id/compare-test-cases
 * Body: { generatedTestCases: TestCase[] }
 * Returns: Comparison result with NEW, UPDATE, EXISTS statuses
 */
router.post("/work-item/:id/compare-test-cases", async (req, res) => {
  try {
    const { id } = req.params;
    const { generatedTestCases } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "Invalid work item ID",
      });
    }

    if (
      !generatedTestCases ||
      !Array.isArray(generatedTestCases) ||
      generatedTestCases.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "generatedTestCases array is required",
      });
    }

    logger.info(
      `Comparing ${generatedTestCases.length} generated test cases for work item ${id}`,
    );

    // Transform test cases to MCP format
    const mcpTestCases = generatedTestCases.map((tc) => ({
      title: tc.title || tc.name,
      steps: (tc.steps || []).map((step, idx) => ({
        action: typeof step === "string" ? step : step.action || step,
        expectedResult:
          typeof step === "string"
            ? tc.expectedResult || "Verify expected behavior"
            : step.expectedResult ||
              tc.expectedResult ||
              "Verify expected behavior",
        stepNumber: idx + 1,
      })),
      priority: tc.priority,
      automationStatus: tc.automationStatus || "Not Automated",
    }));

    const response = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      `/work-items/${id}/compare-test-cases`,
      { testCases: mcpTestCases },
    );

    const comparison = response?.data || {};

    res.json({
      success: true,
      workItemId: parseInt(id),
      workItemTitle: comparison.workItemTitle,
      existingTestCases: comparison.existingTestCases || [],
      generatedTestCases: comparison.generatedTestCases || [],
      comparisons: comparison.comparisons || [],
      summary: comparison.summary || {
        newCount: 0,
        updateCount: 0,
        existsCount: 0,
        totalGenerated: generatedTestCases.length,
        totalExisting: 0,
      },
    });
  } catch (error) {
    logger.error("Compare test cases error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to compare test cases",
      message: error.message,
    });
  }
});

/**
 * Update an existing test case
 * PATCH /api/ado/test-cases/:id
 * Body: { title?, steps?, priority?, automationStatus? }
 */
router.patch("/test-cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, steps, priority, automationStatus } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "Invalid test case ID",
      });
    }

    logger.info(`Updating test case ${id}`);

    const updateData = {};
    if (title) updateData.title = title;
    if (steps) {
      updateData.steps = steps.map((step, idx) => ({
        action: typeof step === "string" ? step : step.action || step,
        expectedResult:
          typeof step === "string"
            ? "Verify expected behavior"
            : step.expectedResult || "Verify expected behavior",
        stepNumber: idx + 1,
      }));
    }
    if (priority !== undefined) updateData.priority = priority;
    if (automationStatus) updateData.automationStatus = automationStatus;

    const response = await req.mcpManager.callDockerMcp(
      "azureDevOps",
      `/work-items/test-cases/${id}`,
      updateData,
      "PATCH",
    );

    res.json({
      success: true,
      testCaseId: parseInt(id),
      updated: response?.data || {},
    });
  } catch (error) {
    logger.error("Update test case error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update test case",
      message: error.message,
    });
  }
});

/**
 * Helper function to get display-friendly field names
 */
function getFieldDisplayName(fieldName) {
  const fieldMap = {
    "System.Title": "Title",
    "System.Description": "Description",
    "System.State": "State",
    "System.Tags": "Tags",
    "System.AssignedTo": "Assigned To",
    "System.IterationPath": "Iteration Path",
    "System.AreaPath": "Area Path",
    "Microsoft.VSTS.Common.AcceptanceCriteria": "Acceptance Criteria",
    "Microsoft.VSTS.Common.Priority": "Priority",
    "Microsoft.VSTS.Common.Severity": "Severity",
    "System.History": "Comment/History",
  };

  return fieldMap[fieldName] || fieldName;
}

export default router;
