/**
 * Documentation Routes
 * Serves markdown documentation for MCPs from mounted /app/mcps directory
 */

import express from "express";
import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger.js";

const router = express.Router();

// MCPs directory path (mounted from docker-compose)
const MCPS_ROOT = "/app/mcps";

// MCP directory mapping
const MCP_PATHS = {
  // Integration MCPs
  "azure-devops": "integration/azure-devops",
  "third-party": "integration/third-party",
  "test-plan-manager": "integration/test-plan-manager",
  "browser-control-mcp": "integration/browser-control-mcp",
  // Code Analysis MCPs
  "code-analyzer": "code-analysis/code-analyzer",
  "coverage-analyzer": "code-analysis/coverage-analyzer",
  "blast-radius-analyzer": "code-analysis/blast-radius-analyzer",
  "migration-analyzer": "code-analysis/migration-analyzer",
  "javascript-code-analyzer": "code-analysis/javascript-code-analyzer",
  "javascript-coverage-analyzer": "code-analysis/javascript-coverage-analyzer",
  // Quality Analysis MCPs
  "risk-analyzer": "quality-analysis/risk-analyzer",
  "integration-mapper": "quality-analysis/integration-mapper",
  "test-selector": "quality-analysis/test-selector",
  // Playwright MCPs
  "playwright-generator": "playwright/playwright-generator",
  "playwright-analyzer": "playwright/playwright-analyzer",
  "playwright-healer": "playwright/playwright-healer",
};

/**
 * List all available MCP documentation
 * GET /docs
 */
router.get("/", async (req, res) => {
  try {
    const categories = {
      integration: [],
      "code-analysis": [],
      "quality-analysis": [],
      playwright: [],
    };

    // Scan for available docs
    for (const [mcpName, mcpPath] of Object.entries(MCP_PATHS)) {
      const readmePath = path.join(MCPS_ROOT, mcpPath, "README.md");
      try {
        await fs.access(readmePath);
        const category = mcpPath.split("/")[0];
        categories[category]?.push({
          name: mcpName,
          path: mcpPath,
          url: `/docs/${mcpName}`,
        });
      } catch {
        // README doesn't exist
      }
    }

    res.json({
      success: true,
      documentation: categories,
    });
  } catch (error) {
    logger.error(`[Docs] Error listing docs: ${error.message}`);
    res.status(500).json({ error: "Failed to list documentation" });
  }
});

/**
 * Serve markdown documentation for a specific MCP
 * GET /docs/:mcpName
 */
router.get("/:mcpName", async (req, res) => {
  try {
    const { mcpName } = req.params;

    logger.info(`[Docs] Request for ${mcpName}`);

    // Find the MCP path
    const mcpPath = MCP_PATHS[mcpName];
    if (!mcpPath) {
      return res.status(404).send(notFoundPage(mcpName));
    }

    // Construct file path
    const docPath = path.join(MCPS_ROOT, mcpPath, "README.md");

    // Read markdown file
    const content = await fs.readFile(docPath, "utf-8");

    // Send as HTML with dark theme markdown styling
    res.send(renderDocPage(mcpName, content));
  } catch (error) {
    logger.error(`[Docs] Error serving docs: ${error.message}`);

    if (error.code === "ENOENT") {
      res.status(404).send(notFoundPage(req.params.mcpName));
    } else {
      res.status(500).send(errorPage(error.message));
    }
  }
});

function renderDocPage(mcpName, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mcpName} - Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown-dark.min.css">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root {
      --bg-primary: #0a0a0a;
      --bg-secondary: #141414;
      --text-primary: #ffffff;
      --text-secondary: #a1a1a1;
      --border-primary: #2a2a2a;
      --accent-primary: #3b82f6;
    }
    body {
      margin: 0;
      padding: 20px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--accent-primary);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
    }
    .back-link:hover {
      opacity: 0.9;
    }
    .doc-title {
      font-size: 1.25rem;
      font-weight: 600;
    }
    .markdown-body {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 0.75rem;
      padding: 2rem;
    }
    .markdown-body pre {
      background: var(--bg-primary) !important;
      border: 1px solid var(--border-primary);
      border-radius: 6px;
    }
    .markdown-body code {
      background: var(--bg-primary);
      border-radius: 3px;
      padding: 2px 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="/" class="back-link">← Back to Dashboard</a>
      <span class="doc-title">📚 ${mcpName}</span>
    </div>
    <div class="markdown-body" id="content"></div>
  </div>
  <script>
    const markdown = ${JSON.stringify(content)};
    document.getElementById('content').innerHTML = marked.parse(markdown);
  </script>
</body>
</html>`;
}

function notFoundPage(mcpName) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Documentation Not Found</title>
  <style>
    :root { --bg-primary: #0a0a0a; --bg-secondary: #141414; --text-primary: #fff; --border-primary: #2a2a2a; --accent: #3b82f6; --error: #ef4444; }
    body { font-family: -apple-system, sans-serif; background: var(--bg-primary); color: var(--text-primary); margin: 0; padding: 40px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .error-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 40px; max-width: 500px; text-align: center; }
    h1 { color: var(--error); margin-bottom: 16px; }
    p { color: var(--text-primary); opacity: 0.8; }
    a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: var(--accent); color: white; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="error-card">
    <h1>📚 Documentation Not Found</h1>
    <p>The documentation for "${mcpName}" could not be found.</p>
    <a href="/">← Back to Dashboard</a>
  </div>
</body>
</html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Error Loading Documentation</title>
  <style>
    :root { --bg-primary: #0a0a0a; --bg-secondary: #141414; --text-primary: #fff; --border-primary: #2a2a2a; --accent: #3b82f6; --error: #ef4444; }
    body { font-family: -apple-system, sans-serif; background: var(--bg-primary); color: var(--text-primary); margin: 0; padding: 40px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .error-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 40px; max-width: 500px; text-align: center; }
    h1 { color: var(--error); margin-bottom: 16px; }
    p { color: var(--text-primary); opacity: 0.8; }
    a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: var(--accent); color: white; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="error-card">
    <h1>⚠️ Error Loading Documentation</h1>
    <p>${message}</p>
    <a href="/">← Back to Dashboard</a>
  </div>
</body>
</html>`;
}

export default router;
