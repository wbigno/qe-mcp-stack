# Azure Pipelines Configuration

This directory contains Azure DevOps Pipeline YAML files for the QE MCP Stack CI/CD process.

## Pipeline Structure

```
azure-pipelines/
├── ado-mcps-pipeline.yml              # Integration MCPs deployment
├── code-mcps-pipeline.yml             # Code Analysis MCPs deployment
├── analysis-mcps-pipeline.yml         # Quality Analysis MCPs deployment
├── dashboard-pipeline.yml             # Dashboard & Orchestrator deployment
├── test-automation-pipeline.yml       # Full Playwright test suite
├── smoke-tests-pipeline.yml           # Quick validation tests
└── swagger-validation-pipeline.yml    # API documentation validation
```

## Main Pipeline

The main entry point is `azure-pipelines.yml` in the root directory, which orchestrates all stages:

1. **Build & Test** - Install dependencies, build packages, run unit tests
2. **Deploy MCPs** - Deploy all MCPs in parallel (3 jobs)
3. **Deploy Dashboard** - Deploy orchestrator, dashboard, and Swagger hub
4. **Smoke Tests** - Quick validation of deployed services
5. **Swagger Validation** - Validate API documentation
6. **Full Test Suite** - Optional manual trigger for complete E2E tests

## Pipeline Files

### ado-mcps-pipeline.yml
Deploys Integration MCPs to Azure Web Apps:
- **azure-devops** (Port 8100) - Azure DevOps integration
- **third-party** (Port 8101) - Third-party integrations
- **test-plan-manager** (Port 8102) - Test plan management

### code-mcps-pipeline.yml
Deploys Code Analysis MCPs to Azure Web Apps:
- **code-analyzer** (Port 8200) - Code analysis with AI
- **coverage-analyzer** (Port 8201) - Code coverage analysis
- **playwright-generator** (Port 8202) - Test generation
- **migration-analyzer** (Port 8203) - Migration analysis

### analysis-mcps-pipeline.yml
Deploys Quality Analysis MCPs to Azure Web Apps:
- **risk-analyzer** (Port 8300) - Risk assessment with AI
- **integration-mapper** (Port 8301) - Integration mapping
- **test-selector** (Port 8302) - Intelligent test selection

### dashboard-pipeline.yml
Deploys core infrastructure:
- **orchestrator** (Port 3000) - Central API gateway
- **ado-dashboard** (Static Web App) - Frontend dashboard
- **swagger-hub** (Port 8000) - API documentation hub

### smoke-tests-pipeline.yml
Quick validation tests after deployment:
- Orchestrator health check
- All MCP health checks
- Swagger documentation availability
- Core API endpoint validation
- Basic UI smoke tests

### swagger-validation-pipeline.yml
Validates API documentation:
- Fetches all MCP Swagger specs
- Validates OpenAPI specification format
- Checks completeness (required fields, endpoints)
- Validates response schemas
- Verifies security definitions
- Generates validation report

### test-automation-pipeline.yml
Runs comprehensive Playwright test suite:
- Payments application tests
- PreCare application tests
- Core.Common application tests
- Third-party integration tests
- Migration compatibility tests
- Cross-app integration tests

## Triggers

### Automatic Triggers
- **Push to main/develop**: Full pipeline execution
- **Pull Request**: Build, test, and validation only (no deployment)
- **Feature branches**: Build and test only

### Manual Triggers
- Full test suite can be triggered manually for any environment

## Environments

The pipelines support multiple environments through variable groups:
- **development** - Development environment
- **staging** - Staging/QA environment
- **production** - Production environment

## Required Variables

### Variable Group: `qe-mcp-stack-variables`

#### Azure Configuration
- `azureSubscription` - Azure service connection name
- `staticWebAppToken` - Static Web App deployment token
- `environment` - Target environment (dev/staging/prod)

#### Azure DevOps
- `AZURE_DEVOPS_ORG` - Azure DevOps organization name
- `AZURE_DEVOPS_PROJECT` - Azure DevOps project name
- `AZURE_DEVOPS_PAT` - Personal Access Token

#### AI Services
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `OPENAI_API_KEY` - OpenAI API key

#### URLs
- `dashboardUrl` - Dashboard URL (for testing)

## Azure Resources

Each MCP is deployed to its own Azure Web App:

### Integration MCPs
- `qe-mcp-azure-devops-{env}.azurewebsites.net`
- `qe-mcp-third-party-{env}.azurewebsites.net`
- `qe-mcp-test-plan-manager-{env}.azurewebsites.net`

### Code Analysis MCPs
- `qe-mcp-code-analyzer-{env}.azurewebsites.net`
- `qe-mcp-coverage-analyzer-{env}.azurewebsites.net`
- `qe-mcp-playwright-generator-{env}.azurewebsites.net`
- `qe-mcp-migration-analyzer-{env}.azurewebsites.net`

### Quality Analysis MCPs
- `qe-mcp-risk-analyzer-{env}.azurewebsites.net`
- `qe-mcp-integration-mapper-{env}.azurewebsites.net`
- `qe-mcp-test-selector-{env}.azurewebsites.net`

### Core Services
- `qe-mcp-orchestrator-{env}.azurewebsites.net`
- `qe-mcp-swagger-hub-{env}.azurewebsites.net`
- Dashboard: Azure Static Web App

## Health Checks

All MCPs expose a `/health` endpoint that returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-08T12:00:00Z",
  "dependencies": [...]
}
```

The orchestrator aggregates health from all MCPs at `/health`.

## Monitoring

### Pipeline Artifacts
- **build-output** - Compiled packages and code
- **test-results-{env}** - Playwright test results
- **playwright-report-{env}** - HTML test report
- **swagger-validation-{env}** - Swagger specs
- **swagger-report-{env}** - Validation report
- **smoke-test-failures-{env}** - Screenshots of failures

### Test Results
All test results are published to Azure DevOps Test Plans:
- Unit test results (JUnit format)
- Playwright test results (JUnit format)
- Smoke test results
- Test run summaries with pass rates

## Usage

### Running the Main Pipeline
The main pipeline runs automatically on:
- Push to main/develop
- Pull requests to main/develop

### Running Individual Pipelines
Individual pipeline templates cannot be run directly. They are called by the main pipeline.

### Manual Test Execution
To run the full test suite:
1. Go to Pipelines in Azure DevOps
2. Select the main pipeline
3. Click "Run pipeline"
4. Check "Full Test Suite" option
5. Select target environment
6. Click "Run"

### Viewing Results
- **Test Results**: Tests tab in pipeline run
- **Artifacts**: Artifacts tab in pipeline run
- **Logs**: Logs tab for each job/step

## Troubleshooting

### Pipeline Fails at Build Stage
- Check Node.js version compatibility
- Verify package.json dependencies
- Review build logs for TypeScript errors

### MCP Deployment Fails
- Verify Azure service connection
- Check app service settings
- Ensure resource groups exist
- Verify environment variables

### Health Checks Fail
- Check MCP logs in Azure Portal
- Verify environment variables are set
- Check network connectivity
- Verify dependencies are available

### Tests Fail
- Check test environment URLs
- Verify authentication tokens
- Review test failure screenshots
- Check Playwright browser installation

## Best Practices

1. **Always run smoke tests** after deployment
2. **Review health checks** before promoting to next environment
3. **Run full test suite** before production deployments
4. **Monitor pipeline duration** and optimize slow stages
5. **Keep secrets in Azure Key Vault** and reference in variable groups
6. **Use caching** for npm packages to speed up builds
7. **Tag releases** in main branch for production deployments

## Pipeline Maintenance

### Adding a New MCP
1. Create deployment step in appropriate MCP pipeline file
2. Add health check in smoke tests
3. Update orchestrator MCP manager
4. Add Swagger endpoint to validation
5. Update this README

### Updating Node.js Version
1. Update `nodeVersion` variable in main pipeline
2. Update Azure Web App runtime stack in all deployment steps
3. Test in development environment first

### Adding New Tests
1. Add test files to appropriate directory under `/tests`
2. Tests will be picked up automatically
3. Update test-automation-pipeline.yml if new categories added

## Related Documentation
- [Main README](../README.md)
- [MCP Development Guide](../docs/mcp-development.md)
- [Test Framework Guide](../packages/test-framework/README.md)
- [Swagger Hub Guide](../swagger-hub/README.md)
