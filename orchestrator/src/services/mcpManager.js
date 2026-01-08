import { spawn } from 'child_process';
import axios from 'axios';
import { logger } from '../utils/logger.js';

export class MCPManager {
  constructor() {
    // Integration MCPs (8100-8199)
    this.integrationMcps = {
      azureDevOps: { url: 'http://azure-devops:8100', status: 'unknown', category: 'integration' },
      thirdParty: { url: 'http://third-party:8101', status: 'unknown', category: 'integration' },
      testPlanManager: { url: 'http://test-plan-manager:8102', status: 'unknown', category: 'integration' },
    };

    // Code Analysis MCPs (8200-8299)
    this.codeAnalysisMcps = {
      codeAnalyzer: { url: 'http://code-analyzer:8200', status: 'unknown', category: 'code-analysis' },
      coverageAnalyzer: { url: 'http://coverage-analyzer:8201', status: 'unknown', category: 'code-analysis' },
      playwrightGenerator: { url: 'http://playwright-generator:8202', status: 'unknown', category: 'code-analysis' },
      migrationAnalyzer: { url: 'http://migration-analyzer:8203', status: 'unknown', category: 'code-analysis' },
    };

    // Quality Analysis MCPs (8300-8399)
    this.qualityAnalysisMcps = {
      riskAnalyzer: { url: 'http://risk-analyzer:8300', status: 'unknown', category: 'quality-analysis' },
      integrationMapper: { url: 'http://integration-mapper:8301', status: 'unknown', category: 'quality-analysis' },
      testSelector: { url: 'http://test-selector:8302', status: 'unknown', category: 'quality-analysis' },
    };

    // All MCPs combined for easy iteration
    this.dockerMcps = {
      ...this.integrationMcps,
      ...this.codeAnalysisMcps,
      ...this.qualityAnalysisMcps
    };
    
    // Dashboard Services (Static file servers - no health check)
    this.dashboards = {
      adoDashboard: { url: 'http://ado-dashboard:8080', status: 'unknown', type: 'static' },
      codeDashboard: { url: 'http://code-dashboard:8080', status: 'unknown', type: 'static' },
    };
    
    // STDIO MCPs (spawned on-demand)
    this.stdioMcps = {};
    this.healthCheckInterval = null;
  }

  async initialize() {
    logger.info('Initializing MCP Manager...');
    
    // Wait for API MCPs to be ready
    await this.waitForDockerMcps();
    
    // Check dashboard availability
    await this.checkDashboards();
    
    // Start health checks
    this.startHealthChecks();
    
    logger.info('MCP Manager initialized successfully');
  }

  async waitForDockerMcps(timeout = 60000) {
    const startTime = Date.now();
    const checkInterval = 2000;

    logger.info('Waiting for Docker API MCPs to be ready...');

    while (Date.now() - startTime < timeout) {
      let allReady = true;

      for (const [name, mcp] of Object.entries(this.dockerMcps)) {
        try {
          await axios.get(`${mcp.url}/health`, { timeout: 1000 });
          mcp.status = 'healthy';
          logger.info(`✓ ${name} is ready`);
        } catch (error) {
          allReady = false;
          mcp.status = 'waiting';
        }
      }

      if (allReady) {
        logger.info('All Docker API MCPs are ready');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Timeout waiting for Docker MCPs to be ready');
  }

  async checkDashboards() {
    logger.info('Checking dashboard availability...');
    
    for (const [name, dashboard] of Object.entries(this.dashboards)) {
      try {
        // Try to fetch root path (static file servers respond to GET /)
        await axios.get(dashboard.url, { timeout: 2000 });
        dashboard.status = 'available';
        logger.info(`✓ ${name} is available at ${dashboard.url}`);
      } catch (error) {
        dashboard.status = 'unavailable';
        logger.warn(`⚠ ${name} not available: ${error.message}`);
      }
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      // Check API MCPs
      for (const [name, mcp] of Object.entries(this.dockerMcps)) {
        try {
          await axios.get(`${mcp.url}/health`, { timeout: 2000 });
          if (mcp.status !== 'healthy') {
            mcp.status = 'healthy';
            logger.info(`${name} is now healthy`);
          }
        } catch (error) {
          if (mcp.status !== 'unhealthy') {
            mcp.status = 'unhealthy';
            logger.error(`${name} is unhealthy`);
          }
        }
      }
      
      // Check Dashboards (less frequently - they're static)
      for (const [name, dashboard] of Object.entries(this.dashboards)) {
        try {
          await axios.get(dashboard.url, { timeout: 2000 });
          if (dashboard.status !== 'available') {
            dashboard.status = 'available';
            logger.info(`${name} is now available`);
          }
        } catch (error) {
          if (dashboard.status !== 'unavailable') {
            dashboard.status = 'unavailable';
            logger.warn(`${name} is unavailable`);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  async callDockerMcp(mcpName, endpoint, data = {}, method = 'POST') {
    const mcp = this.dockerMcps[mcpName];
    
    if (!mcp) {
      throw new Error(`Unknown MCP: ${mcpName}`);
    }

    if (mcp.status !== 'healthy') {
      throw new Error(`MCP ${mcpName} is not healthy (status: ${mcp.status})`);
    }

    try {
      const config = {
        method,
        url: `${mcp.url}${endpoint}`,
        timeout: 30000
      };

      if (method === 'POST' || method === 'PUT') {
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

    const child = spawn('node', [mcpPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    this.stdioMcps[mcpName] = child;

    child.stdout.on('data', (data) => {
      logger.info(`[${mcpName}] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      logger.error(`[${mcpName}] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      logger.info(`[${mcpName}] exited with code ${code}`);
      delete this.stdioMcps[mcpName];
    });

    return child;
  }

  async callStdioMcp(mcpName, input) {
    return new Promise((resolve, reject) => {
      const child = this.spawnStdioMcp(mcpName);
      
      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
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
        Object.entries(this.integrationMcps).map(([name, mcp]) => [name, {
          status: mcp.status,
          url: mcp.url,
          category: mcp.category
        }])
      ),
      codeAnalysis: Object.fromEntries(
        Object.entries(this.codeAnalysisMcps).map(([name, mcp]) => [name, {
          status: mcp.status,
          url: mcp.url,
          category: mcp.category
        }])
      ),
      qualityAnalysis: Object.fromEntries(
        Object.entries(this.qualityAnalysisMcps).map(([name, mcp]) => [name, {
          status: mcp.status,
          url: mcp.url,
          category: mcp.category
        }])
      ),
      // Dashboards
      dashboards: Object.fromEntries(
        Object.entries(this.dashboards).map(([name, dashboard]) => [name, {
          status: dashboard.status,
          url: dashboard.url,
          type: dashboard.type
        }])
      ),
      // STDIO MCPs
      stdioMcps: Object.keys(this.stdioMcps),
      // Summary counts
      summary: {
        mcpsHealthy: Object.values(this.dockerMcps).filter(m => m.status === 'healthy').length,
        mcpsTotal: Object.keys(this.dockerMcps).length,
        dashboardsAvailable: Object.values(this.dashboards).filter(d => d.status === 'available').length,
        dashboardsTotal: Object.keys(this.dashboards).length,
        stdioActive: Object.keys(this.stdioMcps).length
      }
    };
  }

  async getSwaggerDocs(mcpName) {
    const mcp = this.dockerMcps[mcpName];

    if (!mcp) {
      throw new Error(`Unknown MCP: ${mcpName}`);
    }

    if (mcp.status !== 'healthy') {
      throw new Error(`MCP ${mcpName} is not healthy (status: ${mcp.status})`);
    }

    try {
      const response = await axios.get(`${mcp.url}/api-docs.json`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching Swagger docs from ${mcpName}:`, error.message);
      throw error;
    }
  }

  async getAllSwaggerDocs() {
    const docs = {};

    for (const [name, mcp] of Object.entries(this.dockerMcps)) {
      if (mcp.status === 'healthy') {
        try {
          docs[name] = await this.getSwaggerDocs(name);
          docs[name].basePath = mcp.url;
          docs[name].category = mcp.category;
        } catch (error) {
          logger.warn(`Failed to fetch Swagger docs for ${name}: ${error.message}`);
          docs[name] = { error: error.message };
        }
      } else {
        docs[name] = { error: `MCP not healthy (status: ${mcp.status})` };
      }
    }

    return docs;
  }

  async getAggregatedSwaggerSpec() {
    logger.info('Aggregating Swagger specifications from all MCPs...');

    const aggregatedSpec = {
      openapi: '3.0.0',
      info: {
        title: 'QE MCP Stack - Aggregated API',
        version: '1.0.0',
        description: `
Aggregated API documentation for all QE MCP services.

## Service Categories

### Integration MCPs (8100-8199)
Services that integrate with external systems:
- Azure DevOps (8100): Work item management and sprint tracking
- Third Party (8101): External API integrations (Stripe, etc.)
- Test Plan Manager (8102): Test plan creation and management

### Code Analysis MCPs (8200-8299)
Services for analyzing and generating code:
- Code Analyzer (8200): Static code analysis for .NET
- Coverage Analyzer (8201): Test coverage analysis
- Playwright Generator (8202): Generate Playwright tests from specs
- Migration Analyzer (8203): Track Core → Core.Common migration

### Quality Analysis MCPs (8300-8399)
Services for quality assessment and risk analysis:
- Risk Analyzer (8300): AI-powered risk assessment
- Integration Mapper (8301): Map integration points and dependencies
- Test Selector (8302): Intelligent test selection based on changes
        `,
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Orchestrator (local development)'
        },
        {
          url: 'http://orchestrator:3000',
          description: 'Orchestrator (Docker)'
        }
      ],
      tags: [],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
          },
        }
      }
    };

    // Fetch all MCP specs
    for (const [mcpName, mcp] of Object.entries(this.dockerMcps)) {
      if (mcp.status !== 'healthy') {
        logger.warn(`Skipping ${mcpName} (not healthy)`);
        continue;
      }

      try {
        const spec = await this.getSwaggerDocs(mcpName);

        // Add tag for this MCP category
        const categoryTag = {
          name: mcp.category,
          description: `${mcpName} - ${spec.info?.description || ''}`
        };

        if (!aggregatedSpec.tags.find(t => t.name === categoryTag.name)) {
          aggregatedSpec.tags.push(categoryTag);
        }

        // Merge paths with MCP prefix
        if (spec.paths) {
          for (const [path, pathItem] of Object.entries(spec.paths)) {
            const prefixedPath = `/api/${mcpName}${path}`;

            // Add MCP category tag to all operations
            for (const [method, operation] of Object.entries(pathItem)) {
              if (operation && typeof operation === 'object') {
                operation.tags = operation.tags || [];
                if (!operation.tags.includes(mcp.category)) {
                  operation.tags.push(mcp.category);
                }
                // Add server override for this path
                operation.servers = [{ url: mcp.url, description: `${mcpName} service` }];
              }
            }

            aggregatedSpec.paths[prefixedPath] = pathItem;
          }
        }

        // Merge schemas
        if (spec.components?.schemas) {
          for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
            const prefixedSchemaName = `${mcpName}_${schemaName}`;
            aggregatedSpec.components.schemas[prefixedSchemaName] = schema;
          }
        }

        logger.info(`✓ Aggregated ${Object.keys(spec.paths || {}).length} paths from ${mcpName}`);
      } catch (error) {
        logger.error(`Failed to aggregate ${mcpName}: ${error.message}`);
      }
    }

    logger.info(`Aggregation complete: ${Object.keys(aggregatedSpec.paths).length} total paths`);
    return aggregatedSpec;
  }

  async shutdown() {
    logger.info('Shutting down MCP Manager...');

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Kill stdio MCPs
    for (const [name, child] of Object.entries(this.stdioMcps)) {
      logger.info(`Killing stdio MCP: ${name}`);
      child.kill();
    }

    logger.info('MCP Manager shutdown complete');
  }
}
