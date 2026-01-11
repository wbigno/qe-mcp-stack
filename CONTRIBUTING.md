# Contributing to QE MCP Stack

Thank you for your interest in contributing to the QE MCP Stack! This document provides guidelines for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Documentation Requirements](#documentation-requirements)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd qe-mcp-stack

# Install dependencies
npm install

# Build shared packages
npm run build:packages

# Start development environment
docker compose up
```

## Development Workflow

### Creating a New MCP

When creating a new MCP service:

1. Choose the appropriate port range:
   - **8100-8199**: Integration MCPs
   - **8200-8299**: Code Analysis MCPs
   - **8300-8399**: Test MCPs
   - **8400-8499**: Playwright MCPs

2. Use the MCP generator:
   ```bash
   npm run mcp:new
   ```

3. Follow the BaseMCP pattern from `@qe-mcp-stack/mcp-sdk`

4. **Create comprehensive README** (see Documentation Requirements below)

5. Update orchestrator's `mcpManager.js`

6. Add service to `docker-compose.yml`

7. Run `npm run sync-docs` to sync documentation

## Documentation Requirements

⚠️ **CRITICAL**: Documentation is mandatory for all MCPs and automatically validated.

### Pre-commit Hook (Automatic)

When you commit changes to any MCP README, the documentation is **automatically synced**:

```bash
# Edit an MCP README
vim mcps/integration/azure-devops/README.md

# Commit (pre-commit hook runs automatically)
git add mcps/integration/azure-devops/README.md
git commit -m "Update Azure DevOps README"

# Output:
# 📚 MCP README changed, syncing documentation...
# ✓ Synced azure-devops
# ✅ Documentation synced and staged
```

The hook automatically:
1. Detects README changes
2. Runs `npm run sync-docs`
3. Stages synced files in `docs/mcps/`
4. Includes them in your commit

### CI/CD Validation

Pull requests are automatically validated for documentation sync:

```yaml
# GitHub Actions checks that docs are in sync
# If out of sync, the PR cannot be merged
```

If validation fails:
```bash
# Run sync manually
npm run sync-docs

# Stage and commit
git add docs/mcps/
git commit -m "Sync documentation"
git push
```

### MCP README Requirements

Every MCP **MUST** have a comprehensive README.md with these sections:

#### 1. Overview
- Port number
- Swagger UI URL
- Category (Integration/Code Analysis/Test/Playwright)
- Docker container name

#### 2. Architecture
- System diagram
- Component descriptions
- Data flow

#### 3. Features
- Bulleted list of capabilities
- Key features with descriptions

#### 4. Configuration
- Environment variables
- Required vs optional settings
- Configuration examples

#### 5. API Endpoints
- All endpoints documented
- Request/response examples in JSON
- Query parameters
- Error responses

#### 6. Usage Examples
- Claude Desktop examples (natural language)
- HTTP API examples (curl commands)
- Common workflows

#### 7. Development
- Install dependencies
- Run in development mode
- Build and test commands

#### 8. Docker
- Build image command
- Run container command
- Docker Compose usage

#### 9. Troubleshooting
- Common issues
- Solutions with commands
- Debugging tips

#### 10. Dependencies
- List all major dependencies
- Version requirements

#### 11. Related Documentation
- Links to related MCPs
- Architecture docs
- External references

### Documentation Sync Process

```bash
# Manual sync (if needed)
npm run sync-docs

# The script syncs from:
# - mcps/*/README.md → docs/mcps/*.md
# - packages/*/README.md → docs/mcps/*.md
# - swagger-hub/README.md → docs/mcps/swagger-hub.md
```

### Documentation Style Guide

See [Documentation Guide](docs/contributing/documentation-guide.md) for:
- Writing style conventions
- Code example formatting
- API documentation standards
- Diagram creation guidelines

## Code Standards

Follow the code standards outlined in [Code Standards](docs/contributing/code-standards.md):

- TypeScript for new code
- ESLint and Prettier configuration
- Naming conventions
- Error handling patterns
- Logging standards

### Linting

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Testing Guidelines

See [Testing Guidelines](docs/contributing/testing-guidelines.md) for detailed testing requirements.

### Test Requirements

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical workflows
- Minimum 80% code coverage

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## Pull Request Process

### Before Submitting

1. ✅ **All tests pass** (`npm test`)
2. ✅ **Linting passes** (`npm run lint`)
3. ✅ **Documentation updated** (automatic via pre-commit hook)
4. ✅ **Build succeeds** (`npm run build`)
5. ✅ **Health checks pass** for affected MCPs

### PR Guidelines

See [PR Guidelines](docs/contributing/pr-guidelines.md) for detailed process.

**Required:**
- Clear, descriptive title
- Description of changes
- Link to related issues
- Screenshots/videos for UI changes
- Breaking changes clearly marked

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Documentation
- [ ] README updated (auto-synced via pre-commit hook)
- [ ] API docs updated
- [ ] Architecture docs updated (if needed)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] No console warnings/errors
```

### Review Process

1. Automated checks run (tests, linting, docs sync)
2. Code review by team member
3. Address review comments
4. Approval required before merge
5. Squash and merge to main branch

## Commit Message Convention

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

**Examples:**
```
feat(azure-devops): add bulk work item update endpoint

fix(browser-control): resolve WebSocket connection timeout

docs(test-plan-manager): add API usage examples
```

## Documentation Updates

### When to Update Docs

Update documentation when:
- Adding new MCP
- Adding/changing API endpoints
- Modifying configuration
- Changing architecture
- Adding new features
- Fixing bugs that affect usage

### Documentation Checklist

- [ ] MCP README updated
- [ ] API examples current
- [ ] Swagger/OpenAPI spec updated
- [ ] Architecture diagrams updated (if needed)
- [ ] Migration guide provided (for breaking changes)
- [ ] `npm run sync-docs` executed (or let pre-commit hook do it)

## Getting Help

- Check [System Overview](docs/architecture/system-overview.md)
- Review [MCP Documentation](docs/mcps/README.md)
- Check [MCP Status Report](MCP-STATUS-REPORT.md)
- Ask in team chat or create an issue

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue or reach out to the QE Team for any questions about contributing.

---

**Thank you for contributing to QE MCP Stack!** 🚀
