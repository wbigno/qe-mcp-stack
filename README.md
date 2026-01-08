# QE MCP Stack

Enterprise-grade QE Automation Platform with Model Context Protocol (MCP) Services for testing Core, Core.Common, Payments, PreCare, and Third-Party Integrations applications.

## Overview

The QE MCP Stack is a comprehensive monorepo that provides:

- **MCP Microservices**: Specialized services for integration, code analysis, and quality analysis
- **Orchestrator**: Central API gateway aggregating all MCP services
- **Dashboard**: React-based UI for visualization and analysis
- **Swagger Hub**: Centralized API documentation portal
- **Test Automation**: Playwright-based test suites organized by application
- **Shared Packages**: Reusable utilities, SDK, and test framework

## Architecture

```
qe-mcp-stack/
├── packages/              # Shared packages
│   ├── shared/           # Common utilities (auth, config, logging, types)
│   ├── mcp-sdk/          # SDK for building MCPs
│   └── test-framework/   # Playwright test framework
├── mcps/                 # MCP microservices
│   ├── integration/      # Azure DevOps, Test Plan Manager, Third-Party
│   ├── code-analysis/    # Code Analyzer, Coverage Analyzer, Playwright Generator, Migration Analyzer
│   └── quality-analysis/ # Risk Analyzer, Integration Mapper, Test Selector
├── orchestrator/         # API gateway (port 3000)
├── ado-dashboard/        # Dashboard UI (port 5173)
├── swagger-hub/          # API docs landing page (port 8000)
├── tests/                # Playwright test suites
│   ├── payments/         # Payments app tests
│   ├── precare/          # PreCare app tests
│   ├── core-common/      # Core.Common tests
│   ├── third-party-integrations/
│   ├── migration/        # Core → Core.Common migration tests
│   └── cross-app/        # Cross-application tests
├── azure-pipelines/      # Azure DevOps CI/CD pipelines
├── .azuredevops/         # Azure DevOps configuration
├── docs/                 # Comprehensive documentation
└── tools/                # Developer productivity tools
```

See [Architecture Documentation](docs/architecture/system-overview.md) for detailed system design.

## Quick Start

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Docker**: >= 20.10.0 (for containerized services)
- **Git**: For cloning application repositories

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/qe-mcp-stack.git
cd qe-mcp-stack
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Install dependencies and build packages:
```bash
npm run setup
```

4. Start all services:
```bash
npm start
```

### Access Points

After starting, access services at:

- **Swagger Hub**: http://localhost:8000 (API documentation portal)
- **Orchestrator**: http://localhost:3000 (API gateway)
- **Dashboard**: http://localhost:5173 (React UI)
- **MCPs**: Ports 8100-8399 (see Port Assignments below)

## Development

### Available Scripts

#### Setup & Build
```bash
npm run setup              # Install all dependencies and build packages
npm run build              # Build all packages and services
npm run build:packages     # Build only shared packages
npm run clean              # Clean all build artifacts and node_modules
npm run clean:install      # Clean and fresh install
```

#### Development Mode
```bash
npm run dev                # Start all services in dev mode (parallel)
npm run dev:mcps           # Start only MCP services
npm run dev:dashboard      # Start only dashboard
npm run dev:orchestrator   # Start only orchestrator
```

#### Testing
```bash
npm run test               # Run all tests (unit + integration + e2e)
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:e2e           # Run all Playwright E2E tests
npm run test:smoke         # Run smoke tests (@smoke tagged)
npm run test:payments      # Run Payments app tests
npm run test:precare       # Run PreCare app tests
npm run test:migration     # Run migration validation tests
```

#### Code Quality
```bash
npm run lint               # Lint all code
npm run lint:fix           # Lint and auto-fix issues
npm run format             # Format all code with Prettier
npm run format:check       # Check formatting without changes
npm run typecheck          # TypeScript type checking across all packages
```

#### Docker Operations
```bash
npm run docker:build       # Build all Docker images
npm run docker:up          # Start all services in Docker
npm run docker:down        # Stop all Docker services
npm run docker:logs        # Follow logs from all services
npm run docker:restart     # Restart all Docker services
npm run docker:clean       # Stop services and clean volumes
```

#### Tools
```bash
npm run mcp:new            # Scaffold new MCP service
npm run test:gen           # Generate test from template
npm run migration:check    # Check Core → Core.Common migration status
npm run swagger:validate   # Validate all Swagger documentation
npm run health:check       # Check health of all services
```

### Creating a New MCP

Generate a new MCP with the scaffold tool:

```bash
npm run mcp:new
```

Follow the prompts to create:
- MCP category (integration/code-analysis/quality-analysis)
- Service name
- Port assignment
- API endpoints

The tool creates a complete MCP structure with:
- Express server with Swagger UI
- Example controllers and services
- Test structure (unit + integration)
- Dockerfile and README
- TypeScript configuration

### Running Tests

#### Run All Tests
```bash
npm run test:e2e
```

#### Run Specific Application Tests
```bash
npm run test:payments      # Payments app only
npm run test:precare       # PreCare app only
```

#### Run with UI Mode (Interactive)
```bash
npx playwright test --ui
```

#### Run Specific Browser
```bash
npx playwright test --project=chromium
```

#### Debug Mode
```bash
npx playwright test --debug
```

## Port Assignments

### Core Services
- **3000** - Orchestrator (API Gateway)
- **5173** - Dashboard (React UI)
- **8000** - Swagger Hub (API Docs Landing)

### Integration MCPs (8100-8199)
- **8100** - Azure DevOps MCP
- **8101** - Third Party MCP
- **8102** - Test Plan Manager MCP

### Code Analysis MCPs (8200-8299)
- **8200** - Code Analyzer MCP
- **8201** - Coverage Analyzer MCP
- **8202** - Playwright Generator MCP
- **8203** - Migration Analyzer MCP

### Quality Analysis MCPs (8300-8399)
- **8300** - Risk Analyzer MCP
- **8301** - Integration Mapper MCP
- **8302** - Test Selector MCP

## MCP Services

### Integration MCPs

#### Azure DevOps MCP (8100)
- **Purpose**: Interact with Azure DevOps APIs
- **Features**: Fetch iterations, work items, test plans, test results
- **Docs**: http://localhost:8100/api-docs

#### Third Party MCP (8101)
- **Purpose**: Manage third-party integrations (Stripe, etc.)
- **Features**: Integration validation, test data management
- **Docs**: http://localhost:8101/api-docs

#### Test Plan Manager MCP (8102)
- **Purpose**: Manage test plans and test execution
- **Features**: Test plan CRUD, execution tracking, results aggregation
- **Docs**: http://localhost:8102/api-docs

### Code Analysis MCPs

#### Code Analyzer MCP (8200)
- **Purpose**: Analyze .NET codebase for complexity and quality
- **Features**: Cyclomatic complexity, code metrics, method analysis
- **Docs**: http://localhost:8200/api-docs

#### Coverage Analyzer MCP (8201)
- **Purpose**: Analyze test coverage and gap detection
- **Features**: Code coverage analysis, gap identification, test categorization
- **Docs**: http://localhost:8201/api-docs

#### Playwright Generator MCP (8202)
- **Purpose**: Generate Playwright tests from templates
- **Features**: Test scaffolding, page object generation, API test generation
- **Docs**: http://localhost:8202/api-docs

#### Migration Analyzer MCP (8203)
- **Purpose**: Track Core → Core.Common migration progress
- **Features**: Migration gap detection, dependency analysis, risk assessment
- **Docs**: http://localhost:8203/api-docs

### Quality Analysis MCPs

#### Risk Analyzer MCP (8300)
- **Purpose**: Assess risk scores for code changes and features
- **Features**: Risk scoring, impact analysis, recommendation engine
- **Docs**: http://localhost:8300/api-docs

#### Integration Mapper MCP (8301)
- **Purpose**: Map integrations and detect integration patterns
- **Features**: Integration discovery, dependency mapping, visualization
- **Docs**: http://localhost:8301/api-docs

#### Test Selector MCP (8302)
- **Purpose**: Intelligently select tests based on code changes
- **Features**: Change impact analysis, test selection optimization, execution planning
- **Docs**: http://localhost:8302/api-docs

## Shared Packages

### packages/shared
Common utilities used across all services:
- **auth**: JWT validation, API key management
- **config**: Environment configuration, validation
- **logging**: Winston-based structured logging
- **types**: TypeScript type definitions
- **utils**: Date, string, validation helpers

### packages/mcp-sdk
SDK for building MCP services:
- **BaseMCP**: Base class with common functionality
- **MCPClient**: Client for inter-MCP communication
- **SwaggerConfig**: Standardized Swagger setup

### packages/test-framework
Playwright test framework:
- **fixtures**: Custom Playwright fixtures
- **helpers**: Test utility functions
- **pages**: Base page object classes
- **reporters**: Custom test reporters

## Test Organization

Tests are organized by application in the `tests/` directory:

```
tests/
├── payments/
│   ├── ui/              # UI tests (Playwright)
│   ├── api/             # API tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end scenarios
├── precare/
│   ├── ui/
│   ├── api/
│   └── integration/
├── core-common/
│   ├── unit/
│   └── integration/
├── third-party-integrations/
│   ├── ui/
│   └── api/
├── migration/
│   └── core-to-corecommon/
└── cross-app/
    ├── payment-flow/
    └── integration/
```

### Test Tagging

Use tags for selective test execution:
- `@smoke` - Critical smoke tests
- `@regression` - Full regression suite
- `@payments` - Payments app tests
- `@precare` - PreCare app tests
- `@migration` - Migration validation tests

Example:
```typescript
test('@smoke Payment flow with credit card', async ({ page }) => {
  // test code
});
```

Run tagged tests:
```bash
npm run test:smoke         # Run only @smoke tests
npx playwright test --grep @payments  # Run only @payments tests
```

## Environment Variables

Required environment variables (see `.env.example`):

### Azure DevOps
- `AZURE_DEVOPS_ORG` - Azure DevOps organization name
- `AZURE_DEVOPS_PAT` - Personal Access Token
- `AZURE_DEVOPS_PROJECT` - Project name

### AI Services
- `ANTHROPIC_API_KEY` - Anthropic Claude API key (required for AI-powered MCPs)
- `OPENAI_API_KEY` - OpenAI API key (optional, used by Risk Analyzer)

### Stripe (Third-Party Integration)
- `STRIPE_API_KEY` - Stripe API key for testing
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### Application URLs
- `CORE_APP_URL` - Core application URL
- `CORE_COMMON_APP_URL` - Core.Common application URL
- `PAYMENTS_APP_URL` - Payments application URL
- `PRECARE_APP_URL` - PreCare application URL
- `THIRD_PARTY_APP_URL` - Third-Party Integrations URL

### Application Repository Paths
- `CORE_REPO_PATH` - Path to Core repo
- `CORE_COMMON_REPO_PATH` - Path to Core.Common repo
- `PAYMENTS_REPO_PATH` - Path to Payments repo
- `PRECARE_REPO_PATH` - Path to PreCare repo
- `THIRD_PARTY_REPO_PATH` - Path to Third-Party Integrations repo

## Docker Usage

### Starting Services

Start all services with Docker Compose:
```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f
docker-compose logs -f azure-devops  # Specific service
```

### Stopping Services

```bash
docker-compose down
```

### Rebuilding Services

After code changes:
```bash
docker-compose build
docker-compose up -d
```

Or rebuild specific service:
```bash
docker-compose build azure-devops
docker-compose up -d azure-devops
```

### Debugging

Access service shell:
```bash
docker-compose exec orchestrator sh
docker-compose exec azure-devops sh
```

## CI/CD

Azure Pipelines provide selective CI/CD based on file changes:

- **azure-pipelines.yml** - Main pipeline orchestrating all stages
- **ado-mcps-pipeline.yml** - Integration MCPs deployment
- **code-mcps-pipeline.yml** - Code analysis MCPs deployment
- **analysis-mcps-pipeline.yml** - Quality analysis MCPs deployment
- **dashboard-pipeline.yml** - Dashboard and orchestrator deployment
- **test-automation-pipeline.yml** - Full Playwright test suite
- **smoke-tests-pipeline.yml** - Quick validation tests
- **swagger-validation-pipeline.yml** - API documentation validation

Pipelines use path-based conditions to selectively deploy only changed services, reducing build time by up to 60%.

See [Azure Pipelines Documentation](azure-pipelines/README.md) for pipeline architecture and [Selective CI Validation](.azuredevops/SELECTIVE-CI-VALIDATION.md) for testing guidelines.

## Migration Tracking

The QE MCP Stack includes tools for tracking the Core → Core.Common migration:

```bash
npm run migration:check
```

This analyzes:
- Features migrated vs. remaining
- Test coverage in both repos
- Risk assessment for migration items
- Dependency analysis

View migration dashboard at: http://localhost:5173 (Dashboard > Migration tab)

## Troubleshooting

### Services won't start

1. Check ports aren't already in use:
```bash
lsof -i :3000  # Orchestrator
lsof -i :5173  # Dashboard
lsof -i :8000  # Swagger Hub
```

2. Check Docker containers:
```bash
docker ps
docker-compose logs
```

3. Verify environment variables:
```bash
cat .env
```

### Tests failing

1. Ensure services are running:
```bash
npm run health:check
```

2. Check application URLs are accessible:
```bash
curl http://localhost:3000/health
```

3. Verify test configuration:
```bash
npx playwright test --list
```

### Build errors

1. Clean and reinstall:
```bash
npm run clean:install
```

2. Build packages first:
```bash
npm run build:packages
```

3. Check Node.js version:
```bash
node --version  # Should be >= 18.0.0
```

### Docker issues

1. Clean Docker environment:
```bash
npm run docker:clean
docker system prune -f
```

2. Rebuild from scratch:
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Documentation

### Architecture & Design
- [System Overview](docs/architecture/system-overview.md) - High-level architecture
- [MCP Architecture](docs/architecture/mcp-architecture.md) - MCP design patterns
- [Data Flow](docs/architecture/data-flow.md) - Request flow and data movement
- [Decision Records](docs/architecture/decision-records/) - Architectural decisions

### MCP Guides
Each MCP has detailed documentation in `docs/mcps/`:
- [Azure DevOps MCP](docs/mcps/azure-devops.md)
- [Risk Analyzer MCP](docs/mcps/risk-analyzer.md)
- [Integration Mapper MCP](docs/mcps/integration-mapper.md)
- [All MCPs →](docs/mcps/)

### Testing
- [Playwright Guide](docs/testing/playwright-guide.md) - Test framework overview
- [Test Organization](docs/testing/test-organization.md) - How tests are structured
- [Page Objects](docs/testing/page-objects.md) - Page Object Model guide

### Migration
- [Core to Core.Common Migration](docs/migration/core-to-corecommon.md)
- [Migration Validation](docs/migration/migration-validation.md)

### API Documentation
- **Swagger Hub**: http://localhost:8000 - All API docs in one place
- **Individual MCPs**: See `docs/api/` for OpenAPI specs

### Deployment
- [Azure Deployment](docs/deployment/azure-setup.md) - Azure Web Apps deployment
- [Environment Variables](docs/deployment/environment-variables.md) - Configuration guide
- [Docker Setup](docs/deployment/docker-setup.md) - Local Docker development

### Contributing
- [Code Standards](docs/contributing/code-standards.md)
- [PR Guidelines](docs/contributing/pr-guidelines.md)
- [Testing Guidelines](docs/contributing/testing-guidelines.md)

## Contributing

See `docs/contributing/code-standards.md` for:
- Code style guidelines
- PR process
- Testing requirements
- Documentation standards

## Support

- **Issues**: https://github.com/your-org/qe-mcp-stack/issues
- **Slack**: #qe-automation channel
- **Documentation**: http://localhost:8000

## License

MIT
