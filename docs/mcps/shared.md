# @qe-mcp-stack/shared

Shared utilities and common functionality for all QE MCP Stack services.

## Modules

### Auth
JWT validation and API key management utilities.

```typescript
import { validateJWT, generateAPIKey } from '@qe-mcp-stack/shared/auth';
```

### Config
Environment configuration and validation utilities.

```typescript
import { getConfig, validateConfig } from '@qe-mcp-stack/shared/config';
```

### Logging
Winston-based structured logging utilities.

```typescript
import { logger } from '@qe-mcp-stack/shared/logging';

logger.info('Application started');
logger.error('An error occurred', { error });
```

### Types
Common TypeScript type definitions.

```typescript
import { MCPRequest, MCPResponse } from '@qe-mcp-stack/shared/types';
```

### Utils
General utility functions (date, string, validation helpers).

```typescript
import { formatDate, isValidEmail } from '@qe-mcp-stack/shared/utils';
```

## Installation

This package is part of the QE MCP Stack monorepo and is automatically linked via npm workspaces.

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
