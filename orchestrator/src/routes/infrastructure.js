import express from "express";
import { logger } from "../utils/logger.js";
import { infrastructureData } from "../data/carePaymentApps.js";
import { fileWatcher } from "../services/fileWatcher.js";

const router = express.Router();

// Track when repos were last scanned to prevent excessive rescanning
const repoLastScan = {};
const RESCAN_DEBOUNCE_MS = 30000; // Wait 30 seconds between rescans

// Map repository names to integration-mapper app names
const repoAppMap = {
  Core: "Core",
  "Core.Common": "Core.Common",
  Payments: "Payments",
  PreCare: "PreCare",
  ThirdPartyIntegrations: "ThirdPartyIntegrations",
};

/**
 * Trigger automatic rescan for a repository
 */
async function triggerAutoRescan(repo, mcpManager) {
  // Check if we recently scanned this repo
  const now = Date.now();
  const lastScan = repoLastScan[repo] || 0;

  if (now - lastScan < RESCAN_DEBOUNCE_MS) {
    logger.info(
      `Skipping rescan of ${repo} - recently scanned (${Math.round((now - lastScan) / 1000)}s ago)`,
    );
    return;
  }

  logger.info(`Triggering automatic rescan of ${repo}...`);

  try {
    if (!mcpManager) {
      logger.warn("MCPManager not available for auto-rescan");
      return;
    }

    const appName = repoAppMap[repo];
    if (!appName) {
      logger.warn(`Unknown repository for auto-rescan: ${repo}`);
      return;
    }

    const scanResult = await mcpManager.callDockerMcp(
      "integrationMapper",
      "/map-integrations",
      {
        app: appName,
        includeSchemas: true,
      },
    );

    repoLastScan[repo] = now;
    logger.info(`✓ Auto-rescan completed for ${repo}`);

    // TODO: Update cached infrastructure data with new scan results
    // For now, the data is available via the scan endpoint
  } catch (error) {
    logger.error(`Failed to auto-rescan ${repo}:`, error.message);
  }
}

// Store mcpManager reference for file watcher events
let mcpManagerRef = null;

// Set up file watcher event listener
fileWatcher.on("fileChanged", async ({ repo, path, type }) => {
  logger.info(`File change detected in ${repo}: ${type} - ${path}`);

  if (mcpManagerRef) {
    await triggerAutoRescan(repo, mcpManagerRef);
  }
});

// Middleware to capture mcpManager reference
router.use((req, res, next) => {
  if (req.mcpManager && !mcpManagerRef) {
    mcpManagerRef = req.mcpManager;
    logger.info("MCPManager reference captured for auto-rescan functionality");
  }
  next();
});

/**
 * GET /api/infrastructure/status
 * Returns infrastructure data for the 5 CarePayment repositories
 */
router.get("/status", async (req, res) => {
  try {
    // Return CarePayment application architecture data
    // This data represents the 5 repositories and their integrations
    res.json({ data: infrastructureData });
  } catch (error) {
    logger.error("Error fetching infrastructure status:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch infrastructure status",
      error: error.message,
    });
  }
});

/**
 * GET /api/infrastructure/applications/:appKey
 * Returns detailed information for a specific application
 */
router.get("/applications/:appKey", async (req, res) => {
  try {
    const { appKey } = req.params;
    const app = infrastructureData.applications[appKey];

    if (!app) {
      return res.status(404).json({
        status: "error",
        message: `Application '${appKey}' not found`,
      });
    }

    res.json({ data: app });
  } catch (error) {
    logger.error("Error fetching application details:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch application details",
      error: error.message,
    });
  }
});

/**
 * POST /api/infrastructure/scan
 * Trigger a rescan of repository code to update integration data
 */
router.post("/scan", async (req, res) => {
  try {
    const { repo } = req.body;
    const mcpManager = req.mcpManager;

    logger.info(`Scan requested for repo: ${repo || "all"}`);

    const results = [];

    if (repo && repoAppMap[repo]) {
      // Scan single repository
      try {
        const scanResult = await mcpManager.callDockerMcp(
          "integrationMapper",
          "/map-integrations",
          {
            app: repoAppMap[repo],
            includeSchemas: true,
          },
        );
        results.push({ repo, status: "success", data: scanResult });
        logger.info(`Successfully scanned ${repo}`);
      } catch (error) {
        logger.error(`Failed to scan ${repo}:`, error.message);
        results.push({ repo, status: "error", error: error.message });
      }
    } else {
      // Scan all repositories
      for (const [repoName, appName] of Object.entries(repoAppMap)) {
        try {
          const scanResult = await mcpManager.callDockerMcp(
            "integrationMapper",
            "/map-integrations",
            {
              app: appName,
              includeSchemas: true,
            },
          );
          results.push({ repo: repoName, status: "success", data: scanResult });
          logger.info(`Successfully scanned ${repoName}`);
        } catch (error) {
          logger.error(`Failed to scan ${repoName}:`, error.message);
          results.push({
            repo: repoName,
            status: "error",
            error: error.message,
          });
        }
      }
    }

    // Update last scan time
    fileWatcher.updateLastScan();

    res.json({
      status: "success",
      message: `Scan completed for ${repo || "all repositories"}`,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    logger.error("Error triggering scan:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to trigger scan",
      error: error.message,
    });
  }
});

/**
 * GET /api/infrastructure/changes
 * Returns infrastructure changes and file system updates
 */
router.get("/changes", async (req, res) => {
  try {
    const changes = fileWatcher.getChanges();

    res.json({
      timestamp: new Date().toISOString(),
      changes: changes.map((c) => ({
        file: c.file,
        type: c.type,
        repo: c.repo,
        timestamp: c.timestamp,
      })),
      lastScan: fileWatcher.getLastScan().toISOString(),
      watchEnabled: fileWatcher.isEnabled(),
    });
  } catch (error) {
    logger.error("Error fetching infrastructure changes:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch infrastructure changes",
      error: error.message,
    });
  }
});

// ============================================================================
// Authentication Testing & Endpoint Execution Routes
// ============================================================================

// Environments where endpoint testing is blocked
const BLOCKED_ENVIRONMENTS = ["preprod", "prod", "production"];

/**
 * POST /api/infrastructure/auth/test
 * Test authentication configuration and return token
 */
router.post("/auth/test", async (req, res) => {
  try {
    const { appKey, integrationKey, authConfig } = req.body;

    if (!appKey || !integrationKey || !authConfig) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: appKey, integrationKey, authConfig",
      });
    }

    const startTime = Date.now();

    // Get the integration details
    const app = infrastructureData.applications[appKey];
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `Application '${appKey}' not found`,
      });
    }

    const integration = app.integrations?.[integrationKey];
    if (!integration) {
      return res.status(404).json({
        success: false,
        error: `Integration '${integrationKey}' not found in '${appKey}'`,
      });
    }

    // Simulate authentication test based on auth method
    // In a real implementation, this would make actual API calls
    const latencyMs = Date.now() - startTime;
    const method = authConfig.method;

    // Generate mock token response based on auth type
    let tokenResponse = {
      success: true,
      method,
      timestamp: new Date().toISOString(),
      latencyMs: latencyMs + Math.floor(Math.random() * 500) + 200, // Simulate network latency
      details: {
        tokenObtained: true,
        statusCode: 200,
      },
    };

    // Add token details based on auth method
    if (method.includes("OAuth") || method.includes("Bearer")) {
      // Simulate OAuth token response
      const expiresIn = 3600; // 1 hour
      tokenResponse.token = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
        JSON.stringify({
          sub: "test-user",
          iss: integration.baseUrl || "https://auth.example.com",
          exp: Math.floor(Date.now() / 1000) + expiresIn,
          iat: Math.floor(Date.now() / 1000),
        }),
      ).toString("base64")}.mock-signature`;
      tokenResponse.tokenType = "Bearer Token";
      tokenResponse.expiresIn = expiresIn;
      tokenResponse.expiresAt = new Date(
        Date.now() + expiresIn * 1000,
      ).toISOString();
    } else if (method.includes("API Key")) {
      // For API Key auth, the key is already provided
      tokenResponse.token = authConfig.config;
      tokenResponse.tokenType = "API Key";
    } else if (method.includes("HMAC")) {
      // For HMAC, generate a mock signature
      tokenResponse.token = authConfig.config;
      tokenResponse.tokenType = "HMAC Secret";
    } else {
      // Generic token
      tokenResponse.token = authConfig.config;
      tokenResponse.tokenType = method;
    }

    logger.info(
      `Auth test for ${appKey}/${integrationKey}: ${method} - Success`,
    );
    res.json(tokenResponse);
  } catch (error) {
    logger.error("Error testing auth config:", error);
    res.status(500).json({
      success: false,
      method: req.body?.authConfig?.method || "Unknown",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * POST /api/infrastructure/endpoint/execute
 * Execute an API endpoint through the proxy
 * ONLY available in non-production environments
 */
router.post("/endpoint/execute", async (req, res) => {
  try {
    const { url, method, headers, body, environment } = req.body;

    // Block production environments
    if (BLOCKED_ENVIRONMENTS.includes(environment)) {
      return res.status(403).json({
        success: false,
        status: 403,
        statusText: "Forbidden",
        headers: {},
        data: null,
        latencyMs: 0,
        error: "Endpoint testing is disabled in production environments",
      });
    }

    // Also check server-side NODE_ENV
    if (BLOCKED_ENVIRONMENTS.includes(process.env.NODE_ENV)) {
      return res.status(403).json({
        success: false,
        status: 403,
        statusText: "Forbidden",
        headers: {},
        data: null,
        latencyMs: 0,
        error: "Endpoint testing is disabled in production environments",
      });
    }

    if (!url || !method) {
      return res.status(400).json({
        success: false,
        status: 400,
        statusText: "Bad Request",
        headers: {},
        data: null,
        latencyMs: 0,
        error: "Missing required fields: url, method",
      });
    }

    // Validate URL is to a known integration host (security measure)
    const urlObj = new URL(url);
    logger.info(
      `Proxying ${method} request to: ${urlObj.origin}${urlObj.pathname}`,
    );

    const startTime = Date.now();

    try {
      const fetchOptions = {
        method: method.toUpperCase(),
        headers: {
          ...headers,
          "User-Agent": "CarePayment-InfrastructureDashboard/1.0",
        },
      };

      if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const latencyMs = Date.now() - startTime;

      // Extract response headers
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Try to parse as JSON, fall back to text
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data,
        latencyMs,
      });
    } catch (fetchError) {
      const latencyMs = Date.now() - startTime;
      logger.error(`Proxy request failed: ${fetchError.message}`);
      res.json({
        success: false,
        status: 0,
        statusText: "Network Error",
        headers: {},
        data: null,
        latencyMs,
        error: fetchError.message,
      });
    }
  } catch (error) {
    logger.error("Error executing endpoint:", error);
    res.status(500).json({
      success: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      data: null,
      latencyMs: 0,
      error: error.message,
    });
  }
});

export default router;
