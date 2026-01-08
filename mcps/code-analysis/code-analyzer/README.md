# Code Analyzer - .NET C# Application Scanner

**Type:** Docker MCP (Always Running)  
**Port:** 3001  
**Container:** `qe-code-analyzer`  
**Location:** `mcps/code-analyzer/`  
**Technology:** Node.js 18 + TypeScript + Roslyn API  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Input/Output Schemas](#inputoutput-schemas)
8. [Data Persistence](#data-persistence)
9. [Development](#development)
10. [Testing](#testing)
11. [Error Handling](#error-handling)
12. [Troubleshooting](#troubleshooting)
13. [Monitoring](#monitoring)
14. [Integration](#integration)
15. [Changelog](#changelog)

---

## Overview

### Purpose

The **Code Analyzer** is a specialized MCP designed to perform deep static analysis of .NET C# applications. It scans application codebases to extract comprehensive structural information including classes, methods, dependencies, integration points, and architectural patterns. This MCP serves as the foundation for all code-level understanding in the QE MCP Stack.

The Code Analyzer uses AST (Abstract Syntax Tree) parsing to understand code at a semantic level, going beyond simple text scanning to provide accurate, context-aware analysis. It identifies Epic EMR integrations, financial system touchpoints, database interactions, API endpoints, and other critical integration points that require testing coverage.

### Key Features

- ✅ **Deep C# Analysis** - AST-based parsing using Roslyn API for accurate code understanding
- ✅ **Integration Detection** - Automatically identifies Epic, financial, and external service integration points
- ✅ **Dependency Mapping** - Tracks project dependencies, NuGet packages, and internal references
- ✅ **Method Extraction** - Extracts all methods with parameters, return types, and complexity metrics
- ✅ **Test File Detection** - Identifies xUnit test files and separates test from production code
- ✅ **Configuration-Driven** - Reads application definitions from central apps.json configuration
- ✅ **Caching Support** - Stores analysis results for fast subsequent queries
- ✅ **Parallel Processing** - Can analyze multiple applications concurrently

### Use Cases

1. **Test Coverage Planning** - Identify all methods that need test coverage
2. **Integration Mapping** - Find all Epic API calls and financial system touchpoints
3. **Risk Assessment** - Identify high-complexity methods requiring thorough testing
4. **Dependency Analysis** - Map all external dependencies and API integrations
5. **Test Gap Analysis** - Compare production code against test files to find untested areas
6. **Architecture Documentation** - Generate comprehensive architectural diagrams from code structure
7. **Code Metrics** - Calculate complexity metrics, method counts, and code health indicators

### What It Does NOT Do

- ❌ Does not execute code or run tests (delegates to test execution MCPs)
- ❌ Does not modify source code (read-only analysis)
- ❌ Does not perform dynamic analysis (static analysis only)
- ❌ Does not analyze languages other than C# (use language-specific analyzers)
- ❌ Does not store application source code (only metadata and analysis results)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Analyze single application
curl -X POST http://localhost:3000/api/analysis/code-scan \
  -H "Content-Type: application/json" \
  -d '{
    "apps": ["App1"]
  }'

# Analyze multiple applications
curl -X POST http://localhost:3000/api/analysis/code-scan \
  -H "Content-Type: application/json" \
  -d '{
    "apps": ["App1", "App2", "App3"]
  }'
```

### Direct Access (Testing Only)

```bash
# Basic analysis
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeTests": false,
    "deep": false
  }'

# Deep analysis with tests
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeTests": true,
    "deep": true
  }'

# Health check
curl http://localhost:3001/health
```

### Expected Output

```json
{
  "success": true,
  "analysis": {
    "app": "App1",
    "displayName": "Patient Portal",
    "totalFiles": 145,
    "totalClasses": 89,
    "totalMethods": 456,
    "totalTestFiles": 42,
    "totalTestMethods": 234,
    "classes": [
      {
        "name": "PatientService",
        "namespace": "PatientPortal.Services",
        "filePath": "/mnt/apps/patient-portal/Services/PatientService.cs",
        "methods": [
          {
            "name": "GetPatientById",
            "parameters": ["int id"],
            "returnType": "Task<Patient>",
            "complexity": 5,
            "lineCount": 25,
            "isPublic": true,
            "isAsync": true
          }
        ],
        "dependencies": ["IPatientRepository", "ILogger", "IEpicService"],
        "implementsInterface": ["IPatientService"]
      }
    ],
    "epicIntegrations": [
      "EpicService.GetPatient",
      "EpicService.UpdateRecord",
      "EpicService.SearchPatients"
    ],
    "financialTouchpoints": [
      "PaymentProcessor.ProcessPayment",
      "BillingService.CreateInvoice",
      "StripeService.CreateCharge"
    ],
    "databaseAccess": [
      "PatientRepository.GetById",
      "AppointmentRepository.FindByDate"
    ],
    "apiEndpoints": [
      "GET /api/patients/{id}",
      "POST /api/appointments",
      "PUT /api/patients/{id}"
    ],
    "dependencies": {
      "nuget": [
        "Newtonsoft.Json (13.0.3)",
        "EntityFrameworkCore (8.0.0)",
        "Serilog (3.1.1)"
      ],
      "projects": [
        "PatientPortal.Core",
        "PatientPortal.Data"
      ]
    },
    "metrics": {
      "avgComplexity": 3.2,
      "maxComplexity": 15,
      "totalLines": 12450,
      "codeLines": 9800,
      "commentLines": 1200,
      "blankLines": 1450
    }
  },
  "cached": false,
  "executionTime": 2345,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│                Code Analyzer (Port 3001)                        │
│                                                                 │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐        │
│  │ Express  │──▶│ Roslyn AST   │──▶│ Integration    │        │
│  │ Router   │   │ Parser       │   │ Detector       │        │
│  │          │   │              │   │                │        │
│  └──────────┘   └──────────────┘   └────────────────┘        │
│       │                │                    │                  │
│       ▼                ▼                    ▼                  │
│  HTTP API      Code Parsing        Pattern Matching           │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │ Cache        │   │ Config       │   │ Metrics      │     │
│  │ Manager      │   │ Reader       │   │ Calculator   │     │
│  └──────────────┘   └──────────────┘   └──────────────┘     │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
    Cached Results      apps.json Config    Code Metrics
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /analyze` - Main analysis endpoint
   - `POST /applications` - Batch analysis endpoint
   - `GET /health` - Health check endpoint
   - `GET /cache/status` - Cache statistics
   - `DELETE /cache/:app` - Clear app cache

2. **Roslyn AST Parser** (`src/analyzers/roslynParser.js`)
   - **Syntax Tree Parser** - Builds AST from C# source files
   - **Semantic Analyzer** - Resolves types, symbols, and references
   - **Method Extractor** - Extracts method signatures and metadata
   - **Dependency Resolver** - Maps project and package dependencies

3. **Integration Detector** (`src/detectors/integrationDetector.js`)
   - **Epic Integration Detector** - Patterns: `Epic*`, `*EpicService*`, EMR API calls
   - **Financial Detector** - Patterns: `*Payment*`, `*Billing*`, `*Invoice*`, `Stripe*`
   - **Database Detector** - Patterns: `*Repository*`, `DbContext`, Entity Framework
   - **API Endpoint Detector** - MVC controllers, API routes, HTTP attributes

4. **Cache Manager** (`src/services/cacheManager.js`)
   - Time-based cache with configurable TTL
   - Per-application cache keys
   - Automatic invalidation on configuration changes
   - Cache statistics and monitoring

5. **Config Reader** (`src/utils/configReader.js`)
   - Reads `config/apps.json` for application definitions
   - Validates application paths and settings
   - Supports both Docker paths (`/mnt/apps/*`) and local paths

6. **Metrics Calculator** (`src/analyzers/metricsCalculator.js`)
   - Cyclomatic complexity calculation
   - Lines of code counting (total, code, comments, blank)
   - Method complexity distribution
   - Dependency metrics

### Dependencies

**Internal:**
- None (standalone analysis MCP)

**External Services:**
- File system access to application code (`/mnt/apps/*`)
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- @typescript-eslint/parser - TypeScript AST parsing
- roslyn-wrapper - C# Roslyn API wrapper (via child process)
- glob - File pattern matching
- winston - Logging
- node-cache - In-memory caching

### Data Flow

```
1. HTTP Request (POST /analyze)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name exists in apps.json
   ├─▶ Validate request parameters
   └─▶ Check cache for recent results
       │
       ├─ Cache Hit → Return cached results
       │
       └─ Cache Miss
          │
          ▼
3. Application Path Resolution
   ├─▶ Read app config from apps.json
   ├─▶ Resolve Docker path (/mnt/apps/*)
   └─▶ Validate path accessibility
       │
       ▼
4. File Discovery
   ├─▶ Find all *.cs files (excluding bin, obj, packages)
   ├─▶ Apply includePatterns filter
   ├─▶ Apply excludePaths filter
   └─▶ Separate test files from production files
       │
       ▼
5. Roslyn AST Parsing (per file)
   ├─▶ Parse C# syntax tree
   ├─▶ Extract classes, methods, properties
   ├─▶ Extract method signatures (params, return types)
   ├─▶ Calculate cyclomatic complexity
   └─▶ Resolve type references and dependencies
       │
       ▼
6. Integration Detection
   ├─▶ Scan for Epic API patterns
   ├─▶ Scan for financial system patterns
   ├─▶ Scan for database access patterns
   ├─▶ Scan for API endpoint definitions
   └─▶ Extract dependency graph
       │
       ▼
7. Metrics Calculation
   ├─▶ Count total methods, classes, files
   ├─▶ Calculate average complexity
   ├─▶ Calculate lines of code metrics
   └─▶ Generate complexity distribution
       │
       ▼
8. Result Aggregation
   ├─▶ Combine all analysis results
   ├─▶ Store in cache with TTL
   └─▶ Return JSON response
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3001 | Code analyzer HTTP port |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `CACHE_TTL` | ❌ No | 3600 | Cache time-to-live in seconds |
| `MAX_FILE_SIZE` | ❌ No | 10485760 | Max file size to analyze (10MB) |
| `PARALLEL_ANALYSIS` | ❌ No | true | Enable parallel file analysis |
| `MAX_WORKERS` | ❌ No | 4 | Max parallel worker threads |

### Configuration Files

#### `config/apps.json`

Defines .NET applications to analyze:

```json
{
  "applications": [
    {
      "name": "App1",
      "displayName": "Patient Portal",
      "path": "/mnt/apps/patient-portal",
      "localPath": "/Users/williambigno/dev/git/patient-portal",
      "type": "dotnet",
      "framework": "net8.0",
      "testFramework": "xUnit",
      "excludePaths": [
        "bin",
        "obj",
        "packages",
        "node_modules",
        "Migrations"
      ],
      "includePatterns": [
        "**/*.cs",
        "**/*.csproj"
      ],
      "integrations": [
        "Epic",
        "Stripe",
        "SQL Server"
      ],
      "priority": "high"
    }
  ],
  "settings": {
    "parallelAnalysis": true,
    "maxConcurrency": 2,
    "cacheResults": true,
    "cacheTTL": 3600,
    "deepAnalysis": false
  }
}
```

**Field Descriptions:**

- `name` - Unique identifier for the application
- `displayName` - Human-readable name
- `path` - Docker volume mount path (used in container)
- `localPath` - Local development path (for reference)
- `type` - Language/platform type (`dotnet`, `java`, `python`)
- `framework` - Target framework version
- `testFramework` - Testing framework used (`xUnit`, `NUnit`, `MSTest`)
- `excludePaths` - Directories to skip during analysis
- `includePatterns` - File glob patterns to analyze
- `integrations` - Known integration points for this app
- `priority` - Analysis priority (`high`, `medium`, `low`)

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
code-analyzer:
  build: ./mcps/code-analyzer
  container_name: qe-code-analyzer
  ports:
    - "3001:3001"
  environment:
    - NODE_ENV=production
    - PORT=3001
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/code-analyzer:/app/data   # Cache and results
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
    - ${APP2_PATH}:/mnt/apps/app2:ro
    - ${APP3_PATH}:/mnt/apps/app3:ro
  networks:
    - qe-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read application definitions
- `./data/code-analyzer` - Store cached analysis results
- `/mnt/apps/*` - Read-only access to application source code

---

## API Reference

### Analysis Endpoints

#### POST /analyze

Analyze a single application

**Request Body:**
```typescript
{
  app: string;              // Required: App name from apps.json
  includeTests?: boolean;   // Optional: Include test files (default: false)
  deep?: boolean;           // Optional: Deep analysis mode (default: false)
  forceRefresh?: boolean;   // Optional: Bypass cache (default: false)
}
```

**Response:**
```typescript
{
  success: boolean;
  analysis: {
    app: string;
    displayName: string;
    totalFiles: number;
    totalClasses: number;
    totalMethods: number;
    classes: Array<ClassInfo>;
    epicIntegrations: string[];
    financialTouchpoints: string[];
    databaseAccess: string[];
    apiEndpoints: string[];
    dependencies: object;
    metrics: object;
  };
  cached: boolean;
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeTests": true,
    "deep": true
  }'
```

---

#### POST /applications

Batch analyze multiple applications

**Request Body:**
```typescript
{
  apps: string[];           // Required: Array of app names
  includeTests?: boolean;   // Optional: Include test files
  deep?: boolean;           // Optional: Deep analysis mode
  parallel?: boolean;       // Optional: Analyze in parallel (default: true)
}
```

**Response:**
```typescript
{
  success: boolean;
  results: {
    [appName: string]: {
      success: boolean;
      analysis?: object;
      error?: string;
    }
  };
  totalExecutionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/applications \
  -H "Content-Type: application/json" \
  -d '{
    "apps": ["App1", "App2", "App3"],
    "includeTests": false,
    "parallel": true
  }'
```

---

### Cache Endpoints

#### GET /cache/status

Get cache statistics

**Response:**
```typescript
{
  success: boolean;
  cache: {
    enabled: boolean;
    ttl: number;
    size: number;
    keys: string[];
    hitRate: number;
    stats: {
      hits: number;
      misses: number;
      sets: number;
      deletes: number;
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3001/cache/status
```

---

#### DELETE /cache/:app

Clear cache for specific application

**Parameters:**
- `app` - Application name

**Response:**
```typescript
{
  success: boolean;
  message: string;
  cleared: boolean;
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/cache/App1
```

---

#### DELETE /cache

Clear all cache

**Response:**
```typescript
{
  success: boolean;
  message: string;
  clearedKeys: number;
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/cache
```

---

### Health Endpoints

#### GET /health

Service health check

**Response:**
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  uptime: number;
  version: string;
  cache: {
    enabled: boolean;
    size: number;
  };
  config: {
    appsConfigured: number;
  };
  timestamp: string;
}
```

**Example:**
```bash
curl http://localhost:3001/health
```

---

## Usage Examples

### Example 1: Basic Application Analysis

**Scenario:** Analyze a single application to understand its structure

```bash
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeTests": false,
    "deep": false
  }'
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "app": "App1",
    "displayName": "Patient Portal",
    "totalFiles": 145,
    "totalClasses": 89,
    "totalMethods": 456,
    "classes": [...],
    "epicIntegrations": ["EpicService.GetPatient", "EpicService.UpdateRecord"],
    "financialTouchpoints": ["PaymentProcessor.ProcessPayment"],
    "metrics": {
      "avgComplexity": 3.2,
      "maxComplexity": 15
    }
  },
  "cached": false,
  "executionTime": 2345
}
```

---

### Example 2: Deep Analysis with Test Files

**Scenario:** Perform comprehensive analysis including test coverage

```bash
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeTests": true,
    "deep": true
  }'
```

**Key Differences:**
- Includes test file analysis
- Deeper AST parsing for complex patterns
- More detailed dependency graph
- Takes longer but provides comprehensive results

---

### Example 3: Finding Epic Integration Points

**Scenario:** Identify all Epic EMR integration points for testing

```bash
# Step 1: Analyze application
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}' > analysis.json

# Step 2: Extract Epic integrations
cat analysis.json | jq '.analysis.epicIntegrations'
```

**Output:**
```json
[
  "EpicService.GetPatient",
  "EpicService.UpdatePatient",
  "EpicService.SearchPatients",
  "EpicService.GetAppointments",
  "EpicService.CreateOrder"
]
```

**Use Case:** Generate integration tests for each Epic API call

---

### Example 4: Batch Analysis of Multiple Apps

**Scenario:** Analyze entire application portfolio

```bash
curl -X POST http://localhost:3001/applications \
  -H "Content-Type: application/json" \
  -d '{
    "apps": ["App1", "App2", "App3", "App4"],
    "includeTests": false,
    "parallel": true
  }'
```

**Response:**
```json
{
  "success": true,
  "results": {
    "App1": {
      "success": true,
      "analysis": {...}
    },
    "App2": {
      "success": true,
      "analysis": {...}
    },
    "App3": {
      "success": false,
      "error": "Path not found: /mnt/apps/app3"
    },
    "App4": {
      "success": true,
      "analysis": {...}
    }
  },
  "totalExecutionTime": 5678
}
```

---

### Example 5: Cache Management

**Scenario:** Clear stale cache after code changes

```bash
# Check cache status
curl http://localhost:3001/cache/status

# Clear specific app
curl -X DELETE http://localhost:3001/cache/App1

# Clear all cache
curl -X DELETE http://localhost:3001/cache

# Force fresh analysis
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "forceRefresh": true
  }'
```

---

### Example 6: Integration with Coverage Analyzer

**Scenario:** Combine code analysis with test coverage

```bash
# Step 1: Get all methods
CODE_ANALYSIS=$(curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}')

# Step 2: Get test coverage
COVERAGE=$(curl -X POST http://localhost:3002/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}')

# Step 3: Find untested methods
echo $CODE_ANALYSIS | jq '.analysis.totalMethods'
echo $COVERAGE | jq '.coverage.testedMethods'
```

---

## Input/Output Schemas

### Input Schema: Analyze Request

```typescript
interface AnalyzeRequest {
  app: string;                  // Application name from apps.json
  includeTests?: boolean;       // Include test files in analysis (default: false)
  deep?: boolean;               // Perform deep analysis (default: false)
  forceRefresh?: boolean;       // Bypass cache (default: false)
}
```

---

### Output Schema: Analysis Result

```typescript
interface AnalysisResult {
  success: boolean;
  analysis: {
    app: string;                // Application name
    displayName: string;        // Display name from config
    totalFiles: number;         // Total C# files analyzed
    totalClasses: number;       // Total class definitions
    totalMethods: number;       // Total method definitions
    totalTestFiles?: number;    // Test files (if includeTests=true)
    totalTestMethods?: number;  // Test methods (if includeTests=true)
    
    classes: ClassInfo[];       // Detailed class information
    epicIntegrations: string[]; // Epic API integration points
    financialTouchpoints: string[]; // Financial system references
    databaseAccess: string[];   // Database access points
    apiEndpoints: string[];     // API endpoint definitions
    
    dependencies: {
      nuget: string[];          // NuGet package dependencies
      projects: string[];       // Project references
    };
    
    metrics: {
      avgComplexity: number;    // Average cyclomatic complexity
      maxComplexity: number;    // Maximum complexity found
      totalLines: number;       // Total lines including blanks
      codeLines: number;        // Lines of code
      commentLines: number;     // Comment lines
      blankLines: number;       // Blank lines
    };
  };
  cached: boolean;              // Result from cache?
  executionTime: number;        // Analysis time in ms
  timestamp: string;            // ISO 8601 timestamp
}

interface ClassInfo {
  name: string;                 // Class name
  namespace: string;            // Full namespace
  filePath: string;             // Absolute file path
  methods: MethodInfo[];        // Class methods
  properties: PropertyInfo[];   // Class properties
  dependencies: string[];       // Class dependencies
  implementsInterface?: string[]; // Implemented interfaces
  inheritsFrom?: string;        // Base class
  isAbstract?: boolean;         // Abstract class?
  isStatic?: boolean;           // Static class?
}

interface MethodInfo {
  name: string;                 // Method name
  parameters: string[];         // Parameter list
  returnType: string;           // Return type
  complexity: number;           // Cyclomatic complexity
  lineCount: number;            // Lines of code in method
  isPublic: boolean;            // Public visibility?
  isAsync: boolean;             // Async method?
  isTest?: boolean;             // Test method? (if includeTests=true)
  attributes?: string[];        // Method attributes
}

interface PropertyInfo {
  name: string;                 // Property name
  type: string;                 // Property type
  hasGetter: boolean;           // Has getter?
  hasSetter: boolean;           // Has setter?
  isPublic: boolean;            // Public visibility?
}
```

---

## Data Persistence

### Storage Locations

```
./data/code-analyzer/
├── cache/
│   ├── App1.json              # Cached analysis for App1
│   ├── App2.json              # Cached analysis for App2
│   └── cache-metadata.json    # Cache timestamps and stats
├── metrics/
│   └── analysis-metrics.json  # Historical analysis metrics
└── logs/
    └── analyzer.log           # Analysis execution logs
```

### What Gets Stored

1. **Cached Analysis Results** (`cache/*.json`)
   - Full analysis results per application
   - TTL-based expiration (default: 1 hour)
   - Automatically invalidated on config changes

2. **Metrics History** (`metrics/analysis-metrics.json`)
   - Analysis execution times
   - Cache hit/miss rates
   - File counts and complexity trends
   - Used for performance monitoring

3. **Execution Logs** (`logs/analyzer.log`)
   - Analysis start/end times
   - Errors and warnings
   - Performance metrics
   - Cache operations

### Cache Management

```bash
# View cache status
curl http://localhost:3001/cache/status

# Clear specific app cache
curl -X DELETE http://localhost:3001/cache/App1

# Clear all cache
curl -X DELETE http://localhost:3001/cache

# Manually manage via Docker
docker exec qe-code-analyzer rm -rf /app/data/cache/*
```

### Data Backup

```bash
# Backup analysis data
./manage-data.sh backup code-analyzer

# Restore from backup
./manage-data.sh restore code-analyzer
```

---

## Development

### Local Setup

```bash
# Navigate to MCP directory
cd mcps/code-analyzer

# Install dependencies
npm install

# Copy environment file
cp ../../.env.example .env

# Edit .env with your settings
vim .env

# Install Roslyn dependencies (if needed)
# This requires .NET SDK 8.0+
dotnet --version
```

### Project Structure

```
mcps/code-analyzer/
├── src/
│   ├── index.js                 # Entry point
│   ├── routes/
│   │   ├── analyzeRoutes.js     # Analysis endpoints
│   │   ├── cacheRoutes.js       # Cache management endpoints
│   │   └── healthRoutes.js      # Health check endpoints
│   ├── analyzers/
│   │   ├── roslynParser.js      # Roslyn AST parser
│   │   ├── metricsCalculator.js # Complexity metrics
│   │   └── fileScanner.js       # File discovery
│   ├── detectors/
│   │   ├── integrationDetector.js # Epic/Financial detection
│   │   ├── epicDetector.js      # Epic-specific patterns
│   │   ├── financialDetector.js # Financial system patterns
│   │   └── databaseDetector.js  # Database access patterns
│   ├── services/
│   │   ├── cacheManager.js      # Cache operations
│   │   └── analysisService.js   # Main analysis orchestration
│   └── utils/
│       ├── configReader.js      # apps.json reader
│       ├── logger.js            # Winston logger
│       └── validator.js         # Input validation
├── tests/
│   ├── unit/
│   │   ├── roslynParser.test.js
│   │   ├── integrationDetector.test.js
│   │   └── cacheManager.test.js
│   └── integration/
│       └── analyze.test.js
├── package.json
├── Dockerfile
└── README.md
```

### Running Locally

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# With debug logging
DEBUG=* npm run dev

# Run specific port
PORT=3001 npm start
```

### Debugging with VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Code Analyzer",
      "program": "${workspaceFolder}/mcps/code-analyzer/src/index.js",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3001",
        "DEBUG": "*"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Testing

### Unit Tests

```bash
cd mcps/code-analyzer
npm test
```

**Test Coverage:**
- Roslyn parser with various C# code patterns
- Integration detectors with known patterns
- Cache manager operations
- Configuration reader validation
- Metrics calculator accuracy

### Integration Tests

```bash
# Start services
cd ../..
./start.sh

# Run integration tests
cd mcps/code-analyzer
npm run test:integration
```

**Integration Tests Cover:**
- Full application analysis workflow
- Cache hit/miss scenarios
- Error handling for invalid apps
- Parallel analysis of multiple apps
- API endpoint responses

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test basic analysis
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'

# Test with invalid app
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"app": "InvalidApp"}'

# Test cache operations
curl http://localhost:3001/cache/status
curl -X DELETE http://localhost:3001/cache/App1
```

### Test Data

Create test applications in `tests/fixtures/`:

```
tests/fixtures/
├── SimpleApp/
│   ├── Services/
│   │   └── PatientService.cs
│   └── SimpleApp.csproj
└── ComplexApp/
    ├── Services/
    ├── Controllers/
    ├── Models/
    └── ComplexApp.csproj
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INVALID_APP` | 400 | App not found in apps.json | Verify app name in config/apps.json |
| `PATH_NOT_FOUND` | 404 | Application path doesn't exist | Check volume mounts in docker-compose.yml |
| `PARSE_ERROR` | 500 | Failed to parse C# file | Check for syntax errors in source code |
| `CACHE_ERROR` | 500 | Cache operation failed | Clear cache and retry |
| `CONFIG_ERROR` | 500 | Invalid configuration | Validate apps.json syntax |
| `TIMEOUT` | 504 | Analysis timeout | Increase timeout or reduce scope |
| `INSUFFICIENT_MEMORY` | 507 | Out of memory during analysis | Reduce concurrency or analyze smaller batches |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "PATH_NOT_FOUND",
    "message": "Application path not accessible",
    "details": {
      "app": "App1",
      "path": "/mnt/apps/app1",
      "suggestion": "Verify volume mount in docker-compose.yml: - ${APP1_PATH}:/mnt/apps/app1:ro"
    }
  },
  "timestamp": "2024-12-29T10:30:00Z"
}
```

### Error Handling Strategy

1. **Input Validation** - Validate all inputs before processing
2. **Graceful Degradation** - Return partial results if some files fail
3. **Detailed Errors** - Provide actionable error messages
4. **Logging** - Log all errors with context for debugging
5. **Retry Logic** - Automatic retry for transient errors (file locks, etc.)

---

## Troubleshooting

### Issue: Service won't start

**Symptoms:** Container exits immediately or won't start

**Possible Causes:**
- Missing node_modules
- Invalid apps.json syntax
- Port 3001 already in use

**Solution:**
```bash
# Check if port is available
lsof -i :3001

# Check Docker logs
docker compose logs code-analyzer

# Rebuild container
docker compose build code-analyzer
docker compose up -d code-analyzer

# Validate apps.json
cat config/apps.json | jq '.'
```

---

### Issue: Path not found errors

**Symptoms:** `PATH_NOT_FOUND` error in analysis

**Possible Causes:**
- Volume mount not configured
- Incorrect path in apps.json
- Application code not in expected location

**Solution:**
```bash
# Check volume mounts
docker inspect qe-code-analyzer | jq '.[0].Mounts'

# Verify path in apps.json matches volume mount
cat config/apps.json | jq '.applications[] | select(.name=="App1") | .path'

# Test path from inside container
docker exec qe-code-analyzer ls -la /mnt/apps/app1
```

---

### Issue: Slow analysis performance

**Symptoms:** Analysis takes >30 seconds for medium apps

**Possible Causes:**
- First-time analysis (no cache)
- Very large codebase
- Deep analysis mode enabled
- Insufficient resources

**Solution:**
```bash
# Enable caching
curl http://localhost:3001/cache/status

# Use shallow analysis for initial scan
curl -X POST http://localhost:3001/analyze \
  -d '{"app": "App1", "deep": false}'

# Check resource usage
docker stats qe-code-analyzer

# Increase Docker memory limit
# In docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 2G
```

---

### Issue: Missing integration points

**Symptoms:** Epic/Financial integrations not detected

**Possible Causes:**
- Non-standard naming conventions
- Integration code in excluded paths
- Custom integration patterns

**Solution:**
```bash
# Enable deep analysis
curl -X POST http://localhost:3001/analyze \
  -d '{"app": "App1", "deep": true}'

# Check excluded paths in apps.json
cat config/apps.json | jq '.applications[] | select(.name=="App1") | .excludePaths'

# Add custom integration patterns (feature request)
# Current patterns: Epic*, *Payment*, *Billing*, *Invoice*
```

---

### Issue: Cache not clearing

**Symptoms:** Stale results returned after code changes

**Possible Causes:**
- Long cache TTL
- Cache not being invalidated properly
- Manual code changes not triggering refresh

**Solution:**
```bash
# Force clear cache
curl -X DELETE http://localhost:3001/cache

# Force refresh on next analysis
curl -X POST http://localhost:3001/analyze \
  -d '{"app": "App1", "forceRefresh": true}'

# Reduce cache TTL in .env
CACHE_TTL=600  # 10 minutes instead of 1 hour

# Restart service to apply
docker compose restart code-analyzer
```

---

### Issue: Roslyn parsing errors

**Symptoms:** `PARSE_ERROR` for valid C# files

**Possible Causes:**
- Newer C# language features
- Roslyn version mismatch
- Invalid syntax in source code

**Solution:**
```bash
# Check Roslyn version
docker exec qe-code-analyzer dotnet --version

# View detailed error logs
docker compose logs code-analyzer | grep PARSE_ERROR

# Skip problematic files temporarily
# In apps.json, add to excludePaths:
"excludePaths": ["bin", "obj", "ProblematicFile.cs"]

# Update Roslyn wrapper
cd mcps/code-analyzer
npm update roslyn-wrapper
```

---

## Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:3001/health

# Expected healthy response
{
  "status": "healthy",
  "service": "code-analyzer",
  "uptime": 12345,
  "version": "1.0.0",
  "cache": {
    "enabled": true,
    "size": 5
  },
  "config": {
    "appsConfigured": 3
  }
}
```

### Metrics Tracked

Automatically tracked metrics:
- Analysis execution time per application
- Cache hit/miss rate
- Total files analyzed
- Total methods extracted
- Error rate by error code
- Memory usage during analysis
- CPU usage during analysis

### Performance Monitoring

```bash
# View analysis metrics
curl http://localhost:3001/cache/status | jq '.cache.stats'

# Check Docker stats
docker stats qe-code-analyzer

# View execution times in logs
docker compose logs code-analyzer | grep "executionTime"
```

### Logging

```bash
# View real-time logs
docker compose logs -f code-analyzer

# View last 100 lines
docker compose logs --tail=100 code-analyzer

# View error logs only
docker compose logs code-analyzer | grep ERROR

# Log format (JSON)
{
  "timestamp": "2024-12-29T10:30:00Z",
  "level": "info",
  "message": "Analysis completed",
  "metadata": {
    "app": "App1",
    "executionTime": 2345,
    "totalFiles": 145,
    "cached": false
  }
}
```

### Alerts (Recommended)

Set up monitoring alerts for:
- Analysis time > 60 seconds (may indicate performance issues)
- Error rate > 10% (may indicate config or code issues)
- Cache hit rate < 50% (may indicate cache issues)
- Memory usage > 1.5GB (may need resource adjustment)
- Service unhealthy > 5 minutes

---

## Integration

### Used By

**Orchestrator:** 
- `POST /api/analysis/code-scan` endpoint
- Workflow orchestration for multi-MCP analysis

**Coverage Analyzer:**
- Uses code analysis results to map test coverage

**Unit Test Generator:**
- Uses method extraction for generating test cases

**Risk Analyzer:**
- Uses complexity metrics for risk assessment

**Integration Mapper:**
- Uses Epic/Financial integration points for mapping

### Uses

**Configuration:**
- `config/apps.json` - Application definitions

**File System:**
- `/mnt/apps/*` - Read-only access to application code

**No External APIs:**
- Fully self-contained static analysis

### Workflow Integration Examples

**Workflow 1: Code Scan → Coverage Analysis**
```
1. code-analyzer: Extract all methods
2. coverage-analyzer: Check test coverage for methods
3. Return: List of untested methods
```

**Workflow 2: Code Scan → Test Generation**
```
1. code-analyzer: Extract methods needing tests
2. unit-test-generator: Generate xUnit tests
3. Return: Generated test code
```

**Workflow 3: Epic Integration Testing**
```
1. code-analyzer: Find all Epic integration points
2. integration-test-generator: Generate integration tests
3. playwright-generator: Generate UI tests for Epic workflows
4. Return: Complete test suite
```

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Roslyn-based AST parsing for C#
- ✅ Epic and financial integration detection
- ✅ Method extraction with complexity metrics
- ✅ Dependency graph generation
- ✅ Cache management with TTL
- ✅ Batch application analysis
- ✅ Comprehensive error handling
- ✅ Docker containerization
- ✅ Health monitoring

### v1.1.0 (Planned)
- 🚧 Support for additional .NET languages (F#, VB.NET)
- 🚧 Custom integration pattern configuration
- 🚧 Real-time analysis via file watchers
- 🚧 Incremental analysis (only changed files)
- 🚧 Visual Studio Code extension integration
- 🚧 Export to multiple formats (JSON, XML, CSV)
- 🚧 Advanced metrics (maintainability index, code smells)

---

**Need help?** Check the troubleshooting section or view logs with `docker compose logs -f code-analyzer`
