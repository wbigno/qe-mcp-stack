# Documentation Style Guide

This guide establishes standards for documentation across the QE MCP Stack project.

## Table of Contents

- [Overview](#overview)
- [MCP README Template](#mcp-readme-template)
- [Writing Style](#writing-style)
- [Code Examples](#code-examples)
- [API Documentation](#api-documentation)
- [Diagrams and Visuals](#diagrams-and-visuals)
- [Documentation Sync](#documentation-sync)

## Overview

### Purpose

Clear, comprehensive documentation:
- Helps users understand and use MCPs effectively
- Enables quick onboarding for new team members
- Serves as single source of truth
- Reduces support burden

### Documentation Types

1. **MCP READMEs**: Comprehensive service documentation
2. **API Documentation**: OpenAPI/Swagger specifications
3. **Architecture Docs**: System design and patterns
4. **Contributing Guides**: Development workflows
5. **Troubleshooting**: Common issues and solutions

## MCP README Template

Use this structure for all MCP READMEs. See `mcps/integration/browser-control-mcp/README.md` as reference.

### Required Sections

```markdown
# [MCP Name] MCP

## Overview
- Description (1-2 paragraphs)
- Port number
- Swagger UI URL
- Category
- Docker container name

## Architecture
- System diagram (ASCII art or mermaid)
- Component descriptions
- Data flow explanation

## Features
- Bulleted list of key capabilities
- Use emoji for visual appeal (✅ 📊 🔍)

## Configuration
- Environment variables table
- Required vs optional settings
- Configuration examples

## API Endpoints
- Each endpoint documented
- Request/response JSON examples
- Query parameters
- Error responses

## Usage Examples
- Natural language (Claude Desktop)
- HTTP API (curl commands)
- Common workflows

## Development
- Install dependencies
- Run in dev mode
- Build commands
- Test commands

## Docker
- Build image
- Run container
- Docker Compose

## Troubleshooting
- Common issues
- Solutions with commands
- Debug tips

## Dependencies
- Major dependencies listed
- Version requirements

## Related Documentation
- Links to related docs
- External references

## Contributing
- How to contribute to this MCP

## License
- MIT (typically)
```

### Optional Sections

Add these when relevant:

```markdown
## Security
- Authentication details
- Authorization patterns
- Security best practices

## Monitoring
- Key metrics
- Logging configuration
- Health check details

## Performance
- Benchmarks
- Optimization tips
- Scaling guidelines

## Roadmap
- Planned features
- Future enhancements
```

## Writing Style

### Voice and Tone

**Do:**
- Use active voice: "The MCP analyzes code" ✅
- Be concise and clear
- Use second person: "You can configure..."
- Be friendly and approachable

**Don't:**
- Use passive voice: "Code is analyzed by the MCP" ❌
- Be overly formal or technical
- Use first person: "I recommend..."
- Use jargon without explanation

### Examples

**Good:**
```markdown
The Browser Control MCP provides Chrome automation via WebSocket.
Configure the connection port using the `WS_PORT` environment variable.
```

**Bad:**
```markdown
This MCP is used for browser automation purposes and utilizes
WebSocket protocol for bidirectional communication paradigm.
```

### Formatting Guidelines

**Headers:**
- Use sentence case: "API endpoints" ✅
- Not title case: "API Endpoints" ❌
- Be descriptive: "Creating a test plan" ✅
- Not vague: "Setup" ❌

**Lists:**
- Start with action verbs
- Keep items parallel
- Use complete sentences or phrases consistently

**Links:**
- Use descriptive text: [Browser Control README](path) ✅
- Not: [click here](path) ❌

## Code Examples

### Bash/Shell Commands

```bash
# Always include comments explaining what the command does
curl -X POST http://localhost:8100/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{
    "key": "value"
  }'

# Show expected output
# Output:
# {"success": true, "id": 12345}
```

### JSON Examples

```json
// Format with proper indentation (2 spaces)
{
  "success": true,
  "result": {
    "id": 12345,
    "name": "Example"
  }
}
```

### Environment Variables

```bash
# Group related variables
# Server Configuration
PORT=8100
NODE_ENV=production

# Azure DevOps Configuration
AZURE_DEVOPS_PAT=your-token
AZURE_DEVOPS_ORG=your-org
```

### Inline Code

Use backticks for:
- File names: `package.json`
- Environment variables: `PORT`
- Command names: `npm run dev`
- Code elements: `function()`
- Short snippets: `{ "key": "value" }`

### Code Blocks

Always specify language for syntax highlighting:

````markdown
```bash
docker compose up
```

```javascript
const result = await client.get('/api/data');
```

```json
{"success": true}
```
````

## API Documentation

### Endpoint Format

```markdown
### POST /api/resource

Description of what this endpoint does.

**Request Body:**
```json
{
  "field": "value",
  "required": true
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "id": 123,
    "created": "2026-01-11T12:00:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Query Parameters:**
- `limit` (optional) - Number of results (default: 10)
- `offset` (optional) - Pagination offset (default: 0)
```

### OpenAPI/Swagger

Ensure Swagger specs include:
- Complete endpoint descriptions
- Request/response schemas
- Example values
- Error responses
- Authentication requirements

## Diagrams and Visuals

### ASCII Art Diagrams

Use for simple architecture diagrams:

```
Chrome Extension
     ↕ WebSocket
MCP Server
     ↕ HTTP API
Orchestrator
```

### Tables

Use for structured data:

| MCP | Port | Category |
|-----|------|----------|
| Azure DevOps | 8100 | Integration |
| Browser Control | 8103 | Integration |

### Screenshots

Include when helpful:
- UI changes
- Dashboard views
- Error messages

Store in `docs/images/` directory.

## Documentation Sync

### Automatic Sync

The pre-commit hook automatically syncs MCP READMEs to `docs/mcps/`:

```bash
# You edit:
mcps/integration/azure-devops/README.md

# Hook automatically syncs to:
docs/mcps/azure-devops.md
```

### Manual Sync

If needed, sync manually:

```bash
npm run sync-docs
```

### Sync Process

1. Edit MCP README in its source location
2. Commit changes (pre-commit hook runs automatically)
3. Both source and synced files included in commit
4. CI validates sync on pull requests

### Files That Sync

```
Source → Destination

mcps/integration/*/README.md → docs/mcps/*.md
mcps/code-analysis/*/README.md → docs/mcps/*.md
mcps/test/*/README.md → docs/mcps/*.md
mcps/playwright/*/README.md → docs/mcps/*.md
packages/*/README.md → docs/mcps/*.md
swagger-hub/README.md → docs/mcps/swagger-hub.md
```

## Documentation Checklist

Before submitting documentation:

**Content:**
- [ ] All required sections included
- [ ] Code examples tested and working
- [ ] Links are valid
- [ ] No placeholder text (TODO, TBD, etc.)
- [ ] Technical accuracy verified

**Style:**
- [ ] Active voice used
- [ ] Concise and clear language
- [ ] Proper formatting (headers, lists, code blocks)
- [ ] Consistent terminology
- [ ] Grammar and spelling checked

**Examples:**
- [ ] Curl commands include full URL
- [ ] JSON properly formatted
- [ ] Environment variables documented
- [ ] Error cases covered

**Sync:**
- [ ] README updated in source location
- [ ] Pre-commit hook ran (or manual sync)
- [ ] docs/mcps/ file matches source

## Common Mistakes

### ❌ Avoid

**Outdated information:**
```markdown
# Port 8100 (but actually changed to 8200)
```

**Vague descriptions:**
```markdown
# This endpoint does stuff
```

**Broken examples:**
```bash
# Command that doesn't actually work
curl localhost/api  # Missing port!
```

**Missing context:**
```markdown
# Run the script
./script.sh  # What script? Where?
```

### ✅ Do

**Accurate information:**
```markdown
**Port**: 8200 (HTTP API)
```

**Clear descriptions:**
```markdown
### POST /api/users
Create a new user account with email and password.
```

**Working examples:**
```bash
# Create a new user
curl -X POST http://localhost:8100/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret"}'
```

**Full context:**
```markdown
Run the documentation sync script from the project root:
```bash
npm run sync-docs
```
```

## Documentation Updates

### When to Update

Update docs when:
- Adding features
- Changing APIs
- Fixing bugs
- Updating dependencies
- Changing configuration
- Modifying architecture

### Update Process

1. Edit source README
2. Test examples
3. Commit (pre-commit hook syncs)
4. Verify sync in docs/mcps/
5. Submit PR

### Versioning

For major changes:
- Note version in changelog
- Provide migration guide
- Mark breaking changes clearly

## Getting Help

Questions about documentation:
- Check [CONTRIBUTING.md](../../CONTRIBUTING.md)
- Review example: [Browser Control README](../../mcps/integration/browser-control-mcp/README.md)
- Ask the team

## Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

**Remember**: Good documentation is as important as good code! 📚
