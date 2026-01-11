/**
 * Azure DevOps MCP
 * Provides integration with Azure DevOps for work item management and sprint tracking
 */

import { BaseMCP, SwaggerConfig } from '@qe-mcp-stack/mcp-sdk';
import { MCPConfig, HealthCheck, requireEnv, getEnvNumber, logInfo } from '@qe-mcp-stack/shared';
import { ADOService } from './services/ado-service';
import { createWorkItemsRouter } from './routes/work-items';
import { createIterationsRouter } from './routes/iterations';
import { ADOConfig } from './types';
import { schemas } from './swagger/schemas';

class AzureDevOpsMCP extends BaseMCP {
  private adoService!: ADOService;

  constructor() {
    const config: MCPConfig = {
      name: 'azure-devops',
      version: '2.0.0',
      description: 'Azure DevOps integration for work item management and sprint tracking',
      port: getEnvNumber('PORT', 8100),
      environment: process.env.NODE_ENV || 'development',
    };

    super(config);
  }

  protected setupRoutes(): void {
    // Initialize ADO service
    const adoConfig: ADOConfig = {
      pat: requireEnv('AZURE_DEVOPS_PAT'),
      organization: requireEnv('AZURE_DEVOPS_ORG'),
      project: requireEnv('AZURE_DEVOPS_PROJECT'),
      apiVersion: process.env.AZURE_DEVOPS_API_VERSION || '7.0',
    };

    this.adoService = new ADOService(adoConfig);

    // Setup routes
    this.app.use('/work-items', createWorkItemsRouter(this.adoService));
    this.app.use('/iterations', createIterationsRouter(this.adoService));

    logInfo('Routes configured', {
      routes: ['/work-items/*', '/iterations/*'],
    });
  }

  protected setupSwagger(): void {
    const swaggerConfig = new SwaggerConfig({
      title: 'Azure DevOps MCP API',
      version: '2.0.0',
      description: `
Azure DevOps integration MCP providing comprehensive work item management and sprint tracking capabilities.

## Features
- Query work items by sprint, custom WIQL, or specific IDs
- Update and create work items
- Manage test cases
- Bulk operations for work items
- Retrieve projects, teams, and sprints

## Authentication
Configure the following environment variables:
- ADO_PAT: Azure DevOps Personal Access Token
- ADO_ORG: Azure DevOps Organization name
- ADO_PROJECT: Default project name

## Work Item Query Examples

### Query by Sprint Name
\`\`\`json
{
  "sprint": "25.Q4.07",
  "project": "Core",
  "team": "Core Team"
}
\`\`\`

### Query by Full Iteration Path
\`\`\`json
{
  "sprint": "Core\\\\Core Team\\\\2025\\\\Q4\\\\25.Q4.07"
}
\`\`\`

### Query by Work Item IDs
\`\`\`json
{
  "workItemIds": [12345, 12346, 12347]
}
\`\`\`

### Custom WIQL Query
\`\`\`json
{
  "query": "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
}
\`\`\`
      `,
      servers: [
        {
          url: `http://localhost:${this.config.port}`,
          description: 'Development server',
        },
        {
          url: 'http://azure-devops:8100',
          description: 'Docker container',
        },
      ],
      tags: [
        {
          name: 'Work Items',
          description: 'Work item management operations',
        },
        {
          name: 'Iterations',
          description: 'Sprint, team, and project information',
        },
      ],
      schemas,
    });

    swaggerConfig.setupDocs(this.app);

    logInfo('Swagger documentation configured', {
      path: '/api-docs',
    });
  }

  protected async checkDependencies(): Promise<HealthCheck[]> {
    const dependencies: HealthCheck[] = [];

    // Check Azure DevOps API connectivity
    try {
      await this.adoService.getProjects();
      dependencies.push({
        name: 'azure-devops-api',
        status: 'up',
        responseTime: 0,
      });
    } catch (error) {
      dependencies.push({
        name: 'azure-devops-api',
        status: 'down',
        message: (error as Error).message,
        responseTime: 0,
      });
    }

    return dependencies;
  }
}

// Start the MCP server
const mcp = new AzureDevOpsMCP();
mcp.start();
