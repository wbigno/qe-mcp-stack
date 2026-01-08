# MCP Documentation Index

This directory contains detailed documentation for each MCP (Model Context Protocol) service in the QE MCP Stack.

## Integration MCPs (8100-8199)

Integration MCPs connect to external systems and APIs.

| MCP | Port | Documentation | Purpose |
|-----|------|--------------|---------|
| Azure DevOps | 8100 | [azure-devops.md](azure-devops.md) | Work items, iterations, test plans |
| Third Party | 8101 | [third-party.md](third-party.md) | Stripe and external API integration |
| Test Plan Manager | 8102 | [test-plan-manager.md](test-plan-manager.md) | Test execution tracking |

## Code Analysis MCPs (8200-8299)

Code Analysis MCPs analyze application source code.

| MCP | Port | Documentation | Purpose |
|-----|------|--------------|---------|
| Code Analyzer | 8200 | [code-analyzer.md](code-analyzer.md) | Complexity and quality metrics |
| Coverage Analyzer | 8201 | [coverage-analyzer.md](coverage-analyzer.md) | Test coverage analysis |
| Playwright Generator | 8202 | [playwright-generator.md](playwright-generator.md) | Test generation and scaffolding |
| Migration Analyzer | 8203 | [migration-analyzer.md](migration-analyzer.md) | Core→Core.Common tracking |

## Quality Analysis MCPs (8300-8399)

Quality Analysis MCPs provide AI-powered insights and recommendations.

| MCP | Port | Documentation | Purpose |
|-----|------|--------------|---------|
| Risk Analyzer | 8300 | [risk-analyzer.md](risk-analyzer.md) | AI-powered risk assessment |
| Integration Mapper | 8301 | [integration-mapper.md](integration-mapper.md) | Integration discovery and mapping |
| Test Selector | 8302 | [test-selector.md](test-selector.md) | Intelligent test selection |

## Core Services

| Service | Port | Documentation | Purpose |
|---------|------|--------------|---------|
| Orchestrator | 3000 | [orchestrator.md](orchestrator.md) | API gateway and routing |
| Dashboard | 5173 | [dashboard.md](dashboard.md) | Web UI for visualization |
| Swagger Hub | 8000 | [swagger-hub.md](swagger-hub.md) | API documentation portal |

## Quick Reference

### Accessing MCPs Locally

All MCPs expose Swagger UI at `/api-docs`:

```bash
# Azure DevOps MCP
open http://localhost:8100/api-docs

# Risk Analyzer MCP
open http://localhost:8300/api-docs

# Orchestrator (aggregated)
open http://localhost:3000/api-docs
```

### Health Checks

```bash
# Individual MCP
curl http://localhost:8100/health

# All MCPs (via orchestrator)
curl http://localhost:3000/health
```

### Common API Patterns

All MCPs follow these patterns:

```
GET  /health          - Health check
GET  /api-docs        - Swagger UI
GET  /swagger.json    - OpenAPI specification
POST /api/*           - Domain-specific endpoints
```

## Creating a New MCP

See [New MCP Guide](../contributing/new-mcp-guide.md) for step-by-step instructions on creating a new MCP service.

## Related Documentation

- [MCP Architecture](../architecture/mcp-architecture.md)
- [System Overview](../architecture/system-overview.md)
- [Contributing Guide](../contributing/code-standards.md)
