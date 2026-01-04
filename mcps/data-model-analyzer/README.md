# Data Model Analyzer - Database Schema & Entity Relationship Analysis

**Type:** Docker MCP (Always Running)  
**Port:** 3013  
**Container:** `qe-data-model-analyzer`  
**Location:** `mcps/data-model-analyzer/`  
**Technology:** Node.js 18 + Express + Entity Framework Analysis  
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

The **Data Model Analyzer** is a specialized MCP designed to analyze, document, and visualize database schemas and entity relationships in .NET C# applications using Entity Framework. It extracts entity definitions from DbContext classes, maps entity relationships (one-to-one, one-to-many, many-to-many), documents database constraints and indexes, identifies data integrity issues, generates entity relationship diagrams (ERDs), creates comprehensive data dictionaries, and provides test data generation strategies. The service acts as the definitive source of truth for understanding application data models.

This MCP addresses the reality that data models are often poorly documented and difficult to understand. When onboarding new developers who need to understand the database schema, when writing tests that need realistic test data, when identifying which entities are affected by a feature change, or when validating data integrity constraints, the Data Model Analyzer provides comprehensive, accurate, and up-to-date data model documentation extracted directly from code.

The Data Model Analyzer is essential for developer onboarding (understanding the data model), test data generation (creating realistic test entities), impact analysis (identifying affected entities), data migration planning, and database documentation for audits.

### Key Features

- ✅ **Entity Extraction** - Extracts all Entity Framework entity definitions from DbContext
- ✅ **Relationship Mapping** - Maps one-to-one, one-to-many, many-to-many relationships
- ✅ **Constraint Detection** - Identifies primary keys, foreign keys, unique constraints
- ✅ **Index Analysis** - Documents database indexes and their usage
- ✅ **Data Dictionary Generation** - Creates comprehensive data dictionary with field descriptions
- ✅ **ERD Generation** - Generates entity relationship diagrams in Mermaid/PlantUML
- ✅ **Data Integrity Analysis** - Identifies potential data integrity issues
- ✅ **Test Data Strategy** - Provides strategies for generating realistic test data
- ✅ **Migration Impact Analysis** - Shows which entities are affected by schema changes
- ✅ **HIPAA Field Identification** - Identifies PHI fields requiring special handling

### Use Cases

1. **Developer Onboarding** - Help new developers understand database schema
2. **Test Data Generation** - Understand entity structures for creating test data
3. **Impact Analysis** - Identify which entities are affected by feature changes
4. **Data Migration Planning** - Understand schema for planning migrations
5. **Database Documentation** - Generate comprehensive database documentation
6. **Data Integrity Validation** - Identify missing constraints and indexes
7. **HIPAA Compliance** - Identify PHI fields for compliance validation
8. **API Design** - Understand data model for designing APIs

### What It Does NOT Do

- ❌ Does not modify database schema (read-only analysis)
- ❌ Does not execute migrations (analysis only)
- ❌ Does not generate Entity Framework code (analyzes existing code)
- ❌ Does not query live databases (analyzes code definitions)
- ❌ Does not validate data quality (schema analysis only)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Analyze data model
curl -X POST http://localhost:3000/api/data-model/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Generate ERD diagram
curl -X POST http://localhost:3000/api/data-model/generate-erd \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "format": "mermaid"
  }'

# Get data dictionary
curl -X POST http://localhost:3000/api/data-model/data-dictionary \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

### Direct Access (Testing Only)

```bash
# Analyze data model
curl -X POST http://localhost:3013/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get entity details
curl -X POST http://localhost:3013/entity \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "entityName": "Patient"
  }'

# Generate ERD
curl -X POST http://localhost:3013/generate-erd \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "format": "mermaid"
  }'

# Get data dictionary
curl -X POST http://localhost:3013/data-dictionary \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Analyze entity relationships
curl -X POST http://localhost:3013/relationships \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get test data strategy
curl -X POST http://localhost:3013/test-data-strategy \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "entityName": "Patient"
  }'

# Health check
curl http://localhost:3013/health
```

### Expected Output

```json
{
  "success": true,
  "app": "App1",
  "dataModel": {
    "dbContexts": [
      {
        "name": "ApplicationDbContext",
        "file": "Data/ApplicationDbContext.cs",
        "entities": [
          {
            "name": "Patient",
            "tableName": "Patients",
            "schema": "dbo",
            "properties": [
              {
                "name": "Id",
                "type": "int",
                "nullable": false,
                "isPrimaryKey": true,
                "isIdentity": true,
                "description": "Unique patient identifier"
              },
              {
                "name": "FirstName",
                "type": "string",
                "maxLength": 100,
                "nullable": false,
                "isPHI": true,
                "description": "Patient first name (PHI)"
              },
              {
                "name": "LastName",
                "type": "string",
                "maxLength": 100,
                "nullable": false,
                "isPHI": true,
                "description": "Patient last name (PHI)"
              },
              {
                "name": "DateOfBirth",
                "type": "DateTime",
                "nullable": false,
                "isPHI": true,
                "description": "Patient date of birth (PHI)"
              },
              {
                "name": "SSN",
                "type": "string",
                "maxLength": 11,
                "nullable": true,
                "isPHI": true,
                "isEncrypted": true,
                "description": "Social Security Number (PHI - encrypted)"
              },
              {
                "name": "Email",
                "type": "string",
                "maxLength": 255,
                "nullable": true,
                "isPHI": true,
                "description": "Patient email address (PHI)"
              },
              {
                "name": "Phone",
                "type": "string",
                "maxLength": 20,
                "nullable": true,
                "isPHI": true,
                "description": "Patient phone number (PHI)"
              },
              {
                "name": "CreatedDate",
                "type": "DateTime",
                "nullable": false,
                "defaultValue": "GETDATE()",
                "description": "Record creation timestamp"
              },
              {
                "name": "ModifiedDate",
                "type": "DateTime",
                "nullable": true,
                "description": "Record last modified timestamp"
              }
            ],
            "indexes": [
              {
                "name": "IX_Patient_SSN",
                "columns": ["SSN"],
                "isUnique": true,
                "purpose": "Fast lookup by SSN, enforces uniqueness"
              },
              {
                "name": "IX_Patient_LastName_FirstName",
                "columns": ["LastName", "FirstName"],
                "isUnique": false,
                "purpose": "Fast patient search by name"
              }
            ],
            "relationships": [
              {
                "type": "one-to-many",
                "relatedEntity": "Appointment",
                "navigationProperty": "Appointments",
                "foreignKey": "PatientId",
                "cascadeDelete": false,
                "description": "Patient can have many appointments"
              },
              {
                "type": "one-to-many",
                "relatedEntity": "MedicalRecord",
                "navigationProperty": "MedicalRecords",
                "foreignKey": "PatientId",
                "cascadeDelete": false,
                "description": "Patient can have many medical records"
              },
              {
                "type": "one-to-one",
                "relatedEntity": "PatientInsurance",
                "navigationProperty": "Insurance",
                "foreignKey": "PatientId",
                "cascadeDelete": true,
                "description": "Patient has one insurance record"
              }
            ],
            "constraints": [
              {
                "type": "CHECK",
                "name": "CK_Patient_DateOfBirth",
                "definition": "DateOfBirth <= GETDATE()",
                "description": "Birth date cannot be in future"
              }
            ],
            "dataIntegrityIssues": [
              {
                "severity": "medium",
                "issue": "Email field allows nulls but has no unique constraint",
                "impact": "Multiple patients could have same email",
                "recommendation": "Add unique constraint on Email where Email IS NOT NULL"
              }
            ],
            "testDataStrategy": {
              "requiredFields": ["FirstName", "LastName", "DateOfBirth"],
              "optionalFields": ["SSN", "Email", "Phone"],
              "relatedEntities": ["Appointment", "MedicalRecord", "PatientInsurance"],
              "sampleData": {
                "FirstName": "John",
                "LastName": "Smith",
                "DateOfBirth": "1980-05-15",
                "Email": "john.smith@example.com",
                "Phone": "555-1234"
              },
              "generators": [
                "Use Bogus library to generate realistic names",
                "Use Faker for generating SSN, email, phone",
                "Ensure DateOfBirth is at least 18 years ago for adult patients"
              ]
            }
          },
          {
            "name": "Appointment",
            "tableName": "Appointments",
            "properties": [
              {
                "name": "Id",
                "type": "int",
                "nullable": false,
                "isPrimaryKey": true,
                "isIdentity": true
              },
              {
                "name": "PatientId",
                "type": "int",
                "nullable": false,
                "isForeignKey": true,
                "referencedTable": "Patients",
                "description": "Foreign key to Patient"
              },
              {
                "name": "ProviderId",
                "type": "int",
                "nullable": false,
                "isForeignKey": true,
                "referencedTable": "Providers",
                "description": "Foreign key to Provider"
              },
              {
                "name": "AppointmentDate",
                "type": "DateTime",
                "nullable": false,
                "description": "Scheduled appointment date and time"
              },
              {
                "name": "Status",
                "type": "string",
                "maxLength": 50,
                "nullable": false,
                "allowedValues": ["Scheduled", "Confirmed", "Completed", "Cancelled"],
                "description": "Appointment status"
              },
              {
                "name": "Notes",
                "type": "string",
                "maxLength": 1000,
                "nullable": true,
                "isPHI": true,
                "description": "Appointment notes (may contain PHI)"
              }
            ],
            "relationships": [
              {
                "type": "many-to-one",
                "relatedEntity": "Patient",
                "navigationProperty": "Patient",
                "foreignKey": "PatientId",
                "description": "Appointment belongs to one patient"
              },
              {
                "type": "many-to-one",
                "relatedEntity": "Provider",
                "navigationProperty": "Provider",
                "foreignKey": "ProviderId",
                "description": "Appointment with one provider"
              }
            ],
            "constraints": [
              {
                "type": "CHECK",
                "name": "CK_Appointment_Status",
                "definition": "Status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled')",
                "description": "Valid appointment statuses"
              },
              {
                "type": "CHECK",
                "name": "CK_Appointment_Date",
                "definition": "AppointmentDate >= GETDATE()",
                "description": "Cannot schedule appointments in past"
              }
            ]
          },
          {
            "name": "Provider",
            "tableName": "Providers",
            "properties": [
              {
                "name": "Id",
                "type": "int",
                "isPrimaryKey": true
              },
              {
                "name": "FirstName",
                "type": "string",
                "maxLength": 100,
                "nullable": false
              },
              {
                "name": "LastName",
                "type": "string",
                "maxLength": 100,
                "nullable": false
              },
              {
                "name": "Specialty",
                "type": "string",
                "maxLength": 100,
                "nullable": true
              },
              {
                "name": "LicenseNumber",
                "type": "string",
                "maxLength": 50,
                "nullable": false
              }
            ],
            "relationships": [
              {
                "type": "one-to-many",
                "relatedEntity": "Appointment",
                "navigationProperty": "Appointments",
                "foreignKey": "ProviderId"
              }
            ]
          }
        ],
        "totalEntities": 15,
        "totalRelationships": 28
      }
    ],
    "summary": {
      "totalEntities": 15,
      "totalRelationships": 28,
      "phiFields": 45,
      "encryptedFields": 3,
      "dataIntegrityIssues": 8,
      "missingIndexes": 4
    },
    "entityRelationshipDiagram": {
      "mermaid": "erDiagram\n    Patient ||--o{ Appointment : has\n    Patient ||--|| PatientInsurance : has\n    Patient ||--o{ MedicalRecord : has\n    Provider ||--o{ Appointment : schedules\n    Appointment }o--|| Patient : for\n    Appointment }o--|| Provider : with\n    \n    Patient {\n        int Id PK\n        string FirstName\n        string LastName\n        DateTime DateOfBirth\n        string SSN\n        string Email\n        string Phone\n    }\n    \n    Appointment {\n        int Id PK\n        int PatientId FK\n        int ProviderId FK\n        DateTime AppointmentDate\n        string Status\n        string Notes\n    }\n    \n    Provider {\n        int Id PK\n        string FirstName\n        string LastName\n        string Specialty\n        string LicenseNumber\n    }"
    },
    "dataDictionary": [
      {
        "entity": "Patient",
        "table": "Patients",
        "description": "Core patient demographic and contact information",
        "fields": [
          {
            "name": "Id",
            "type": "int",
            "nullable": false,
            "description": "Unique patient identifier (primary key)",
            "constraints": "PRIMARY KEY, IDENTITY(1,1)"
          },
          {
            "name": "FirstName",
            "type": "string(100)",
            "nullable": false,
            "description": "Patient first name",
            "phi": true,
            "validations": "Required, MaxLength 100"
          },
          {
            "name": "SSN",
            "type": "string(11)",
            "nullable": true,
            "description": "Social Security Number",
            "phi": true,
            "encrypted": true,
            "validations": "Format: XXX-XX-XXXX",
            "compliance": "HIPAA Protected, PII"
          }
        ]
      }
    ],
    "recommendations": [
      "Add unique constraint on Patient.Email where Email IS NOT NULL",
      "Add index on Appointment.AppointmentDate for query performance",
      "Consider adding audit fields (CreatedBy, ModifiedBy) to all entities",
      "Implement soft delete pattern for Patient and Appointment entities",
      "Add composite index on Appointment (PatientId, AppointmentDate) for common queries"
    ]
  },
  "cached": false,
  "executionTime": 2140,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│         Data Model Analyzer (Port 3013)                          │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ DbContext    │──▶│ Entity         │         │
│  │ Router   │   │ Parser       │   │ Extractor      │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      Parse EF Code       Extract Entities            │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Relationship │   │ ERD          │   │ Dictionary   │      │
│  │ Mapper       │   │ Generator    │   │ Builder      │      │
│  └──────────────┐   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Relationships        ERD Diagrams        Data Dictionary
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /analyze` - Analyze complete data model
   - `POST /entity` - Get specific entity details
   - `POST /generate-erd` - Generate ERD diagram
   - `POST /data-dictionary` - Generate data dictionary
   - `POST /relationships` - Analyze relationships
   - `POST /test-data-strategy` - Get test data strategy
   - `GET /health` - Health check endpoint

2. **DbContext Parser** (`src/parsers/dbContextParser.js`)
   - **File Finder** - Locates DbContext files
   - **Code Parser** - Parses C# code
   - **Entity Detector** - Identifies DbSet<T> properties
   - **Configuration Loader** - Loads fluent API configurations

3. **Entity Extractor** (`src/extractors/entityExtractor.js`)
   - **Property Analyzer** - Extracts entity properties
   - **Type Mapper** - Maps C# types to database types
   - **Constraint Detector** - Identifies primary keys, foreign keys
   - **Annotation Parser** - Parses data annotations

4. **Relationship Mapper** (`src/mappers/relationshipMapper.js`)
   - **Navigation Property Analyzer** - Identifies relationships
   - **Cardinality Detector** - Determines one-to-one, one-to-many, etc.
   - **Foreign Key Mapper** - Maps foreign key relationships
   - **Cascade Analyzer** - Analyzes cascade delete behavior

5. **ERD Generator** (`src/generators/erdGenerator.js`)
   - **Mermaid Builder** - Creates Mermaid ERD syntax
   - **PlantUML Builder** - Creates PlantUML diagrams
   - **Layout Optimizer** - Optimizes diagram layout
   - **Relationship Visualizer** - Visualizes relationships

6. **Dictionary Builder** (`src/builders/dictionaryBuilder.js`)
   - **Field Documenter** - Documents all fields
   - **Constraint Documenter** - Documents constraints
   - **PHI Identifier** - Identifies PHI fields
   - **Description Generator** - Generates field descriptions

7. **Test Data Strategist** (`src/strategists/testDataStrategist.js`)
   - **Required Field Analyzer** - Identifies required fields
   - **Relationship Analyzer** - Analyzes related entities
   - **Sample Generator** - Generates sample data
   - **Strategy Recommender** - Recommends test data approaches

### Dependencies

**Internal:**
- code-analyzer (3001) - For code parsing

**External Services:**
- File system access to application code (`/mnt/apps/*`)
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- acorn - Code parsing
- @babel/parser - Alternative parser
- glob - File pattern matching
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /analyze)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name
   └─▶ Load app configuration
       │
       ▼
3. DbContext Discovery
   ├─▶ Scan for *DbContext.cs files
   ├─▶ Parse DbContext files
   ├─▶ Extract DbSet properties
   └─▶ Load fluent API configurations
       │
       ▼
4. Entity Extraction
   ├─▶ For each DbSet<T>:
   │   ├─ Load entity class file
   │   ├─ Parse properties
   │   ├─ Identify data types
   │   ├─ Extract data annotations
   │   └─ Map to database types
   └─▶ Build entity definitions
       │
       ▼
5. Relationship Analysis
   ├─▶ Identify navigation properties
   ├─▶ Determine relationship types
   ├─▶ Map foreign keys
   ├─▶ Analyze cascade behavior
   └─▶ Build relationship graph
       │
       ▼
6. Constraint Detection
   ├─▶ Identify primary keys
   ├─▶ Identify foreign keys
   ├─▶ Find unique constraints
   ├─▶ Extract check constraints
   └─▶ Document indexes
       │
       ▼
7. PHI Identification
   ├─▶ Scan for PHI field patterns
   ├─▶ Identify encrypted fields
   ├─▶ Flag sensitive data
   └─▶ Document compliance requirements
       │
       ▼
8. Data Integrity Analysis
   ├─▶ Check for missing indexes
   ├─▶ Identify missing constraints
   ├─▶ Validate relationships
   └─▶ Generate recommendations
       │
       ▼
9. ERD Generation
   ├─▶ Build entity nodes
   ├─▶ Draw relationships
   ├─▶ Add cardinality labels
   └─▶ Generate Mermaid/PlantUML
       │
       ▼
10. Data Dictionary Creation
    ├─▶ Document all entities
    ├─▶ Document all fields
    ├─▶ Add descriptions
    └─▶ Include compliance notes
        │
        ▼
11. Response
    └─▶ Return JSON with entities, relationships, ERD, dictionary
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3013 | Data model analyzer HTTP port |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `CODE_ANALYZER_URL` | ❌ No | http://code-analyzer:3001 | Code analyzer service URL |

### Configuration Files

#### `config/apps.json`

Applications with data model paths:

```json
{
  "applications": [
    {
      "name": "App1",
      "displayName": "Patient Portal",
      "path": "/mnt/apps/patient-portal",
      "dataPath": "/mnt/apps/patient-portal/Data",
      "modelsPath": "/mnt/apps/patient-portal/Models",
      "type": "dotnet",
      "framework": "net8.0",
      "ormType": "EntityFramework"
    }
  ]
}
```

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
data-model-analyzer:
  build: ./mcps/data-model-analyzer
  container_name: qe-data-model-analyzer
  ports:
    - "3013:3013"
  environment:
    - NODE_ENV=production
    - PORT=3013
    - CODE_ANALYZER_URL=http://code-analyzer:3001
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/data-model-analyzer:/app/data   # Analysis results
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
  networks:
    - qe-network
  restart: unless-stopped
  depends_on:
    - code-analyzer
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3013/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

## API Reference

### Data Model Analysis Endpoints

#### POST /analyze

Analyze complete data model

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
}
```

**Response:**
```typescript
{
  success: boolean;
  app: string;
  dataModel: DataModel;
  cached: boolean;
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3013/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

---

#### POST /entity

Get specific entity details

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  entityName: string;             // Required: Entity name
}
```

**Response:**
```typescript
{
  success: boolean;
  entity: Entity;
}
```

**Example:**
```bash
curl -X POST http://localhost:3013/entity \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "entityName": "Patient"
  }'
```

---

#### POST /generate-erd

Generate entity relationship diagram

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  format?: "mermaid" | "plantuml" | "both";  // Optional: Diagram format
  entities?: string[];            // Optional: Specific entities to include
}
```

**Response:**
```typescript
{
  success: boolean;
  erd: {
    mermaid?: string;
    plantuml?: string;
  };
}
```

**Example:**
```bash
curl -X POST http://localhost:3013/generate-erd \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "format": "mermaid"
  }'
```

---

#### POST /data-dictionary

Generate data dictionary

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  format?: "json" | "markdown" | "html";  // Optional: Output format
}
```

**Response:**
```typescript
{
  success: boolean;
  dictionary: DataDictionaryEntry[];
}
```

---

#### POST /relationships

Analyze entity relationships

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  entityName?: string;            // Optional: Specific entity
}
```

**Response:**
```typescript
{
  success: boolean;
  relationships: Relationship[];
}
```

---

#### POST /test-data-strategy

Get test data generation strategy

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  entityName: string;             // Required: Entity name
}
```

**Response:**
```typescript
{
  success: boolean;
  strategy: TestDataStrategy;
}
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
  timestamp: string;
}
```

---

## Usage Examples

### Example 1: Generate ERD for Documentation

**Scenario:** Create ERD for architecture documentation

```bash
curl -X POST http://localhost:3013/generate-erd \
  -d '{"app":"App1","format":"mermaid"}' | \
  jq -r '.erd.mermaid' > data-model.mmd
```

**Action:** Include ERD in documentation

---

### Example 2: Identify PHI Fields

**Scenario:** HIPAA compliance - catalog all PHI fields

```bash
curl -X POST http://localhost:3013/analyze \
  -d '{"app":"App1"}' | \
  jq '.dataModel.dbContexts[].entities[] | 
    {entity: .name, phiFields: [.properties[] | 
    select(.isPHI == true) | .name]}'
```

---

### Example 3: Test Data Strategy

**Scenario:** Need to create test data for Patient entity

```bash
curl -X POST http://localhost:3013/test-data-strategy \
  -d '{"app":"App1","entityName":"Patient"}'
```

**Response:**
```json
{
  "strategy": {
    "requiredFields": ["FirstName", "LastName", "DateOfBirth"],
    "optionalFields": ["SSN", "Email", "Phone"],
    "sampleData": {
      "FirstName": "John",
      "LastName": "Smith"
    },
    "generators": [
      "Use Bogus library for realistic data"
    ]
  }
}
```

---

### Example 4: Impact Analysis

**Scenario:** Changing Patient entity - what's affected?

```bash
curl -X POST http://localhost:3013/relationships \
  -d '{"app":"App1","entityName":"Patient"}' | \
  jq '.relationships[] | .relatedEntity'
```

**Output:**
```json
"Appointment"
"MedicalRecord"
"PatientInsurance"
```

---

### Example 5: Data Dictionary Export

**Scenario:** Generate data dictionary for audit

```bash
curl -X POST http://localhost:3013/data-dictionary \
  -d '{"app":"App1","format":"markdown"}' > data-dictionary.md
```

---

## Input/Output Schemas

### Input Schema: Analyze Request

```typescript
interface AnalyzeRequest {
  app: string;
}
```

---

### Output Schema: Data Model

```typescript
interface DataModel {
  dbContexts: DbContext[];
  summary: Summary;
  entityRelationshipDiagram: ERD;
  dataDictionary: DataDictionaryEntry[];
  recommendations: string[];
}

interface Entity {
  name: string;
  tableName: string;
  schema?: string;
  properties: Property[];
  indexes: Index[];
  relationships: Relationship[];
  constraints: Constraint[];
  dataIntegrityIssues: Issue[];
  testDataStrategy: TestDataStrategy;
}

interface Property {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isIdentity?: boolean;
  isPHI?: boolean;
  isEncrypted?: boolean;
  maxLength?: number;
  description: string;
}

interface Relationship {
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  relatedEntity: string;
  navigationProperty: string;
  foreignKey: string;
  cascadeDelete: boolean;
  description: string;
}
```

---

## Data Persistence

### Storage Locations

```
./data/data-model-analyzer/
├── models/
│   ├── App1-data-model.json
│   └── App2-data-model.json
├── erds/
│   ├── App1-erd.mmd
│   └── App1-erd.puml
└── logs/
    └── data-model-analyzer.log
```

---

## Development

### Local Setup

```bash
cd mcps/data-model-analyzer
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
| `NO_DBCONTEXT` | 404 | No DbContext found | Check dataPath configuration |

---

## Troubleshooting

### Issue: Entities not detected

**Solution:** Verify DbContext file location in apps.json

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3013/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/data-model/analyze`

### Uses

**Code Analyzer:** For code parsing

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ Entity extraction
- ✅ Relationship mapping
- ✅ ERD generation
- ✅ Data dictionary creation

---

**Need help?** View logs with `docker compose logs -f data-model-analyzer`
