import { spawn } from "child_process";
import axios from "axios";
import { logger } from "../utils/logger.js";
import { orchestratorApiSpec } from "../swagger/orchestrator-api-spec.js";

export class MCPManager {
  constructor() {
    // Integration MCPs (8100-8199)
    this.integrationMcps = {
      azureDevOps: {
        url: "http://azure-devops:8100",
        status: "unknown",
        category: "integration",
      },
      thirdParty: {
        url: "http://third-party:8101",
        status: "unknown",
        category: "integration",
      },
      testPlanManager: {
        url: "http://test-plan-manager:8102",
        status: "unknown",
        category: "integration",
      },
      browserControl: {
        url: "http://browser-control-mcp:8103",
        status: "unknown",
        category: "integration",
      },
    };

    // Code Analysis MCPs (8200-8299)
    this.codeAnalysisMcps = {
      dotnetCodeAnalyzer: {
        url: "http://code-analyzer:8200",
        status: "unknown",
        category: "code-analysis",
      },
      dotnetCoverageAnalyzer: {
        url: "http://coverage-analyzer:8201",
        status: "unknown",
        category: "code-analysis",
      },
      blastRadiusAnalyzer: {
        url: "http://blast-radius-analyzer:8202",
        status: "unknown",
        category: "code-analysis",
      },
      javascriptCodeAnalyzer: {
        url: "http://javascript-code-analyzer:8204",
        status: "unknown",
        category: "code-analysis",
      },
      javascriptCoverageAnalyzer: {
        url: "http://javascript-coverage-analyzer:8205",
        status: "unknown",
        category: "code-analysis",
      },
      migrationAnalyzer: {
        url: "http://migration-analyzer:8203",
        status: "unknown",
        category: "code-analysis",
      },
    };

    // Quality Analysis MCPs (8300-8399)
    this.qualityAnalysisMcps = {
      riskAnalyzer: {
        url: "http://risk-analyzer:8300",
        status: "unknown",
        category: "quality-analysis",
      },
      integrationMapper: {
        url: "http://integration-mapper:8301",
        status: "unknown",
        category: "quality-analysis",
      },
      testSelector: {
        url: "http://test-selector:8302",
        status: "unknown",
        category: "quality-analysis",
      },
    };

    // Playwright MCPs (8400-8499)
    this.playwrightMcps = {
      playwrightGenerator: {
        url: "http://playwright-generator:8400",
        status: "unknown",
        category: "playwright",
      },
      playwrightAnalyzer: {
        url: "http://playwright-analyzer:8401",
        status: "unknown",
        category: "playwright",
      },
      playwrightHealer: {
        url: "http://playwright-healer:8402",
        status: "unknown",
        category: "playwright",
      },
    };

    // All MCPs combined for easy iteration
    this.dockerMcps = {
      ...this.integrationMcps,
      ...this.codeAnalysisMcps,
      ...this.qualityAnalysisMcps,
      ...this.playwrightMcps,
    };

    // Dashboard Services (nginx containers with health endpoints)
    this.dashboards = {
      adoDashboard: {
        url: "http://dashboard:5173",
        status: "unknown",
        type: "dashboard",
      },
      codeDashboard: {
        url: "http://code-dashboard:8081",
        status: "unknown",
        type: "dashboard",
      },
    };

    // STDIO MCPs (spawned on-demand)
    this.stdioMcps = {};
    this.healthCheckInterval = null;
  }

  async initialize() {
    logger.info("Initializing MCP Manager...");

    // Wait for API MCPs to be ready (optional - continue if timeout)
    try {
      await this.waitForDockerMcps();
    } catch (error) {
      logger.warn(
        "Docker MCPs not available, continuing without them: " + error.message,
      );
    }

    // Check dashboard availability
    await this.checkDashboards();

    // Start health checks
    this.startHealthChecks();

    logger.info("MCP Manager initialized successfully");
  }

  async waitForDockerMcps(timeout = 60000) {
    const startTime = Date.now();
    const checkInterval = 2000;

    logger.info("Waiting for Docker API MCPs to be ready...");

    while (Date.now() - startTime < timeout) {
      let allReady = true;

      for (const [name, mcp] of Object.entries(this.dockerMcps)) {
        try {
          await axios.get(`${mcp.url}/health`, { timeout: 1000 });
          mcp.status = "healthy";
          logger.info(`✓ ${name} is ready`);
        } catch (error) {
          allReady = false;
          mcp.status = "waiting";
        }
      }

      if (allReady) {
        logger.info("All Docker API MCPs are ready");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error("Timeout waiting for Docker MCPs to be ready");
  }

  async checkDashboards() {
    logger.info("Checking dashboard availability...");

    for (const [name, dashboard] of Object.entries(this.dashboards)) {
      try {
        // Dashboards have /health endpoints
        await axios.get(`${dashboard.url}/health`, { timeout: 2000 });
        dashboard.status = "healthy";
        logger.info(`✓ ${name} is healthy at ${dashboard.url}`);
      } catch (error) {
        dashboard.status = "unhealthy";
        logger.warn(`⚠ ${name} not healthy: ${error.message}`);
      }
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      // Check API MCPs
      for (const [name, mcp] of Object.entries(this.dockerMcps)) {
        try {
          await axios.get(`${mcp.url}/health`, { timeout: 2000 });
          if (mcp.status !== "healthy") {
            mcp.status = "healthy";
            logger.info(`${name} is now healthy`);
          }
        } catch (error) {
          if (mcp.status !== "unhealthy") {
            mcp.status = "unhealthy";
            logger.error(`${name} is unhealthy`);
          }
        }
      }

      // Check Dashboards
      for (const [name, dashboard] of Object.entries(this.dashboards)) {
        try {
          await axios.get(`${dashboard.url}/health`, { timeout: 2000 });
          if (dashboard.status !== "healthy") {
            dashboard.status = "healthy";
            logger.info(`${name} is now healthy`);
          }
        } catch (error) {
          if (dashboard.status !== "unhealthy") {
            dashboard.status = "unhealthy";
            logger.warn(`${name} is unhealthy`);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  async callDockerMcp(mcpName, endpoint, data = {}, method = "POST") {
    const mcp = this.dockerMcps[mcpName];

    if (!mcp) {
      throw new Error(`Unknown MCP: ${mcpName}`);
    }

    if (mcp.status !== "healthy") {
      throw new Error(`MCP ${mcpName} is not healthy (status: ${mcp.status})`);
    }

    try {
      // Longer timeout for operations that may create multiple items (e.g., test cases with suites)
      const isLongRunningOperation =
        endpoint.includes("create-test-cases") ||
        endpoint.includes("bulk-update") ||
        endpoint.includes("create-test-plan");
      const config = {
        method,
        url: `${mcp.url}${endpoint}`,
        timeout: isLongRunningOperation ? 120000 : 30000, // 2 min for long ops, 30s default
      };

      if (method === "POST" || method === "PUT") {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error(`Error calling ${mcpName}:`, error.message);
      throw error;
    }
  }

  spawnStdioMcp(mcpName, command, args = []) {
    const mcpPath = `/app/mcps/${mcpName}/index.js`;

    logger.info(`Spawning stdio MCP: ${mcpName}`);

    const child = spawn("node", [mcpPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    this.stdioMcps[mcpName] = child;

    child.stdout.on("data", (data) => {
      logger.info(`[${mcpName}] ${data.toString().trim()}`);
    });

    child.stderr.on("data", (data) => {
      logger.error(`[${mcpName}] ${data.toString().trim()}`);
    });

    child.on("close", (code) => {
      logger.info(`[${mcpName}] exited with code ${code}`);
      delete this.stdioMcps[mcpName];
    });

    return child;
  }

  async callStdioMcp(mcpName, input) {
    return new Promise((resolve, reject) => {
      const child = this.spawnStdioMcp(mcpName);

      let output = "";
      let errorOutput = "";

      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch (error) {
            resolve({ raw: output });
          }
        } else {
          reject(new Error(`MCP exited with code ${code}: ${errorOutput}`));
        }
      });

      child.stdin.write(JSON.stringify(input));
      child.stdin.end();
    });
  }

  getStatus() {
    return {
      // Group by category
      integration: Object.fromEntries(
        Object.entries(this.integrationMcps).map(([name, mcp]) => [
          name,
          {
            status: mcp.status,
            url: mcp.url,
            category: mcp.category,
          },
        ]),
      ),
      codeAnalysis: Object.fromEntries(
        Object.entries(this.codeAnalysisMcps).map(([name, mcp]) => [
          name,
          {
            status: mcp.status,
            url: mcp.url,
            category: mcp.category,
          },
        ]),
      ),
      qualityAnalysis: Object.fromEntries(
        Object.entries(this.qualityAnalysisMcps).map(([name, mcp]) => [
          name,
          {
            status: mcp.status,
            url: mcp.url,
            category: mcp.category,
          },
        ]),
      ),
      playwright: Object.fromEntries(
        Object.entries(this.playwrightMcps).map(([name, mcp]) => [
          name,
          {
            status: mcp.status,
            url: mcp.url,
            category: mcp.category,
          },
        ]),
      ),
      // Dashboards
      dashboards: Object.fromEntries(
        Object.entries(this.dashboards).map(([name, dashboard]) => [
          name,
          {
            status: dashboard.status,
            url: dashboard.url,
            type: dashboard.type,
          },
        ]),
      ),
      // STDIO MCPs
      stdioMcps: Object.keys(this.stdioMcps),
      // Summary counts
      summary: {
        mcpsHealthy: Object.values(this.dockerMcps).filter(
          (m) => m.status === "healthy",
        ).length,
        mcpsTotal: Object.keys(this.dockerMcps).length,
        dashboardsAvailable: Object.values(this.dashboards).filter(
          (d) => d.status === "available",
        ).length,
        dashboardsTotal: Object.keys(this.dashboards).length,
        stdioActive: Object.keys(this.stdioMcps).length,
      },
    };
  }

  async getSwaggerDocs(mcpName) {
    const mcp = this.dockerMcps[mcpName];

    if (!mcp) {
      throw new Error(`Unknown MCP: ${mcpName}`);
    }

    if (mcp.status !== "healthy") {
      throw new Error(`MCP ${mcpName} is not healthy (status: ${mcp.status})`);
    }

    try {
      const response = await axios.get(`${mcp.url}/api-docs.json`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      logger.error(
        `Error fetching Swagger docs from ${mcpName}:`,
        error.message,
      );
      throw error;
    }
  }

  async getAllSwaggerDocs() {
    const docs = {};

    for (const [name, mcp] of Object.entries(this.dockerMcps)) {
      if (mcp.status === "healthy") {
        try {
          docs[name] = await this.getSwaggerDocs(name);
          docs[name].basePath = mcp.url;
          docs[name].category = mcp.category;
        } catch (error) {
          logger.warn(
            `Failed to fetch Swagger docs for ${name}: ${error.message}`,
          );
          docs[name] = { error: error.message };
        }
      } else {
        docs[name] = { error: `MCP not healthy (status: ${mcp.status})` };
      }
    }

    return docs;
  }

  async getAggregatedSwaggerSpec() {
    logger.info("Returning orchestrator API specification...");

    // Return the comprehensive orchestrator API spec
    // MCPs are internal services - the orchestrator is the public API gateway
    // All API endpoints are exposed through the orchestrator
    logger.info(
      `API specification includes ${Object.keys(orchestratorApiSpec.paths).length} endpoints`,
    );
    return orchestratorApiSpec;
  }

  async shutdown() {
    logger.info("Shutting down MCP Manager...");

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Kill stdio MCPs
    for (const [name, child] of Object.entries(this.stdioMcps)) {
      logger.info(`Killing stdio MCP: ${name}`);
      child.kill();
    }

    logger.info("MCP Manager shutdown complete");
  }
}
