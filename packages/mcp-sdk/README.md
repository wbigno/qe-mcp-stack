# @qe-mcp-stack/mcp-sdk

SDK for building Model Context Protocol (MCP) microservices.

## Features

- **BaseMCP**: Base class with common MCP functionality
- **MCPClient**: Client for inter-MCP communication
- **SwaggerConfig**: Standardized Swagger/OpenAPI setup

## Usage

### Creating a New MCP

```typescript
import { BaseMCP } from '@qe-mcp-stack/mcp-sdk';

class MyMCP extends BaseMCP {
  constructor() {
    super({
      name: 'my-mcp',
      version: '1.0.0',
      description: 'My custom MCP service',
      port: 8100
    });

    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get('/api/hello', (req, res) => {
      res.json({ message: 'Hello from MyMCP!' });
    });
  }
}

const mcp = new MyMCP();
mcp.start();
```

### Inter-MCP Communication

```typescript
import { MCPClient } from '@qe-mcp-stack/mcp-sdk';

const client = new MCPClient({
  baseURL: 'http://azure-devops:8100'
});

const iterations = await client.get('/api/iterations');
```

### Swagger Configuration

```typescript
import { SwaggerConfig } from '@qe-mcp-stack/mcp-sdk';

const swaggerConfig = new SwaggerConfig({
  title: 'My MCP API',
  version: '1.0.0',
  description: 'API documentation for My MCP',
  servers: [
    { url: 'http://localhost:8100', description: 'Development' }
  ]
});

app.use('/api-docs', swaggerConfig.serve(), swaggerConfig.setup());
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm run test

# Lint
npm run lint
```

## API

### BaseMCP

Base class for all MCP services providing:
- Express app setup
- Health check endpoint
- Logging configuration
- Error handling middleware
- Graceful shutdown

### MCPClient

HTTP client for calling other MCP services:
- Automatic retries
- Request/response logging
- Error handling
- Timeout configuration

### SwaggerConfig

Swagger/OpenAPI configuration helper:
- Standard Swagger UI setup
- OpenAPI 3.0 schema generation
- JSDoc annotations support
- Custom theming options
