# JavaScript Code Analyzer MCP

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Port](https://img.shields.io/badge/port-8204-blue.svg)]()
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)]()

## Overview

The **JavaScript Code Analyzer MCP** is a microservice that analyzes JavaScript, TypeScript, React, and Vue codebases to extract structural information, calculate complexity metrics, and identify code patterns.

## Features

### Supported File Types
- ✅ JavaScript (`.js`)
- ✅ JSX (`.jsx`)
- ✅ TypeScript (`.ts`)
- ✅ TSX (`.tsx`)
- ✅ Vue Single File Components (`.vue`)

### Analysis Capabilities
- **React Components**: Detects functional and class-based components
- **Custom Hooks**: Identifies hooks following the `use*` naming pattern
- **Functions**: Extracts all function declarations and expressions
- **Classes**: Analyzes class declarations and methods
- **Imports/Exports**: Tracks module dependencies
- **API Calls**: Detects fetch, axios, and HTTP requests
- **Complexity**: Calculates cyclomatic complexity for functions
- **File Types**: Automatically categorizes files (Component, Hook, Utility, Service, Page, etc.)

### Vue.js Support
- Parses Vue SFC template, script, and style blocks
- Extracts component props, methods, computed properties
- Supports both Options API and Composition API

## API Endpoints

### Health Check
```bash
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "javascript-code-analyzer-mcp",
  "timestamp": "2026-01-09T15:00:00.000Z"
}
```

### Analyze Application
```bash
POST /analyze
Content-Type: application/json

{
  "app": "Core",
  "includeTests": false,
  "detailed": true
}
```

**Parameters**:
- `app` (required): Application name from `apps.json`
- `includeTests` (optional): Whether to include test files in analysis
- `detailed` (optional): Include detailed analysis for each item

**Response**:
```json
{
  "success": true,
  "analysis": {
    "app": "Core",
    "timestamp": "2026-01-09T15:00:00.000Z",
    "totalFiles": 150,
    "components": [
      {
        "name": "UserProfile",
        "type": "FunctionalComponent",
        "file": "/mnt/apps/Core/src/components/UserProfile.jsx",
        "hooks": ["useState", "useEffect", "useCallback"],
        "props": ["userId", "onUpdate"],
        "complexity": 8
      }
    ],
    "functions": [
      {
        "name": "validateEmail",
        "file": "/mnt/apps/Core/src/utils/validation.js",
        "line": 15,
        "params": 1,
        "isAsync": false,
        "isArrow": true,
        "complexity": 3
      }
    ],
    "hooks": [
      {
        "name": "useAuth",
        "file": "/mnt/apps/Core/src/hooks/useAuth.js",
        "dependencies": ["user", "token"]
      }
    ],
    "classes": [
      {
        "name": "ApiService",
        "file": "/mnt/apps/Core/src/services/ApiService.js",
        "methods": [
          {
            "name": "get",
            "kind": "method",
            "isAsync": true,
            "params": 2
          }
        ]
      }
    ],
    "apiCalls": [
      {
        "method": "get",
        "url": "/api/users",
        "line": 42
      }
    ],
    "summary": {
      "totalFiles": 150,
      "totalComponents": 45,
      "totalFunctions": 210,
      "totalClasses": 12,
      "totalHooks": 18,
      "totalApiCalls": 67,
      "averageComplexity": 5,
      "totalComplexity": 1050
    }
  }
}
```

## Technology Stack

- **@babel/parser**: JavaScript/TypeScript/JSX parsing
- **@babel/traverse**: AST traversal for code analysis
- **@vue/compiler-sfc**: Vue Single File Component parsing
- **TypeScript**: Built-in TypeScript support
- **Express**: HTTP server framework
- **glob**: File pattern matching

## Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=8204
CONFIG_PATH=/app/config/apps.json
```

### apps.json Structure
```json
{
  "applications": [
    {
      "name": "Core",
      "path": "/mnt/apps/Core",
      "includePatterns": ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.vue"],
      "excludePaths": [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**"
      ]
    }
  ]
}
```

## Docker Setup

### Build
```bash
docker compose build javascript-code-analyzer
```

### Run
```bash
docker compose up -d javascript-code-analyzer
```

### Health Check
```bash
curl http://localhost:8204/health
```

## Usage Examples

### 1. Analyze React Application
```bash
curl -X POST http://localhost:8204/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "Core",
    "includeTests": false,
    "detailed": true
  }'
```

### 2. Find All Custom Hooks
```bash
curl -X POST http://localhost:8204/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core"}' | jq '.analysis.hooks'
```

### 3. Get Complexity Metrics
```bash
curl -X POST http://localhost:8204/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core"}' | jq '.analysis.summary'
```

### 4. Find Components with High Complexity
```bash
curl -X POST http://localhost:8204/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "Core"}' | jq '.analysis.components[] | select(.complexity > 10)'
```

## Integration with Orchestrator

The JavaScript Code Analyzer integrates with the orchestrator for unified analysis:

```bash
# Get JavaScript analysis through orchestrator
curl http://localhost:3000/api/dashboard/javascript-analysis?app=Core

# Get overview (combines .NET + JavaScript)
curl http://localhost:3000/api/dashboard/overview?app=Core
```

## File Type Detection

The analyzer automatically categorizes files:

| Path Pattern | Category |
|--------------|----------|
| `/components/` | Component |
| `/hooks/` | Hook |
| `/pages/`, `/routes/` | Page |
| `/utils/`, `/helpers/` | Utility |
| `/services/`, `/api/` | Service |
| `/store/`, `/redux/` | State |
| `*.config.js` | Config |

## Complexity Calculation

Cyclomatic complexity is calculated by counting:
- `if` statements (+1)
- Ternary operators (+1)
- `switch` cases (+1)
- Loops (`for`, `while`, `do-while`) (+1)
- Logical operators (`&&`, `||`) (+1)
- `catch` blocks (+1)

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker compose logs javascript-code-analyzer

# Verify config file
docker exec qe-javascript-code-analyzer cat /app/config/apps.json
```

### No Files Found
- Verify application paths in `apps.json`
- Check file patterns in `includePatterns`
- Ensure app directory is volume-mounted in Docker

### Parsing Errors
- Check for syntax errors in source files
- Verify TypeScript files have correct configuration
- Review logs for specific parsing failures

## Performance

- Analyzes ~150 files in ~2-3 seconds
- Memory usage: ~200MB for typical applications
- CPU usage: Moderate during analysis, idle otherwise

## API Documentation

Full OpenAPI documentation available at: `http://localhost:8204/api-docs` (when Swagger is configured)

## Related Services

- **JavaScript Coverage Analyzer** (Port 8205): Analyzes Jest/Vitest test coverage
- **.NET Code Analyzer** (Port 8200): Analyzes C# code
- **Orchestrator** (Port 3000): Aggregates analysis from all analyzers

## Version History

### 1.0.0 (2026-01-09)
- Initial release
- Support for JavaScript, TypeScript, React, Vue
- Complexity analysis
- Component and hook detection
- API call detection
