import express from "express";
import { RiskScorer } from "./riskScorer.js";

const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.json());

const riskScorer = new RiskScorer();

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "risk-analyzer-mcp",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

app.post("/analyze-risk", async (req, res) => {
  try {
    const { app: appName, story } = req.body;

    if (!appName) {
      return res.status(400).json({
        success: false,
        error: "app parameter required",
      });
    }

    if (!story) {
      return res.status(400).json({
        success: false,
        error:
          "story parameter required (must include: id, title, description, acceptanceCriteria)",
      });
    }

    console.log(
      `[risk-analyzer] Analyzing story ${story.id} for app ${appName}...`,
    );

    // Calculate risk using the RiskScorer
    const riskAnalysis = await riskScorer.calculateRisk(appName, story);

    console.log(
      `[risk-analyzer] Risk analysis complete: ${riskAnalysis.level} (${riskAnalysis.score}/100)`,
    );

    res.json({
      success: true,
      app: appName,
      storyId: story.id,
      timestamp: new Date().toISOString(),
      result: {
        risk: riskAnalysis,
        metadata: {
          version: "2.0.0",
          mcpType: "risk-analyzer",
        },
      },
    });
  } catch (error) {
    console.error(`[risk-analyzer] Error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * QE Risk Matrix Analysis
 * POST /risk-matrix
 * Provides Probability × Impact scoring for QE methodology
 */
app.post("/risk-matrix", async (req, res) => {
  try {
    const { app: appName, story, acceptanceCriteria } = req.body;

    if (!appName) {
      return res.status(400).json({
        success: false,
        error: "app parameter required",
      });
    }

    if (!story) {
      return res.status(400).json({
        success: false,
        error: "story parameter required",
      });
    }

    console.log(
      `[risk-analyzer] Calculating QE Risk Matrix for story ${story.id}...`,
    );

    // Calculate full risk analysis
    const riskAnalysis = await riskScorer.calculateRisk(appName, story);

    // Build QE Risk Matrix (Probability × Impact)
    const riskMatrix = {
      probability: {
        score: Math.round(
          riskAnalysis.factors.complexity.score * 0.25 +
            riskAnalysis.factors.changeFrequency.score * 0.2 +
            riskAnalysis.factors.integration.score * 0.25 +
            (100 - riskAnalysis.factors.coverage.score) * 0.15 +
            riskAnalysis.factors.defectHistory.score * 0.15,
        ),
        level: getProbabilityLevel(
          riskAnalysis.factors.complexity.score * 0.25 +
            riskAnalysis.factors.changeFrequency.score * 0.2 +
            riskAnalysis.factors.integration.score * 0.25 +
            (100 - riskAnalysis.factors.coverage.score) * 0.15 +
            riskAnalysis.factors.defectHistory.score * 0.15,
        ),
        factors: {
          codeComplexity: {
            score: riskAnalysis.factors.complexity.score,
            reason: riskAnalysis.factors.complexity.description,
          },
          changeVolume: {
            score: riskAnalysis.factors.changeFrequency.score,
            reason: riskAnalysis.factors.changeFrequency.description,
          },
          integrationComplexity: {
            score: riskAnalysis.factors.integration.score,
            reason: riskAnalysis.factors.integration.description,
          },
          testCoverage: {
            score: 100 - riskAnalysis.factors.coverage.score,
            reason: riskAnalysis.factors.coverage.description,
          },
          defectHistory: {
            score: riskAnalysis.factors.defectHistory.score,
            reason: riskAnalysis.factors.defectHistory.description,
          },
        },
      },
      impact: {
        score: riskAnalysis.factors.businessImpact.score,
        level: getImpactLevel(riskAnalysis.factors.businessImpact.score),
        factors: {
          businessCriticality: {
            score: riskAnalysis.factors.businessImpact.score,
            reason: riskAnalysis.factors.businessImpact.description,
          },
          integrationImpact: {
            score: riskAnalysis.factors.integration.score,
            reason: riskAnalysis.factors.integration.description,
          },
        },
      },
      overall: {
        score: riskAnalysis.score,
        level: riskAnalysis.level,
        recommendation: getTestDepthRecommendation(riskAnalysis.level),
      },
    };

    // Map ACs to risk levels if provided
    let acRiskMapping = [];
    if (acceptanceCriteria && acceptanceCriteria.length > 0) {
      acRiskMapping = acceptanceCriteria.map((ac) => {
        const acText = (ac.text || "").toLowerCase();
        let riskLevel = "medium";
        let riskReasons = [];

        // Analyze AC content for risk indicators
        if (
          acText.includes("payment") ||
          acText.includes("billing") ||
          acText.includes("financial")
        ) {
          riskLevel = "critical";
          riskReasons.push("Financial/Payment processing");
        } else if (
          acText.includes("epic") ||
          acText.includes("ehr") ||
          acText.includes("patient")
        ) {
          riskLevel = "critical";
          riskReasons.push("Epic/EHR integration");
        } else if (
          acText.includes("security") ||
          acText.includes("authentication") ||
          acText.includes("authorization")
        ) {
          riskLevel = "high";
          riskReasons.push("Security-related functionality");
        } else if (
          acText.includes("api") ||
          acText.includes("integration") ||
          acText.includes("external")
        ) {
          riskLevel = "high";
          riskReasons.push("External API/Integration");
        } else if (
          acText.includes("database") ||
          acText.includes("data") ||
          acText.includes("migration")
        ) {
          riskLevel = "high";
          riskReasons.push("Data/Database operations");
        }

        return {
          ac: ac.id || `AC${ac.number}`,
          text: ac.text,
          riskLevel,
          riskReasons,
          testingDepth: getTestingDepthForRisk(riskLevel),
          recommendedTests: getRecommendedTestCounts(riskLevel),
        };
      });
    }

    res.json({
      success: true,
      app: appName,
      storyId: story.id,
      timestamp: new Date().toISOString(),
      riskMatrix,
      acRiskMapping,
      testPrioritization: generateTestPrioritization(
        riskAnalysis,
        acRiskMapping,
      ),
      suggestedTestTypes: {
        integration: {
          priority:
            riskAnalysis.factors.integration.score > 50 ? "high" : "medium",
          reason: riskAnalysis.factors.integration.description,
        },
        regression: {
          priority:
            riskAnalysis.factors.changeFrequency.score > 50 ? "high" : "medium",
          reason: riskAnalysis.factors.changeFrequency.description,
        },
        security: {
          priority: story.description?.toLowerCase().includes("security")
            ? "high"
            : "low",
          reason: "Based on story content analysis",
        },
        performance: {
          priority: "medium",
          reason: "Standard performance testing recommended",
        },
      },
    });
  } catch (error) {
    console.error(`[risk-analyzer] Risk matrix error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper functions for QE Risk Matrix
function getProbabilityLevel(score) {
  if (score >= 80) return "Very High";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Very Low";
}

function getImpactLevel(score) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Minimal";
}

function getTestDepthRecommendation(level) {
  const recommendations = {
    critical:
      "Exhaustive testing required: all positive, negative, edge, and integration tests",
    high: "Comprehensive testing: positive paths, key negative scenarios, important edge cases",
    medium: "Standard coverage: happy path, obvious negative cases",
    low: "Smoke testing: basic validation sufficient",
  };
  return recommendations[level] || recommendations.medium;
}

function getTestingDepthForRisk(riskLevel) {
  const depths = {
    critical: "exhaustive",
    high: "comprehensive",
    medium: "standard",
    low: "smoke",
  };
  return depths[riskLevel] || "standard";
}

function getRecommendedTestCounts(riskLevel) {
  const counts = {
    critical: { positive: 3, negative: 5, edge: 4, integration: 2 },
    high: { positive: 2, negative: 3, edge: 2, integration: 1 },
    medium: { positive: 2, negative: 2, edge: 1, integration: 0 },
    low: { positive: 1, negative: 1, edge: 0, integration: 0 },
  };
  return counts[riskLevel] || counts.medium;
}

function generateTestPrioritization(riskAnalysis, acRiskMapping) {
  const prioritization = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  // Add AC-based priorities
  acRiskMapping.forEach((ac) => {
    prioritization[ac.riskLevel].push(
      `${ac.ac}: ${ac.text.substring(0, 50)}...`,
    );
  });

  // Add general recommendations based on risk factors
  if (riskAnalysis.factors.integration.score > 70) {
    prioritization.critical.push("Integration point testing");
  }
  if (riskAnalysis.factors.coverage.score > 70) {
    prioritization.high.push("Unit test coverage improvement");
  }
  if (riskAnalysis.factors.defectHistory.score > 60) {
    prioritization.high.push("Regression testing for known problem areas");
  }

  return prioritization;
}

app.listen(PORT, () => {
  console.log(`risk-analyzer MCP running on port ${PORT}`);
  console.log("Endpoints:");
  console.log("  POST /analyze-risk");
  console.log("  POST /risk-matrix");
  console.log("  GET  /health");
});
