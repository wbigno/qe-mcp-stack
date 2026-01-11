# MCP Architecture

## Model Context Protocol (MCP) Pattern

The QE MCP Stack implements the **Model Context Protocol** pattern where each microservice (MCP) is a specialized, focused service that handles a specific domain of quality engineering.

## Core Principles

### 1. Single Responsibility
Each MCP has one clearly defined purpose:
- **Azure DevOps MCP**: Azure DevOps integration only
- **Risk Analyzer MCP**: Risk assessment only  
- **Code Analyzer MCP**: Code metrics only

### 2. Standard Interface
All MCPs expose a consistent REST API:
```
GET  /health          - Health check
GET  /api-docs        - Swagger UI
GET  /swagger.json    - OpenAPI spec
POST /api/*           - Domain-specific endpoints
```

### 3. Independence
- MCPs can be deployed, scaled, and updated independently
- No direct MCP-to-MCP communication (goes through orchestrator)
- Each MCP has its own dependencies and configuration

### 4. Standardization
- Common base classes from `@qe-mcp-stack/mcp-sdk`
- Shared utilities from `@qe-mcp-stack/shared`
- Consistent logging, error handling, authentication

## MCP Structure

```
mcps/{category}/{mcp-name}/
├── src/
│   ├── index.ts           # Entry point, Express server
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── models/            # Data models
│   └── utils/             # Helpers
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── Dockerfile             # Container definition
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── README.md              # MCP documentation
```

## MCP Categories

### Integration MCPs (8100-8199)
**Purpose**: Connect to external systems

**Characteristics**:
- API clients for external services
- Data transformation
- Authentication/authorization handling
- Rate limiting

**Examples**:
- Azure DevOps MCP (8100)
- Third Party MCP (8101)
- Test Plan Manager MCP (8102)

### Code Analysis MCPs (8200-8299)
**Purpose**: Analyze application code

**Characteristics**:
- File system access to repos
- Code parsing and analysis
- Metric calculation
- Report generation

**Examples**:
- Code Analyzer MCP (8200)
- Coverage Analyzer MCP (8201)
- Playwright Generator MCP (8202)
- Migration Analyzer MCP (8203)

### Quality Analysis MCPs (8300-8399)
**Purpose**: AI-powered insights

**Characteristics**:
- AI/ML integration (Anthropic, OpenAI)
- Complex analysis algorithms
- Historical data analysis
- Recommendation engines

**Examples**:
- Risk Analyzer MCP (8300)
- Integration Mapper MCP (8301)
- Test Selector MCP (8302)

## Communication Patterns

### Client → Orchestrator → MCP

```typescript
// Dashboard calls orchestrator
const response = await fetch('http://localhost:3000/api/azure-devops/iterations');

// Orchestrator routes to MCP
const mcpResponse = await axios.get('http://azure-devops:8100/api/iterations', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Error Handling

```typescript
try {
  const result = await mcpService.analyze(data);
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Analysis failed', { error, context });
  res.status(500).json({ 
    success: false, 
    error: error.message 
  });
}
```

## Best Practices

1. **Health Checks**: Always implement `/health` endpoint
2. **Swagger Documentation**: Keep OpenAPI specs up-to-date
3. **Logging**: Use structured logging with correlation IDs
4. **Error Responses**: Consistent error format across all MCPs
5. **Versioning**: Use URL versioning for breaking changes (`/api/v2/`)

## Related Documentation

- [System Overview](system-overview.md)
- [Data Flow](data-flow.md)
- [Creating a New MCP](../contributing/new-mcp-guide.md)
