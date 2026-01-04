# Integration Mapper - API Integration Discovery & Mapping

**Type:** Docker MCP (Always Running)  
**Port:** 3008  
**Container:** `qe-integration-mapper`  
**Location:** `mcps/integration-mapper/`  
**Technology:** Node.js 18 + Express + Static Code Analysis  
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

The **Integration Mapper** is a specialized MCP designed to automatically discover, analyze, and map all external API integrations within .NET C# applications. It identifies Epic EMR integrations, financial system touchpoints (Stripe, PayPal), third-party services (Twilio, SendGrid), internal microservice calls, database connections, and message queue interactions. The service creates comprehensive integration diagrams showing data flow, documents API endpoints with request/response schemas, identifies authentication requirements, and highlights integration risks requiring thorough testing.

This MCP serves as the essential bridge between code analysis and integration testing by understanding not just what integrations exist, but how they're used, what data they exchange, where they're called from, and what business processes depend on them. It provides the critical context needed for integration test planning, API mocking strategies, and understanding the application's external dependencies.

The Integration Mapper is essential for greenfield analysis (understanding inherited system integrations), test planning (identifying integration points requiring mocks), security audits (cataloging all external data flows), and architecture documentation (generating integration architecture diagrams).

### Key Features

- ✅ **Automatic Integration Discovery** - Scans code to find all Epic, financial, and third-party service integrations
- ✅ **API Endpoint Mapping** - Documents REST APIs, SOAP services, and RPC calls with full details
- ✅ **Data Flow Visualization** - Maps how data flows between application and external systems
- ✅ **Authentication Detection** - Identifies OAuth, API keys, certificates, and other auth methods
- ✅ **Request/Response Schema** - Extracts data models for API requests and responses
- ✅ **Integration Categorization** - Groups integrations by type (Epic, financial, messaging, etc.)
- ✅ **Dependency Analysis** - Shows which application features depend on which integrations
- ✅ **Risk Assessment** - Flags high-risk integrations requiring comprehensive testing
- ✅ **Mock Strategy Recommendations** - Suggests mocking approaches for testing
- ✅ **Integration Diagram Generation** - Creates visual integration architecture diagrams

### Use Cases

1. **Integration Test Planning** - Identify all integration points requiring integration tests
2. **API Mocking Strategy** - Determine which APIs need mocking for unit/integration tests
3. **Security Audit** - Catalog all external data flows for security review
4. **Architecture Documentation** - Generate integration architecture diagrams
5. **Onboarding** - Help new developers understand system dependencies
6. **Integration Risk Analysis** - Identify high-risk integrations for testing prioritization
7. **Vendor Management** - Track all third-party service dependencies
8. **Compliance** - Document data flows for HIPAA, PCI-DSS compliance

### What It Does NOT Do

- ❌ Does not test integrations (delegates to integration test frameworks)
- ❌ Does not generate API mocks (delegates to mock generators)
- ❌ Does not monitor live API traffic (static analysis only)
- ❌ Does not modify integration code (read-only analysis)
- ❌ Does not validate API responses (analysis only)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Map all integrations for application
curl -X POST http://localhost:3000/api/analysis/map-integrations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get Epic integrations only
curl -X POST http://localhost:3000/api/analysis/map-integrations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "integrationType": "epic"
  }'

# Get integration diagram
curl -X POST http://localhost:3000/api/analysis/integration-diagram \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "format": "mermaid"
  }'
```

### Direct Access (Testing Only)

```bash
# Map all integrations
curl -X POST http://localhost:3008/map-integrations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get specific integration type
curl -X POST http://localhost:3008/map-integrations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "integrationType": "financial"
  }'

# Analyze single integration
curl -X POST http://localhost:3008/analyze-integration \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "integrationName": "EpicService"
  }'

# Generate integration diagram
curl -X POST http://localhost:3008/generate-diagram \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "format": "mermaid"
  }'

# Get mock recommendations
curl -X POST http://localhost:3008/mock-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Health check
curl http://localhost:3008/health
```

### Expected Output

```json
{
  "success": true,
  "app": "App1",
  "integrations": {
    "epic": [
      {
        "name": "EpicService",
        "type": "Epic EMR",
        "category": "Healthcare",
        "file": "Services/Integration/EpicService.cs",
        "endpoints": [
          {
            "method": "SearchPatients",
            "httpMethod": "POST",
            "url": "https://epic.hospital.com/api/fhir/Patient/_search",
            "authentication": "OAuth2",
            "requestSchema": {
              "name": "string",
              "birthdate": "date",
              "identifier": "string"
            },
            "responseSchema": {
              "total": "number",
              "entry": "Patient[]"
            },
            "usedBy": [
              "PatientController.SearchPatients",
              "PatientService.FindPatient"
            ],
            "frequency": "very-high",
            "riskLevel": "critical"
          },
          {
            "method": "GetPatientChart",
            "httpMethod": "GET",
            "url": "https://epic.hospital.com/api/fhir/Patient/{id}",
            "authentication": "OAuth2",
            "requestSchema": {
              "patientId": "string"
            },
            "responseSchema": {
              "resourceType": "Patient",
              "id": "string",
              "name": "HumanName[]",
              "birthDate": "date"
            },
            "usedBy": [
              "ChartController.GetChart",
              "PatientService.GetChart"
            ],
            "frequency": "very-high",
            "riskLevel": "critical"
          },
          {
            "method": "CreateAppointment",
            "httpMethod": "POST",
            "url": "https://epic.hospital.com/api/fhir/Appointment",
            "authentication": "OAuth2",
            "requestSchema": {
              "patient": "Reference",
              "practitioner": "Reference",
              "start": "dateTime",
              "end": "dateTime"
            },
            "responseSchema": {
              "id": "string",
              "status": "string"
            },
            "usedBy": [
              "AppointmentController.Schedule",
              "AppointmentService.CreateAppointment"
            ],
            "frequency": "high",
            "riskLevel": "high"
          }
        ],
        "dataFlow": {
          "inbound": [
            "Patient demographics",
            "Appointment availability",
            "Clinical data"
          ],
          "outbound": [
            "Appointment requests",
            "Patient search queries"
          ]
        },
        "authentication": {
          "type": "OAuth2",
          "tokenEndpoint": "https://epic.hospital.com/oauth2/token",
          "scopes": ["patient.read", "appointment.write"],
          "credentialLocation": "appsettings.json (Epic:ClientId, Epic:ClientSecret)"
        },
        "errorHandling": {
          "hasRetry": true,
          "hasCircuitBreaker": false,
          "hasTimeout": true,
          "timeoutMs": 30000
        },
        "riskAssessment": {
          "level": "critical",
          "reasons": [
            "Core clinical workflow dependency",
            "Contains PHI (Protected Health Information)",
            "Single point of failure for patient access",
            "No fallback mechanism identified"
          ]
        },
        "testingRecommendations": [
          "Mock Epic API for unit tests",
          "Create Epic sandbox environment for integration tests",
          "Test OAuth token refresh flow",
          "Test Epic API unavailability scenarios",
          "Validate FHIR response parsing"
        ]
      }
    ],
    "financial": [
      {
        "name": "StripeService",
        "type": "Payment Processing",
        "category": "Financial",
        "file": "Services/Payment/StripeService.cs",
        "endpoints": [
          {
            "method": "ProcessPayment",
            "httpMethod": "POST",
            "url": "https://api.stripe.com/v1/charges",
            "authentication": "ApiKey",
            "requestSchema": {
              "amount": "number",
              "currency": "string",
              "source": "string",
              "description": "string"
            },
            "responseSchema": {
              "id": "string",
              "amount": "number",
              "status": "string",
              "paid": "boolean"
            },
            "usedBy": [
              "BillingController.ProcessPayment",
              "PaymentService.ChargeCard"
            ],
            "frequency": "medium",
            "riskLevel": "critical"
          },
          {
            "method": "CreateRefund",
            "httpMethod": "POST",
            "url": "https://api.stripe.com/v1/refunds",
            "authentication": "ApiKey",
            "requestSchema": {
              "charge": "string",
              "amount": "number",
              "reason": "string"
            },
            "responseSchema": {
              "id": "string",
              "status": "string",
              "amount": "number"
            },
            "usedBy": [
              "BillingController.ProcessRefund"
            ],
            "frequency": "low",
            "riskLevel": "high"
          }
        ],
        "dataFlow": {
          "inbound": [
            "Payment confirmation",
            "Refund status"
          ],
          "outbound": [
            "Credit card tokens",
            "Payment amounts",
            "Customer information"
          ]
        },
        "authentication": {
          "type": "ApiKey",
          "headerName": "Authorization",
          "format": "Bearer {api_key}",
          "credentialLocation": "Azure Key Vault (Stripe:SecretKey)"
        },
        "errorHandling": {
          "hasRetry": true,
          "hasCircuitBreaker": true,
          "hasTimeout": true,
          "timeoutMs": 15000
        },
        "riskAssessment": {
          "level": "critical",
          "reasons": [
            "Financial transaction processing",
            "PCI-DSS compliance required",
            "Revenue impact if unavailable",
            "Fraud risk if not properly secured"
          ]
        },
        "testingRecommendations": [
          "Use Stripe test API keys for all non-production environments",
          "Test card decline scenarios",
          "Test refund flow",
          "Validate webhook signature verification",
          "Test idempotency for duplicate charges"
        ]
      }
    ],
    "messaging": [
      {
        "name": "TwilioService",
        "type": "SMS",
        "category": "Messaging",
        "file": "Services/Notification/TwilioService.cs",
        "endpoints": [
          {
            "method": "SendSMS",
            "httpMethod": "POST",
            "url": "https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json",
            "authentication": "BasicAuth",
            "requestSchema": {
              "To": "string",
              "From": "string",
              "Body": "string"
            },
            "responseSchema": {
              "sid": "string",
              "status": "string",
              "error_code": "number"
            },
            "usedBy": [
              "NotificationService.SendAppointmentReminder"
            ],
            "frequency": "high",
            "riskLevel": "medium"
          }
        ],
        "dataFlow": {
          "inbound": [
            "Delivery status",
            "Error messages"
          ],
          "outbound": [
            "Patient phone numbers",
            "Appointment reminders",
            "Notification messages"
          ]
        },
        "authentication": {
          "type": "BasicAuth",
          "credentialLocation": "appsettings.json (Twilio:AccountSid, Twilio:AuthToken)"
        },
        "riskAssessment": {
          "level": "medium",
          "reasons": [
            "Contains PHI in SMS messages",
            "Patient communication channel",
            "No critical functionality blocked if unavailable"
          ]
        }
      }
    ],
    "database": [
      {
        "name": "ApplicationDbContext",
        "type": "SQL Database",
        "category": "Database",
        "file": "Data/ApplicationDbContext.cs",
        "connectionString": "Server=sql.hospital.com;Database=PatientPortal;",
        "entities": [
          "Patient",
          "Appointment",
          "Provider",
          "User"
        ],
        "riskLevel": "critical"
      }
    ]
  },
  "summary": {
    "totalIntegrations": 5,
    "byCategory": {
      "epic": 1,
      "financial": 1,
      "messaging": 1,
      "database": 1,
      "other": 1
    },
    "byRisk": {
      "critical": 3,
      "high": 1,
      "medium": 1,
      "low": 0
    },
    "totalEndpoints": 8,
    "authenticationTypes": ["OAuth2", "ApiKey", "BasicAuth"],
    "externalDependencies": 4
  },
  "recommendations": [
    "PRIORITY 1: Create integration tests for Epic API (critical risk, 3 endpoints)",
    "PRIORITY 2: Create integration tests for Stripe API (critical risk, financial)",
    "PRIORITY 3: Set up API mocking for all Epic endpoints in unit tests",
    "Consider implementing circuit breaker for Epic API calls",
    "Add integration health checks to monitoring dashboard",
    "Document API rate limits and implement rate limiting"
  ],
  "diagram": {
    "mermaid": "graph TD\n  App[Patient Portal] --> Epic[Epic EMR API]\n  App --> Stripe[Stripe Payment API]\n  App --> Twilio[Twilio SMS API]\n  App --> DB[(SQL Database)]\n  \n  Epic -.->|OAuth2| App\n  Stripe -.->|API Key| App\n  Twilio -.->|Basic Auth| App"
  },
  "cached": false,
  "executionTime": 2340,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│           Integration Mapper (Port 3008)                         │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Code         │──▶│ Integration    │         │
│  │ Router   │   │ Scanner      │   │ Detector       │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      File Scanning        Pattern Matching           │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Endpoint     │   │ Schema       │   │ Diagram      │      │
│  │ Extractor    │   │ Analyzer     │   │ Generator    │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   API Endpoints       Data Schemas        Mermaid Diagrams
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /map-integrations` - Map all integrations
   - `POST /analyze-integration` - Analyze single integration
   - `POST /generate-diagram` - Generate integration diagram
   - `POST /mock-recommendations` - Get mocking recommendations
   - `GET /health` - Health check endpoint

2. **Code Scanner** (`src/scanners/codeScanner.js`)
   - **File Discovery** - Finds service and integration files
   - **Pattern Matching** - Identifies integration service patterns
   - **Import Analyzer** - Tracks SDK and library imports
   - **HTTP Client Detector** - Finds HttpClient usage

3. **Integration Detector** (`src/detectors/integrationDetector.js`)
   - **Epic Detector** - Identifies Epic FHIR API calls
   - **Financial Detector** - Finds Stripe, PayPal, payment gateways
   - **Messaging Detector** - Identifies Twilio, SendGrid, etc.
   - **Database Detector** - Finds Entity Framework contexts
   - **Generic API Detector** - Detects other REST/SOAP APIs

4. **Endpoint Extractor** (`src/extractors/endpointExtractor.js`)
   - **HTTP Method Parser** - Extracts GET, POST, PUT, DELETE
   - **URL Builder** - Reconstructs full API URLs
   - **Parameter Extractor** - Identifies query params, headers, body
   - **Response Parser** - Extracts expected response structure

5. **Schema Analyzer** (`src/analyzers/schemaAnalyzer.js`)
   - **Request Schema Builder** - Builds request object schemas
   - **Response Schema Builder** - Builds response object schemas
   - **Data Type Mapper** - Maps C# types to schema types
   - **Nested Object Handler** - Handles complex nested structures

6. **Authentication Analyzer** (`src/analyzers/authAnalyzer.js`)
   - **OAuth Detector** - Identifies OAuth2 flows
   - **API Key Detector** - Finds API key authentication
   - **Certificate Detector** - Identifies certificate auth
   - **Basic Auth Detector** - Finds basic authentication

7. **Diagram Generator** (`src/generators/diagramGenerator.js`)
   - **Mermaid Builder** - Creates Mermaid diagram syntax
   - **PlantUML Builder** - Creates PlantUML diagrams
   - **Data Flow Mapper** - Maps data flow between systems
   - **Layout Optimizer** - Optimizes diagram layout

### Dependencies

**Internal:**
- code-analyzer (3001) - For code structure analysis
- architecture-analyzer (3007) - For architecture context

**External Services:**
- File system access to application code (`/mnt/apps/*`)
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- acorn - JavaScript/TypeScript parsing
- @babel/parser - Alternative parser
- glob - File pattern matching
- mermaid (for diagram generation)
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /map-integrations)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name
   └─▶ Load app configuration
       │
       ▼
3. File Discovery
   ├─▶ Scan for service files (*Service.cs)
   ├─▶ Scan for integration files (*/Integration/*.cs)
   ├─▶ Scan for HttpClient usage
   └─▶ Scan for SDK imports (Stripe, Twilio, etc.)
       │
       ▼
4. Integration Detection
   ├─▶ Parse each service file
   ├─▶ Identify integration patterns
   ├─▶ Categorize by type (Epic, financial, etc.)
   └─▶ Extract integration metadata
       │
       ▼
5. Endpoint Extraction
   ├─▶ Find HTTP method calls
   ├─▶ Extract URLs and parameters
   ├─▶ Identify request/response objects
   └─▶ Map to source code locations
       │
       ▼
6. Schema Analysis
   ├─▶ Parse request object structures
   ├─▶ Parse response object structures
   ├─▶ Build JSON schemas
   └─▶ Document data types
       │
       ▼
7. Authentication Analysis
   ├─▶ Identify auth headers
   ├─▶ Find credential storage locations
   ├─▶ Determine auth type
   └─▶ Document auth flow
       │
       ▼
8. Data Flow Mapping
   ├─▶ Track data from controllers to services
   ├─▶ Map service to external API calls
   ├─▶ Identify inbound/outbound data
   └─▶ Build flow diagram
       │
       ▼
9. Risk Assessment
   ├─▶ Calculate risk level per integration
   ├─▶ Consider data sensitivity
   ├─▶ Evaluate business impact
   └─▶ Generate risk reasons
       │
       ▼
10. Recommendations
    ├─▶ Generate testing recommendations
    ├─▶ Suggest mocking strategies
    ├─▶ Identify gaps in error handling
    └─▶ Prioritize integration work
        │
        ▼
11. Diagram Generation
    ├─▶ Build Mermaid syntax
    ├─▶ Add authentication indicators
    ├─▶ Show data flow directions
    └─▶ Format for readability
        │
        ▼
12. Response
    └─▶ Return JSON with integrations, diagram, recommendations
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3008 | Integration mapper HTTP port |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `CODE_ANALYZER_URL` | ❌ No | http://code-analyzer:3001 | Code analyzer service URL |

### Configuration Files

#### `config/apps.json`

Applications must be defined here:

```json
{
  "applications": [
    {
      "name": "App1",
      "displayName": "Patient Portal",
      "path": "/mnt/apps/patient-portal",
      "type": "dotnet",
      "framework": "net8.0",
      "knownIntegrations": [
        {
          "name": "Epic",
          "type": "epic",
          "baseUrl": "https://epic.hospital.com/api"
        },
        {
          "name": "Stripe",
          "type": "financial",
          "baseUrl": "https://api.stripe.com"
        }
      ]
    }
  ]
}
```

**Field Descriptions:**

- `knownIntegrations` - Known integrations to help detection

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
integration-mapper:
  build: ./mcps/integration-mapper
  container_name: qe-integration-mapper
  ports:
    - "3008:3008"
  environment:
    - NODE_ENV=production
    - PORT=3008
    - CODE_ANALYZER_URL=http://code-analyzer:3001
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/integration-mapper:/app/data   # Integration maps
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
    - ${APP2_PATH}:/mnt/apps/app2:ro
    - ${APP3_PATH}:/mnt/apps/app3:ro
  networks:
    - qe-network
  restart: unless-stopped
  depends_on:
    - code-analyzer
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3008/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Volume Mounts:**
- `./config` - Read application definitions
- `./data/integration-mapper` - Store integration maps
- `/mnt/apps/*` - Read-only access to application code

---

## API Reference

### Integration Mapping Endpoints

#### POST /map-integrations

Map all integrations for an application

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
  integrationType?: "epic" | "financial" | "messaging" | "database" | "all";  // Optional
  includeSchemas?: boolean;       // Optional: Include request/response schemas (default: true)
  includeDiagram?: boolean;       // Optional: Include integration diagram (default: true)
}
```

**Response:**
```typescript
{
  success: boolean;
  app: string;
  integrations: {
    epic?: Integration[];
    financial?: Integration[];
    messaging?: Integration[];
    database?: Integration[];
    other?: Integration[];
  };
  summary: Summary;
  recommendations: string[];
  diagram?: {
    mermaid: string;
    plantuml?: string;
  };
  cached: boolean;
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3008/map-integrations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "includeSchemas": true,
    "includeDiagram": true
  }'
```

---

#### POST /analyze-integration

Analyze single integration in detail

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  integrationName: string;        // Required: Integration service name
}
```

**Response:**
```typescript
{
  success: boolean;
  integration: Integration;
  usageAnalysis: {
    callLocations: string[];
    callFrequency: string;
    criticalPaths: string[];
  };
  testingGaps: string[];
  recommendations: string[];
}
```

**Example:**
```bash
curl -X POST http://localhost:3008/analyze-integration \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "integrationName": "EpicService"
  }'
```

---

#### POST /generate-diagram

Generate integration architecture diagram

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  format?: "mermaid" | "plantuml" | "both";  // Optional: Diagram format
  includeAuthentication?: boolean;  // Optional: Show auth details
  includeDataFlow?: boolean;      // Optional: Show data flow
}
```

**Response:**
```typescript
{
  success: boolean;
  diagram: {
    mermaid?: string;
    plantuml?: string;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3008/generate-diagram \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "format": "mermaid",
    "includeAuthentication": true,
    "includeDataFlow": true
  }'
```

---

#### POST /mock-recommendations

Get API mocking recommendations

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  testType?: "unit" | "integration" | "e2e";  // Optional: Test type
}
```

**Response:**
```typescript
{
  success: boolean;
  recommendations: Array<{
    integration: string;
    mockingStrategy: string;
    tools: string[];
    priority: string;
    reason: string;
  }>;
}
```

**Example:**
```bash
curl -X POST http://localhost:3008/mock-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testType": "unit"
  }'
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
  dependencies: {
    codeAnalyzer: "healthy" | "unhealthy";
  };
  timestamp: string;
}
```

**Example:**
```bash
curl http://localhost:3008/health
```

---

## Usage Examples

### Example 1: Map All Integrations

**Scenario:** New project - need to understand all external dependencies

```bash
curl -X POST http://localhost:3008/map-integrations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

**Action:** Review all integrations and plan testing strategy

---

### Example 2: Focus on Epic Integrations

**Scenario:** Epic EMR migration - need to catalog all Epic touchpoints

```bash
curl -X POST http://localhost:3008/map-integrations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "integrationType": "epic"
  }'
```

**Action:** Create comprehensive Epic integration test suite

---

### Example 3: Generate Architecture Diagram

**Scenario:** Architecture review - need visual of all integrations

```bash
curl -X POST http://localhost:3008/generate-diagram \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "format": "mermaid",
    "includeAuthentication": true
  }' | jq -r '.diagram.mermaid' > integrations.mmd
```

**Action:** Include diagram in architecture documentation

---

### Example 4: Analyze Critical Integration

**Scenario:** Epic integration causing issues - need detailed analysis

```bash
curl -X POST http://localhost:3008/analyze-integration \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "integrationName": "EpicService"
  }'
```

**Action:** Review usage patterns and add missing error handling

---

### Example 5: Get Mocking Strategy

**Scenario:** Setting up unit test suite - need mocking guidance

```bash
curl -X POST http://localhost:3008/mock-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "testType": "unit"
  }'
```

**Response:**
```json
{
  "recommendations": [
    {
      "integration": "EpicService",
      "mockingStrategy": "Interface-based mocking",
      "tools": ["Moq", "NSubstitute"],
      "priority": "high",
      "reason": "Critical dependency with multiple endpoints"
    }
  ]
}
```

---

### Example 6: Security Audit

**Scenario:** Security audit - catalog all external data flows

```bash
curl -X POST http://localhost:3008/map-integrations \
  -d '{"app":"App1"}' | \
  jq '.integrations | to_entries | map({
    name: .value[].name,
    auth: .value[].authentication.type,
    dataOut: .value[].dataFlow.outbound
  })'
```

---

### Example 7: Integration Test Planning

**Scenario:** Sprint planning - identify integrations needing tests

```bash
curl -X POST http://localhost:3008/map-integrations \
  -d '{"app":"App1"}' | \
  jq '.integrations | to_entries | map(.value[]) | 
    sort_by(-.riskAssessment.level) | 
    .[0:5] | 
    map({name, risk: .riskAssessment.level, endpoints: (.endpoints | length)})'
```

---

## Input/Output Schemas

### Input Schema: Map Integrations Request

```typescript
interface MapIntegrationsRequest {
  app: string;
  integrationType?: "epic" | "financial" | "messaging" | "database" | "all";
  includeSchemas?: boolean;
  includeDiagram?: boolean;
}
```

---

### Output Schema: Map Integrations Result

```typescript
interface MapIntegrationsResult {
  success: boolean;
  app: string;
  integrations: {
    epic?: Integration[];
    financial?: Integration[];
    messaging?: Integration[];
    database?: Integration[];
    other?: Integration[];
  };
  summary: Summary;
  recommendations: string[];
  diagram?: Diagram;
  cached: boolean;
  executionTime: number;
  timestamp: string;
}

interface Integration {
  name: string;
  type: string;
  category: string;
  file: string;
  endpoints: Endpoint[];
  dataFlow: DataFlow;
  authentication: Authentication;
  errorHandling?: ErrorHandling;
  riskAssessment: RiskAssessment;
  testingRecommendations: string[];
}

interface Endpoint {
  method: string;
  httpMethod: string;
  url: string;
  authentication: string;
  requestSchema: object;
  responseSchema: object;
  usedBy: string[];
  frequency: string;
  riskLevel: string;
}

interface DataFlow {
  inbound: string[];
  outbound: string[];
}

interface Authentication {
  type: string;
  credentialLocation: string;
  [key: string]: any;
}

interface RiskAssessment {
  level: "critical" | "high" | "medium" | "low";
  reasons: string[];
}
```

---

## Data Persistence

### Storage Locations

```
./data/integration-mapper/
├── maps/
│   ├── App1-integrations.json
│   └── App2-integrations.json
├── diagrams/
│   ├── App1-diagram.mmd
│   └── App1-diagram.puml
└── logs/
    └── integration-mapper.log
```

---

## Development

### Local Setup

```bash
cd mcps/integration-mapper
npm install
cp ../../.env.example .env
```

---

## Testing

### Unit Tests

```bash
npm test
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INVALID_APP` | 400 | App not found | Verify app name in apps.json |
| `NO_INTEGRATIONS_FOUND` | 404 | No integrations detected | Check service file patterns |
| `PARSE_ERROR` | 500 | Failed to parse service file | Check file syntax |

---

## Troubleshooting

### Issue: No integrations detected

**Solution:** Verify service files follow naming conventions (*Service.cs)

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3008/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/analysis/map-integrations`

### Uses

**Code Analyzer:** For code structure analysis

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Integration discovery
- ✅ Endpoint mapping
- ✅ Diagram generation

---

**Need help?** View logs with `docker compose logs -f integration-mapper`
