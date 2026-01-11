# MCP Documentation Index

This directory contains detailed documentation for each MCP (Model Context Protocol) service in the QE MCP Stack.

**Total MCPs**: 15

## Integration MCPs (8100-8199)

Integration MCPs connect to external systems and APIs.

| MCP | Port | Documentation | Purpose |
|-----|------|--------------|---------|
| Azure DevOps | 8100 | [azure-devops.md](azure-devops.md) | Work items, iterations, test plans |
| Third Party | 8101 | [third-party.md](third-party.md) | Stripe and external API integration |
| Test Plan Manager | 8102 | [test-plan-manager.md](test-plan-manager.md) | Test plan and execution management |
| Browser Control | 8103 | [browser-control-mcp.md](browser-control-mcp.md) | Chrome browser automation via WebSocket |

## Code Analysis MCPs (8200-8299)

Code Analysis MCPs analyze application source code and infrastructure.

| MCP | Port | Documentation | Purpose |
|-----|------|--------------|---------|
| Code Quality Analyzer | 8200 | [code-analyzer.md](code-analyzer.md) | Complexity and quality metrics |
| Infrastructure Analyzer | 8201 | [infrastructure-analyzer.md](infrastructure-analyzer.md) | Infrastructure analysis and assessment |
| Test Analyzer | 8202 | [test-analyzer.md](test-analyzer.md) | Test coverage and gap analysis |
| Migration Analyzer | 8203 | [migration-analyzer.md](migration-analyzer.md) | Core→Core.Common migration tracking |

## Test MCPs (8300-8399)

Test MCPs provide test generation and scaffolding capabilities.

| MCP | Port | Documentation | Purpose |
|-----|------|--------------|---------|
| Test Generation | 8300 | [test-generation-mcp.md](test-generation-mcp.md) | AI-powered test generation |
| Unit Test | 8301 | [unit-test-mcp.md](unit-test-mcp.md) | Unit test generation and scaffolding |

## Playwright MCPs (8400-8499)

Playwright MCPs provide end-to-end test automation capabilities.

| MCP | Port | Documentation | Purpose |
|-----|------|--------------|---------|
| Playwright Generator | 8400 | [playwright-generator.md](playwright-generator.md) | Playwright test generation |
| Playwright Healer | 8401 | [playwright-healer.md](playwright-healer.md) | Self-healing test maintenance |
| Playwright Analyzer | 8402 | [playwright-analyzer.md](playwright-analyzer.md) | Test analysis and optimization |

## Framework Packages

Core shared packages used across all MCPs.

| Package | Documentation | Purpose |
|---------|--------------|---------|
| MCP SDK | [mcp-sdk.md](mcp-sdk.md) | Base MCP framework and BaseMCP class |
| Shared | [shared.md](shared.md) | Shared utilities, logging, and config |
| Test Framework | [test-framework.md](test-framework.md) | Playwright fixtures and test utilities |

## Core Services & Dashboards

| Service | Port | Documentation | Purpose |
|---------|------|--------------|---------|
| Orchestrator | 3000 | [orchestrator.md](orchestrator.md) | API gateway and routing |
| Swagger Hub | 8000 | [swagger-hub.md](swagger-hub.md) | API documentation portal |
| Code Dashboard | 8081 | - | Code analysis visualization |
| ADO Dashboard | 5173 | - | Azure DevOps integration UI |
| Infrastructure Dashboard | 8082 | - | Infrastructure analysis visualization |

## Quick Reference

### Accessing MCPs Locally

All MCPs expose Swagger UI at `/api-docs`:

```bash
# Integration MCPs
open http://localhost:8100/api-docs  # Azure DevOps
open http://localhost:8101/api-docs  # Third Party
open http://localhost:8102/api-docs  # Test Plan Manager
open http://localhost:8103/api-docs  # Browser Control

# Code Analysis MCPs
open http://localhost:8200/api-docs  # Code Quality Analyzer
open http://localhost:8201/api-docs  # Infrastructure Analyzer
open http://localhost:8202/api-docs  # Test Analyzer
open http://localhost:8203/api-docs  # Migration Analyzer

# Test MCPs
open http://localhost:8300/api-docs  # Test Generation
open http://localhost:8301/api-docs  # Unit Test

# Playwright MCPs
open http://localhost:8400/api-docs  # Playwright Generator
open http://localhost:8401/api-docs  # Playwright Healer
open http://localhost:8402/api-docs  # Playwright Analyzer

# Aggregated API Docs
open http://localhost:3000/api-docs  # Orchestrator (all MCPs)
open http://localhost:8000           # Swagger Hub (visual dashboard)
```

### Dashboards

```bash
# Central API Documentation Hub
open http://localhost:8000

# Code Analysis Dashboard
open http://localhost:8081

# Azure DevOps Dashboard
open http://localhost:5173

# Infrastructure Dashboard
open http://localhost:8082

# Orchestrator Root
open http://localhost:3000
```

### Health Checks

```bash
# Individual MCP health checks
curl http://localhost:8100/health  # Azure DevOps
curl http://localhost:8103/health  # Browser Control
curl http://localhost:8200/health  # Code Quality Analyzer
curl http://localhost:8300/health  # Test Generation
curl http://localhost:8400/health  # Playwright Generator

# All MCPs (via orchestrator)
curl http://localhost:3000/health

# Swagger Hub health
curl http://localhost:8000/health
```

### Common API Patterns

All MCPs follow these standard patterns:

```
GET  /health          - Health check endpoint
GET  /api-docs        - Interactive Swagger UI
GET  /swagger.json    - OpenAPI 3.0 specification
POST /api/*           - Domain-specific API endpoints
```

## MCP Categories Overview

### Integration MCPs
Connect the QE stack to external systems like Azure DevOps, third-party APIs (Stripe, SendGrid), and browser automation.

### Code Analysis MCPs
Analyze codebases for quality metrics, test coverage, infrastructure configuration, and migration tracking.

### Test MCPs
Generate test code using AI, including unit tests, integration tests, and test scaffolding.

### Playwright MCPs
Specialize in end-to-end test automation with Playwright, including generation, self-healing, and optimization.

### Framework Packages
Provide shared infrastructure (SDK, utilities, logging) that all MCPs depend on.

## Documentation Sync

All MCP documentation in this directory is automatically synced from individual MCP README files. To update:

```bash
# Sync all MCP READMEs to docs/mcps/
npm run sync-docs

# The script copies from:
# - mcps/*/README.md → docs/mcps/*.md
# - packages/*/README.md → docs/mcps/*.md
# - swagger-hub/README.md → docs/mcps/swagger-hub.md
```

## Creating a New MCP

See [New MCP Guide](../contributing/new-mcp-guide.md) for step-by-step instructions on creating a new MCP service.

When creating a new MCP:
1. Choose appropriate port range based on category
2. Follow the BaseMCP pattern from mcp-sdk
3. Create comprehensive README with examples
4. Run `npm run sync-docs` to update central docs
5. Update orchestrator's mcpManager.js
6. Add to docker-compose.yml

## Related Documentation

- [System Overview](../architecture/system-overview.md) - High-level architecture
- [MCP Architecture](../architecture/mcp-architecture.md) - MCP design patterns
- [Contributing Guide](../contributing/CONTRIBUTING.md) - Development guidelines
- [Documentation Guide](../contributing/documentation-guide.md) - Documentation standards
- [MCP Status Report](../../MCP-STATUS-REPORT.md) - Health status of all MCPs

## Port Allocation

Port ranges are organized by MCP category:

- **8100-8199**: Integration MCPs (external system connections)
- **8200-8299**: Code Analysis MCPs (static analysis tools)
- **8300-8399**: Test MCPs (test generation)
- **8400-8499**: Playwright MCPs (E2E automation)
- **3000**: Orchestrator (API gateway)
- **5173**: ADO Dashboard (frontend)
- **8000**: Swagger Hub (API docs portal)
- **8081**: Code Dashboard (frontend)
- **8082**: Infrastructure Dashboard (frontend)

## API Documentation Standards

All MCPs must provide:

1. **OpenAPI 3.0 Specification**: Complete API schema
2. **Swagger UI**: Interactive documentation at `/api-docs`
3. **README**: Comprehensive guide with examples
4. **Health Endpoint**: `/health` with service status
5. **Error Responses**: Standardized error format

## Support

For questions or issues with MCPs:
- Check individual MCP README for troubleshooting
- Review [System Overview](../architecture/system-overview.md) for architecture
- See [MCP Status Report](../../MCP-STATUS-REPORT.md) for current health
- Contact QE Team for support
