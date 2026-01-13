/**
 * Blast Radius Analyzer MCP
 * Analyzes the impact of code changes to identify affected components,
 * tests, and integrations.
 */

import express from "express";
import { BlastRadiusAnalyzer } from "./analyzer.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const analyzer = new BlastRadiusAnalyzer();

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "blast-radius-analyzer" });
});

/**
 * Analyze blast radius for changed files
 * POST /analyze
 * Body: { app: string, changedFiles: string[], depth?: number }
 */
app.post("/analyze", async (req, res) => {
  try {
    const { app, changedFiles, depth = 2 } = req.body;

    if (!app || !changedFiles || !Array.isArray(changedFiles)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "app and changedFiles array are required",
        },
      });
    }

    console.log(
      `[BlastRadius] Analyzing ${changedFiles.length} files for app: ${app}`,
    );

    const result = await analyzer.analyzeBlastRadius(app, changedFiles, depth);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[BlastRadius] Analysis error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "ANALYSIS_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * Get dependency graph for a file
 * POST /dependencies
 * Body: { app: string, file: string }
 */
app.post("/dependencies", async (req, res) => {
  try {
    const { app, file } = req.body;

    if (!app || !file) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "app and file are required",
        },
      });
    }

    const dependencies = await analyzer.getFileDependencies(app, file);

    res.json({
      success: true,
      result: dependencies,
    });
  } catch (error) {
    console.error("[BlastRadius] Dependencies error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DEPENDENCIES_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * Find similar files using fuzzy matching
 * POST /find-files
 * Body: { app: string, searchPaths: string[] }
 */
app.post("/find-files", async (req, res) => {
  try {
    const { app, searchPaths } = req.body;

    if (!app || !searchPaths || !Array.isArray(searchPaths)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "app and searchPaths array are required",
        },
      });
    }

    const resolvedFiles = await analyzer.resolveFilesWithFuzzy(
      app,
      searchPaths,
    );

    res.json({
      success: true,
      result: resolvedFiles,
    });
  } catch (error) {
    console.error("[BlastRadius] Find files error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "FIND_FILES_FAILED",
        message: error.message,
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `[BlastRadius] Blast Radius Analyzer MCP running on port ${PORT}`,
  );
});

export default app;
