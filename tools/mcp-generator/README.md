# MCP Generator

CLI tool to scaffold new MCP services with a complete structure including Swagger documentation, tests, and Docker configuration.

## Usage

From the root of the monorepo:

```bash
npm run mcp:new
```

Or directly:

```bash
node tools/mcp-generator/bin/generate.js
```

## Interactive Prompts

The generator will ask you:

1. **MCP Category**: Choose from:
   - Integration (ports 8100-8199)
   - Code Analysis (ports 8200-8299)
   - Quality Analysis (ports 8300-8399)

2. **Service Name**: Name of your MCP (e.g., "data-validator")

3. **Port**: Port number for the service (auto-suggested based on category)

4. **Description**: Short description of what the MCP does

5. **Features**: List of API endpoints/features to scaffold

## Generated Structure

```
mcps/{category}/{service-name}/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Express server setup
│   ├── routes/               # API routes
│   │   └── index.ts
│   ├── services/             # Business logic
│   │   └── {service}.service.ts
│   ├── models/               # Data models
│   ├── swagger.ts            # Swagger configuration
│   └── types.ts              # TypeScript types
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── Dockerfile                # Docker configuration
├── package.json              # Package configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Service documentation
```

## Example

```bash
$ npm run mcp:new

? Select MCP category: Code Analysis
? Service name: dependency-analyzer
? Port number: 8204
? Description: Analyzes project dependencies and detects vulnerabilities
? Enter features (comma-separated): analyze, report, scan
? Include AI integration? Yes

✓ Created mcps/code-analysis/dependency-analyzer
✓ Generated package.json
✓ Generated TypeScript configuration
✓ Generated Swagger documentation
✓ Generated API routes
✓ Generated service files
✓ Generated tests
✓ Generated Dockerfile
✓ Generated README

Next steps:
  cd mcps/code-analysis/dependency-analyzer
  npm install
  npm run dev

MCP will be available at: http://localhost:8204
Swagger docs at: http://localhost:8204/api-docs
```

## Templates

Templates are located in `tools/mcp-generator/templates/` and use placeholders:

- `{{SERVICE_NAME}}` - Service name (kebab-case)
- `{{SERVICE_NAME_PASCAL}}` - Service name (PascalCase)
- `{{SERVICE_NAME_CAMEL}}` - Service name (camelCase)
- `{{CATEGORY}}` - MCP category
- `{{PORT}}` - Port number
- `{{DESCRIPTION}}` - Service description
- `{{FEATURES}}` - List of features

## Customization

Modify templates in `tools/mcp-generator/templates/` to change the generated structure.

## Development

```bash
cd tools/mcp-generator
npm install
npm run generate
```
