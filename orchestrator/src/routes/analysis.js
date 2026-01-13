import express from "express";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Analyze code coverage for an application
router.post("/coverage", async (req, res) => {
  try {
    const { app, detailed = false } = req.body;

    if (!app) {
      return res.status(400).json({ error: "Application name is required" });
    }

    logger.info(`Starting coverage analysis for ${app}`);

    // Call Code Analyzer MCP
    const codeStructure = await req.mcpManager.callDockerMcp(
      "dotnetCodeAnalyzer",
      "/analyze",
      { app, includeTests: true },
    );

    // Call Coverage Analyzer MCP
    const coverageReport = await req.mcpManager.callDockerMcp(
      "dotnetCoverageAnalyzer",
      "/analyze",
      { app, codeStructure, detailed },
    );

    // Emit real-time update
    req.io.to("analysis").emit("coverage-complete", { app, coverageReport });

    res.json({
      success: true,
      app,
      timestamp: new Date().toISOString(),
      data: {
        structure: codeStructure,
        coverage: coverageReport,
      },
    });
  } catch (error) {
    logger.error("Coverage analysis error:", error);
    res.status(500).json({
      error: "Coverage analysis failed",
      message: error.message,
    });
  }
});

// Analyze code structure for all applications
router.post("/code-scan", async (req, res) => {
  try {
    const { apps = ["App1"] } = req.body;

    logger.info(`Starting code scan for applications: ${apps.join(", ")}`);

    const results = {};

    for (const app of apps) {
      try {
        const analysis = await req.mcpManager.callDockerMcp(
          "dotnetCodeAnalyzer",
          "/analyze",
          {
            app,
            includeIntegrations: true,
            findEpicReferences: true,
            findFinancialReferences: true,
          },
        );
        results[app] = analysis;

        // Real-time update
        req.io.to("analysis").emit("app-scanned", { app, analysis });
      } catch (error) {
        logger.error(`Error scanning ${app}:`, error);
        results[app] = { error: error.message };
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    logger.error("Code scan error:", error);
    res.status(500).json({
      error: "Code scan failed",
      message: error.message,
    });
  }
});

// Get test gaps - combines code analysis and coverage
router.post("/test-gaps", async (req, res) => {
  try {
    const { app } = req.body;

    if (!app) {
      return res.status(400).json({ error: "Application name is required" });
    }

    logger.info(`Identifying test gaps for ${app}`);

    // Get code structure
    const codeStructure = await req.mcpManager.callDockerMcp(
      "dotnetCodeAnalyzer",
      "/analyze",
      { app },
    );

    // Extract only the methods array to reduce payload size
    const methods =
      codeStructure?.analysis?.methods || codeStructure?.methods || [];
    logger.info(
      `[Analysis] Sending ${methods.length} methods to coverage analyzer`,
    );

    // DEBUG: Check if className is present
    if (methods.length > 0) {
      const sampleMethod = methods[0];
      logger.info(
        `[Analysis] Sample method keys: ${Object.keys(sampleMethod).join(", ")}`,
      );
      logger.info(
        `[Analysis] Sample className: ${sampleMethod.className || "MISSING"}`,
      );
    }

    // Get coverage data - pass only methods array, not entire codeStructure
    const coverage = await req.mcpManager.callDockerMcp(
      "dotnetCoverageAnalyzer",
      "/analyze",
      { app, codeStructure: { methods } },
    );

    // Identify gaps (methods without tests, missing negative tests, etc.)
    const coverageData = coverage.coverage || coverage;
    const allMethods = coverageData.methods || [];

    // ✅ FIX: Methods with tests but missing negative tests should NOT be in untestedMethods
    const gaps = {
      untestedMethods: allMethods.filter(
        (m) => !m.hasTests && (m.coverage === 0 || m.coverage === null),
      ),
      partialCoverage: allMethods.filter(
        (m) => m.coverage !== null && m.coverage > 0 && m.coverage < 80,
      ),
      missingNegativeTests: allMethods.filter(
        (m) => m.hasTests && !m.hasNegativeTests,
      ),
      criticalPaths: coverageData.criticalUntested || [],
    };

    res.json({
      success: true,
      app,
      timestamp: new Date().toISOString(),
      gaps,
      summary: {
        totalMethods: (coverageData.methods || []).length,
        untestedCount: gaps.untestedMethods.length,
        coveragePercentage: coverageData.overallPercentage || 0,
      },
    });
  } catch (error) {
    logger.error("Test gaps analysis error:", error);
    res.status(500).json({
      error: "Test gaps analysis failed",
      message: error.message,
    });
  }
});

// ============================================
// RISK ANALYSIS
// ============================================

// Analyze risk for a story
router.post("/risk/analyze-story", async (req, res) => {
  try {
    const { app, story } = req.body;

    if (!app) {
      return res.status(400).json({ error: "app parameter required" });
    }

    if (!story) {
      return res.status(400).json({ error: "story parameter required" });
    }

    logger.info(`Analyzing risk for story ${story.id} in app ${app}`);

    const result = await req.mcpManager.callDockerMcp(
      "riskAnalyzer",
      "/analyze-risk",
      { app, story },
    );

    res.json(result);
  } catch (error) {
    logger.error("Risk analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Risk analysis failed",
      message: error.message,
    });
  }
});

// Enhanced risk analysis with per-AC Likelihood × Impact scoring
router.post("/risk/analyze-ac", async (req, res) => {
  try {
    const { app, story, acceptanceCriteria, extractedData } = req.body;

    if (!app) {
      return res.status(400).json({ error: "app parameter required" });
    }

    if (!story) {
      return res.status(400).json({ error: "story parameter required" });
    }

    logger.info(`Analyzing per-AC risk for story ${story.id} in app ${app}`);

    // Parse acceptance criteria if provided as HTML string
    let parsedACs = acceptanceCriteria || [];
    if (typeof parsedACs === "string" && parsedACs.length > 0) {
      parsedACs = parseAcceptanceCriteriaHtml(parsedACs);
    }

    const result = await req.mcpManager.callDockerMcp(
      "riskAnalyzer",
      "/risk-matrix",
      {
        app,
        story,
        acceptanceCriteria: parsedACs,
      },
    );

    // Enhance response with formatted output for frontend
    if (result.success) {
      // Build summary risk matrix table
      const summaryTable = buildRiskSummaryTable(result.acRiskMapping || []);

      // Build detailed analysis per AC
      const detailedAnalysis = buildDetailedACAnalysis(
        result.acRiskMapping || [],
        result.riskMatrix,
        extractedData,
      );

      // Build testing prioritization order
      const testingPriority = buildTestingPrioritization(
        result.acRiskMapping || [],
        result.riskMatrix,
      );

      result.formattedOutput = {
        summaryTable,
        detailedAnalysis,
        testingPriority,
        testRecommendations: result.testPrioritization,
        integrationRecommendations: result.suggestedTestTypes,
      };
    }

    res.json(result);
  } catch (error) {
    logger.error("Per-AC risk analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Per-AC risk analysis failed",
      message: error.message,
    });
  }
});

// Helper: Parse acceptance criteria from HTML
function parseAcceptanceCriteriaHtml(html) {
  const acs = [];
  // Match numbered items like "1. ...", "AC1:", "- AC1:", bullet points, etc.
  const patterns = [
    /<li[^>]*>(.*?)<\/li>/gi,
    /(?:^|\n)\s*(?:AC)?(\d+)[.:]\s*(.+?)(?=\n|$)/gi,
    /(?:^|\n)\s*[-•*]\s*(.+?)(?=\n|$)/gi,
  ];

  let acNumber = 1;

  // Try ordered list items first
  const listMatches = html.matchAll(/<li[^>]*>(.*?)<\/li>/gi);
  for (const match of listMatches) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text) {
      acs.push({
        id: `AC${acNumber}`,
        number: acNumber,
        text,
      });
      acNumber++;
    }
  }

  // If no list items found, try line-by-line parsing
  if (acs.length === 0) {
    const lines = html.replace(/<[^>]+>/g, "\n").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 10) {
        // Check for numbered pattern
        const numbered = trimmed.match(/^(?:AC)?(\d+)[.:]\s*(.+)/i);
        if (numbered) {
          acs.push({
            id: `AC${numbered[1]}`,
            number: parseInt(numbered[1]),
            text: numbered[2].trim(),
          });
        } else if (trimmed.match(/^[-•*]\s*/)) {
          acs.push({
            id: `AC${acNumber}`,
            number: acNumber,
            text: trimmed.replace(/^[-•*]\s*/, "").trim(),
          });
          acNumber++;
        }
      }
    }
  }

  return acs;
}

// Helper: Build summary risk matrix table
function buildRiskSummaryTable(acRiskMapping) {
  return acRiskMapping
    .map((ac) => ({
      ac: ac.ac,
      text: ac.text?.substring(0, 60) + (ac.text?.length > 60 ? "..." : ""),
      riskLevel: ac.riskLevel,
      likelihood: getLikelihoodFromRisk(ac.riskLevel),
      impact: getImpactFromRisk(ac.riskLevel),
      riskScore: getRiskScoreFromLevel(ac.riskLevel),
      testDepth: ac.testingDepth,
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
}

// Helper: Build detailed analysis per AC
function buildDetailedACAnalysis(acRiskMapping, riskMatrix, extractedData) {
  return acRiskMapping.map((ac) => ({
    acReference: ac.ac,
    text: ac.text,
    riskFactors: {
      integrationPoints: ac.riskReasons || [],
      dataFlowComplexity:
        riskMatrix?.probability?.factors?.codeComplexity?.reason ||
        "Not assessed",
      dependencies:
        extractedData?.filePaths?.length > 0
          ? `${extractedData.filePaths.length} files affected`
          : "None identified",
      historicalProblems:
        riskMatrix?.probability?.factors?.defectHistory?.reason || "None known",
      newVsModified: "Modified code - regression risk",
    },
    likelihoodScore: getLikelihoodFromRisk(ac.riskLevel),
    likelihoodJustification:
      ac.riskReasons?.join(", ") || "Based on content analysis",
    impactScore: getImpactFromRisk(ac.riskLevel),
    impactJustification:
      riskMatrix?.impact?.factors?.businessCriticality?.reason ||
      "Based on business impact assessment",
    riskScore: getRiskScoreFromLevel(ac.riskLevel),
    riskPriority: ac.riskLevel.toUpperCase(),
    recommendedTestFocus: {
      scenarios: generateTestScenarios(ac),
      edgeCases: generateEdgeCases(ac),
      integrationPoints: ac.riskReasons || [],
      testTypes: Object.entries(ac.recommendedTests || {})
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => `${count} ${type} test(s)`),
    },
  }));
}

// Helper: Build testing prioritization
function buildTestingPrioritization(acRiskMapping, riskMatrix) {
  const sorted = [...acRiskMapping].sort(
    (a, b) =>
      getRiskScoreFromLevel(b.riskLevel) - getRiskScoreFromLevel(a.riskLevel),
  );

  return {
    order: sorted.map((ac, idx) => ({
      priority: idx + 1,
      ac: ac.ac,
      riskLevel: ac.riskLevel,
      reason: ac.riskReasons?.join(", ") || "Standard priority",
    })),
    criticalFirst: sorted
      .filter((ac) => ac.riskLevel === "critical")
      .map((ac) => ac.ac),
    highPriority: sorted
      .filter((ac) => ac.riskLevel === "high")
      .map((ac) => ac.ac),
  };
}

function getLikelihoodFromRisk(riskLevel) {
  const mapping = { critical: 5, high: 4, medium: 3, low: 2 };
  return mapping[riskLevel] || 3;
}

function getImpactFromRisk(riskLevel) {
  const mapping = { critical: 5, high: 4, medium: 3, low: 2 };
  return mapping[riskLevel] || 3;
}

function getRiskScoreFromLevel(riskLevel) {
  const mapping = { critical: 25, high: 16, medium: 9, low: 4 };
  return mapping[riskLevel] || 9;
}

function generateTestScenarios(ac) {
  const scenarios = [];
  const text = (ac.text || "").toLowerCase();

  if (text.includes("submit") || text.includes("save")) {
    scenarios.push("Successful submission with valid data");
    scenarios.push("Submission failure handling");
  }
  if (text.includes("validate") || text.includes("error")) {
    scenarios.push("Validation error messages displayed correctly");
    scenarios.push("Field-level validation behavior");
  }
  if (text.includes("display") || text.includes("show")) {
    scenarios.push("Data displays correctly");
    scenarios.push("Empty state handling");
  }

  return scenarios.length > 0
    ? scenarios
    : ["Happy path validation", "Error handling"];
}

function generateEdgeCases(ac) {
  const edgeCases = [];
  const text = (ac.text || "").toLowerCase();

  if (text.includes("payment") || text.includes("amount")) {
    edgeCases.push(
      "Zero amount handling",
      "Maximum amount limit",
      "Currency edge cases",
    );
  }
  if (text.includes("date") || text.includes("time")) {
    edgeCases.push("Timezone handling", "Date boundary conditions");
  }
  if (text.includes("list") || text.includes("multiple")) {
    edgeCases.push("Empty list", "Single item", "Maximum items");
  }

  return edgeCases.length > 0
    ? edgeCases
    : ["Boundary conditions", "Null/empty values"];
}

// ============================================
// INTEGRATION MAPPING
// ============================================

// Map integrations for an application
router.post("/integrations/map", async (req, res) => {
  try {
    const { app, integrationType, includeDiagram, changedFiles } = req.body;

    if (!app) {
      return res.status(400).json({ error: "app parameter required" });
    }

    logger.info(
      `Mapping integrations for app ${app}, type: ${integrationType || "all"}`,
    );
    if (changedFiles && changedFiles.length > 0) {
      logger.info(`Filtering by ${changedFiles.length} changed files`);
    }

    const result = await req.mcpManager.callDockerMcp(
      "integrationMapper",
      "/map-integrations",
      { app, integrationType, includeDiagram },
    );

    // Filter integrations by changed files if provided
    if (
      changedFiles &&
      changedFiles.length > 0 &&
      result.success &&
      result.result
    ) {
      const normalizedChangedFiles = changedFiles.map((f) =>
        f.toLowerCase().replace(/\\/g, "/"),
      );

      // Filter integrations to only those from changed files
      const filteredIntegrations = result.result.integrations.filter(
        (integration) => {
          const integrationFile = (
            integration.file ||
            integration.sourceFile ||
            ""
          )
            .toLowerCase()
            .replace(/\\/g, "/");
          return normalizedChangedFiles.some((changedFile) => {
            // Match if the integration file contains the changed file path (partial match for relative paths)
            const changedFileName = changedFile.split("/").pop();
            return (
              integrationFile.includes(changedFile) ||
              integrationFile.endsWith(changedFileName)
            );
          });
        },
      );

      // Rebuild integrationsByType based on filtered results
      const filteredByType = {};
      for (const integration of filteredIntegrations) {
        const type = integration.type || "unknown";
        if (!filteredByType[type]) {
          filteredByType[type] = [];
        }
        filteredByType[type].push(integration);
      }

      // Update result with filtered data
      result.result.integrations = filteredIntegrations;
      result.result.integrationsByType = filteredByType;
      result.result.summary = {
        total: filteredIntegrations.length,
        byType: Object.fromEntries(
          Object.entries(filteredByType).map(([type, items]) => [
            type,
            items.length,
          ]),
        ),
        filteredBy: `${changedFiles.length} changed files`,
      };

      logger.info(
        `Filtered to ${filteredIntegrations.length} integrations from changed files`,
      );
    }

    res.json(result);
  } catch (error) {
    logger.error("Integration mapping error:", error);
    res.status(500).json({
      success: false,
      error: "Integration mapping failed",
      message: error.message,
    });
  }
});

// ============================================
// BLAST RADIUS ANALYSIS
// ============================================

// Analyze blast radius for changed files
router.post("/blast-radius/analyze", async (req, res) => {
  try {
    const { app, changedFiles, depth } = req.body;

    if (!app) {
      return res.status(400).json({ error: "app parameter required" });
    }

    if (!changedFiles || changedFiles.length === 0) {
      return res.status(400).json({ error: "changedFiles array required" });
    }

    logger.info(
      `Analyzing blast radius for ${changedFiles.length} files in app ${app}`,
    );

    const result = await req.mcpManager.callDockerMcp(
      "blastRadiusAnalyzer",
      "/analyze",
      {
        app,
        changedFiles,
        depth: depth || 2,
      },
    );

    res.json({
      success: true,
      result: result,
    });
  } catch (error) {
    logger.error("Blast radius analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Blast radius analysis failed",
      message: error.message,
    });
  }
});

export default router;
