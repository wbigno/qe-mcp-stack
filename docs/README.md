# QE MCP Stack Documentation

Welcome to the QE MCP Stack documentation. This directory contains comprehensive documentation for architecture, development, testing, deployment, and contribution guidelines.

## Quick Links

### Getting Started
- [Root README](../README.md) - Quick start and overview
- [Docker Setup](./deployment/docker-setup.md) - Running with Docker
- [Environment Variables](./deployment/environment-variables.md) - Configuration guide

### Architecture
- [System Overview](./architecture/system-overview.md) - High-level architecture
- [MCP Architecture](./architecture/mcp-architecture.md) - MCP design patterns
- [Data Flow](./architecture/data-flow.md) - How data moves through the system
- [Decision Records](./architecture/decision-records/) - Architectural decisions

### Testing
- [Playwright Guide](./testing/playwright-guide.md) - E2E testing with Playwright
- [Test Organization](./testing/test-organization.md) - Test structure and patterns
- [Page Objects](./testing/page-objects.md) - Page Object Model guide

### Development
- [MCP Development](./mcps/) - Building and extending MCPs
- [Contributing Guide](./contributing/code-standards.md) - Code standards and practices
- [PR Guidelines](./contributing/pr-guidelines.md) - Pull request process

### Deployment
- [Docker Setup](./deployment/docker-setup.md) - Docker and Docker Compose
- [Environment Variables](./deployment/environment-variables.md) - Configuration reference

### Migration
- [Core to Core.Common](./migration/core-to-corecommon.md) - Migration tracking
- [Migration Validation](./migration/migration-validation.md) - Validation process

## Documentation Structure

```
docs/
├── README.md                    # This file
├── architecture/                # System architecture
│   ├── system-overview.md      # High-level overview
│   ├── mcp-architecture.md     # MCP design patterns
│   ├── data-flow.md            # Data flow diagrams
│   └── decision-records/       # ADRs (Architecture Decision Records)
├── mcps/                        # MCP-specific documentation
│   ├── integration/            # Integration MCPs
│   ├── code-analysis/          # Code analysis MCPs
│   └── quality-analysis/       # Quality analysis MCPs
├── testing/                     # Testing documentation
│   ├── playwright-guide.md     # Playwright testing guide
│   ├── test-organization.md    # Test structure
│   └── page-objects.md         # Page Object Model
├── migration/                   # Migration documentation
│   ├── core-to-corecommon.md  # Migration guide
│   └── migration-validation.md # Validation process
├── api/                         # API documentation (Swagger exports)
├── deployment/                  # Deployment guides
│   ├── docker-setup.md         # Docker deployment
│   └── environment-variables.md # Environment config
└── contributing/                # Contribution guidelines
    ├── code-standards.md       # Coding standards
    ├── pr-guidelines.md        # PR process
    └── testing-guidelines.md   # Testing standards
```

## Contributing to Documentation

### Documentation Standards

1. **Markdown Format**: All docs use GitHub-flavored Markdown
2. **Clear Structure**: Use headings, lists, and code blocks
3. **Examples**: Include code examples where appropriate
4. **Links**: Link to related documentation
5. **Keep Updated**: Update docs with code changes

### Adding New Documentation

1. Create a new `.md` file in the appropriate directory
2. Add a link to it in this README
3. Update any related documentation
4. Include examples and diagrams where helpful

### Documentation Review

All documentation changes should be reviewed as part of the PR process.

## Additional Resources

- [GitHub Repository](https://github.com/your-org/qe-mcp-stack)
- [Swagger Hub](http://localhost:8000) - API documentation (when running)
- [Dashboard](http://localhost:5173) - UI for analysis (when running)

## Need Help?

- Open an issue on GitHub
- Ask in #qe-automation Slack channel
- Review existing documentation in this directory
