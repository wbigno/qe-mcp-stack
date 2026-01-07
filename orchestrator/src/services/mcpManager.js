import { spawn } from 'child_process';
import axios from 'axios';
import { logger } from '../utils/logger.js';

export class MCPManager {
  constructor() {
    // API Services (Docker MCPs with /health endpoints)
    this.dockerMcps = {
      dotnetCodeAnalyzer: { url: 'http://dotnet-code-analyzer:3001', status: 'unknown', type: 'api' },
      dotnetCoverageAnalyzer: { url: 'http://dotnet-coverage-analyzer:3002', status: 'unknown', type: 'api' },
      azureDevOps: { url: 'http://azure-devops:3003', status: 'unknown', type: 'api' },
      playwrightAnalyzer: { url: 'http://playwright-analyzer:3004', status: 'unknown', type: 'api' },
      playwrightGenerator: { url: 'http://playwright-generator:3005', status: 'unknown', type: 'api' },
      playwrightHealer: { url: 'http://playwright-healer:3006', status: 'unknown', type: 'api' },
      architectureAnalyzer: { url: 'http://architecture-analyzer:3007', status: 'unknown', type: 'api' },
      integrationMapper: { url: 'http://integration-mapper:3008', status: 'unknown', type: 'api' },
      riskAnalyzer: { url: 'http://risk-analyzer:3009', status: 'unknown', type: 'api' },
      workflowAnalyzer: { url: 'http://workflow-analyzer:3010', status: 'unknown', type: 'api' },
      qualityMetricsAnalyzer: { url: 'http://quality-metrics-analyzer:3011', status: 'unknown', type: 'api' },
      securityAnalyzer: { url: 'http://security-analyzer:3012', status: 'unknown', type: 'api' },
      dataModelAnalyzer: { url: 'http://data-model-analyzer:3013', status: 'unknown', type: 'api' },
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
      // API Services
      apiServices: Object.fromEntries(
        Object.entries(this.dockerMcps).map(([name, mcp]) => [name, {
          status: mcp.status,
          url: mcp.url,
          type: mcp.type
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
        apiServicesHealthy: Object.values(this.dockerMcps).filter(m => m.status === 'healthy').length,
        apiServicesTotal: Object.keys(this.dockerMcps).length,
        dashboardsAvailable: Object.values(this.dashboards).filter(d => d.status === 'available').length,
        dashboardsTotal: Object.keys(this.dashboards).length,
        stdioActive: Object.keys(this.stdioMcps).length
      }
    };
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
