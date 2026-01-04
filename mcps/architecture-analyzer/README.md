# Architecture Analyzer - Application Architecture & Design Pattern Analysis

**Type:** Docker MCP (Always Running)  
**Port:** 3007  
**Container:** `qe-architecture-analyzer`  
**Location:** `mcps/architecture-analyzer/`  
**Technology:** Node.js 18 + Express + DotNetAnalyzer  
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

The **Architecture Analyzer** is a specialized MCP designed to perform comprehensive architectural analysis of .NET C# applications. It automatically identifies architectural layers (presentation, business, data, integration, infrastructure), detects design patterns (MVC, Repository, Dependency Injection, Service Layer), analyzes component dependencies, calculates maintainability metrics, and identifies technical debt. This MCP serves as an essential tool for understanding application structure, enforcing architectural standards, and guiding refactoring efforts.

The Architecture Analyzer goes beyond simple code scanning by understanding the semantic relationships between components. It recognizes controllers, services, repositories, and models, then maps how they interact to form architectural patterns. It identifies God classes, high-complexity methods, missing error handling, and other code smells that indicate technical debt. The analyzer calculates a maintainability score (0-100) with letter grades (A-D) to provide an at-a-glance assessment of code health.

This MCP is particularly valuable for greenfield analysis (understanding inherited codebases), architecture validation (ensuring patterns are followed correctly), refactoring planning (identifying which areas need improvement), and technical debt tracking (quantifying the cost of architectural shortcuts).

### Key Features

- ✅ **Automatic Layer Detection** - Identifies presentation, business, data, integration, and infrastructure layers without configuration
- ✅ **Design Pattern Recognition** - Detects MVC, Repository, Service Layer, Dependency Injection, and Integration Layer patterns
- ✅ **Dependency Analysis** - Maps dependencies between classes, including inheritance and namespace usage
- ✅ **Data Flow Mapping** - Traces how data flows from controllers through services to integrations
- ✅ **Maintainability Metrics** - Calculates maintainability score (0-100) based on complexity and lines of code
- ✅ **Technical Debt Identification** - Finds God classes, high-complexity methods, and missing error handling
- ✅ **Cost Estimation** - Estimates hours and dollar value to address identified technical debt
- ✅ **Agnostic Operation** - Works with any .NET application defined in apps.json without custom configuration
- ✅ **Layer Visualization Ready** - Provides structured data suitable for generating architecture diagrams
- ✅ **Confidence Scoring** - Rates pattern detection confidence (high/medium/low) based on evidence strength

### Use Cases

1. **Greenfield Code Analysis** - Quickly understand the architecture of inherited or unfamiliar codebases
2. **Architecture Validation** - Verify that applications follow intended architectural patterns (MVC, Clean Architecture, etc.)
3. **Refactoring Planning** - Identify God classes and high-complexity areas that need refactoring
4. **Technical Debt Quantification** - Calculate the cost (hours and dollars) of architectural shortcuts and code smells
5. **Code Review Support** - Provide architectural context during code reviews to ensure consistency
6. **Team Onboarding** - Generate architecture documentation automatically for new team members
7. **Compliance Checking** - Ensure applications follow organizational architectural standards
8. **Evolution Tracking** - Track how architecture changes over time (with historical comparison)

### What It Does NOT Do

- ❌ Does not enforce architectural rules (provides analysis, not enforcement)
- ❌ Does not modify code structure (read-only analysis)
- ❌ Does not generate architecture diagrams (provides data, diagram generation is separate)
- ❌ Does not analyze runtime behavior (static analysis only)
- ❌ Does not support non-.NET languages (focused on C#/.NET ecosystem)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Analyze architecture for application
curl -X POST http://localhost:3000/api/architecture/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Analyze with specific options
curl -X POST http://localhost:3000/api/architecture/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeDataFlow": true,
    "includeDependencies": true,
    "includePatterns": true
  }'
```

### Direct Access (Testing Only)

```bash
# Basic architecture analysis
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Full analysis with all options
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeDataFlow": true,
    "includeDependencies": true,
    "includePatterns": true
  }'

# Get list of analyzable applications
curl http://localhost:3007/applications

# Health check
curl http://localhost:3007/health
```

### Expected Output

```json
{
  "success": true,
  "app": "App1",
  "type": "dotnet",
  "framework": "net8.0",
  "timestamp": "2024-12-29T10:30:00Z",
  "architecture": {
    "layers": {
      "presentation": [
        {
          "name": "PatientController",
          "file": "Controllers/PatientController.cs",
          "methods": 8,
          "dependencies": ["ControllerBase"]
        },
        {
          "name": "AppointmentController",
          "file": "Controllers/AppointmentController.cs",
          "methods": 6,
          "dependencies": ["ControllerBase"]
        }
      ],
      "business": [
        {
          "name": "PatientService",
          "file": "Services/PatientService.cs",
          "methods": 12,
          "complexity": 4.5
        },
        {
          "name": "AppointmentService",
          "file": "Services/AppointmentService.cs",
          "methods": 10,
          "complexity": 3.8
        }
      ],
      "data": [
        {
          "name": "PatientRepository",
          "file": "Data/PatientRepository.cs",
          "methods": 8
        },
        {
          "name": "Patient",
          "file": "Models/Patient.cs",
          "properties": 15,
          "isEntity": true
        }
      ],
      "integration": [
        {
          "name": "EpicService",
          "file": "Integration/EpicService.cs",
          "externalSystem": "Epic",
          "methods": 15
        },
        {
          "name": "FinancialService",
          "file": "Integration/FinancialService.cs",
          "externalSystem": "Financial",
          "methods": 8
        }
      ],
      "infrastructure": []
    },
    "patterns": [
      {
        "name": "Model-View-Controller (MVC)",
        "confidence": "high",
        "evidence": [
          "2 controllers",
          "2 service classes",
          "2 models/repositories"
        ]
      },
      {
        "name": "Dependency Injection",
        "confidence": "high",
        "evidence": [
          "Interfaces found",
          "Constructor injection used"
        ]
      },
      {
        "name": "Repository Pattern",
        "confidence": "high",
        "evidence": [
          "1 repository classes"
        ]
      },
      {
        "name": "Service Layer",
        "confidence": "high",
        "evidence": [
          "2 service classes"
        ]
      },
      {
        "name": "Integration Layer",
        "confidence": "high",
        "evidence": [
          "2 integration services",
          "External systems: Epic, Financial"
        ]
      }
    ],
    "dependencies": [
      {
        "from": "PatientController",
        "to": "PatientPortal.Services",
        "type": "namespace",
        "file": "Controllers/PatientController.cs"
      },
      {
        "from": "PatientService",
        "to": "IPatientRepository",
        "type": "inheritance",
        "file": "Services/PatientService.cs"
      }
    ],
    "dataFlow": [
      {
        "from": "PatientController",
        "to": "PatientService",
        "layer": "presentation -> business",
        "type": "method_call"
      },
      {
        "from": "PatientService",
        "to": "EpicService",
        "layer": "business -> integration",
        "type": "external_call",
        "externalSystem": "Epic"
      }
    ],
    "metrics": {
      "totalClasses": 23,
      "totalMethods": 145,
      "averageComplexity": 4.2,
      "averageMethodsPerClass": 6.3,
      "maintainabilityScore": 72.5,
      "rating": "B"
    },
    "technicalDebt": {
      "items": [
        {
          "type": "God Class",
          "location": "PatientService in Services/PatientService.cs",
          "severity": "high",
          "description": "Class has 18 methods (recommended: < 15)",
          "estimatedHours": 4
        },
        {
          "type": "High Complexity",
          "location": "BillingService.ProcessPayment",
          "severity": "high",
          "description": "Method complexity: 16 (recommended: < 10)",
          "estimatedHours": 2
        },
        {
          "type": "Missing Error Handling",
          "location": "AppointmentService.Schedule",
          "severity": "medium",
          "description": "Public method lacks try-catch blocks",
          "estimatedHours": 1
        }
      ],
      "summary": {
        "totalItems": 23,
        "estimatedHours": 48,
        "estimatedValue": "$9,600"
      }
    },
    "summary": {
      "totalFiles": 145,
      "totalClasses": 23,
      "totalMethods": 145,
      "averageComplexity": 4.2,
      "maintainabilityScore": 72.5
    }
  }
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│           Architecture Analyzer (Port 3007)                      │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ DotNet       │──▶│ Layer          │         │
│  │ Router   │   │ Analyzer     │   │ Detection      │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      File Parsing        Pattern Detection           │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Pattern      │   │ Dependency   │   │ Technical    │      │
│  │ Detector     │   │ Analyzer     │   │ Debt Finder  │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Pattern Evidence    Dependency Graph    Debt Metrics
```

### Components

1. **Express Router** (`index.js`)
   - `POST /analyze-architecture` - Main architecture analysis endpoint
   - `GET /applications` - List analyzable applications
   - `GET /health` - Health check endpoint

2. **DotNetAnalyzer** (`shared/dotnet-analyzer.js`)
   - **Config Loader** - Loads app configuration from apps.json
   - **File Scanner** - Scans C# files in application directory
   - **Parser** - Parses C# files into AST (classes, methods, properties)
   - **Class Detector** - Identifies controllers, services, repositories, models

3. **Layer Analyzer** (`analyzeLayers()`)
   - **Presentation Layer** - Detects controllers (classes with "Controller" suffix)
   - **Business Layer** - Detects services (classes with "Service" suffix, excluding integrations)
   - **Data Layer** - Detects repositories and entity models
   - **Integration Layer** - Detects Epic and Financial integration services
   - **Infrastructure Layer** - Detects utility and helper classes

4. **Pattern Detector** (`detectPatterns()`)
   - **MVC Pattern** - Presence of controllers, services, and models
   - **Dependency Injection** - Interfaces and constructor injection
   - **Repository Pattern** - Classes with "Repository" suffix
   - **Service Layer** - Service classes handling business logic
   - **Integration Layer** - External system integration services

5. **Dependency Analyzer** (`analyzeDependencies()`)
   - **Namespace Dependencies** - Using statements (excluding System/Microsoft)
   - **Inheritance Dependencies** - Base classes and implemented interfaces
   - **Dependency Graph** - Maps from/to relationships between components

6. **Data Flow Analyzer** (`analyzeDataFlow()`)
   - **Controller → Service Flow** - Presentation to business layer
   - **Service → Integration Flow** - Business to external systems
   - **Flow Types** - method_call, external_call, data_access

7. **Metrics Calculator** (`calculateMetrics()`)
   - **Complexity Metrics** - Average cyclomatic complexity
   - **Class Metrics** - Methods per class
   - **Maintainability Index** - Score based on complexity and LOC
   - **Rating System** - A (80-100), B (60-79), C (40-59), D (0-39)

8. **Technical Debt Finder** (`identifyTechnicalDebt()`)
   - **God Class Detection** - Classes with > 15 methods
   - **High Complexity Detection** - Methods with complexity > 10
   - **Missing Error Handling** - Public methods without try-catch
   - **Cost Estimation** - Hours and dollar value ($200/hour)

### Dependencies

**Internal:**
- None (standalone analysis MCP)

**External Services:**
- File system access to application code (`/mnt/apps/*`)
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- dotnet-analyzer (shared) - C# parsing and analysis
- fs/promises - Async file operations
- Winston (planned) - Logging

### Data Flow

```
1. HTTP Request (POST /analyze-architecture)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name provided
   ├─▶ Validate analysis options
   └─▶ Load app configuration from apps.json
       │
       ▼
3. File Discovery
   ├─▶ Load app config (path, type, framework)
   ├─▶ Scan directory for C# files
   └─▶ Exclude test files, bin, obj directories
       │
       ▼
4. File Parsing
   ├─▶ Parse each C# file into AST
   ├─▶ Extract classes, methods, properties
   ├─▶ Identify class types (controller, service, repository, model)
   └─▶ Calculate method complexity
       │
       ▼
5. Layer Analysis
   ├─▶ Categorize classes into architectural layers
   ├─▶ Presentation: Controllers
   ├─▶ Business: Services (non-integration)
   ├─▶ Data: Repositories and models
   ├─▶ Integration: Epic/Financial services
   └─▶ Infrastructure: Utilities
       │
       ▼
6. Pattern Detection (if enabled)
   ├─▶ Check for MVC pattern (controllers + services + models)
   ├─▶ Check for Dependency Injection (interfaces + constructors)
   ├─▶ Check for Repository Pattern (repository classes)
   ├─▶ Check for Service Layer (service classes)
   └─▶ Check for Integration Layer (integration services)
       │
       ▼
7. Dependency Analysis (if enabled)
   ├─▶ Extract using statements
   ├─▶ Identify inheritance relationships
   ├─▶ Map namespace dependencies
   └─▶ Build dependency graph
       │
       ▼
8. Data Flow Analysis (if enabled)
   ├─▶ Map controller → service calls
   ├─▶ Map service → integration calls
   └─▶ Identify external system dependencies
       │
       ▼
9. Metrics Calculation
   ├─▶ Calculate average complexity
   ├─▶ Calculate methods per class
   ├─▶ Calculate maintainability index
   └─▶ Assign letter grade (A-D)
       │
       ▼
10. Technical Debt Identification
    ├─▶ Find God classes (> 15 methods)
    ├─▶ Find high-complexity methods (> 10)
    ├─▶ Find missing error handling
    ├─▶ Estimate remediation hours
    └─▶ Calculate dollar value ($200/hour)
        │
        ▼
11. Result Aggregation
    └─▶ Return JSON response with all analysis data
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3007 | Architecture analyzer HTTP port |
| `NODE_ENV` | ❌ No | production | Node environment (development\|production) |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |

### Configuration Files

#### `config/apps.json`

Applications must be defined here for architecture analysis:

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
      "excludePaths": [
        "bin",
        "obj",
        "packages",
        "node_modules"
      ]
    }
  ]
}
```

**Field Descriptions:**

- `type` - Must be "dotnet" for architecture analysis
- `framework` - .NET framework version (informational)
- `excludePaths` - Directories to skip during analysis

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
architecture-analyzer:
  build: ./mcps/architecture-analyzer
  container_name: qe-architecture-analyzer
  ports:
    - "3007:3007"
  environment:
    - NODE_ENV=production
    - PORT=3007
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/architecture-analyzer:/app/data   # Analysis results
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
    - ${APP2_PATH}:/mnt/apps/app2:ro
    - ${APP3_PATH}:/mnt/apps/app3:ro
  networks:
    - qe-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3007/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read application definitions
- `./data/architecture-analyzer` - Store analysis results
- `/mnt/apps/*` - Read-only access to application code

---

## API Reference

### Architecture Analysis Endpoints

#### POST /analyze-architecture

Analyze application architecture with layers, patterns, dependencies, and technical debt

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
  includeDataFlow?: boolean;      // Optional: Include data flow analysis (default: true)
  includeDependencies?: boolean;  // Optional: Include dependency analysis (default: true)
  includePatterns?: boolean;      // Optional: Include pattern detection (default: true)
}
```

**Response:**
```typescript
{
  success: boolean;
  app: string;
  type: string;                   // Application type (e.g., "dotnet")
  framework: string;              // Framework version (e.g., "net8.0")
  timestamp: string;
  architecture: {
    layers: ArchitectureLayers;
    patterns: Pattern[];
    dependencies: Dependency[];
    dataFlow: DataFlow[];
    metrics: Metrics;
    technicalDebt: TechnicalDebt;
    summary: Summary;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeDataFlow": true,
    "includeDependencies": true,
    "includePatterns": true
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "app": "App1",
  "type": "dotnet",
  "framework": "net8.0",
  "architecture": {
    "layers": {
      "presentation": [...],
      "business": [...],
      "data": [...],
      "integration": [...],
      "infrastructure": [...]
    },
    "patterns": [...],
    "metrics": {
      "maintainabilityScore": 72.5,
      "rating": "B"
    }
  }
}
```

---

#### GET /applications

Get list of all analyzable applications

**Response:**
```typescript
{
  success: boolean;
  applications: Array<{
    name: string;
    displayName: string;
    type: string;
    framework: string;
    canAnalyze: boolean;          // true if type === 'dotnet'
  }>;
}
```

**Example:**
```bash
curl http://localhost:3007/applications
```

**Success Response (200):**
```json
{
  "success": true,
  "applications": [
    {
      "name": "App1",
      "displayName": "Patient Portal",
      "type": "dotnet",
      "framework": "net8.0",
      "canAnalyze": true
    },
    {
      "name": "App2",
      "displayName": "Admin Portal",
      "type": "dotnet",
      "framework": "net8.0",
      "canAnalyze": true
    }
  ]
}
```

---

### Health Endpoints

#### GET /health

Service health check

**Response:**
```typescript
{
  status: string;                 // "healthy"
  service: string;                // "architecture-analyzer-mcp"
  timestamp: string;              // ISO 8601 timestamp
  version: string;                // "1.0.0"
}
```

**Example:**
```bash
curl http://localhost:3007/health
```

**Success Response (200):**
```json
{
  "status": "healthy",
  "service": "architecture-analyzer-mcp",
  "timestamp": "2024-12-29T10:30:00Z",
  "version": "1.0.0"
}
```

---

## Usage Examples

### Example 1: Basic Architecture Analysis

**Scenario:** Understand the architecture of an inherited codebase

```bash
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

**Response:**
```json
{
  "success": true,
  "architecture": {
    "layers": {
      "presentation": [
        {"name": "PatientController", "methods": 8}
      ],
      "business": [
        {"name": "PatientService", "methods": 12, "complexity": 4.5}
      ],
      "data": [
        {"name": "PatientRepository", "methods": 8}
      ]
    },
    "patterns": [
      {
        "name": "Model-View-Controller (MVC)",
        "confidence": "high",
        "evidence": ["2 controllers", "2 service classes"]
      }
    ]
  }
}
```

**Interpretation:** Application follows MVC pattern with clear separation of concerns

---

### Example 2: Finding Technical Debt

**Scenario:** Identify areas needing refactoring before major feature development

```bash
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }' | jq '.architecture.technicalDebt'
```

**Response:**
```json
{
  "items": [
    {
      "type": "God Class",
      "location": "PatientService in Services/PatientService.cs",
      "severity": "high",
      "description": "Class has 18 methods (recommended: < 15)",
      "estimatedHours": 4
    },
    {
      "type": "High Complexity",
      "location": "BillingService.ProcessPayment",
      "severity": "high",
      "description": "Method complexity: 16 (recommended: < 10)",
      "estimatedHours": 2
    }
  ],
  "summary": {
    "totalItems": 23,
    "estimatedHours": 48,
    "estimatedValue": "$9,600"
  }
}
```

**Action Plan:**
1. Refactor PatientService into smaller, focused services (4 hours)
2. Simplify BillingService.ProcessPayment method (2 hours)
3. Budget $9,600 for complete technical debt remediation

---

### Example 3: Validating Architectural Patterns

**Scenario:** Ensure new application follows company standards (MVC + Repository + Dependency Injection)

```bash
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "NewApp",
    "includePatterns": true
  }' | jq '.architecture.patterns'
```

**Response:**
```json
[
  {
    "name": "Model-View-Controller (MVC)",
    "confidence": "high",
    "evidence": ["5 controllers", "8 service classes", "12 models/repositories"]
  },
  {
    "name": "Dependency Injection",
    "confidence": "high",
    "evidence": ["Interfaces found", "Constructor injection used"]
  },
  {
    "name": "Repository Pattern",
    "confidence": "high",
    "evidence": ["5 repository classes"]
  }
]
```

**Validation Result:** ✅ Application follows all required patterns

---

### Example 4: Data Flow Analysis for Integration Testing

**Scenario:** Understand data flow to plan integration tests

```bash
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeDataFlow": true
  }' | jq '.architecture.dataFlow'
```

**Response:**
```json
[
  {
    "from": "PatientController",
    "to": "PatientService",
    "layer": "presentation -> business",
    "type": "method_call"
  },
  {
    "from": "PatientService",
    "to": "EpicService",
    "layer": "business -> integration",
    "type": "external_call",
    "externalSystem": "Epic"
  },
  {
    "from": "AppointmentService",
    "to": "FinancialService",
    "layer": "business -> integration",
    "type": "external_call",
    "externalSystem": "Financial"
  }
]
```

**Testing Plan:**
- Integration test: PatientController → PatientService → EpicService
- Integration test: AppointmentService → FinancialService
- Mock Epic and Financial systems for testing

---

### Example 5: Maintainability Assessment

**Scenario:** Assess overall code health before acquisition/handoff

```bash
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }' | jq '.architecture.metrics'
```

**Response:**
```json
{
  "totalClasses": 23,
  "totalMethods": 145,
  "averageComplexity": 4.2,
  "averageMethodsPerClass": 6.3,
  "maintainabilityScore": 72.5,
  "rating": "B"
}
```

**Assessment:**
- **Rating: B** - Good maintainability
- Average complexity of 4.2 is acceptable (< 10)
- 6.3 methods per class is healthy (< 15)
- Maintainability score of 72.5 indicates well-structured code
- Recommended for acquisition/handoff with minor refactoring

---

### Example 6: Detecting Missing Patterns

**Scenario:** Check if application is missing recommended patterns

```bash
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{
    "app": "LegacyApp",
    "includePatterns": true
  }' | jq '.architecture.patterns'
```

**Response:**
```json
[
  {
    "name": "Service Layer",
    "confidence": "high",
    "evidence": ["3 service classes"]
  }
]
```

**Analysis:**
- ❌ Missing: MVC pattern (no controllers found)
- ❌ Missing: Repository pattern (no repositories)
- ❌ Missing: Dependency Injection
- ✅ Present: Service Layer

**Recommendation:** Refactor to introduce MVC, Repository, and DI patterns

---

### Example 7: Comparing Applications

**Scenario:** Compare architecture between two similar applications

```bash
# Analyze App1
APP1=$(curl -s -X POST http://localhost:3007/analyze-architecture -d '{"app":"App1"}')

# Analyze App2
APP2=$(curl -s -X POST http://localhost:3007/analyze-architecture -d '{"app":"App2"}')

# Compare maintainability scores
echo "App1:" $(echo $APP1 | jq '.architecture.metrics.maintainabilityScore')
echo "App2:" $(echo $APP2 | jq '.architecture.metrics.maintainabilityScore')

# Compare technical debt
echo "App1 Debt:" $(echo $APP1 | jq '.architecture.technicalDebt.summary.estimatedHours')
echo "App2 Debt:" $(echo $APP2 | jq '.architecture.technicalDebt.summary.estimatedHours')
```

**Output:**
```
App1: 72.5
App2: 65.3
App1 Debt: 48 hours
App2 Debt: 78 hours
```

**Conclusion:** App1 has better maintainability and less technical debt than App2

---

## Input/Output Schemas

### Input Schema: Architecture Analysis Request

```typescript
interface ArchitectureAnalysisRequest {
  app: string;                    // Application name from apps.json
  includeDataFlow?: boolean;      // Include data flow analysis (default: true)
  includeDependencies?: boolean;  // Include dependency analysis (default: true)
  includePatterns?: boolean;      // Include pattern detection (default: true)
}
```

---

### Output Schema: Architecture Analysis Result

```typescript
interface ArchitectureAnalysisResult {
  success: boolean;
  app: string;
  type: string;                   // e.g., "dotnet"
  framework: string;              // e.g., "net8.0"
  timestamp: string;              // ISO 8601 timestamp
  architecture: {
    layers: ArchitectureLayers;
    patterns: Pattern[];
    dependencies: Dependency[];
    dataFlow: DataFlow[];
    metrics: Metrics;
    technicalDebt: TechnicalDebt;
    summary: Summary;
  };
}

interface ArchitectureLayers {
  presentation: PresentationComponent[];
  business: BusinessComponent[];
  data: DataComponent[];
  integration: IntegrationComponent[];
  infrastructure: InfrastructureComponent[];
}

interface PresentationComponent {
  name: string;                   // Controller name
  file: string;                   // File path
  methods: number;                // Number of action methods
  dependencies: string[];         // Base classes/interfaces
}

interface BusinessComponent {
  name: string;                   // Service name
  file: string;                   // File path
  methods: number;                // Number of methods
  complexity: number;             // Average method complexity
}

interface DataComponent {
  name: string;                   // Repository or model name
  file: string;                   // File path
  methods?: number;               // For repositories
  properties?: number;            // For models
  isEntity?: boolean;             // True if entity model
}

interface IntegrationComponent {
  name: string;                   // Integration service name
  file: string;                   // File path
  externalSystem: string;         // "Epic" | "Financial" | etc.
  methods: number;                // Number of integration methods
}

interface InfrastructureComponent {
  name: string;                   // Utility/helper name
  file: string;                   // File path
  methods: number;                // Number of methods
}

interface Pattern {
  name: string;                   // Pattern name
  confidence: "high" | "medium" | "low";
  evidence: string[];             // Evidence supporting detection
}

interface Dependency {
  from: string;                   // Source class
  to: string;                     // Target class/namespace
  type: "namespace" | "inheritance";
  file: string;                   // Source file
}

interface DataFlow {
  from: string;                   // Source component
  to: string;                     // Target component
  layer: string;                  // e.g., "presentation -> business"
  type: "method_call" | "external_call" | "data_access";
  externalSystem?: string;        // If type is "external_call"
}

interface Metrics {
  totalClasses: number;
  totalMethods: number;
  averageComplexity: number;      // Average cyclomatic complexity
  averageMethodsPerClass: number;
  maintainabilityScore: number;   // 0-100
  rating: "A" | "B" | "C" | "D";  // Letter grade
}

interface TechnicalDebt {
  items: TechnicalDebtItem[];     // Top 20 items
  summary: {
    totalItems: number;
    estimatedHours: number;
    estimatedValue: string;       // e.g., "$9,600"
  };
}

interface TechnicalDebtItem {
  type: "God Class" | "High Complexity" | "Missing Error Handling";
  location: string;               // Class or method location
  severity: "high" | "medium" | "low";
  description: string;            // Detailed description
  estimatedHours: number;         // Hours to fix
}

interface Summary {
  totalFiles: number;
  totalClasses: number;
  totalMethods: number;
  averageComplexity: number;
  maintainabilityScore: number;
}
```

---

### Input Schema: Applications List Request

```typescript
// No input parameters - GET request
```

---

### Output Schema: Applications List Result

```typescript
interface ApplicationsListResult {
  success: boolean;
  applications: Application[];
}

interface Application {
  name: string;
  displayName: string;
  type: string;
  framework: string;
  canAnalyze: boolean;            // true if type === 'dotnet'
}
```

---

## Data Persistence

### Storage Locations

```
./data/architecture-analyzer/
├── analyses/
│   ├── App1-architecture.json         # Latest analysis for App1
│   ├── App2-architecture.json         # Latest analysis for App2
│   └── analysis-metadata.json         # Analysis timestamps
├── reports/
│   ├── App1-maintainability-report.json
│   └── App2-maintainability-report.json
└── logs/
    └── architecture-analyzer.log      # Service logs
```

### What Gets Stored

1. **Architecture Analyses** (`analyses/*.json`)
   - Complete architecture analysis results
   - Latest analysis per application
   - No automatic expiration (manual cleanup)

2. **Maintainability Reports** (`reports/*.json`)
   - Trend data for maintainability scores
   - Historical metrics comparison
   - Used for tracking improvements over time

3. **Execution Logs** (`logs/architecture-analyzer.log`)
   - Analysis execution times
   - Errors and warnings
   - Performance metrics

### Cache Management

**Note:** Architecture Analyzer does not implement caching by default. Each request triggers fresh analysis.

**Rationale:** Architecture changes frequently during development, so cached results would quickly become stale.

**Future Enhancement:** Implement optional caching with:
- TTL of 1 hour
- Invalidation on code changes (git commit hash comparison)

### Data Backup

```bash
# Backup architecture data
./manage-data.sh backup architecture-analyzer

# Restore from backup
./manage-data.sh restore architecture-analyzer
```

---

## Development

### Local Setup

```bash
# Navigate to MCP directory
cd mcps/architecture-analyzer

# Install dependencies
npm install

# Copy environment file
cp ../../.env.example .env

# Edit .env if needed
vim .env
```

### Project Structure

```
mcps/architecture-analyzer/
├── src/
│   ├── index.js                     # Entry point and main logic
│   └── (shared via parent)
├── shared/
│   └── dotnet-analyzer.js           # Shared C# parsing logic
├── tests/
│   ├── unit/
│   │   ├── layerAnalyzer.test.js
│   │   ├── patternDetector.test.js
│   │   └── debtFinder.test.js
│   └── integration/
│       └── architecture-analysis.test.js
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
PORT=3007 npm start
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
      "name": "Debug Architecture Analyzer",
      "program": "${workspaceFolder}/mcps/architecture-analyzer/src/index.js",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3007",
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
cd mcps/architecture-analyzer
npm test
```

**Test Coverage:**
- Layer detection for all layer types
- Pattern detection with various code structures
- Dependency analysis accuracy
- Technical debt identification
- Metrics calculation correctness

### Integration Tests

```bash
# Start service
cd ../..
./start.sh

# Run integration tests
cd mcps/architecture-analyzer
npm run test:integration
```

**Integration Tests Cover:**
- Full architecture analysis workflow
- Pattern detection on real codebases
- Technical debt calculation
- API endpoint responses

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3007/health

# Test architecture analysis
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{"app": "App1"}'

# Test with invalid app
curl -X POST http://localhost:3007/analyze-architecture \
  -H "Content-Type: application/json" \
  -d '{"app": "InvalidApp"}'

# Test applications list
curl http://localhost:3007/applications
```

### Test Data

Create test applications in `tests/fixtures/`:

```
tests/fixtures/
├── SimpleApp/
│   ├── Controllers/
│   │   └── HomeController.cs
│   ├── Services/
│   │   └── HomeService.cs
│   └── Models/
│       └── Home.cs
└── ComplexApp/
    ├── Controllers/
    ├── Services/
    ├── Repositories/
    └── Models/
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INVALID_APP` | 400 | App name not provided | Include "app" in request body |
| `APP_NOT_FOUND` | 404 | App not found in apps.json | Verify app name in config/apps.json |
| `PATH_NOT_FOUND` | 404 | Application path doesn't exist | Check volume mounts in docker-compose.yml |
| `UNSUPPORTED_TYPE` | 400 | App type is not "dotnet" | Only .NET applications supported |
| `PARSE_ERROR` | 500 | Failed to parse C# file | Check for syntax errors in source code |
| `NO_FILES_FOUND` | 404 | No C# files in application | Verify application path is correct |
| `ANALYSIS_ERROR` | 500 | Analysis failed | Check logs for details |

### Error Response Format

```json
{
  "error": "Application name is required",
  "stack": "Error: Application name is required\n  at ..." // Only in development
}
```

### Error Handling Strategy

1. **Input Validation** - Validate all inputs before processing
2. **Graceful Failures** - Return partial results if some analysis fails
3. **Clear Messages** - Provide actionable error messages
4. **Logging** - Log all errors with context
5. **Stack Traces** - Include stack traces in development only

---

## Troubleshooting

### Issue: Service won't start

**Symptoms:** Container exits immediately or won't start

**Possible Causes:**
- Missing node_modules
- Invalid apps.json syntax
- Port 3007 already in use

**Solution:**
```bash
# Check if port is available
lsof -i :3007

# Check Docker logs
docker compose logs architecture-analyzer

# Rebuild container
docker compose build architecture-analyzer
docker compose up -d architecture-analyzer

# Validate apps.json
cat config/apps.json | jq '.'
```

---

### Issue: No layers detected

**Symptoms:** All layer arrays are empty in response

**Possible Causes:**
- Application path incorrect
- No C# files found
- Class naming doesn't follow conventions

**Solution:**
```bash
# Verify application path
docker exec qe-architecture-analyzer ls -la /mnt/apps/app1

# Check for C# files
docker exec qe-architecture-analyzer find /mnt/apps/app1 -name "*.cs" | head -10

# Verify class naming conventions
# Controllers should end with "Controller"
# Services should end with "Service"
# Repositories should end with "Repository"
```

---

### Issue: Patterns not detected

**Symptoms:** Patterns array is empty

**Possible Causes:**
- Application doesn't follow standard patterns
- Insufficient evidence for pattern detection
- Class naming doesn't match conventions

**Solution:**
```bash
# Check what layers were detected
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1"}' | jq '.architecture.layers'

# For MVC pattern, need:
# - At least 1 controller
# - At least 1 service
# - At least 1 model or repository

# Verify class names follow conventions:
# - Controllers: *Controller.cs
# - Services: *Service.cs
# - Repositories: *Repository.cs
```

---

### Issue: Maintainability score is 0 or unexpected

**Symptoms:** Maintainability score doesn't seem accurate

**Possible Causes:**
- No methods found
- Complexity calculation error
- Very high complexity or LOC

**Solution:**
```bash
# Check metrics breakdown
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1"}' | jq '.architecture.metrics'

# Verify methods are being counted
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1"}' | jq '.architecture.summary.totalMethods'

# Check average complexity
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1"}' | jq '.architecture.metrics.averageComplexity'
```

---

### Issue: Technical debt items not found

**Symptoms:** Technical debt items array is empty

**Possible Causes:**
- Code is very clean (no God classes, low complexity)
- Detection thresholds not met
- Parsing issues

**Solution:**
```bash
# Check thresholds:
# - God Class: > 15 methods
# - High Complexity: > 10
# - Missing Error Handling: public methods without try-catch

# Verify methods per class
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1"}' | jq '.architecture.layers.business[] | {name, methods}'

# Check method complexity
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1"}' | jq '.architecture.layers.business[] | {name, complexity}'
```

---

### Issue: Data flow analysis incomplete

**Symptoms:** Data flow array is empty or missing expected flows

**Possible Causes:**
- Layers not properly detected
- Naming conventions not followed
- Limited code patterns

**Solution:**
```bash
# Ensure layers are detected first
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1", "includeDataFlow": true}' | jq '.architecture.layers'

# Data flow requires:
# - Controllers in presentation layer
# - Services in business layer
# - Integration services in integration layer

# Verify controllers exist
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1"}' | jq '.architecture.layers.presentation | length'
```

---

### Issue: Integration layer not detected

**Symptoms:** Integration layer is empty despite Epic/Financial services existing

**Possible Causes:**
- Service names don't contain "Epic" or "Financial"
- Services not properly classified

**Solution:**
```bash
# Check business layer for integration services
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{"app": "App1"}' | jq '.architecture.layers.business'

# Integration services must have "Epic" or "Financial" in the name
# Examples:
# - EpicService ✓
# - EpicIntegrationService ✓
# - FinancialService ✓
# - BillingService ✗ (use "FinancialBillingService")
```

---

### Issue: Performance - analysis takes too long

**Symptoms:** Analysis takes >30 seconds

**Possible Causes:**
- Very large codebase
- Many files to parse
- Complex analysis

**Solution:**
```bash
# Check file count
docker exec qe-architecture-analyzer \
  find /mnt/apps/app1 -name "*.cs" | wc -l

# Disable optional analyses for faster results
curl -X POST http://localhost:3007/analyze-architecture \
  -d '{
    "app": "App1",
    "includeDataFlow": false,
    "includeDependencies": false
  }'

# Check resource usage
docker stats qe-architecture-analyzer

# Increase resources if needed (docker-compose.yml)
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
```

---

## Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:3007/health

# Expected healthy response
{
  "status": "healthy",
  "service": "architecture-analyzer-mcp",
  "timestamp": "2024-12-29T10:30:00Z",
  "version": "1.0.0"
}
```

### Metrics Tracked

Automatically tracked metrics:
- Analysis execution time per application
- Total files analyzed
- Total classes analyzed
- Average maintainability score across applications
- Technical debt hours across applications
- Error rate by error type

### Performance Monitoring

```bash
# View analysis times from logs
docker compose logs architecture-analyzer | grep "Analyzing"

# Check Docker stats
docker stats qe-architecture-analyzer

# Monitor file count vs execution time
curl -X POST http://localhost:3007/analyze-architecture -d '{"app":"App1"}' -w "\nTime: %{time_total}s\n"
```

### Logging

```bash
# View real-time logs
docker compose logs -f architecture-analyzer

# View last 100 lines
docker compose logs --tail=100 architecture-analyzer

# View error logs only
docker compose logs architecture-analyzer | grep ERROR

# View analysis completions
docker compose logs architecture-analyzer | grep "Analyzing"

# Log format (Console)
[Architecture Analyzer] Analyzing App1...
[Architecture Analyzer] Found app at /mnt/apps/patient-portal
[Architecture Analyzer] Found 145 C# files
```

### Alerts (Recommended)

Set up monitoring alerts for:
- Analysis time > 60 seconds (performance issue)
- Maintainability score < 40 (code health concern)
- Technical debt > 100 hours (significant debt accumulation)
- Error rate > 10% (service degradation)
- Service unhealthy > 5 minutes

---

## Integration

### Used By

**Orchestrator:**
- `POST /api/architecture/analyze` endpoint
- Architecture documentation workflows
- Technical debt tracking workflows

**Integration Mapper:**
- Uses architecture layer data for integration context

**Risk Analyzer:**
- Uses maintainability metrics for risk assessment

**Documentation Generator:**
- Uses architecture data for technical documentation

### Uses

**DotNetAnalyzer (Shared):**
- Shared C# parsing and analysis logic
- Used by multiple MCPs (code-analyzer, coverage-analyzer, etc.)

**File System:**
- Reads C# files from `/mnt/apps/*`

**Configuration:**
- Reads `config/apps.json` for application definitions

**No External APIs:**
- Fully self-contained static analysis

### Workflow Integration Examples

**Workflow 1: Architecture Documentation**
```
1. architecture-analyzer: Analyze application structure
2. documentation-generator: Generate architecture diagrams
3. Return: Architecture documentation
```

**Workflow 2: Technical Debt Sprint Planning**
```
1. architecture-analyzer: Identify technical debt
2. risk-analyzer: Calculate risk scores for debt items
3. Return: Prioritized refactoring backlog
```

**Workflow 3: Code Review Architecture Validation**
```
1. architecture-analyzer: Analyze current architecture
2. Compare with previous analysis
3. Flag architectural violations
4. Return: Architecture review report
```

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Automatic layer detection (presentation, business, data, integration, infrastructure)
- ✅ Design pattern recognition (MVC, Repository, DI, Service Layer, Integration Layer)
- ✅ Dependency analysis (namespace and inheritance)
- ✅ Data flow mapping (controller → service → integration)
- ✅ Maintainability metrics with letter grades (A-D)
- ✅ Technical debt identification (God classes, high complexity, missing error handling)
- ✅ Cost estimation ($200/hour standard rate)
- ✅ Docker containerization
- ✅ Health monitoring
- ✅ Comprehensive error handling

### v1.1.0 (Planned)
- 🚧 Historical comparison (track architecture changes over time)
- 🚧 Mermaid diagram generation (automatic architecture diagrams)
- 🚧 Custom pattern definitions (configure application-specific patterns)
- 🚧 Architecture rules enforcement (fail CI/CD if rules violated)
- 🚧 Multi-language support (Java, Python, TypeScript)
- 🚧 Caching with smart invalidation
- 🚧 Configurable thresholds (God class, complexity, debt)
- 🚧 Export to multiple formats (JSON, XML, CSV, HTML reports)

---

**Need help?** Check the troubleshooting section or view logs with `docker compose logs -f architecture-analyzer`
