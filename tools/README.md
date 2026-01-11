# QE MCP Stack - Developer Tools

This directory contains CLI tools and scripts for developer productivity.

## Available Tools

### 1. MCP Generator

Scaffold new MCP services with complete structure.

```bash
npm run mcp:new
```

**Features:**
- Interactive CLI prompts
- Generate complete MCP structure
- Swagger documentation scaffolding
- Test structure creation
- Docker configuration

[Read more →](./mcp-generator/README.md)

### 2. Test Generator

Generate Playwright tests from templates.

```bash
npm run test:gen
```

**Features:**
- UI, API, Integration, and E2E test templates
- Page object generation
- Test data fixtures
- Application-specific templates

[Read more →](./test-generator/README.md)

### 3. Migration Helper

Track Core → Core.Common migration progress.

```bash
npm run migration:check
```

**Features:**
- Feature comparison
- Test coverage analysis
- Risk assessment
- Dependency mapping
- Multiple output formats (console, JSON, HTML, Markdown)

[Read more →](./migration-helper/README.md)

### 4. Development Environment

Scripts for setting up and managing local development environment.

```bash
./tools/dev-env/setup.sh
```

**Scripts:**
- `setup.sh` - Initial environment setup
- `verify.sh` - Verify configuration
- `start.sh` - Start services
- `stop.sh` - Stop services
- `logs.sh` - View logs
- `clean.sh` - Clean artifacts

[Read more →](./dev-env/README.md)

## Quick Reference

### Creating a New MCP

```bash
# Interactive prompts
npm run mcp:new

# Follow prompts to:
# 1. Select category (integration/code-analysis/quality-analysis)
# 2. Enter service name
# 3. Choose port
# 4. Add description
# 5. List features
```

### Generating Tests

```bash
# Interactive prompts
npm run test:gen

# Follow prompts to:
# 1. Select application
# 2. Choose test type
# 3. Enter test name
# 4. Configure options
```

### Checking Migration Status

```bash
# Console output
npm run migration:check

# JSON report
npm run migration:check -- --format=json --output=migration.json

# HTML report
npm run migration:check -- --format=html --output=migration.html
```

### Setting Up Environment

```bash
# Full setup
./tools/dev-env/setup.sh

# Skip certain steps
./tools/dev-env/setup.sh --skip-docker --skip-build

# Verify setup
./tools/dev-env/verify.sh

# Start services
./tools/dev-env/start.sh

# View logs
./tools/dev-env/logs.sh -f
```

## Tool Development

Each tool is a standalone npm package that can be developed independently:

```bash
# Install tool dependencies
cd tools/mcp-generator
npm install

# Test tool
npm run generate

# Link for global use
npm link
```

## Adding New Tools

To add a new tool:

1. Create a new directory under `tools/`
2. Add `package.json` with appropriate bin entry
3. Create `README.md` with usage instructions
4. Add entry in root `package.json` scripts
5. Update this README with tool description

Example structure:

```
tools/
└── my-new-tool/
    ├── bin/
    │   └── execute.js
    ├── templates/
    │   └── template-file.ts
    ├── package.json
    └── README.md
```

## Common Tasks

### Installing Tool Dependencies

```bash
# Install all tool dependencies
npm install

# Install specific tool dependencies
cd tools/mcp-generator && npm install
```

### Running Tools Locally

```bash
# From root
npm run mcp:new
npm run test:gen
npm run migration:check

# Directly
node tools/mcp-generator/bin/generate.js
node tools/test-generator/bin/generate.js
node tools/migration-helper/bin/check.js
```

### Testing Tools

Each tool should have its own test suite:

```bash
cd tools/mcp-generator
npm test
```

## Best Practices

### Tool Design

1. **Interactive**: Use prompts for user-friendly CLI experience
2. **Documented**: Comprehensive README with examples
3. **Tested**: Include tests for tool functionality
4. **Standalone**: Each tool should work independently
5. **Idempotent**: Running multiple times shouldn't cause issues

### Templates

1. **Placeholders**: Use clear placeholder syntax (e.g., `{{VARIABLE}}`)
2. **Validated**: Validate generated output
3. **Documented**: Include template documentation
4. **Flexible**: Support customization

### Scripts

1. **POSIX Compatible**: Use sh/bash for portability
2. **Error Handling**: Check for errors and provide clear messages
3. **Help Text**: Include --help option
4. **Safety**: Confirm destructive operations

## Troubleshooting

### Tool Won't Run

```bash
# Check Node.js version
node --version  # Should be >= 18

# Reinstall dependencies
rm -rf node_modules
npm install

# Check script permissions
chmod +x tools/dev-env/setup.sh
```

### Missing Templates

```bash
# Verify templates exist
ls tools/mcp-generator/templates/
ls tools/test-generator/templates/

# Regenerate if needed
cd tools/mcp-generator
npm run build
```

### Permission Errors

```bash
# Fix script permissions
find tools -name "*.sh" -exec chmod +x {} \;

# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## Related Documentation

- [Contributing Guide](../docs/contributing/code-standards.md)
- [Development Workflow](../docs/contributing/pr-guidelines.md)
- [Root README](../README.md)
